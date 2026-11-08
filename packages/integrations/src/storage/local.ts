import fs from "node:fs/promises";
import path from "node:path";
import { resolveFromRepoRoot } from "../env";
import type { StorageAdapter, StoredObject } from "./types";

export class LocalStorageAdapter implements StorageAdapter {
  private readonly root: string;

  constructor(root = process.env.STORAGE_LOCAL_DIR ?? ".storage") {
    this.root = resolveFromRepoRoot(root);
  }

  private resolveKey(key: string): string {
    const normalized = key.replace(/\\/g, "/");
    if (normalized.startsWith("/") || normalized.includes("..")) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    const resolved = path.resolve(this.root, normalized);
    if (!resolved.startsWith(this.root + path.sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return resolved;
  }

  async put(key: string, data: Buffer, contentType = "application/octet-stream"): Promise<StoredObject> {
    const target = this.resolveKey(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    return { key, size: data.byteLength, contentType };
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolveKey(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }
}
