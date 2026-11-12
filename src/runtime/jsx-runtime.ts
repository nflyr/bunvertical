///
/// Component: jsx
/// Objective: Bare bones Runtime transpiler for JSX-REACT (Typescript 4.1+)
///

/**
 * Constant with the SVG namespace
 */
const SVGNS = "http://www.w3.org/2000/svg";

/**
 * Add a class name to the class list property of a element.
 * @param {node} elem The element to change
 * @param {string} clazz The class name to add
 * @returns this
 */
function addClass(elem: Element, clazz: string) {
   if (elem.classList && typeof clazz === "string") elem.classList.add(clazz);
}

/**
 * Recursivelly append child nodes to a element.
 */
const appendChild = (parent: Element, child: any) => {
   if (Array.isArray(child)) {
      child.forEach((nthChild) => appendChild(parent, nthChild));
   } else {
      parent.appendChild(child?.nodeType ? child : document.createTextNode(child ?? ""));
   }
};

/**
 * The "Vanilla REACT-JSX" function that handles single child.
 * @param {*} tag May be a function or some html element name (eg. 'div')
 * @param {*} props An object with name:value tuples where each one may be
 *                  an element property, or a event handler.
 * @param {*} key The element's data key value for lists;
 * @returns The created element.
 */
type JSXProps = Record<string, unknown> & {
   children?: unknown;
};

type Component = (props: JSXProps, key?: string | number) => Element;

export namespace JSX {
   export type Element = globalThis.Element;
   export interface IntrinsicElements {
      [elementName: string]: JSXProps;
   }
}

export const jsx = (tag: string | Component, props: JSXProps, key?: string | number): Element => {
   if (typeof tag === "function") return tag(props, key);
   let element: HTMLElement | SVGElement;
   if ("svg|use".indexOf(tag) > -1) {
      element = document.createElementNS(SVGNS, tag);
      element.setAttribute("xmlns", SVGNS);
   } else {
      element = document.createElement(tag);
   }
   const _props = props || {};
   const children = _props.children || undefined;
   delete _props.children;
   Object.entries(_props).forEach(([name, value]) => {
      if (name.startsWith("on") && name.toLowerCase() in window) {
         element.addEventListener(name.toLowerCase().substring(2), value as EventListener);
      } else {
         if (name === "hidden" || "checked|selected|readonly|disabled".indexOf(name) > -1) {
            Reflect.set(element, name, !!value);
         } else {
            if (!!value) {
               // name manipulations:
               //    className -> class (because class is a reserved word in javasript)
               //    data_* -> data-*   (extended attribute names SHOULD have "data-" prefix)
               element.setAttribute(name === "className" ? "class" : name.replace(/^data_/i, "data-"), String(value));
            }
         }
      }
   });
   if (children) appendChild(element, children);
   return element;
};

/**
 * The "Vanilla REACT-JSX" function that handles elements with multiple children.
 * ? Delegates to the main function (maybe later separate to handle multi-child)
 * @param {*} tag May be a function or some html element name (eg. 'div')
 * @param {*} props An object with name:value tuples where each one may be
 *                  an element property, or a event handler.
 * @param {*} key The element's data key value;
 * @returns The created element.
 */
export const jsxs = (tag: string | Component, props: JSXProps, key?: string | number): Element => {
   return jsx(tag, props, key);
};

/**
 * Export the Symbol to handle Fragments
 */
export const Fragment = Symbol("Fragment");
