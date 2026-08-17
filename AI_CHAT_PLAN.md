# AI Chat — Implementation Plan

An assistant panel that helps compose requests, explain responses, and answer
questions about the project at hand. Bring your own key; the provider is the
user's choice.

This mirrors the AI panel in RayoDB (`rayodb/src-tauri/src/ai/`,
`rayodb/src/stores/ai-store.ts`) — same two-wire-format design, same versioned
data policy, same approval-gated tools. The one place this plan deliberately
diverges is **what leaves the machine**, because a REST client holds materially
more dangerous data than a database client does: bearer tokens, basic-auth
passwords, API keys, cookies, and response bodies full of real customer records.
Section 2 is therefore the load-bearing part of this document, not boilerplate.

---

## 1. Architecture

The assistant is a **service**, like every other capability in this codebase, so
both run modes get it from one implementation:

```
internal/services/ai/
  service.go     conversation state, the agentic loop, cancellation
  wire.go        Wire enum; anthropic and openai-compatible transports
  policy.go      what may leave the machine; the enumerated list + VERSION
  redact.go      builds the request/response digest the model is allowed to see
  tools.go       tool catalogue + the approval gate
  keystore.go    key persistence and where it ended up

internal/handlers/ai_handlers.go   web mode: REST + SSE
main.go (App methods)              native mode: Wails bindings + EventsEmit
```

**The key never reaches the frontend.** The frontend sends a question; the
backend attaches credentials and calls the provider. This is the same boundary
the cookie jar and the variable resolver already respect.

### Streaming across two transports

The provider stream is consumed once in the service and re-emitted through an
interface the two modes implement differently:

```go
// Emitter delivers assistant output as it arrives. Web mode writes SSE frames;
// native mode forwards to the Wails event bus. The service never knows which.
type Emitter interface {
    Delta(streamID, text string) error
    ToolCall(streamID string, call ToolCall) error
    Done(streamID string, usage Usage) error
    Fail(streamID string, err error) error
}
```

- **Web mode**: `GET /api/ai/stream/:id` — SSE, `text/event-stream`, flushed per
  delta. Gin's `c.Stream` with the request context wired to cancellation.
- **Native mode**: `runtime.EventsEmit(ctx, "ai:delta:"+streamID, text)`, with
  the frontend subscribing via `runtime.EventsOn`.

Both keyed by a `streamID` minted per turn, which is also the cancellation
handle (`StopStream(streamID)`), matching RayoDB's `streamId`.

**Adapter parity matters here.** `apiAdapter` and `wailsAdapter` must expose the
same method set or the dev-only parity check fires — the streaming subscription
is the one method whose implementations genuinely differ, so it needs a common
shape (`subscribeToAiStream(streamId, handlers) → unsubscribe`).

---

## 2. What may leave the machine

Every question goes to a third party the user picked. For a database client that
is a decision; for a REST client that holds production credentials it is *the*
decision. Two rules make the rest of the design fall out.

### Rule 1 — send the unresolved request, never the resolved one

The variable resolver already produces two versions of every request: the stored
one, with `{{API_TOKEN}}` placeholders intact, and the resolved one that goes on
the wire. **The assistant only ever sees the stored one.**

This single decision means bearer tokens, basic-auth passwords, API keys, and
every environment value stay on the machine by default — not because a redaction
regex caught them, but because the substitution never happened. It is structural,
not best-effort, and it costs nothing: `{{API_TOKEN}}` is more useful to the
model than the token would be anyway.

Variable **names** travel (the model needs them to write `{{API_URL}}/stops`);
variable **values** never travel unless the user opts a specific variable in.

### Rule 2 — the policy is an enumerated, versioned list

Not a checkbox with a reassuring sentence under it. `policy.go` owns the list,
publishes it to the panel, and enforces it — so the text a user agreed to and
the rule the code applies are the same value and cannot drift. Three kinds of
point, as in RayoDB: `always` (stated, no switch), `choice` (theirs to decide,
off until they say otherwise), `never` (stated because an unfindable promise is
not a promise).

| Point | Rule | Notes |
|---|---|---|
| Request shape — method, URL template, header **names**, body with `{{vars}}` unresolved | `always` | Turning it off leaves nothing to ask about |
| Variable **names** and their source layer (folder / environment) | `always` | Names only. Never values |
| Folder and request names, the tree structure | `always` | |
| Response **structure** — JSON keys and value *types*, no values | `choice` | What makes "write me a capture path" work without shipping data |
| Response **bodies**, verbatim | `choice`, off | For "why is this 422" |
| Variable **values**, per variable, explicitly chosen | `choice`, off | |
| Resolved auth: bearer tokens, basic-auth passwords, API keys | `never` | Structurally impossible under Rule 1 |
| Cookie jar contents | `never` | |
| Request history | `never` | |

`policy.VERSION` is stamped into settings on acceptance. Adding a point or
widening one bumps it and the panel asks again; narrowing does not. **Below the
current version nothing is sent at all — not even the question** — and the panel
shows the list instead of a composer.

### The structure-only digest

`redact.go` turns a response body into keys and types:

```json
{"data":[{"id":"number","name":"string","stops":[{"lat":"number"}]}],
 "meta":{"total_elements":"number"}}
```

Enough to write `data.0.stops.0.lat` as a capture path; useless as a data leak.
Arrays collapse to their first element's shape. Long strings never appear, so a
token pasted into a response body cannot ride along in a value.

---

## 3. Provider and model

**Two wire formats, not a vendor list** — `anthropic` and `openai-compatible`,
with a configurable base URL. That covers Anthropic, OpenAI, OpenRouter, vLLM,
LM Studio and Ollama, and it makes "the model runs on this machine and nothing
leaves it" a supported setup rather than a compromise. For a client used against
production APIs that is not a niche.

### Anthropic wire

Official SDK — `github.com/anthropics/anthropic-sdk-go`. Defaults:

```go
stream := client.Messages.NewStreaming(ctx, anthropic.MessageNewParams{
    Model:     "claude-opus-5",
    MaxTokens: 16000,
    Thinking:  anthropic.ThinkingConfigParamUnion{OfAdaptive: &adaptive},
    System:    []anthropic.TextBlockParam{{
        Text:         systemPrompt,
        CacheControl: anthropic.NewCacheControlEphemeralParam(),
    }},
    Tools:    toolDefs,
    Messages: history,
})
```

- **`claude-opus-5`** as the default model, adaptive thinking, streaming.
- **Prompt caching on the system prompt + tool definitions.** They are identical
  across every turn and every conversation, so the breakpoint goes on the last
  system block (tools render before system and are cached with it). Keep the
  tool list deterministically ordered — a reordered tool invalidates everything.
- **Handle `stop_reason: "refusal"` before reading content**, and opt into
  server-side fallbacks (`fallbacks: "default"`, beta
  `server-side-fallback-2026-07-01`) so a classifier decline is re-served rather
  than surfacing as an empty answer.
- Accumulate `resp.Usage` per turn and surface it — without token accounting the
  cost of the feature is invisible.

### Model catalogue

`GET /v1/models` on both wires. Cached in settings against the endpoint it came
from and refreshed on demand, exactly as RayoDB does (`modelsFor`): a list of
model IDs is not a secret, it barely changes, and refetching it means touching
the key on every settings open. Group by vendor prefix (`anthropic/claude-…`)
or family, preserving the provider's own ordering — list order is the only
quality signal a catalogue carries.

---

## 4. Tools — the assistant that uses the app

Read-only tools run automatically. Anything that writes or sends is proposed to
the user and waits. Same three phases as RayoDB (`proposed` → `running` →
`done`), same "allow for this conversation" affordance — offered for reads,
never for writes.

| Tool | Gate | Notes |
|---|---|---|
| `list_requests`, `get_request` | auto | Unresolved, per Rule 1 |
| `list_variables` | auto | Names + source layer, no values |
| `describe_last_response` | auto | Structure-only digest unless policy says otherwise |
| `create_request`, `update_request` | **ask** | The main "help me build this" payoff |
| `set_capture_rules` | **ask** | Pairs with the structure digest |
| `set_variable` | **ask** | Writes into the active environment |
| `execute_request` | **ask, every time** | Sends real traffic with real credentials. Never rememberable |

`execute_request` is the one that makes the assistant genuinely useful — "try it
and tell me why it 401s" — and the one that must never fire unattended. It is
also where the request finally *is* resolved: the resolution happens in the
existing service, on the machine, and only the status plus the digest come back.

**The Go SDK's tool runner** (`client.Beta.Messages.NewToolRunner`) drives the
loop; the approval gate lives inside each tool's run function, which returns a
"user declined" result rather than executing. Stepping with `NextMessage()` is
the alternative if the gate needs to intercept before the model sees anything.

---

## 5. Storage

Two new tables through the versioned `migrations` list in `database.go` —
append, never edit a shipped entry:

```sql
CREATE TABLE ai_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  wire TEXT NOT NULL DEFAULT 'anthropic',
  base_url TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  policy TEXT NOT NULL DEFAULT '{}',      -- JSON, incl. accepted_version
  models_cache TEXT NOT NULL DEFAULT '[]',
  models_for TEXT NOT NULL DEFAULT ''
);

CREATE TABLE ai_key (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  location TEXT NOT NULL,                 -- 'keychain' | 'local-database'
  value TEXT NOT NULL DEFAULT ''          -- empty when location = 'keychain'
);
```

**On key storage, be honest in the UI.** The OS keychain is right for native
mode; web mode has no keychain, and the SQLite file is not encrypted at rest.
The panel states where the key ended up rather than implying a guarantee it
cannot make — this is why RayoDB models `KeyLocation` as data instead of
assuming. Phase 1 can ship `local-database` only, with the label telling the
truth, and add keychain in phase 4.

Conversations are **not** persisted in v1 — they live in the frontend store and
die with the panel. Persisting them means storing whatever the user pasted into
the chat, which is a policy question of its own; defer it.

---

## 6. Frontend

```
stores/aiStore.js          settings, policy, messages, streamId, models
components/ai-panel/
  index.jsx                the panel: composer, transcript, tool cards
  Settings.jsx             wire, base URL, key, model picker, the policy list
  ModelPicker.jsx          grouped catalogue, also in the composer footer
  ToolCard.jsx             proposed / running / done, with approve / deny
```

- `aiStore` follows the existing store contract: `asyncAction`, an `error`
  field, adapter-only calls.
- The panel renders `policyPoints` **verbatim from the backend** — the list the
  user reads is the list the backend enforces.
- Below the accepted version, the composer is replaced by the policy list. There
  is no "ask me later" that silently sends anything.
- Monaco is already bundled (see `hooks/useMonacoAppTheme.js`); a proposed body
  diff can render in a read-only editor for free.
- i18n in all three locales, as everywhere else.

---

## 7. Phases

Each phase is shippable on its own.

**Phase 1 — the boring half.** Migration, `ai_config` / `ai_key`, settings
service, the wire abstraction, model catalogue fetch + cache, settings UI with
the policy list and its version gate. No chat yet. Deliverable: a user can
configure a provider, pick a model, and read what would be sent.

**Phase 2 — chat.** Non-tool conversation, streaming over both transports,
cancellation, the redaction digest, token accounting. Deliverable: ask about the
open request and get a streamed answer.

**Phase 3 — read-only tools.** `list_requests`, `get_request`,
`list_variables`, `describe_last_response`, plus the tool-card UI. Deliverable:
"which variable is my URL using and where does it come from?"

**Phase 4 — writes, gated.** `create_request` / `update_request` /
`set_capture_rules` / `set_variable`, the approval gate, "allow for this
conversation" for reads. Keychain storage. Deliverable: the assistant builds the
request and the user approves it.

**Phase 5 — `execute_request`.** Always-ask, never rememberable, results as a
digest. Deliverable: "run it and tell me why it fails."

---

## 8. Testing

- `policy.go`: the enforced set matches the published list, point by point. A
  bumped `VERSION` invalidates an older acceptance.
- `redact.go`: no value from a request or response body survives into the
  digest — table-driven, with tokens and PII-shaped strings as inputs. This is
  the test that matters most; everything else is a feature, this is a promise.
- Rule 1: a request carrying `{{API_TOKEN}}` produces a payload containing the
  literal placeholder and never the resolved value, including when an
  environment defines it.
- `wire.go`: both transports against a stub server, including a mid-stream
  cancellation and a `refusal` stop reason.
- Tools: writes and `execute_request` are unreachable without an approval.

Go tests live in `internal/services`, run with `go test ./...`. There is no JS
test framework — the frontend is covered by ESLint and by the parity check.

---

## 9. Open questions

1. **Key storage in web mode.** No keychain exists there. Ship
   `local-database` with an honest label, or refuse to store the key at all and
   read `RIKUEST_AI_KEY` from the environment like the telemetry webhook does?
2. **Conversation persistence.** Deferred in v1. If it lands, it needs its own
   policy point — the transcript holds whatever the user pasted.
3. **Per-project vs global config.** Global is simpler and matches settings;
   per-project would let a work project use a local model and a personal one use
   a hosted API. Global for v1.
4. **Cost ceiling.** Anthropic's task budgets bound one agentic loop. Worth it
   once tools land in phase 4, unnecessary before that.
