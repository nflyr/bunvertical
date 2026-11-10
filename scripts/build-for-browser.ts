/*
Goal: Build / Bundle client side dynamic html.

Notes:

The `PUBLIC_*` convention prevents accidentally exposing private server environment variables to browser code.
Bun supports environment-variable replacement during builds using the env option.

Use:

```bash
PUBLIC_API_URL=https://api.example.com bun run scripts/build-browser.ts
``` 

*/
const result = await Bun.build({
  entrypoints: [
    "./src/web/pages/index.html",
    "./src/web/pages/admin.html",
  ],
  outdir: "./build/browser",
  target: "browser",
  minify: true,
  sourcemap: "external",
  env: "PUBLIC_*",
});

if (!result.success) {
  console.error("Browser build failed:");

  for (const log of result.logs) {
    console.error(log);
  }

  process.exit(1);
}

console.log("Browser build completed");
