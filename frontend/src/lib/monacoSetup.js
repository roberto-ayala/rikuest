// Monaco is bundled with the app instead of fetched at runtime.
//
// @monaco-editor/react defaults to loading the editor from a CDN
// (cdn.jsdelivr.net/npm/monaco-editor@x/min/vs). That makes the request body
// editor and the response viewer depend on an internet connection, which a
// desktop REST client used against localhost cannot assume — offline, both
// panels would simply never render.
//
// Importing the package and handing it to `loader.config` pins the editor to
// the version in package-lock and makes it work with no network at all. The
// workers below are the same wiring, for the language services Monaco runs off
// the main thread; Vite's `?worker` suffix compiles each into its own bundle.
// Rather than the default entry (which pulls the CSS, HTML and TypeScript
// language services along with it), the pieces are picked explicitly:
//
//   edcore.main       the editor and all of its features — find, folding,
//                     bracket matching, context menu, multi-cursor
//   basic-languages   Monarch colorizers for json, html, xml, css, javascript
//                     and the rest; colorization runs on the main thread and
//                     needs no worker
//   json service      the only language service in use: it backs the request
//                     body editor's validation
//
// The dropped services exist to provide diagnostics, completion and formatting.
// Nothing here asks for those in CSS, HTML or JS — those languages only ever
// appear in the read-only response viewer — and their workers cost about 7.5 MB
// of bundle, of which the TypeScript compiler alone is 5.9 MB.
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import { loader } from '@monaco-editor/react';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// Workers are created on demand, so a session that never opens a JSON body
// never instantiates the JSON one.
self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    return label === 'json' ? new jsonWorker() : new editorWorker();
  },
};

loader.config({ monaco });
