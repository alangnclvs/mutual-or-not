/** Every UI text in both languages. */

import type { Language } from "./types";

export interface Strings {
  tagline: string;
  settings: string;
}

const pt: Strings = {
  tagline:
    "Quem segue de volta, quem não segue e com quem você quase não interage. Tudo no seu aparelho.",
  settings: "Ajustes",
};

const en: Strings = {
  tagline:
    "Who follows you back, who doesn’t, and who you barely interact with. All on your device.",
  settings: "Settings",
};

export const STRINGS: Record<Language, Strings> = { pt, en };
