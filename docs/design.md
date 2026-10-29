# Design

What the app is. The reasons behind the choices that are hard to undo live in `docs/adr/`.

A small web app for Alan and Mariana that reads the export Instagram gives of an account ("Download your information") and shows who follows back, who does not, and who the owner barely interacts with. Everything runs in the browser: the export is read on the device and nothing leaves it (ADR 0001). No account and no backend, only a shared password checked before the app is served (ADR 0004). No ML or LLM. Visual identity shared with the games of the pack (Twenty One Clues, Ego Death Sudoku, Houdini Solitaire).

## Glossary

| Term | Meaning |
|---|---|
| **export** | The ZIP (or the loose JSON files) Instagram gives when the owner asks for their information, in JSON format. |
| **owner** | The Instagram account the export belongs to. Written as its username. |
| **username** | An account's Instagram handle, lowercased, without `@`. The key of every list. |
| **follower** | An account that follows the owner (`followers_*.json`). |
| **following** | An account the owner follows (`following.json`). |
| **mutual** | An account that is both a follower and a following. Shown as *Mútuos* / *Mutuals*. |
| **not following back** | A following that is not a follower. Shown as *Não seguem de volta* / *Don't follow you back*. |
| **you don't follow back** | A follower that is not a following. Shown as *Você não segue de volta* / *You don't follow back*. |
| **interaction** | One action of the owner on another account's content: a like on a post or a comment, a comment, a like on a story, a reply to a story sticker. Counted against the account that owns the content. |
| **window** | The 365 days that end on the export date. Only interactions inside it count. |
| **barely interact** | A mutual with at most 2 interactions in the window. Shown as *Quase não interage* / *Barely interact*. |
| **analysis** | What the app keeps of one export: the owner, the export date, the followers and following with their dates, the interaction counts and the profile. One per owner on the device. |
| **changes** | The difference between an analysis and the one before it for the same owner: *Deixaram de seguir* / *Unfollowed you* (followers no longer there) and *Passaram a seguir* / *Started following* (new followers). |
| **list** | One of the six: not following back, mutuals, barely interact, you don't follow back, unfollowed you, started following. |
| **sequence** | The animation that plays once after an upload, before the summary (Visual direction, Sequence). |
| **Cartaz** | The summary screen's layout: the not-following-back count as a poster, the other counts in a grid. |

## Lists

All computed from one export and, for the changes, the analysis before it.

| List | Who | Order | Right-hand column |
|---|---|---|---|
| Not following back | following − followers | by username | since when the owner follows them |
| Mutuals | following ∩ followers | by username | since when the owner follows them |
| Barely interact | mutuals with ≤ 2 interactions in the window | fewest interactions first, then by username | the count ("0 interações") |
| You don't follow back | followers − following | by username | since when they follow the owner |
| Unfollowed you | previous followers − followers | by username | since when they followed, from the previous analysis |
| Started following | followers − previous followers | by username | since when they follow the owner |

- Usernames compare lowercased.
- The threshold (2) and the window (365 days) are constants in `analysis.ts` (`LOW_MAX`, `WINDOW_DAYS`).
- When the export carries no activity files, barely interact is empty with a note that the activity was not in the export. When it carries activity files but no owner of any interaction could be read, the note says the activity of this export could not be read; the list never fills with every mutual by mistake.
- Changes exist from the second analysis of the same owner on. An export older than the stored analysis is refused with a notice; one of the same date replaces the analysis and keeps the stored changes.

## Reading the export

Checked against a real export (Alan's, 2026-10-28, English account). Files are found by name anywhere in the ZIP, so the folder layout can change.

| Data | Files | Where the username is |
|---|---|---|
| Followers | `followers_1.json`, `followers_2.json`, ... (a list) | `string_list_data[0].value`; else `title`; else the last segment of `string_list_data[0].href` |
| Following | `following.json` (`{ relationships_following: [...] }`) | `title`; else `string_list_data[0].value`; else the `href` (`instagram.com/_u/<username>`) |
| Likes | `liked_posts.json`, `story_likes.json` | the owner block (below) |
| Story replies | `polls.json`, `quizzes.json`, `questions.json`, `emoji_sliders.json`, `story_reaction_sticker_reactions.json`, `emoji_story_reactions.json` | the owner block |
| Liked comments | `liked_comments.json` (`{ likes_comment_likes: [...] }`) | `title` |
| Comments | `post_comments_*.json` (a list), `reels_comments.json`, `hype.json` (objects holding one list) | `string_map_data["Media Owner"].value` |
| Profile | `personal_information.json` | to be confirmed with an export that includes it (BACKLOG step 7) |

- The date of an entry is its `timestamp` (seconds); for comments, `string_map_data["Time"].timestamp`.
- **Owner block:** items of the newer files hold `label_values`. The owner of the content is a block with `title: "Owner"`, sometimes nested under a `"Media"` block, and inside it the entry `label: "Username"`. The labels follow the account's language, so the parser first looks for the known labels in English and Portuguese, then falls back to the structure, which held in every item of the real export: the owner block is the middle one of three sibling titled blocks (Hashtags, Owner, Brand partner), and its username is the third entry of its group (URL, Name, Username). Comments fall back to the second of their three keys (Comment, Media Owner, Time). A story URL (`instagram.com/stories/<username>/...`) names its owner too.
- Not counted: `stories_viewed.json` (views, mostly of accounts not followed), `countdowns.json` (no owner), and the other files of the connections folder (blocked, removed suggestions, follow requests, recently unfollowed).
- **Owner and date:** from the ZIP's name, `instagram-<username>-<YYYY-MM-DD>-<id>.zip`. Otherwise the owner comes from `personal_information.json` and the date from the picked file's modification time, which is when it was downloaded (loose files: the newest of them); when no owner can be found, the app asks once before the sequence. The ZIP entries' own dates are not read: fflate gives them only in its async mode, whose workers the CSP refuses.
- **Errors**, each a notice on home that says what to do: the file is not a ZIP or JSON; the export is in HTML (an `.html` where the JSON should be); no followers or no following file (the notice names the missing one); a file larger than 500 MB (the whole ZIP is read into the phone's memory; the steps ask for low-quality media).

## Screens

- **Home:** "MUTUAL / OR / NOT" as the hero title in both languages, OR in the accent; the tagline; SETTINGS at the top right. A folded "How to download the export" with the numbered steps and the shortcut of typing *your information* in Instagram's settings search. One row per stored analysis (owner and export date) opening its summary; then CHOOSE FILE, full width, ink, and a muted line saying ZIP or JSON and that nothing leaves the device. On a computer the file can also be dropped on the page.
- **Sequence:** after an upload only (Visual direction, Sequence). A tap skips it.
- **Summary (Cartaz):** the sticky bar (←INÍCIO, RESUMO). The profile card (photo, name, @username; only the @username when the export carries no profile). An eyebrow with the export date and the following count. The not-following-back count as a poster in the accent, its label under it, and SEE LIST. A 2 × 2 grid: mutuals, barely interact, you don't follow back, followers (followers is a figure, not a link). Then, from the second analysis, an eyebrow "Since the analysis of <date>" and a 2-cell grid: unfollowed you (accent) and started following. NEW EXPORT at the bottom.
- **List:** the sticky bar (←RESUMO, the list's name); the count and export date as an eyebrow; the list's name as the screen title; for barely interact, one line on the rule; a search field filtering by username as it is typed; one row per account: @username, the right-hand column of Lists, and ↗. A row opens `https://www.instagram.com/<username>/` in a new tab, which Android hands to the Instagram app.
- **Settings:** language (pt, en), theme (system, light, dark), DELETE DATA ON THIS DEVICE (a second tap within 2.5 s confirms, as Houdini's RESTART); at the bottom, small and muted, the app version.

## Visual direction

Same identity as the pack: the tokens, fonts, grain and motion of `../twenty-one-clues/docs/design.md` (Visual direction), copied into `web/src/style.css` as in the games and kept copied (Houdini's design says why).

| Token | Light | Dark |
|---|---|---|
| background | `#F5F2EA` | `#0D0D0D` |
| ink | `#0D0D0D` | `#F5F2EA` |
| muted | `#5F5A50` | `#A8A296` |
| accent (red) | `#C42A18` | `#FF4E38` |
| hairline | `#CDC7BA` | `#36332E` |

- Theme follows `prefers-color-scheme`; settings override it.
- Archivo Black for titles, numbers and buttons; Archivo 500 for text; JetBrains Mono for the app's voice (eyebrows, counts, dates). Served by the app itself (`@fontsource`), not by Google Fonts (ADR 0001).
- Newsprint grain on every screen. No border radius anywhere; the profile photo is square with a 1 px ink edge.
- Motion as in the games: a screen further in enters from the right and one closer to home from the left (28 px, 260 ms), the bars staying put; buttons sink 2 px while pressed; the title rises line by line when home opens. Nothing moves under `prefers-reduced-motion`.
- Touch targets at least 44 px.
- Reference prototype: https://claude.ai/artifact/25Ge3P2J4hYtkK5rZboqhX (picked by Alan on 2026-10-28: sequence B, summary B, icon 2).

### Sequence

"Lista corrida", picked by Alan on 2026-10-28 among three versions (the wall, the running list, one by one). Ink, cream and the dark theme's red in both themes, like the pack's openers: a poster, not a screen.

- On ink: a mono caption at the top left, ANALISANDO @owner / ANALYSING @owner; a red reading line across the screen at 58% of its height; under it the accounts the owner follows, up to 150 picked by a seed from the owner's name, one per row in mono: @username on the left and, on the right, SEGUE / YES or NÃO SEGUE / NO, which shows as the row crosses the line.
- The list runs up past the line, slowly and then faster (cubic ease-in, from 250 ms to 2.6 s); each account that does not follow back is struck by the risco in red as it crosses. Rows fade out above the line. An outlined red tally at the bottom left counts the struck, scaled to the real count.
- At 2.75 s the screen turns red and the not-following-back count slams in ink (scale 2.9 to 1, 160 ms), as wide as 74% of the screen, with its label in mono under it. At 3.31 s a diagonal wipe of the app's background, led by an accent band, opens the summary (340 ms). About 3.65 s in all.
- A tap skips to the summary. Under `prefers-reduced-motion` the summary opens at once. Every frame is a function of the time since the start, as in Houdini's opener.
- Processing takes under a second; the sequence is presentation, not a progress bar. The usernames shown are real and never leave the screen.

### Icon

Icon 2 of the prototype, picked by Alan on 2026-10-28: on cream, an ink equals sign (two bars) centred, struck by a red risco from bottom-left to top-right, which turns "=" (mutual) into "≠" (or not). Inside the maskable safe zone (40%). Source `web/public/icons/icon.svg`; every PWA size is drawn from it.

## Data

### Analysis (localStorage, one key per owner)

| Field | Content |
|---|---|
| `owner` | username |
| `exportDate` | `YYYY-MM-DD` |
| `followers` | `{ username, since }[]`, `since` in seconds |
| `following` | `{ username, since }[]` |
| `interactions` | `{ [username]: count }` inside the window, for the accounts the owner follows |
| `activity` | `none` (no activity files), `read` or `unreadable` |
| `profile` | `{ name, photo }` or null; `photo` a 128 px JPEG data URL |
| `changes` | `{ since: YYYY-MM-DD, unfollowed: { username, since }[], started: { username, since }[] }` or null |

About 100 KB for 5,000 accounts. Only usernames, dates, counts and the small photo.

### On the device (localStorage)

Language, theme, and the analyses. Every read and write is wrapped so the app still runs when storage is unavailable. DELETE DATA ON THIS DEVICE removes all of it.

## Infra

- **App:** TypeScript (strict) with Vite, no framework (ADR 0002). Biome, Vitest with happy-dom. PWA via `vite-plugin-pwa`: the app shell and the fonts are precached, so it opens offline. `fflate` reads the ZIP in the browser, unpacking only the files named in Reading the export. UI strings in a pt/en dictionary.
- **Privacy:** a Content Security Policy in `web/vercel.json` limits every request to the app's own origin (ADR 0001).
- **Access:** `web/middleware.ts` (Vercel Routing Middleware) asks for one password through the browser's own box (HTTP Basic) before serving any file but the manifest and the icons; the rule is `refusal` in `web/src/access.ts`, the password the Vercel environment variable `APP_PASSWORD`; with none set, everyone is refused (ADR 0004).
- **Hosting:** Vercel, project root `web/`, `main` to production, other branches to preview; `mutual-or-not.alangoncalves.com` through a CNAME at Squarespace (ADR 0003).
- **CI:** GitHub Actions on pull requests and on pushes to `main` and `develop`: Biome, Vitest, tsc and the build.
