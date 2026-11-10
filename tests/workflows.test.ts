import { describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { buildBrowser } from "../scripts/lib/browser-build";
import { outputRelativePath } from "../scripts/lib/build-output";
import { renderTemplate } from "../src/server/lib/renderEngine";
import { assertPrerenderPages } from "../src/server/prerender";

const projectRoot = resolve(import.meta.dir, "..");
const bun = process.execPath;

async function runCommand(command: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) {
   const child = Bun.spawn({
      cmd: command,
      cwd,
      env,
      stdout: "pipe",
      stderr: "pipe",
   });
   const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
   return { stdout, stderr, exitCode };
}

async function runSuccessfully(command: string[], cwd: string): Promise<void> {
   const result = await runCommand(command, cwd);
   if (result.exitCode !== 0) {
      throw new Error(`${command.join(" ")} failed with ${result.exitCode}\n${result.stdout}\n${result.stderr}`);
   }
}

interface RunningServer {
   url: string;
   stop(): Promise<void>;
}

async function startServer(command: string[], cwd: string): Promise<RunningServer> {
   const child = Bun.spawn({
      cmd: command,
      cwd,
      env: { ...process.env, HOST: "127.0.0.1", PORT: "0" },
      stdout: "pipe",
      stderr: "pipe",
   });
   const reader = child.stdout.getReader();
   const timeout = setTimeout(() => child.kill(), 10_000);
   let output = "";

   try {
      while (true) {
         const { value, done } = await reader.read();
         if (done) {
            const stderr = await new Response(child.stderr).text();
            throw new Error(`Server did not start:\n${output}\n${stderr}`);
         }

         output += new TextDecoder().decode(value);
         const url = output.match(/Listening on (http:\/\/\S+)/)?.[1];
         if (url) {
            return {
               url,
               async stop() {
                  if (child.exitCode === null) {
                     child.kill();
                  }
                  await child.exited;
               },
            };
         }
      }
   } finally {
      clearTimeout(timeout);
      reader.releaseLock();
   }
}

function findReference(html: string, expression: RegExp): string {
   const reference = html.match(expression)?.[1];
   if (!reference) {
      throw new Error(`Missing browser asset reference matching ${expression}`);
   }
   return reference;
}

async function verifyClient(baseUrl: string, expectedStatus: string): Promise<void> {
   const response = await fetch(new URL("/", baseUrl));
   expect(response.status).toBe(200);
   const html = await response.text();

   const script = findReference(html, /<script\b[^>]*\bsrc="([^"]+)"/i);
   const stylesheet = findReference(html, /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/i);
   const icon = findReference(html, /<link\b[^>]*\brel="icon"[^>]*\bhref="([^"]+)"/i);
   const [scriptResponse, styleResponse, iconResponse] = await Promise.all([
      fetch(new URL(script, baseUrl)),
      fetch(new URL(stylesheet, baseUrl)),
      fetch(new URL(icon, baseUrl)),
   ]);

   expect(scriptResponse.status).toBe(200);
   expect(scriptResponse.headers.get("content-type")).toContain("javascript");
   expect(styleResponse.status).toBe(200);
   expect(styleResponse.headers.get("content-type")).toContain("css");
   expect(iconResponse.status).toBe(200);

   const status = { textContent: "" };
   runInNewContext(
      await scriptResponse.text(),
      {
         document: {
            querySelector: (selector: string) => (selector === "#client-status" ? status : null),
         },
      },
      { timeout: 1_000 },
   );
   expect(status.textContent).toBe(expectedStatus);
}

async function verifyServer(baseUrl: string): Promise<string> {
   expect((await fetch(new URL("/index.html", baseUrl))).status).toBe(200);
   expect((await fetch(new URL("/who.html", baseUrl))).status).toBe(200);
   expect((await fetch(new URL("/views/example.html", baseUrl))).status).toBe(200);
   expect((await fetch(new URL("/views/page%20with%20spaces.html", baseUrl))).status).toBe(200);
   expect((await fetch(new URL("/.hidden.html", baseUrl))).status).toBe(200);
   expect((await fetch(new URL("/views/example", baseUrl))).status).toBe(404);
   expect((await fetch(new URL("/index.ts", baseUrl))).status).toBe(404);
   expect((await fetch(new URL("/static/favicon.ico", baseUrl))).status).toBe(404);
   expect((await fetch(new URL("/views/example.html", baseUrl), { method: "HEAD" })).status).toBe(200);

   const api = await fetch(new URL("/api/example", baseUrl));
   expect(api.status).toBe(200);
   expect(await api.json()).toEqual({ message: "Hello from the server." });
   expect((await fetch(new URL("/api/missing", baseUrl))).status).toBe(404);

   const ssrUrl = new URL("/examples/ssr", baseUrl);
   ssrUrl.searchParams.set("name", '<script>alert("x")</script> & $& {{title}}');
   const ssr = await fetch(ssrUrl);
   expect(ssr.status).toBe(200);
   const html = await ssr.text();
   expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; $&amp; {{title}}");
   expect(html).not.toContain("<script>alert");

   const prerendered = await fetch(new URL("/examples/pre-rendered.html", baseUrl));
   expect(prerendered.status).toBe(200);
   return prerendered.text();
}

describe("Bun build and runtime", () => {
   test("discovers nested pages and only bundles referenced assets and PUBLIC_ values", async () => {
      const temporary = await mkdtemp(join(tmpdir(), "bunvertical-browser-"));
      const webRoot = join(temporary, "web");

      try {
         await mkdir(join(webRoot, "nested"), { recursive: true });
         await Promise.all([
            Bun.write(
               join(webRoot, "index.html"),
               '<!doctype html><link rel="icon" href="./icon.svg"><script type="module" src="./main.ts"></script>',
            ),
            Bun.write(join(webRoot, "nested", "page.html"), "<!doctype html><h1>Nested</h1>"),
            Bun.write(join(webRoot, ".hidden.html"), "<!doctype html><h1>Hidden</h1>"),
            Bun.write(join(webRoot, "main.ts"), "console.log(process.env.PUBLIC_BUNVERTICAL_TEST, process.env.PRIVATE_BUNVERTICAL_TEST);"),
            Bun.write(join(webRoot, "icon.svg"), '<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
            Bun.write(join(webRoot, "unused.svg"), '<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
         ]);
         const result = await buildBrowser(webRoot, false);
         const paths = result.outputs.map((output) => outputRelativePath(output.path));
         expect(paths).toContain("index.html");
         expect(paths).toContain("nested/page.html");
         expect(paths).toContain(".hidden.html");
         expect(paths.some((path) => path.startsWith("icon-") && path.endsWith(".svg"))).toBe(true);
         expect(paths.some((path) => path.includes("unused"))).toBe(false);
         expect(paths.some((path) => path.endsWith(".js.map"))).toBe(true);

         const probe = await runCommand(
            [
               bun,
               "--no-install",
               "-e",
               `import { buildBrowser } from ${JSON.stringify(join(projectRoot, "scripts", "lib", "browser-build.ts"))};
           const result = await buildBrowser(${JSON.stringify(webRoot)}, false);
           for (const output of result.outputs) {
             if (output.path.endsWith(".js")) console.log(await output.text());
           }`,
            ],
            projectRoot,
            {
               ...process.env,
               PUBLIC_BUNVERTICAL_TEST: "public-test-value",
               PRIVATE_BUNVERTICAL_TEST: "private-test-value",
            },
         );
         if (probe.exitCode !== 0) {
            throw new Error(`Browser environment probe failed:\n${probe.stderr}`);
         }
         expect(probe.stdout).toContain("public-test-value");
         expect(probe.stdout).not.toContain("private-test-value");
      } finally {
         await rm(temporary, { recursive: true, force: true });
      }
   });

   test("escapes template values and replaces missing values with ? or throw", async () => {
      const template = join(projectRoot, "tests", "resources", "template-1.html");
      const response = await renderTemplate(template, {
         title: "Example",
         message: "$&{{title}} <b>&",
      });
      const html = await response.text();
      expect(html).toContain("$&amp;{{title}} &lt;b&gt;&amp;");
      expect(html).toContain("<h1>?</h1>");
      await expect(renderTemplate(template, { title: "Example" }, true)).rejects.toThrow("Missing value for {{title_2}}");
      expect(() => assertPrerenderPages([{ path: "../outside.html", template: "example.html", values: {} }], [])).toThrow(
         "Invalid pre-rendered page path",
      );
      const page = { path: "example.html", template: "example.html", values: {} };
      expect(() => assertPrerenderPages([page, page], [])).toThrow("Duplicate pre-rendered page");
   });

   test("runs from source and an isolated build, and rejects real output collisions", async () => {
      const temporary = await mkdtemp(join(tmpdir(), "bunvertical-workflows-"));
      const project = join(temporary, "project");
      const deployment = join(temporary, "deployment");
      let development: RunningServer | undefined;
      let production: RunningServer | undefined;

      try {
         await mkdir(project, { recursive: true });
         await Promise.all([
            cp(join(projectRoot, "src"), join(project, "src"), { recursive: true }),
            cp(join(projectRoot, "scripts"), join(project, "scripts"), { recursive: true }),
            cp(join(projectRoot, "package.json"), join(project, "package.json")),
            cp(join(projectRoot, "tsconfig.json"), join(project, "tsconfig.json")),
         ]);
         await Promise.all([
            Bun.write(join(project, "src", "web", "views", "page with spaces.html"), "<!doctype html><h1>Page with spaces</h1>"),
            Bun.write(join(project, "src", "web", ".hidden.html"), "<!doctype html><h1>Hidden</h1>"),
         ]);

         await runSuccessfully([bun, "run", "build"], project);
         await runSuccessfully([bun, "run", "build"], project);
         await cp(join(project, "dist"), deployment, { recursive: true });

         development = await startServer([bun, "--hot", "src/server/index.ts", "--development"], project);
         production = await startServer([bun, "--no-install", "server/index.js"], deployment);

         await verifyClient(development.url, "Browser code is running.");
         await verifyClient(production.url, "Browser code is running.");
         const developmentPage = await verifyServer(development.url);
         const productionPage = await verifyServer(production.url);
         expect(developmentPage).toBe(productionPage);
         expect(productionPage).toContain("This page was generated during the build.");

         const clientSource = join(project, "src", "web", "index.ts");
         const clientCode = await Bun.file(clientSource).text();
         expect(clientCode).toContain("Browser code is running.");
         await Bun.write(clientSource, clientCode.replace("Browser code is running.", "Browser code changed."));
         await verifyClient(development.url, "Browser code changed.");
         await verifyClient(production.url, "Browser code is running.");

         const sourceTemplate = join(project, "src", "server", "ssr", "example.html");
         const template = await Bun.file(sourceTemplate).text();
         await Bun.write(sourceTemplate, template.replace("Back to the static page", "Changed development template"));
         const updatedDevelopmentPage = await fetch(new URL("/examples/pre-rendered.html", development.url));
         expect(await updatedDevelopmentPage.text()).toContain("Changed development template");
         expect(await (await fetch(new URL("/examples/pre-rendered.html", production.url))).text()).toBe(productionPage);

         const deployedTemplate = join(deployment, "server", "ssr", "example.html");
         await Bun.write(deployedTemplate, template.replace("Back to the static page", "Edited deployed template"));
         const updatedProductionSsr = await fetch(new URL("/examples/ssr", production.url));
         expect(await updatedProductionSsr.text()).toContain("Edited deployed template");
         expect(await (await fetch(new URL("/examples/pre-rendered.html", production.url))).text()).toBe(productionPage);

         await development.stop();
         development = undefined;
         await production.stop();
         production = undefined;

         const clientDirectory = join(project, "dist", "client");
         const faviconFiles = Array.from(new Bun.Glob("**/favicon*.ico").scanSync({ cwd: clientDirectory, absolute: true }));
         expect(faviconFiles.length).toBeGreaterThan(0);
         const indexSource = join(project, "src", "web", "index.html");
         const indexHtml = await Bun.file(indexSource).text();
         const iconTag = '<link rel="icon" href="./static/favicon.ico" />';
         expect(indexHtml).toContain(iconTag);
         await Bun.write(indexSource, indexHtml.replace(iconTag, ""));
         await Bun.write(join(project, "src", "web", "static", "unused.svg"), "<svg></svg>");

         await runSuccessfully([bun, "run", "build:browser"], project);
         for (const favicon of faviconFiles) {
            expect(await Bun.file(favicon).exists()).toBe(false);
         }
         expect(await Bun.file(join(clientDirectory, "examples", "pre-rendered.html")).exists()).toBe(false);
         expect(Array.from(new Bun.Glob("**/unused*").scanSync({ cwd: clientDirectory })).length).toBe(0);
         await runSuccessfully([bun, "run", "build:server"], project);

         const outputIndex = join(clientDirectory, "index.html");
         const outputPage = join(clientDirectory, "examples", "pre-rendered.html");
         const beforeIndex = await Bun.file(outputIndex).text();
         const beforePage = await Bun.file(outputPage).text();
         const collision = join(project, "src", "web", "examples", "pre-rendered.html");
         await mkdir(dirname(collision), { recursive: true });
         await Bun.write(collision, "<!doctype html><h1>Conflicting page</h1>");

         for (const script of ["build:browser", "build:server"]) {
            const result = await runCommand([bun, "run", script], project);
            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).toContain("pre-rendered.html");
            expect(result.stderr).toContain("conflicts");
         }
         expect(await Bun.file(outputIndex).text()).toBe(beforeIndex);
         expect(await Bun.file(outputPage).text()).toBe(beforePage);
      } finally {
         if (development) await development.stop();
         if (production) await production.stop();
         await rm(temporary, { recursive: true, force: true });
      }
   }, 60_000);
});
