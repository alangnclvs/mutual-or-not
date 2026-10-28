import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { MAX_BYTES, readExport, type UploadedFile } from "./export_reader";
import {
  comment,
  exportFiles,
  exportZip,
  follower,
  followingEntry,
  like,
  personalInformation,
  storyLikeByUrl,
} from "./test_exports";

const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

function upload(name: string, bytes: Uint8Array, lastModified = noon(2026, 10, 1)): UploadedFile {
  return { name, size: bytes.length, lastModified, bytes: async () => bytes };
}

const base = {
  followers: [follower("ana", 1), follower("leo", 2)],
  following: [followingEntry("ana", 3), followingEntry("bia", 4), followingEntry("caio", 5)],
};

describe("reading a ZIP", () => {
  it("takes the owner and the date from the ZIP's name", async () => {
    const result = await readExport([
      upload("instagram-conta.exemplo-2026-10-28-Xwq10MeB.zip", exportZip(base)),
    ]);
    expect(result.ok && result.data.owner).toBe("conta.exemplo");
    expect(result.ok && result.data.exportDate).toBe("2026-10-28");
  });

  it("finds the name even with a prefix added by the browser", async () => {
    const result = await readExport([
      upload("8b3a383c-instagram-conta-2026-10-28-abc.zip", exportZip(base)),
    ]);
    expect(result.ok && result.data.owner).toBe("conta");
  });

  it("reads followers and following", async () => {
    const result = await readExport([upload("instagram-conta-2026-10-28-a.zip", exportZip(base))]);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.followers.map((a) => a.username)).toEqual(["ana", "leo"]);
    expect(result.data.following.map((a) => a.username)).toEqual(["ana", "bia", "caio"]);
  });

  it("merges followers split across files", async () => {
    const files = exportFiles(base);
    files["connections/followers_and_following/followers_2.json"] = strToU8(
      JSON.stringify([follower("zeca", 9)]),
    );
    const result = await readExport([upload("instagram-conta-2026-10-28-a.zip", zipSync(files))]);
    expect(result.ok && result.data.followers.map((a) => a.username)).toEqual([
      "ana",
      "leo",
      "zeca",
    ]);
  });

  it("collects the interactions of every activity file, and not the stories viewed", async () => {
    const zip = exportZip({
      ...base,
      likedPosts: [like("ana", 10), like("bia", 11)],
      storyLikes: [storyLikeByUrl("ana", 12)],
      postComments: [comment("bia", 13)],
      storiesViewed: [like("caio", 14)],
    });
    const result = await readExport([upload("instagram-conta-2026-10-28-a.zip", zip)]);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.activity).toBe("read");
    expect(result.data.interactions.map((a) => a.username).sort()).toEqual([
      "ana",
      "ana",
      "bia",
      "bia",
    ]);
  });

  it("marks the activity as absent when the export has none", async () => {
    const result = await readExport([upload("instagram-conta-2026-10-28-a.zip", exportZip(base))]);
    expect(result.ok && result.data.activity).toBe("none");
  });

  it("marks the activity as unreadable when no owner of any item can be read", async () => {
    const noOwner = {
      timestamp: 1,
      media: [],
      label_values: [{ label: "x", value: "y" }],
      fbid: "1",
    };
    const zip = exportZip({ ...base, likedPosts: [noOwner, noOwner] });
    const result = await readExport([upload("instagram-conta-2026-10-28-a.zip", zip)]);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.activity).toBe("unreadable");
    expect(result.data.interactions).toEqual([]);
  });

  it("reads the profile and its photo", async () => {
    const photo = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
    const zip = exportZip({
      ...base,
      personal: personalInformation("conta", "Conta Exemplo", "media/profile/202610/pic.jpg"),
      photo: { path: "media/profile/202610/pic.jpg", bytes: photo },
    });
    const result = await readExport([upload("instagram-conta-2026-10-28-a.zip", zip)]);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.profile?.name).toBe("Conta Exemplo");
    expect(result.data.profile?.photo?.type).toBe("image/jpeg");
    expect(Array.from(result.data.profile?.photo?.bytes ?? [])).toEqual(Array.from(photo));
  });

  it("takes the owner from the profile and the date from the file when the ZIP was renamed", async () => {
    const zip = exportZip({ ...base, personal: personalInformation("conta.b", "B", null) });
    const result = await readExport([upload("export.zip", zip, noon(2026, 9, 12))]);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.owner).toBe("conta.b");
    expect(result.data.exportDate).toBe("2026-09-12");
  });

  it("leaves the owner unknown when nothing names it", async () => {
    const result = await readExport([upload("export.zip", exportZip(base))]);
    expect(result.ok && result.data.owner).toBeNull();
  });
});

describe("reading loose JSON files", () => {
  it("reads the files by their names, the date from the newest of them", async () => {
    const files = exportFiles({ ...base, likedPosts: [like("ana", 10)] });
    const pick = (path: string, day: number) =>
      upload(path.split("/").pop() ?? path, files[path] ?? new Uint8Array(), noon(2026, 10, day));
    const result = await readExport([
      pick("connections/followers_and_following/followers_1.json", 20),
      pick("connections/followers_and_following/following.json", 21),
      pick("your_instagram_activity/likes/liked_posts.json", 19),
    ]);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.owner).toBeNull();
    expect(result.data.exportDate).toBe("2026-10-21");
    expect(result.data.following).toHaveLength(3);
    expect(result.data.interactions).toHaveLength(1);
  });
});

describe("refusing a file", () => {
  it("refuses an export in HTML", async () => {
    const zip = zipSync({
      "connections/followers_and_following/followers_1.html": strToU8("<html></html>"),
    });
    expect(await readExport([upload("instagram-conta-2026-10-28-a.zip", zip)])).toEqual({
      ok: false,
      error: "html",
    });
    expect(await readExport([upload("followers_1.html", strToU8("<html></html>"))])).toEqual({
      ok: false,
      error: "html",
    });
  });

  it("names what is missing", async () => {
    expect(await readExport([upload("a.zip", exportZip({ followers: base.followers }))])).toEqual({
      ok: false,
      error: "no_following",
    });
    expect(await readExport([upload("a.zip", exportZip({ following: base.following }))])).toEqual({
      ok: false,
      error: "no_followers",
    });
  });

  it("refuses a file that is neither a ZIP nor JSON", async () => {
    expect(await readExport([upload("photo.png", new Uint8Array([137, 80, 78, 71]))])).toEqual({
      ok: false,
      error: "unsupported",
    });
  });

  it("refuses a broken ZIP or a broken JSON", async () => {
    const broken = exportZip(base).slice(0, 60);
    expect(await readExport([upload("a.zip", broken)])).toEqual({ ok: false, error: "corrupt" });
    expect(await readExport([upload("following.json", strToU8("{ not json"))])).toEqual({
      ok: false,
      error: "corrupt",
    });
  });

  it("refuses a file too large for the phone without reading it", async () => {
    const huge: UploadedFile = {
      name: "a.zip",
      size: MAX_BYTES + 1,
      lastModified: 0,
      bytes: async () => {
        throw new Error("read");
      },
    };
    expect(await readExport([huge])).toEqual({ ok: false, error: "too_large" });
  });
});
