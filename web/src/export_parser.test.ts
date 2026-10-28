import { describe, expect, it } from "vitest";
import { parseAccounts, parseInteractions, parseProfile, readUsername } from "./export_parser";
import {
  comment,
  follower,
  followingEntry,
  like,
  likedComment,
  personalInformation,
  storyLikeByUrl,
  storyReply,
} from "./test_exports";

describe("followers and following", () => {
  it("reads followers from their value, lowercased", () => {
    expect(parseAccounts([follower("Ana.Costa", 100), follower("leo_rx", 200)])).toEqual([
      { username: "ana.costa", at: 100 },
      { username: "leo_rx", at: 200 },
    ]);
  });

  it("reads following from the title when there is no value", () => {
    expect(parseAccounts({ relationships_following: [followingEntry("bia.foto", 300)] })).toEqual([
      { username: "bia.foto", at: 300 },
    ]);
  });

  it("falls back to the link when value and title are empty", () => {
    const entry = {
      title: "",
      string_list_data: [{ href: "https://www.instagram.com/_u/caio.sp/", timestamp: 5 }],
    };
    expect(parseAccounts([entry])).toEqual([{ username: "caio.sp", at: 5 }]);
  });

  it("keeps an account once when it is listed twice", () => {
    expect(parseAccounts([follower("ana", 1), follower("ana", 2)])).toHaveLength(1);
  });

  it("skips entries with no username", () => {
    expect(parseAccounts([{ title: "", string_list_data: [] }, 7, null])).toEqual([]);
  });
});

describe("interactions", () => {
  it("reads the owner of a like, not its brand partner", () => {
    expect(parseInteractions([like("nina", 10, "en", "brand.co")])).toEqual({
      items: 1,
      interactions: [{ username: "nina", at: 10 }],
    });
  });

  it("reads the owner of a like from a Portuguese export, by structure", () => {
    expect(parseInteractions([like("nina", 10, "pt", "marca")]).interactions).toEqual([
      { username: "nina", at: 10 },
    ]);
  });

  it("reads the owner of a story reply nested under its media, in both languages", () => {
    expect(
      parseInteractions([storyReply("teo", 20, "en"), storyReply("vivi", 21, "pt")]).interactions,
    ).toEqual([
      { username: "teo", at: 20 },
      { username: "vivi", at: 21 },
    ]);
  });

  it("reads the owner of a story like from its link", () => {
    expect(parseInteractions([storyLikeByUrl("duda", 30)]).interactions).toEqual([
      { username: "duda", at: 30 },
    ]);
  });

  it("reads the owner of a comment, in English and Portuguese", () => {
    expect(
      parseInteractions([comment("rafa", 40, "en"), comment("gabi", 41, "pt")]).interactions,
    ).toEqual([
      { username: "rafa", at: 40 },
      { username: "gabi", at: 41 },
    ]);
  });

  it("reads comments wrapped in an object", () => {
    expect(
      parseInteractions({ comments_reels_comments: [comment("rafa", 40)] }).interactions,
    ).toHaveLength(1);
  });

  it("reads the author of a liked comment", () => {
    expect(
      parseInteractions({ likes_comment_likes: [likedComment("lia", 50)] }).interactions,
    ).toEqual([{ username: "lia", at: 50 }]);
  });

  it("reads a file that holds a single item instead of a list", () => {
    expect(parseInteractions(like("otto", 60)).interactions).toEqual([
      { username: "otto", at: 60 },
    ]);
  });

  it("counts items whose owner cannot be read", () => {
    const noOwner = {
      timestamp: 1,
      media: [],
      label_values: [{ label: "Question", value: "?" }],
      fbid: "1",
    };
    expect(parseInteractions([noOwner, like("otto", 60)])).toEqual({
      items: 2,
      interactions: [{ username: "otto", at: 60 }],
    });
  });
});

describe("the profile", () => {
  it("reads the username, the name and the photo's path", () => {
    expect(
      parseProfile(personalInformation("conta.exemplo", "Conta Exemplo", "media/profile/1.jpg")),
    ).toEqual({
      username: "conta.exemplo",
      name: "Conta Exemplo",
      photo: "media/profile/1.jpg",
    });
  });

  it("reads a profile without a photo", () => {
    expect(parseProfile(personalInformation("conta", "Conta", null))).toEqual({
      username: "conta",
      name: "Conta",
      photo: null,
    });
  });

  it("returns nothing for a file it does not understand", () => {
    expect(parseProfile({ something: [] })).toBeNull();
  });
});

describe("a username", () => {
  it("is lowercased and loses its @ and spaces", () => {
    expect(readUsername(" @Ana.Costa ")).toBe("ana.costa");
  });

  it("is refused when it cannot be a username", () => {
    expect(readUsername("Name of someone")).toBeNull();
    expect(readUsername("")).toBeNull();
  });
});
