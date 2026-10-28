/**
 * Synthetic exports for the tests, in the shapes of a real one (docs/design.md, Reading the export).
 * Every username here is invented. `labels` switches the label texts to Portuguese guesses, so the
 * structural fallback is what reads them.
 */

import { strToU8, zipSync } from "fflate";

export type Labels = "en" | "pt";
const TEXT = {
  en: {
    owner: "Owner",
    username: "Username",
    name: "Name",
    media: "Media",
    hashtags: "Hashtags",
    partner: "Brand partner",
    mediaOwner: "Media Owner",
    comment: "Comment",
    time: "Time",
  },
  pt: {
    owner: "Proprietário",
    username: "Nome de usuário",
    name: "Nome",
    media: "Mídia",
    hashtags: "Hashtags",
    partner: "Parceiro de marca",
    mediaOwner: "Proprietário da mídia",
    comment: "Comentário",
    time: "Hora",
  },
};

export const follower = (username: string, at: number) => ({
  title: "",
  media_list_data: [],
  string_list_data: [
    { href: `https://www.instagram.com/${username}`, value: username, timestamp: at },
  ],
});

export const followingEntry = (username: string, at: number) => ({
  title: username,
  string_list_data: [{ href: `https://www.instagram.com/_u/${username}`, timestamp: at }],
});

const person = (labels: Labels, username: string) => ({
  dict: [
    { label: "URL", value: `https://www.instagram.com/${username}` },
    { label: TEXT[labels].name, value: `Name of ${username}` },
    { label: TEXT[labels].username, value: username },
  ],
  title: "",
});

/** The trio of titled blocks that names a post's or story's owner. */
const ownerTrio = (labels: Labels, owner: string, partner?: string) => [
  {
    dict: [{ dict: [{ label: TEXT[labels].name, value: "#tag" }], title: "" }],
    title: TEXT[labels].hashtags,
  },
  { dict: [person(labels, owner)], title: TEXT[labels].owner },
  { dict: partner ? [person(labels, partner)] : [], title: TEXT[labels].partner },
];

/** A like on a post or a story (`liked_posts.json`, `story_likes.json`). */
export const like = (owner: string, at: number, labels: Labels = "en", partner?: string) => ({
  timestamp: at,
  media: [],
  label_values: [
    {
      label: "URL",
      value: `https://www.instagram.com/reel/x${at}/`,
      href: `https://www.instagram.com/reel/x${at}/`,
    },
    { label: "Caption", value: "a caption" },
    ...ownerTrio(labels, owner, partner),
  ],
  fbid: String(at),
});

/** A reply to a story sticker (`quizzes.json`, `questions.json`), its owner nested under a media block. */
export const storyReply = (owner: string, at: number, labels: Labels = "en") => ({
  timestamp: at,
  media: [],
  label_values: [
    { label: "Question", value: "a question" },
    {
      dict: [
        {
          dict: [
            { label: "URL", value: "https://www.instagram.com/stories/x/1/" },
            ...ownerTrio(labels, owner),
          ],
          title: "",
        },
      ],
      title: TEXT[labels].media,
    },
  ],
  fbid: String(at),
});

/** A like on a story whose only owner mark is its URL. */
export const storyLikeByUrl = (owner: string, at: number) => ({
  timestamp: at,
  media: [],
  label_values: [
    { label: "URL", value: `https://www.instagram.com/stories/${owner}/${at}/`, href: "" },
  ],
  fbid: String(at),
});

/** A comment (`post_comments_1.json`, and the lists of `reels_comments.json` and `hype.json`). */
export const comment = (owner: string, at: number, labels: Labels = "en") => ({
  media_list_data: [{ uri: "" }],
  string_map_data: {
    [TEXT[labels].comment]: { value: "nice" },
    [TEXT[labels].mediaOwner]: { value: owner },
    [TEXT[labels].time]: { timestamp: at },
  },
});

/** A like on a comment (`liked_comments.json`). */
export const likedComment = (owner: string, at: number) => ({
  title: owner,
  string_list_data: [{ href: "https://www.instagram.com/reel/y/", value: "👍", timestamp: at }],
});

/** `personal_information.json`, in the older string_map_data shape. */
export const personalInformation = (username: string, name: string, photo: string | null) => ({
  profile_user: [
    {
      media_map_data: photo ? { "Profile Photo": { uri: photo, creation_timestamp: 1 } } : {},
      string_map_data: {
        Email: { value: "someone@example.com" },
        Name: { value: name },
        Username: { value: username },
      },
    },
  ],
});

export interface ExportContent {
  followers?: object[];
  following?: object[];
  likedPosts?: object[];
  storyLikes?: object[];
  quizzes?: object[];
  postComments?: object[];
  reelsComments?: object[];
  likedComments?: object[];
  storiesViewed?: object[];
  personal?: object;
  photo?: { path: string; bytes: Uint8Array };
}

/** The files of an export, by their path in the ZIP. */
export function exportFiles(content: ExportContent): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const put = (path: string, json: unknown) => {
    files[path] = strToU8(JSON.stringify(json));
  };
  const ff = "connections/followers_and_following";
  const activity = "your_instagram_activity";
  if (content.followers) put(`${ff}/followers_1.json`, content.followers);
  if (content.following)
    put(`${ff}/following.json`, { relationships_following: content.following });
  put(`${ff}/blocked_profiles.json`, []);
  if (content.likedPosts) put(`${activity}/likes/liked_posts.json`, content.likedPosts);
  if (content.likedComments)
    put(`${activity}/likes/liked_comments.json`, { likes_comment_likes: content.likedComments });
  if (content.storyLikes)
    put(`${activity}/story_interactions/story_likes.json`, content.storyLikes);
  if (content.quizzes) put(`${activity}/story_interactions/quizzes.json`, content.quizzes);
  if (content.storiesViewed)
    put(`${activity}/story_interactions/stories_viewed.json`, content.storiesViewed);
  if (content.postComments) put(`${activity}/comments/post_comments_1.json`, content.postComments);
  if (content.reelsComments)
    put(`${activity}/comments/reels_comments.json`, {
      comments_reels_comments: content.reelsComments,
    });
  if (content.personal)
    put("personal_information/personal_information/personal_information.json", content.personal);
  if (content.photo) files[content.photo.path] = content.photo.bytes;
  return files;
}

export function exportZip(content: ExportContent): Uint8Array {
  return zipSync(exportFiles(content));
}
