import { isAbsolute } from "node:path";

export interface PrerenderPage {
  path: string;
  template: string;
  values: Readonly<Record<string, string>>;
}

export const prerenderPages: readonly PrerenderPage[] = [
  {
    path: "examples/pre-rendered.html",
    template: "example.html",
    values: {
      title: "Pre-rendered example",
      message: "This page was generated during the build.",
    },
  },
];

function assertRelativeHtmlPath(path: string, label: string): void {
  const segments = path.split("/");
  if (
    isAbsolute(path) ||
    path.includes("\\") ||
    path.includes("\0") ||
    !path.endsWith(".html") ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid ${label} path: ${path}`);
  }
}

export function assertPrerenderPages(
  pages: readonly PrerenderPage[],
  browserOutputs: Iterable<string>,
): void {
  const outputs = new Set(browserOutputs);
  const destinations = new Set<string>();

  for (const page of pages) {
    assertRelativeHtmlPath(page.path, "pre-rendered page");
    assertRelativeHtmlPath(page.template, "template");

    if (destinations.has(page.path)) {
      throw new Error(`Duplicate pre-rendered page: ${page.path}`);
    }
    if (outputs.has(page.path)) {
      throw new Error(
        `Pre-rendered page "${page.path}" conflicts with browser output "${page.path}"`,
      );
    }
    destinations.add(page.path);
  }
}
