/*
Goal: Build a JSON object with all dynamic routes.
*/

import { listUsers, getUser } from "../components/users/user.rest";
import { renderHomePage } from "./pages/home.page";
import { renderAboutPage } from "./pages/about.page";

export function createRoutes() {
  return {
    // Static files
    "/favicon.ico": Bun.file("./web/static/favicon.ico"),
    "/robots.txt": Bun.file("./web/static/robots.txt"),

    // Static documentation
    "/docs": Bun.file("./web/docs/index.html"),
    "/docs/getting-started": Bun.file(
      "./web/docs/getting-started.html",
    ),

    // Static pages
    "/terms": Bun.file("./web/pages/terms.html"),
    "/privacy": Bun.file("./web/pages/privacy.html"),

    // Dynamically rendered pages
    "/": renderHomePage,
    "/about": renderAboutPage,

/** NOTES FRM LF

I don't like this part!

1. The createRoutes should ASK the "user.controller.rest.ts" to contribute to this main Routing.
(it may even be dynamic?... later!)

2. The "user.controller.rest.ts" looks LIKE a "Service", not a rest Controller!

**/


    // REST API
    "/api/users": {
      GET: listUsers,
    },

    "/api/users/:id": {
      GET: getUser,
    },

    // API fallback
    "/api/*": Response.json(
      { error: "API route not found" },
      { status: 404 },
    ),
  };
}
