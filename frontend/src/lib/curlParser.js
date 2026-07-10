// Parses a pasted curl command (e.g. copied from a terminal, or a browser
// devtools "Copy as cURL") into a request-shaped object that can be merged
// into `createRequest()`'s payload. This is the reverse of the export logic
// in CopyFormatModal (which turns a request INTO a curl string).
//
// Design note on --location/-L: real curl does NOT follow redirects unless
// -L/--location is passed. Rikuest requests default `follow_redirects` to
// true because that's the more useful default for a REST client (most API
// testing wants redirects followed). So here we leave `follow_redirects:
// true` regardless of whether -L is present - -L simply confirms/keeps it
// true. We do NOT flip it to false when -L is absent, since curl's stricter
// default would surprise users pasting a plain `curl https://...` command.

// Flags that take a "Key: Value" header argument.
const HEADER_FLAGS = new Set(['-H', '--header']);

// Flags that supply a request body (curl joins repeated -d/--data with '&').
const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode']);

// Flags whose argument we consume but whose effect isn't modeled - listed
// explicitly so we don't misinterpret their argument as the request URL.
// Not supported: client certs (--cert/--key/--cacert), proxying (--proxy),
// multipart form fields (-F/--form - Rikuest's form_data model doesn't map
// 1:1 to curl's key=value/key=@file syntax), --resolve, --retry, --output.
const IGNORED_ARG_FLAGS = new Set([
  '-o', '--output',
  '--connect-timeout',
  '--retry',
  '--cacert', '--cert', '--key', '--proxy', '--resolve',
  '-F', '--form'
]);

// Flags that take no argument and have no effect on the parsed request.
const NOOP_FLAGS = new Set([
  '-s', '--silent', '-v', '--verbose', '-i', '--include',
  '--compressed', '--http1.1', '--http2', '-#', '--progress-bar', '-g', '--globoff'
]);

// Splits a "Key: Value" header line into its parts.
function splitHeaderLine(line) {
  const idx = line.indexOf(':');
  if (idx === -1) return [line.trim(), ''];
  return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
}

// Tokenizes a shell-ish command string: handles single quotes (literal, no
// escapes), double quotes (backslash escapes \, ", $, `), unquoted
// backslash-escapes, and whitespace-separated tokens. Multi-line pasted
// commands (trailing `\` + newline, common when copying from devtools) are
// joined into a single line before tokenizing.
function tokenize(input) {
  const joined = input.replace(/\\\r?\n\s*/g, ' ');

  const tokens = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let hasToken = false;

  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];

    if (inSingle) {
      if (ch === "'") {
        inSingle = false;
      } else {
        current += ch;
      }
      continue;
    }

    if (inDouble) {
      if (ch === '"') {
        inDouble = false;
      } else if (ch === '\\' && i + 1 < joined.length && '"\\$`'.includes(joined[i + 1])) {
        current += joined[++i];
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      hasToken = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      hasToken = true;
      continue;
    }
    if (ch === '\\' && i + 1 < joined.length) {
      current += joined[++i];
      hasToken = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (hasToken || current) {
        tokens.push(current);
        current = '';
        hasToken = false;
      }
      continue;
    }

    current += ch;
    hasToken = true;
  }

  if (hasToken || current) tokens.push(current);
  return tokens;
}

/**
 * Parses a curl command string into a request-shaped object.
 *
 * Supported flags:
 *  -X, --request <method>            explicit HTTP method
 *  -H, --header "Key: Value"         repeatable; Authorization: Bearer ...
 *                                    is detected and mapped to bearer auth
 *                                    instead of a literal header
 *  -d, --data, --data-raw,
 *  --data-binary, --data-ascii,
 *  --data-urlencode <data>           repeatable, joined with '&'; implies
 *                                    method POST when -X isn't given
 *  -u, --user <user:pass>            basic auth
 *  -k, --insecure                    -> insecure_skip_verify: true
 *  -L, --location                    kept for compatibility; see module doc
 *  -m, --max-time <seconds>          -> timeout_seconds
 *  -A, --user-agent <ua>             -> User-Agent header
 *  -b, --cookie <cookie>             -> Cookie header
 *  -e, --referer <url>               -> Referer header
 *  --url <url>                       explicit URL
 *  bare URL (quoted or unquoted)     may appear anywhere in the command
 *
 * Recognized-but-ignored (argument consumed so it isn't mistaken for the
 * URL, but has no effect on the result): --compressed, -s/--silent,
 * -v/--verbose, -i/--include, --http1.1, --http2, -o/--output,
 * --connect-timeout, --retry.
 *
 * Explicitly NOT supported: client certificates (--cert/--key/--cacert),
 * --proxy, --resolve, multipart form fields (-F/--form).
 *
 * @param {string} curlText
 * @returns {{method: string, url: string, headers: Object, body: string,
 *   body_type: string, auth_type: string, bearer_token: string,
 *   basic_auth: {username: string, password: string},
 *   insecure_skip_verify: boolean, follow_redirects: boolean,
 *   timeout_seconds: number}}
 */
export function parseCurlCommand(curlText) {
  if (!curlText || !curlText.trim()) {
    throw new Error('Nothing to parse - paste a curl command first.');
  }

  const tokens = tokenize(curlText.trim());

  let i = 0;
  if (tokens[i] === 'curl') i++;

  const result = {
    method: null,
    url: '',
    headers: {},
    body: '',
    body_type: 'none',
    auth_type: 'none',
    bearer_token: '',
    basic_auth: { username: '', password: '' },
    insecure_skip_verify: false,
    follow_redirects: true,
    timeout_seconds: 0
  };

  const dataParts = [];
  let explicitMethod = null;

  for (; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '-X' || token === '--request') {
      explicitMethod = (tokens[++i] || '').toUpperCase();
      continue;
    }

    if (HEADER_FLAGS.has(token)) {
      const [key, value] = splitHeaderLine(tokens[++i] || '');
      if (key) {
        if (key.toLowerCase() === 'authorization' && /^bearer\s+/i.test(value)) {
          result.auth_type = 'bearer';
          result.bearer_token = value.replace(/^bearer\s+/i, '').trim();
        } else {
          result.headers[key] = value;
        }
      }
      continue;
    }

    if (DATA_FLAGS.has(token)) {
      dataParts.push(tokens[++i] || '');
      continue;
    }

    if (token === '-u' || token === '--user') {
      const cred = tokens[++i] || '';
      const sep = cred.indexOf(':');
      result.auth_type = 'basic';
      result.basic_auth = sep === -1
        ? { username: cred, password: '' }
        : { username: cred.slice(0, sep), password: cred.slice(sep + 1) };
      continue;
    }

    if (token === '-k' || token === '--insecure') {
      result.insecure_skip_verify = true;
      continue;
    }

    if (token === '-L' || token === '--location') {
      result.follow_redirects = true;
      continue;
    }

    if (token === '-m' || token === '--max-time') {
      const seconds = parseInt(tokens[++i], 10);
      if (!Number.isNaN(seconds)) result.timeout_seconds = seconds;
      continue;
    }

    if (token === '--url') {
      result.url = tokens[++i] || '';
      continue;
    }

    if (token === '-A' || token === '--user-agent') {
      const ua = tokens[++i] || '';
      if (ua) result.headers['User-Agent'] = ua;
      continue;
    }

    if (token === '-b' || token === '--cookie') {
      const cookie = tokens[++i] || '';
      if (cookie) result.headers['Cookie'] = cookie;
      continue;
    }

    if (token === '-e' || token === '--referer') {
      const referer = tokens[++i] || '';
      if (referer) result.headers['Referer'] = referer;
      continue;
    }

    if (IGNORED_ARG_FLAGS.has(token)) {
      i++; // discard the argument
      continue;
    }

    if (NOOP_FLAGS.has(token)) {
      continue;
    }

    // Any other flag-looking token we don't recognize: skip it rather than
    // mistaking it for the URL (best-effort forward compatibility).
    if (token.length > 1 && token.startsWith('-')) {
      continue;
    }

    // First bare (non-flag) token is the URL.
    if (!result.url) {
      result.url = token;
    }
  }

  if (!result.url) {
    throw new Error('Could not find a URL in the curl command.');
  }

  if (dataParts.length > 0) {
    result.body = dataParts.join('&');
  }

  // Method resolution: explicit -X/--request wins; otherwise curl defaults
  // to POST when a body is present, GET otherwise.
  result.method = explicitMethod || (dataParts.length > 0 ? 'POST' : 'GET');

  // Body type detection: JSON if a Content-Type: application/json header was
  // given, or if the body content itself is valid JSON. Otherwise text.
  const contentTypeEntry = Object.entries(result.headers)
    .find(([key]) => key.toLowerCase() === 'content-type');
  const declaredJson = contentTypeEntry && /application\/json/i.test(contentTypeEntry[1]);

  if (result.body) {
    if (declaredJson) {
      result.body_type = 'json';
    } else {
      try {
        JSON.parse(result.body);
        result.body_type = 'json';
      } catch {
        result.body_type = 'text';
      }
    }
  }

  return result;
}
