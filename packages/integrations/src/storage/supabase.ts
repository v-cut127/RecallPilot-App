import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StorageAdapter, StoredObject } from "./types";

export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly client: SupabaseClient;
  private readonly bucket: string;
  private bucketReady: Promise<void> | null = null;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error("Supabase storage requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "imports";
  }

  private ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        const { data } = await this.client.storage.getBucket(this.bucket);
        if (!data) {
          const { error } = await this.client.storage.createBucket(this.bucket, { public: false });
          if (error && !/already exists/i.test(error.message)) throw error;
        }
      })();
    }
    return this.bucketReady;
  }

  async put(key: string, data: Buffer, contentType = "text/csv"): Promise<StoredObject> {
    await this.ensureBucket();
    const { error } = await this.client.storage.from(this.bucket).upload(key, data, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
    return { key, size: data.byteLength, contentType };
  }

  async get(key: string): Promise<Buffer> {
    await this.ensureBucket();
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) throw error ?? new Error(`Object not found: ${key}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    await this.ensureBucket();
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) throw error;
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureBucket();
    const { data, error } = await this.client.storage.from(this.bucket).list(key.split("/").slice(0, -1).join("/"), {
      search: key.split("/").at(-1),
      limit: 1,
    });
    if (error) return false;
    return Boolean(data && data.length > 0);
  }
}
