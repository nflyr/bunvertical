# Bun vertical

This project contains my opinionated proposal for the structure and tooling to build a Bun server.

The directory trees below describe the intended organization; future business
components and pages do not need to exist for the examples to run. The agreed
build and runtime requirements are recorded in [docs/decisions.md](./docs/decisions.md).

## Repository structure and Components

### Server Runtime

Root folder: `./src/server/`.

The server runtime contains all the code required to execute the server and provide technical capabilities.

```
src/
├── server/
│   ├── index.ts
│   ├── routes.ts
│   ├── prerender.ts
│   ├── lib/
│   │   └── ssr.ts
│   └── ssr/
│       └── example.html
```

The minimal modules required to execute this server MUST define static routes, start the server, register dynamic routes, and render SSR.

The server serves the browser output, a small JSON route, and examples of
request-time and pre-rendered HTML. The existing `render.ts` re-exports the
renderer for compatibility.

### Business Components

Root folder: `./src/server/domains/`.

Business components contain the business domains, data, behaviour, and access API.

```
src/
├── server/
│   └── domains/
│       └── domainOne/
```

This is the intended location for future domains, not a requirement to
implement them now. The unfinished
[User controller](./src/bc/User/user.controller.rest.ts) remains in `src/bc/`
and is explicitly excluded from type checking because its service does not yet
exist. How domain controllers contribute routes, and their boundary with
services, remain to be designed.

### Server Side Rendering

Root folder: `./src/server/ssr`.

Server-generated HTML can be pre-rendered during the build or generated
dynamically for each request. Templates are stored under `src/server/ssr/`;
the [renderer](./src/server/lib/ssr.ts) replaces `{{name}}`-style placeholders
and escapes values for HTML text. It is not a general contextual escaping or
template engine: layouts, loops, conditionals, includes, and helpers are
future work.

Pre-rendered pages, their templates, and their fixed build-time data are
registered in [prerender.ts](./src/server/prerender.ts). The build fails if a
registered page conflicts with a static browser page. In development the
pre-rendered URL is rendered on request; in production it serves the generated
file. Bundling browser assets used only by SSR templates is deferred.

## Static Content

Root folder: `./src/web/`.

Static pages include HTML, styles, browser code, and public resources such as
images and fonts. The current runnable examples are:

```
src/
├── web/
│   ├── index.html
│   ├── index.css
│   ├── index.ts
│   ├── who.html
│   ├── views/
│   │   └── example.html
│   └── static/
│       └── favicon.ico
```

Additional pages such as `views/legal.html` or `manage.html`, with their own
styles and scripts, can be added without updating an entry-point list.

## Key principles

- `src/web/` contains public content. Every HTML page is discovered
  recursively, including dotfiles; referenced browser code and supported
  assets are bundled into `dist/client/`. Keep server-only templates and
  secrets out of this directory.
- Unreferenced images, fonts, favicons, and other source assets are not copied
  automatically. Reference required assets from a browser entry point; no
  separate copying policy for otherwise unreferenced assets is defined yet.
- Static HTML keeps its source-relative URL, such as `/views/example.html`.
  `/` serves `index.html`; extensionless page aliases are not automatic.
- `src/server/` is bundled for Bun into `dist/server/`, together with editable
  copies of its templates. The complete `dist/` directory can run without the
  source tree or `node_modules`, but requires Bun.

## Development and deployment

The current implementation has been tested with Bun 1.4.4; a minimum
supported version has not yet been established.

```sh
bun install
bun run dev           # serve source; rebuild browser assets as needed
bun run check         # type-check the project, except the unfinished draft
bun run test          # run build and runtime checks in temporary directories
bun run build         # build client, server, templates, and pre-rendered pages
bun run start         # start the built server from the project directory
```

In development, the server uses Bun's `--hot` mode and rebuilds browser
outputs on request. Refresh the browser to see browser-side changes; automatic
browser refresh or hot-module replacement is not promised.

To run a portable build directly from its output directory:

```sh
cd dist
bun server/index.js
```

`bun run build` recreates `dist/client/` and `dist/server/`; do not store
hand-maintained files in those directories. `bun run build:browser` recreates
only the browser output, so pre-rendered pages are added again by the
subsequent `bun run build:server` step. A server-only build does not build the
static browser pages.

The server listens on `0.0.0.0:3000` by default. Set `HOST` and `PORT` to
override this, for example `HOST=127.0.0.1 PORT=3001 bun run dev`.

The browser builder inlines set `PUBLIC_*` environment variables referenced
literally as `process.env.PUBLIC_NAME`. These values are public: never put
secrets in them. Set them before starting Bun, then restart development or
rebuild production after changes; an unset reference may remain unresolved in
the browser. Production currently emits external source maps into the public
output, which can expose source code.

### Example routes

- `/` and `/index.html`: static home page with browser TypeScript and CSS.
- `/who.html` and `/views/example.html`: additional static pages.
- `/api/example`: example JSON response.
- `/examples/ssr?name=Bun`: HTML rendered on request with escaped text.
- `/examples/pre-rendered.html`: HTML generated during the production build.
