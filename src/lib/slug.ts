// Slug generation for permanent pet pages (/pet/bella, /pet/bella-smith, ...).
// The uniqueness check is injected so this stays testable without a DB.

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "") || "pet";
}

export interface GenerateUniqueSlugOptions {
  name: string;
  ownerLastName?: string | null;
  exists: (slug: string) => Promise<boolean>;
}

/**
 * Tries, in order: "bella", "bella-smith" (if a last name is available),
 * then "bella-2", "bella-3", ... until an unused slug is found.
 */
export async function generateUniqueSlug({
  name,
  ownerLastName,
  exists,
}: GenerateUniqueSlugOptions): Promise<string> {
  const base = slugify(name);

  if (!(await exists(base))) return base;

  if (ownerLastName) {
    const withLastName = `${base}-${slugify(ownerLastName)}`;
    if (!(await exists(withLastName))) return withLastName;
  }

  let n = 2;
  // Reasonable upper bound so a bug elsewhere can't loop forever.
  while (n < 10000) {
    const candidate = `${base}-${n}`;
    if (!(await exists(candidate))) return candidate;
    n++;
  }
  throw new Error(`Could not generate a unique slug for "${name}"`);
}

/** Best-effort extraction of a "last name" from an owner's full name, if given. */
export function guessLastName(ownerName?: string | null): string | null {
  if (!ownerName) return null;
  const parts = ownerName.trim().split(/\s+/);
  if (parts.length < 2) return null;
  return parts[parts.length - 1];
}
