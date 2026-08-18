// src/operations/createFolder.ts

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";
import { resolveDirectory } from "../utils/pathResolver";

export function createFolder(disk: VirtualDisk, path: string[], name: string): DirectoryEntry {
  const entries = resolveDirectory(disk, path);

  const existing = entries.find((e) => e.name === name && !e.isDeleted);
  if (existing) {
    throw new Error(`Ya existe "${name}" en esta carpeta`);
  }

  const folder: DirectoryEntry = {
    name,
    isDirectory: true,
    firstCluster: -1,
    sizeInBytes: 0,
    isDeleted: false,
    createdAt: Date.now(),
    children: [],
  };

  entries.push(folder);
  return folder;
}