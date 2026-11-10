# Bun vertical: agreed development and build decisions

This document records the decisions made while reviewing
[README.md](../README.md). They describe the intended solution, not a claim
that it has already been implemented.

## Scope and working agreement

- Complete the requirements review and document the decisions before adapting
  the client and server builds.
- Add only the small examples needed to demonstrate and verify the solution.
  Do not implement the missing business domains or all of the files shown in
  the README's illustrative directory trees.
- Explain proposed changes briefly and obtain the user's permission before
  writing files. Authorization to write this document is not authorization to
  change the implementation; implementation and verification were
  subsequently approved separately.
- Demonstrate that the application compiles and runs both in development and
  from the build directory.

## Source organization

- Server runtime code belongs under `src/server/`.
- The intended root for business components is `src/server/domains/`.
- Public browser pages and their client-side code belong under `src/web/`.
- Server-only HTML templates belong under `src/server/ssr/`; rendering code
  belongs under `src/server/lib/`.
- The existing unfinished
  [User controller](../src/bc/User/user.controller.rest.ts) remains unchanged.
  Explicitly exclude that single file from type checking while it is a draft;
  do not implement its missing service merely to complete this assignment.

## Production output

- Build a Bun-targeted JavaScript server bundle at `dist/server/index.js`.
  Bun is required at runtime; a standalone executable is not required.
- Put the browser build and generated public HTML in `dist/client/`.
- Ship separate, editable server templates inside `dist/server/`.
- The `dist/` directory must be deployable without the original source tree
  or `node_modules`. In particular, starting the server from the output
  directory must work:

   ```sh
   cd dist
   bun server/index.js
   ```

- Paths needed by the deployed server must resolve to the deployed output,
  not to source files in the original repository.
- Preserve the current default binding of `0.0.0.0:3000`, with `HOST` and
  `PORT` overrides.

## Browser build and static URLs

- Recursively discover HTML pages under `src/web/` as browser-build entry
  points. Bundle the JavaScript, TypeScript, CSS, and supported assets
  referenced by those pages or their dependencies.
- Do not automatically publish unreferenced images, fonts, favicons, or other
  public assets merely because they exist in `src/web/`. For example, an
  unreferenced favicon or `robots.txt` is not guaranteed to appear in the
  production output. Assets needed only by a runtime URL require an explicit
  inclusion strategy; no such exception has been agreed yet.
- Expose static HTML pages at source-relative file paths. For example, a
  `src/web/views/legal.html` page, if present, is available at
  `/views/legal.html`. Automatic extensionless aliases are not part of the
  selected convention.
- Serve the static `src/web/index.html` page at `/`; it is also a static
  page at `/index.html`. Demonstrate SSR on a separate route.
- Bun may rewrite or hash the names of bundled assets; the browser build must
  produce working references to them.
- Preserve the `PUBLIC_*` build-time environment-variable policy. These
  values are public and must not contain secrets.
- Preserve external production source maps for now, noting that publicly
  served maps can expose source code.

## Development workflow

- One development command runs the server from source and automatically
  builds browser code as needed, without a separate manual browser build.
- The development workflow must provide the static pages and dynamic routes
  needed by the demonstrations.
- A pre-rendered page's URL is rendered on request in development. In
  production, the same URL serves the file generated during the build.

## Server-side rendering

- Provide a minimal dynamic SSR demonstration using server-side templates.
- Escape interpolated text safely in the demonstration. Text escaping must
  not be represented as a general solution for arbitrary attribute, URL, or
  JavaScript contexts.
- A full template engine is outside the agreed scope. Layout inheritance,
  loops, conditionals, includes, and custom helpers remain future work.
- The SSR demonstration does not require browser assets used only by SSR
  pages. A pipeline for bundling such assets is deferred.

## Build-time pre-rendering

- Support pre-rendering as well as request-time SSR.
- Use an explicit registry identifying the pages, renderers, and build-time
  data; include one small example. Automatic discovery of pre-renderable
  modules is not required.
- The example uses deterministic, fixed build-time data. The resulting HTML
  remains unchanged until it is built again.
- Write generated public HTML to `dist/client/` and expose it at its
  corresponding static URL.
- Fail the build with a clear error if a generated page and a static page
  target the same output path; neither silently replaces the other.

## Runnable examples and verification

- Replace the server's references to missing route modules with minimal
  static, SSR, and JSON-route demonstrations rather than implementing a
  business domain.
- Use browser-safe example code to demonstrate HTML, client-side
  TypeScript/JavaScript, styles, and referenced assets as needed.
- Verify the actual behavior in development and in the built deployment:
  static page URLs and browser assets, a dynamic JSON route, escaped dynamic
  SSR, and the pre-rendered page.
- Verify that the production output works without the source tree or
  `node_modules`, that unreferenced public assets are not automatically
  copied, and that a pre-render/static-page collision fails the build.
- The project type check should cover the applicable project files while
  explicitly documenting the one excluded unfinished User controller.

## Observed gaps at review time

- [package.json](../package.json) builds the server into `dist/server/` but
  its `start` script points to `build/server/`.
- [build-for-browser.ts](../scripts/build-for-browser.ts) names a missing
  `admin.html` as an entry point.
- [routes.ts](../src/server/routes.ts) imports three missing modules, and the
  unfinished User controller imports a missing service. A read-only
  `bun check` reported these four missing imports.
- [src/web/index.ts](../src/web/index.ts) imports a server-side renderer,
  while [src/web/index.html](../src/web/index.html) contains template
  placeholders. The agreed structure separates browser pages from SSR
  templates.
- The README's intended domain root differs from the location of the
  unfinished User controller.

## Questions not yet decided

The final questionnaire was interrupted. The existing bind address, public
environment-variable prefix, and source-map behavior were subsequently
approved for preservation; the remaining suggested defaults were not accepted
as decisions.

- Minimum supported Bun version. Bun `1.4.4` was installed when the project
  was inspected, but that alone does not establish a minimum.
- Browser compatibility and supported deployment platforms.
- Whether browser hot-module replacement or automatic browser refresh is
  required beyond automatic rebuilding.
- Exact demonstration route names, pre-rendered filenames, and any explicit
  inclusion mechanism for otherwise unreferenced public assets.

## Bun references

- [Documentation](https://bun.com/docs),
  [guides](https://bun.com/guides), and [API reference](https://bun.com/reference)
- [HTML and static-site bundling](https://bun.com/docs/bundler/html-static)
- [Full-stack applications](https://bun.com/docs/bundler/fullstack)
- [Type checking](https://bun.com/docs/runtime/check)
