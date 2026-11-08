import type { StorageAdapter } from "./types";
import { LocalStorageAdapter } from "./local";
import { SupabaseStorageAdapter } from "./supabase";

let adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (adapter) return adapter;
  const driver = process.env.STORAGE_DRIVER ?? (process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local");
  adapter = driver === "supabase" ? new SupabaseStorageAdapter() : new LocalStorageAdapter();
  return adapter;
}

export function resetStorageAdapterForTests(): void {
  adapter = null;
}

export type { StorageAdapter, StoredObject } from "./types";
