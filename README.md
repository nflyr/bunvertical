# Bun vertical

This project contains my opinionated proposal for the structure and tooling to build a Bun server.

## Responsibilities

## Server entry point (executable)

This folder contains the Bun runtime application:

- Starts the server.
- Defines static route patterns.
- Registers dynamic routes.
- Applies middleware.

- Renders dynamic HTML ?.

## Business Components

Business components reside inside `server/bc`.

A business component has one or more Aggregates that also resides in its own subfolder.


### Static HTML

Static html content resides in `./web`, and can be subdivided into several parts.
Usually there should be at least a `pages` folder dedicated to static HTML that contributes to the application renderization.

*** Notes to LF: Maybe place this under "web/statics"


```
web/
├── docs/
│   ├── index.html
│   └── getting-started.html
└── pages/
    ├── terms.html
    └── privacy.html
```

## Dynamically generated HTML


All dynamically generated content live under `./src/view` and is composed by pairs of html and ts files.

** Note to LF:: This really should be specialized with templating for reutilization!

Also, for production, use a real template engine if you need, with:

- Layout inheritance
- Loops
- Conditionals
- Includes
- Automatic escaping
- Custom helpers (hum....)


## Bundled frontend Code

Bun can process HTML entry points and bundle their referenced TypeScript, JavaScript, CSS, and assets.
Production builds can emit hashed assets into an output directory.

```
src/web/
├── entries/
│   ├── app.ts
│   └── admin.ts
├── pages/
│   ├── index.html
│   └── admin.html
└── styles/
    └── app.css
```








## Full Project Structure

The key principle is:

- `web/` contains content that can be published or served directly.
- `src/web/` contains browser source code.
- `src/views/` contains private server-side templates.
- `src/components/` contains isolated business capabilities.
- `src/server/` contains HTTP and Bun integration.
- `build/` contains generated artifacts only.


Tree:

```
bun-app/
├── package.json
├── tsconfig.json
├── src/
│   ├── server/
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   └── render.ts
│   ├── components/
│   │   ├── users/
│   │   └── orders/
│   ├── infrastructure/
│   │   └── database/
│   ├── shared/
│   ├── web/
│   │   ├── entries/
│   │   └── pages/
│   └── views/
│       ├── layouts/
│       ├── pages/
│       └── partials/
├── web/
│   ├── static/
│   ├── docs/
│   └── pages/
├── scripts/
│   └── build-browser.ts
├── build/
└── tests/
```
