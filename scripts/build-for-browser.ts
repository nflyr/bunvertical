import { join, resolve } from "node:path";
import { assertPrerenderPages, prerenderPages } from "../src/server/prerender";
import { buildBrowser } from "./lib/browser-build";
import {
  outputRelativePath,
  replaceBuildDirectory,
  writeBuildArtifacts,
} from "./lib/build-output";

const projectRoot = resolve(import.meta.dir, "..");
const clientDirectory = join(projectRoot, "dist", "client");
const result = await buildBrowser(join(projectRoot, "src", "web"), true);

assertPrerenderPages(
  prerenderPages,
  result.outputs.map((output) => outputRelativePath(output.path)),
);

await replaceBuildDirectory(clientDirectory);
await writeBuildArtifacts(clientDirectory, result.outputs);

console.log(`Browser build completed: ${clientDirectory}`);
