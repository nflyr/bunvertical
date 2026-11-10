///
/// Component: Server
/// Objective: Build a JSON object with all dynamic routes.
/// Arguments:
///    templateRoot - Path to a folder with pages to render on the server.
///

import { join } from "node:path";
import { renderTemplate } from "./lib/renderEngine";

export function createRoutes(templateRoot: string) {
   return {
      "/api/example": {
         GET: () => Response.json({ message: "Hello from the server." }),
      },
      "/api/*": Response.json({ error: "API route not found" }, { status: 404 }),
      "/examples/ssr": {
         GET: (request: Request) => {
            const name = new URL(request.url).searchParams.get("name") ?? "Bun";
            return renderTemplate(join(templateRoot, "example.html"), {
               title: "Server-rendered example",
               message: `Hello, ${name}!`,
            });
         },
      },
   };
}
