///
/// Component: Library
/// Objective: Render templates into HTML documents.
///

/**
 * Render a document template into a document ready to serve.
 *
 * * Replacement markers use {{moustache}} syntax.
 *
 * ! This really need a big boost!!!
 *
 * @param templatePath Path to the template HTML
 * @param values Values to replace in the template
 * @param throwOnMissing IF true, throws error on missing values
 * @returns The document contents
 */
export async function renderTemplate(
   templatePath: string,
   values: Readonly<Record<string, string>> = {},
   throwOnMissing: boolean = false,
): Promise<Response> {
   const html = await Bun.file(templatePath).text();
   const rendered = html.replaceAll(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (placeholder, key: string) => {
      const value = values[key] ?? "?";
      if (values[key] === undefined) {
         console.error(`Missing value for ${placeholder} in ${templatePath}`);
         if (throwOnMissing) throw new Error(`Missing value for ${placeholder} in ${templatePath}`);
      }
      return escapeHtml(value);
   });

   return new Response(rendered, {
      headers: {
         "content-type": "text/html; charset=utf-8",
      },
   });
}

/**
 * Converts special characters into HTML entities.
 * @param value original string
 * @returns converted string
 */
function escapeHtml(value: string): string {
   return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
