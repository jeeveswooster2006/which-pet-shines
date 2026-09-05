import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface StoredPhoto {
  url: string;
}

export interface StorageProvider {
  savePhoto(file: File): Promise<StoredPhoto>;
}

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export function assertValidPhoto(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Photo must be a JPEG, PNG, WebP, or GIF image");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Photo must be smaller than 8MB");
  }
}

/**
 * Saves to /public/uploads. Simple and free, but on most serverless hosts
 * (including Vercel) the filesystem is ephemeral/read-only in production —
 * fine for local dev and single-instance/VM deploys, not for serverless.
 * Swap STORAGE_PROVIDER=vercel-blob for a real production deploy on Vercel.
 */
class LocalStorageProvider implements StorageProvider {
  async savePhoto(file: File): Promise<StoredPhoto> {
    assertValidPhoto(file);
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${extFor(file.type)}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), bytes);
    return { url: `/uploads/${filename}` };
  }
}

/** Production-ready option for Vercel deployments. Requires BLOB_READ_WRITE_TOKEN. */
class VercelBlobStorageProvider implements StorageProvider {
  async savePhoto(file: File): Promise<StoredPhoto> {
    assertValidPhoto(file);
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN is not set");
    }
    // Dynamically imported so @vercel/blob (an optional dependency) is only
    // required when this provider is actually selected.
    const { put } = await import("@vercel/blob");
    const filename = `pets/${randomUUID()}.${extFor(file.type)}`;
    const blob = await put(filename, file, { access: "public" });
    return { url: blob.url };
  }
}

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;
  provider =
    process.env.STORAGE_PROVIDER === "vercel-blob"
      ? new VercelBlobStorageProvider()
      : new LocalStorageProvider();
  return provider;
}
