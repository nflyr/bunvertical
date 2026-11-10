const status = document.querySelector<HTMLElement>("#client-status");

if (!status) {
  throw new Error("The client status element is missing");
}

status.textContent = "Browser code is running.";
