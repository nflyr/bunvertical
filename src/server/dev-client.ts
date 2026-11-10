import { join } from "node:path";
import { buildBrowser } from "../../scripts/lib/browser-build";
import { outputRelativePath } from "../../scripts/lib/build-output";
import { renderTemplate } from "./lib/renderEngine";
import { assertPrerenderPages, prerenderPages } from "./prerender";

function publicPath(path: string): string {
   const segments = path.split("/").map((segment) => encodeURI(segment).replaceAll("#", "%23").replaceAll("?", "%3F"));
   return `/${segments.join("/")}`;
}

export function createDevelopmentHandler(webRoot: string, templateRoot: string) {
   let pendingBuild: Promise<Map<string, Bun.BuildArtifact>> | undefined;

   function getOutputs(): Promise<Map<string, Bun.BuildArtifact>> {
      if (!pendingBuild) {
         pendingBuild = (async () => {
            const result = await buildBrowser(webRoot, false);
            const paths = result.outputs.map((output) => outputRelativePath(output.path));
            assertPrerenderPages(prerenderPages, paths);

            return new Map(result.outputs.map((output) => [publicPath(outputRelativePath(output.path)), output]));
         })().finally(() => {
            pendingBuild = undefined;
         });
      }

      return pendingBuild;
   }

   return async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      const outputs = await getOutputs();
      const page = prerenderPages.find((entry) => publicPath(entry.path) === url.pathname);

      if (page) {
         return renderTemplate(join(templateRoot, page.template), page.values);
      }

      const path = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
      const output = outputs.get(path);

      if (output) {
         return new Response(request.method === "HEAD" ? null : output, {
            headers: {
               "content-type": output.type,
               "cache-control": "no-store",
            },
         });
      }

      if (!url.pathname.endsWith("/") && [...outputs.keys()].some((key) => key.startsWith(`${url.pathname}/`))) {
         url.pathname += "/";
         return Response.redirect(url.toString(), 301);
      }

      return new Response("Not found", { status: 404 });
   };
}
