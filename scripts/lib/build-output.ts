import { mkdir, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, sep } from "node:path";

export function outputRelativePath(outputPath: string): string {
  const normalized = normalize(outputPath);

  if (
    isAbsolute(normalized) ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith(`..${sep}`)
  ) {
    throw new Error(`Invalid build output path: ${outputPath}`);
  }

  return normalized.split(sep).join("/");
}

export async function replaceBuildDirectory(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
}

export async function writeBuildArtifacts(
  directory: string,
  outputs: readonly Bun.BuildArtifact[],
): Promise<void> {
  for (const output of outputs) {
    const destination = join(directory, outputRelativePath(output.path));
    await mkdir(dirname(destination), { recursive: true });
    await Bun.write(destination, output);
  }
}
