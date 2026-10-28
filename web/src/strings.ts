/** Every UI text in both languages. */

import type { ListKey } from "./analysis";
import type { ReadError } from "./export_reader";
import type { Language, Theme } from "./types";

export type Notice = ReadError | "older" | "full" | "photo";

export interface Strings {
  tagline: string;
  settings: string;
  how: string;
  /** The steps to download an export; may hold `<b>`. */
  steps: string[];
  searchTip: string;
  chooseFile: string;
  reading: string;
  uploadNote: string;
  saved: string;
  home: string;
  summary: string;
  lists: Record<ListKey, string>;
  exportOf: (date: string) => string;
  sinceAnalysis: (date: string) => string;
  following: string;
  followers: string;
  seeList: string;
  newExport: string;
  search: string;
  since: (month: string) => string;
  interactions: (n: number) => string;
  emptyList: string;
  noMatch: string;
  lowRule: string;
  activityNone: string;
  activityUnreadable: string;
  notices: Record<Exclude<Notice, "older">, string>;
  older: (exportDate: string, owner: string, storedDate: string) => string;
  ownerQuestion: string;
  ownerLabel: string;
  ownerInvalid: string;
  continue: string;
  cancel: string;
  language: string;
  theme: string;
  themes: Record<Theme, string>;
  deleteData: string;
  confirmDelete: string;
  deleted: string;
  close: string;
  months: string[];
  analysing: (owner: string) => string;
  follows: string;
  doesNotFollow: string;
}

const pt: Strings = {
  tagline:
    "Quem segue de volta, quem não segue e com quem você quase não interage. Tudo no seu aparelho.",
  settings: "Ajustes",
  how: "Como baixar o export",
  steps: [
    "No Instagram: <b>perfil</b>, <b>menu</b>, <b>Central de Contas</b>.",
    "<b>Suas informações e permissões</b>, <b>Exportar suas informações</b>.",
    "<b>Criar exportação</b>, seu perfil, <b>Exportar para o dispositivo</b>.",
    "Marque <b>Seguidores e seguindo</b>, <b>Informações pessoais</b>, <b>Curtidas</b>, <b>Comentários</b> e <b>Interações com stories</b>.",
    "<b>Todo o período</b>, formato <b>JSON</b>, mídia <b>Baixa</b>.",
    "Quando ficar pronto, baixe o ZIP e escolha-o aqui.",
  ],
  searchTip:
    "Atalho: na busca das configurações do Instagram, digite <b>your information</b> (ou <b>suas informações</b>) e siga do passo 3.",
  chooseFile: "Escolher arquivo",
  reading: "Lendo",
  uploadNote: "ZIP ou JSON do Instagram · nada sai do aparelho",
  saved: "Análises salvas",
  home: "Início",
  summary: "Resumo",
  lists: {
    notFollowingBack: "Não seguem de volta",
    mutuals: "Mútuos",
    barelyInteract: "Quase não interage",
    youDontFollowBack: "Você não segue de volta",
    unfollowed: "Deixaram de seguir",
    started: "Passaram a seguir",
  },
  exportOf: (date) => `Export de ${date}`,
  sinceAnalysis: (date) => `Desde a análise de ${date}`,
  following: "Seguindo",
  followers: "Seguidores",
  seeList: "Ver lista",
  newExport: "Novo export",
  search: "Buscar",
  since: (month) => `desde ${month}`,
  interactions: (n) => (n === 1 ? "1 interação" : `${n} interações`),
  emptyList: "Ninguém aqui.",
  noMatch: "Ninguém com esse nome.",
  lowRule:
    "Mútuos com até 2 curtidas, comentários ou respostas a stories seus nos 12 meses antes do export.",
  activityNone:
    "A atividade não veio neste export. Para ver esta lista, marque Curtidas, Comentários e Interações com stories no próximo.",
  activityUnreadable:
    "Não consegui ler a atividade deste export, então esta lista ficou vazia em vez de errada.",
  notices: {
    unsupported: "Esse arquivo não é um export do Instagram. Escolha o ZIP ou os arquivos JSON.",
    html: "Esse export está em HTML. Peça de novo no Instagram com o formato JSON.",
    no_followers:
      "Faltou o arquivo de seguidores (followers_1.json). Marque Seguidores e seguindo no export.",
    no_following:
      "Faltou o arquivo de quem você segue (following.json). Marque Seguidores e seguindo no export.",
    too_large:
      "Esse arquivo passa de 500 MB. Peça o export com mídia em qualidade baixa e só as categorias do passo a passo.",
    corrupt: "Não consegui abrir esse arquivo. Baixe o ZIP de novo e tente outra vez.",
    full: "A análise não coube no aparelho, então não fica salva para a próxima vez.",
    photo: "A foto do perfil não pôde ser lida; o resto da análise está completo.",
  },
  older: (exportDate, owner, storedDate) =>
    `Esse export é de ${exportDate}, mais antigo que a análise salva de @${owner} (${storedDate}).`,
  ownerQuestion: "De qual conta é este export?",
  ownerLabel: "Usuário do Instagram",
  ownerInvalid: "Escreva o usuário como no Instagram: letras, números, ponto e _.",
  continue: "Continuar",
  cancel: "Cancelar",
  language: "Idioma",
  theme: "Tema",
  themes: { system: "Sistema", light: "Claro", dark: "Escuro" },
  deleteData: "Apagar dados do aparelho",
  confirmDelete: "Toque de novo para apagar",
  deleted: "Dados apagados.",
  close: "Fechar",
  months: ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"],
  analysing: (owner) => `Analisando @${owner}`,
  follows: "Segue",
  doesNotFollow: "Não segue",
};

const en: Strings = {
  tagline:
    "Who follows you back, who doesn’t, and who you barely interact with. All on your device.",
  settings: "Settings",
  how: "How to download the export",
  steps: [
    "On Instagram: <b>profile</b>, <b>menu</b>, <b>Accounts Center</b>.",
    "<b>Your information and permissions</b>, <b>Export your information</b>.",
    "<b>Create export</b>, your profile, <b>Export to device</b>.",
    "Tick <b>Followers and following</b>, <b>Personal information</b>, <b>Likes</b>, <b>Comments</b> and <b>Story interactions</b>.",
    "<b>All time</b>, format <b>JSON</b>, media <b>Low</b>.",
    "When it is ready, download the ZIP and choose it here.",
  ],
  searchTip:
    "Shortcut: in Instagram’s settings search, type <b>your information</b> and go on from step 3.",
  chooseFile: "Choose file",
  reading: "Reading",
  uploadNote: "Instagram ZIP or JSON · nothing leaves your device",
  saved: "Saved analyses",
  home: "Home",
  summary: "Summary",
  lists: {
    notFollowingBack: "Don’t follow you back",
    mutuals: "Mutuals",
    barelyInteract: "Barely interact",
    youDontFollowBack: "You don’t follow back",
    unfollowed: "Unfollowed you",
    started: "Started following",
  },
  exportOf: (date) => `Export of ${date}`,
  sinceAnalysis: (date) => `Since the analysis of ${date}`,
  following: "Following",
  followers: "Followers",
  seeList: "See list",
  newExport: "New export",
  search: "Search",
  since: (month) => `since ${month}`,
  interactions: (n) => (n === 1 ? "1 interaction" : `${n} interactions`),
  emptyList: "No one here.",
  noMatch: "No one by that name.",
  lowRule:
    "Mutuals with at most 2 of your likes, comments or story replies in the 12 months before the export.",
  activityNone:
    "This export has no activity. To see this list, tick Likes, Comments and Story interactions in the next one.",
  activityUnreadable:
    "The activity of this export could not be read, so this list is empty rather than wrong.",
  notices: {
    unsupported: "This file is not an Instagram export. Choose the ZIP or the JSON files.",
    html: "This export is in HTML. Ask Instagram for it again in JSON format.",
    no_followers:
      "The followers file (followers_1.json) is missing. Tick Followers and following in the export.",
    no_following:
      "The following file (following.json) is missing. Tick Followers and following in the export.",
    too_large:
      "This file is over 500 MB. Ask for the export with low-quality media and only the categories in the steps.",
    corrupt: "This file could not be opened. Download the ZIP again and retry.",
    full: "The analysis did not fit on this device, so it will not be kept for next time.",
    photo: "The profile photo could not be read; the rest of the analysis is complete.",
  },
  older: (exportDate, owner, storedDate) =>
    `This export is from ${exportDate}, older than the saved analysis of @${owner} (${storedDate}).`,
  ownerQuestion: "Which account is this export from?",
  ownerLabel: "Instagram username",
  ownerInvalid: "Write the username as on Instagram: letters, digits, dots and _.",
  continue: "Continue",
  cancel: "Cancel",
  language: "Language",
  theme: "Theme",
  themes: { system: "System", light: "Light", dark: "Dark" },
  deleteData: "Delete data on this device",
  confirmDelete: "Tap again to delete",
  deleted: "Data deleted.",
  close: "Close",
  months: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
  analysing: (owner) => `Analysing @${owner}`,
  follows: "Yes",
  doesNotFollow: "No",
};

export const STRINGS: Record<Language, Strings> = { pt, en };

/** `2026-10-28` as `28 OUT 2026`. */
export function formatDay(strings: Strings, date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d ?? ""} ${strings.months[(m ?? 1) - 1] ?? ""} ${y ?? ""}`;
}

/** Seconds as the month and year, `MAR 2025`. */
export function formatMonth(strings: Strings, seconds: number): string {
  const date = new Date(seconds * 1000);
  return `${strings.months[date.getUTCMonth()] ?? ""} ${date.getUTCFullYear()}`;
}
