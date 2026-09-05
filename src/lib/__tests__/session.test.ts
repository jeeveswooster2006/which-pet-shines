import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

const SECRET = "test-secret";

describe("admin session token", () => {
  it("round-trips a valid, unexpired token", () => {
    const token = createSessionToken(
      { adminId: "1", email: "admin@example.com", exp: Math.floor(Date.now() / 1000) + 3600 },
      SECRET
    );
    const payload = verifySessionToken(token, SECRET);
    expect(payload?.email).toBe("admin@example.com");
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(
      { adminId: "1", email: "admin@example.com", exp: Math.floor(Date.now() / 1000) - 10 },
      SECRET
    );
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken(
      { adminId: "1", email: "admin@example.com", exp: Math.floor(Date.now() / 1000) + 3600 },
      "other-secret"
    );
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken(
      { adminId: "1", email: "admin@example.com", exp: Math.floor(Date.now() / 1000) + 3600 },
      SECRET
    );
    const [json, sig] = token.split(".");
    const tampered = `${json}xx.${sig}`;
    expect(verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it("rejects garbage / missing tokens", () => {
    expect(verifySessionToken(undefined, SECRET)).toBeNull();
    expect(verifySessionToken(null, SECRET)).toBeNull();
    expect(verifySessionToken("not-a-token", SECRET)).toBeNull();
  });
});
