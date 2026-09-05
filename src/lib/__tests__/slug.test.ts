import { describe, it, expect } from "vitest";
import { slugify, generateUniqueSlug, guessLastName } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Bella")).toBe("bella");
    expect(slugify("Sir Reginald Fluff III")).toBe("sir-reginald-fluff-iii");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(slugify("Mochi's Big Adventure!!")).toBe("mochis-big-adventure");
    expect(slugify("  Spacey   Cat  ")).toBe("spacey-cat");
  });

  it("falls back to 'pet' for input with no usable characters", () => {
    expect(slugify("!!!")).toBe("pet");
  });
});

describe("generateUniqueSlug", () => {
  it("uses the plain slug when available", async () => {
    const slug = await generateUniqueSlug({
      name: "Bella",
      exists: async () => false,
    });
    expect(slug).toBe("bella");
  });

  it("falls back to name-lastname on collision", async () => {
    const taken = new Set(["bella"]);
    const slug = await generateUniqueSlug({
      name: "Bella",
      ownerLastName: "Smith",
      exists: async (s) => taken.has(s),
    });
    expect(slug).toBe("bella-smith");
  });

  it("falls back to an incrementing number if the last-name variant is also taken", async () => {
    const taken = new Set(["bella", "bella-smith", "bella-2"]);
    const slug = await generateUniqueSlug({
      name: "Bella",
      ownerLastName: "Smith",
      exists: async (s) => taken.has(s),
    });
    expect(slug).toBe("bella-3");
  });

  it("increments with no last name available", async () => {
    const taken = new Set(["bella"]);
    const slug = await generateUniqueSlug({
      name: "Bella",
      exists: async (s) => taken.has(s),
    });
    expect(slug).toBe("bella-2");
  });
});

describe("guessLastName", () => {
  it("extracts the final word of a full name", () => {
    expect(guessLastName("Jane Smith")).toBe("Smith");
    expect(guessLastName("Mary Jane Watson")).toBe("Watson");
  });

  it("returns null for a single name or no name", () => {
    expect(guessLastName("Jane")).toBeNull();
    expect(guessLastName(undefined)).toBeNull();
    expect(guessLastName(null)).toBeNull();
  });
});
