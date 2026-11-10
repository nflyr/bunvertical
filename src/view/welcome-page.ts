import { renderTemplate } from "../server/render";

export function renderHomePage() {
  return renderTemplate("./welcome-page.html", {
    title: "Home",
    message: "Welcome to the application",
  });
}
