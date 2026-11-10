import { relative } from "node:path";
import { outputRelativePath } from "./build-output";

export async function discoverHtmlPages(webRoot: string): Promise<string[]> {
  const entrypoints: string[] = [];
  const glob = new Bun.Glob("**/*.html");

  for await (const path of glob.scan({
    cwd: webRoot,
    absolute: true,
    dot: true,
    onlyFiles: true,
  })) {
    entrypoints.push(path);
  }

  entrypoints.sort();
  if (entrypoints.length === 0) {
    throw new Error(`No HTML pages found in ${webRoot}`);
  }

  return entrypoints;
}

export async function buildBrowser(
  webRoot: string,
  minify: boolean,
): Promise<Bun.BuildOutput> {
  const entrypoints = await discoverHtmlPages(webRoot);
  const result = await Bun.build({
    entrypoints,
    root: webRoot,
    target: "browser",
    minify,
    sourcemap: "external",
    env: "PUBLIC_*",
  });

  if (!result.success) {
    throw new AggregateError(result.logs, "Browser build failed");
  }
  for (const log of result.logs) {
    console.warn(log);
  }

  const outputs = new Set(
    result.outputs.map((output) => outputRelativePath(output.path)),
  );
  for (const entrypoint of entrypoints) {
    const expected = outputRelativePath(relative(webRoot, entrypoint));
    if (!outputs.has(expected)) {
      throw new Error(`Browser build did not produce the expected page: ${expected}`);
    }
  }

  return result;
}
