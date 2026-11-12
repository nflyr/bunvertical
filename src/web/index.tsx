/** @jsxImportSource ../runtime */

///
/// Component: demo
/// Objective: Dynamic run browser code (DOM and JSX)
///

// render using direct DOM

const status: Element | null = document.querySelector<HTMLElement>("#dom-status");
if (status) status.textContent = "Browser code is running.";

// render using JSX
const jsxStatus: Element | null = document.querySelector<HTMLElement>("#jsx-status");
if (jsxStatus) jsxStatus.appendChild(<span>JSX can render</span>);
