import { Environment, Utils } from "uu5g05";
// NOTE Following import is required to make uu5g04-based components work and integrate correctly with uu5g05.
// It is primarily intended for applications using uuEcc, uu5RichText, components that are dynamically loaded
// via uuAppLibraryRegistry or customizable uu5Strings (as all of those may contain uu5g04-based components).
import "uu5g04";

import Spa from "./core/spa.js";

// propagate app version into environment
Environment["appVersion"] = process.env.VERSION;

// consider app as progressive web app, but not on iOS (OIDC login doesn't work there)
if (!navigator.userAgent.match(/iPhone|iPad|iPod/)) {
  let link = document.createElement("link");
  link.rel = "manifest";
  link.href = "assets/manifest.json";
  document.head.appendChild(link);
}

function render(targetElementId) {
  Utils.Dom.render(<Spa />, document.getElementById(targetElementId));
}

export { render };
