///
/// Component: Server
/// Objective: Entry point to the Application Server
/// Arguments:
///    env.PORT - Server port
///    env.HOST - Server hostname
///

import { resolve } from "node:path";
import { createDevelopmentHandler } from "./dev-client";
import { createRoutes } from "./routes";

const development = process.argv.includes("--development");
const clientRoot = resolve(import.meta.dir, development ? "../web" : "../client");
const templateRoot = resolve(import.meta.dir, "ssr");
const developmentHandler = development ? createDevelopmentHandler(clientRoot, templateRoot) : null;
const routes: Bun.Serve.Routes<undefined, string> = createRoutes(templateRoot);
if (!development) {
   routes["/*"] = { dir: clientRoot };
}

const server = Bun.serve({
   port: Number(process.env.PORT ?? 3000),
   hostname: process.env.HOST ?? "0.0.0.0",

   routes,

   fetch(request) {
      if (developmentHandler) {
         return developmentHandler(request);
      }
      return new Response("Not found", { status: 404 });
   },

   error(error) {
      console.error(error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
   },
});

console.log(`Listening on ${server.url}`);
