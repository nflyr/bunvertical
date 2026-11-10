/*
Goal: Entry point to the Server Application
*/

import { createRoutes } from "./routes";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  hostname: process.env.HOST ?? "0.0.0.0",

  routes: createRoutes(),

  fetch(request) {
    return new Response("Not found", { status: 404 });
  },

  error(error) {
    console.error(error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  },
});

console.log(`Listening on ${server.url}`);
