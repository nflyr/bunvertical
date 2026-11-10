import { cp, mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { renderTemplate } from "../src/server/lib/renderEngine";
import { assertPrerenderPages, prerenderPages } from "../src/server/prerender";
import { discoverHtmlPages } from "./lib/browser-build";
import { outputRelativePath, replaceBuildDirectory, writeBuildArtifacts } from "./lib/build-output";

const projectRoot = resolve(import.meta.dir, "..");
const webRoot = join(projectRoot, "src", "web");
const templateRoot = join(projectRoot, "src", "server", "ssr");
const clientDirectory = join(projectRoot, "dist", "client");
const serverDirectory = join(projectRoot, "dist", "server");
const htmlPages = await discoverHtmlPages(webRoot);

assertPrerenderPages(
   prerenderPages,
   htmlPages.map((page) => outputRelativePath(relative(webRoot, page))),
);

const result = await Bun.build({
   entrypoints: [join(projectRoot, "src", "server", "index.ts")],
   target: "bun",
   packages: "bundle",
});

if (!result.success) {
   throw new AggregateError(result.logs, "Server build failed");
}
for (const log of result.logs) {
   console.warn(log);
}
if (!result.outputs.some((output) => outputRelativePath(output.path) === "index.js")) {
   throw new Error("Server build did not produce index.js");
}

const generatedPages = await Promise.all(
   prerenderPages.map(async (page) => {
      const response = await renderTemplate(join(templateRoot, page.template), page.values);
      return { path: page.path, html: await response.text() };
   }),
);

await replaceBuildDirectory(serverDirectory);
await writeBuildArtifacts(serverDirectory, result.outputs);
await cp(templateRoot, join(serverDirectory, "ssr"), { recursive: true });

for (const page of generatedPages) {
   const destination = join(clientDirectory, page.path);
   await mkdir(dirname(destination), { recursive: true });
   await Bun.write(destination, page.html);
}

console.log(`Server build completed: ${serverDirectory}`);
