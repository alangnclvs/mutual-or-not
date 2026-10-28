/** The page: wires the screens to the modules. */

import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/archivo/latin-500.css";
import "@fontsource/archivo/latin-600.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "./style.css";
import { version } from "../package.json";
import { STRINGS } from "./strings";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing #${id}`);
  return element as T;
};

const language = navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
const strings = STRINGS[language];

for (const element of document.querySelectorAll<HTMLElement>("[data-t]")) {
  const key = element.dataset.t as keyof typeof strings;
  const value = strings[key];
  if (typeof value === "string") element.textContent = value;
}
document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
$("version").textContent = `v${version}`;
$("home").hidden = false;
