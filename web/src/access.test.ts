import { describe, expect, it } from "vitest";
import { refusal } from "./access";

function requestWith(credentials?: string, scheme = "Basic"): Request {
  const headers = new Headers();
  if (credentials !== undefined) {
    const bytes = new TextEncoder().encode(credentials);
    headers.set("Authorization", `${scheme} ${btoa(String.fromCharCode(...bytes))}`);
  }
  return new Request("https://mutual-or-not.alangoncalves.com/", { headers });
}

describe("refusal", () => {
  it("lets in the right password, whatever the user", () => {
    expect(refusal(requestWith("alan:segredo"), "segredo")).toBeNull();
    expect(refusal(requestWith("mariana:segredo"), "segredo")).toBeNull();
    expect(refusal(requestWith(":segredo"), "segredo")).toBeNull();
  });

  it("lets in a password with accents and a colon", () => {
    expect(refusal(requestWith("alan:pão:de:açúcar"), "pão:de:açúcar")).toBeNull();
  });

  it("refuses a wrong password with 401 and the browser's password box", () => {
    const response = refusal(requestWith("alan:errada"), "segredo");
    expect(response?.status).toBe(401);
    expect(response?.headers.get("WWW-Authenticate")).toBe(
      'Basic realm="Mutual or Not", charset="UTF-8"',
    );
  });

  it("refuses a request with no credentials", () => {
    expect(refusal(requestWith(), "segredo")?.status).toBe(401);
  });

  it("refuses credentials that are not Basic or not base64", () => {
    expect(refusal(requestWith("alan:segredo", "Bearer"), "segredo")?.status).toBe(401);
    const garbled = new Request("https://mutual-or-not.alangoncalves.com/", {
      headers: { Authorization: "Basic %%%" },
    });
    expect(refusal(garbled, "segredo")?.status).toBe(401);
  });

  it("refuses everyone when no password is set", () => {
    expect(refusal(requestWith("alan:"), undefined)?.status).toBe(401);
    expect(refusal(requestWith("alan:"), "")?.status).toBe(401);
  });
});
