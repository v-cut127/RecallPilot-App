export interface StoredObject {
  key: string;
  size: number;
  contentType: string | null;
}

export interface StorageAdapter {
  put(key: string, data: Buffer, contentType?: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
