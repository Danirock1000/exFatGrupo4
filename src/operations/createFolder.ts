// src/operations/createFolder.ts

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";
import { listDirectory, saveDirectory } from "../utils/pathResolver";
import { writeDirectoryContent } from "../utils/directoryIO";

export function createFolder(disk: VirtualDisk, path: string[], name: string): DirectoryEntry {
  const entries = listDirectory(disk, path);
  if (entries.find((e) => e.name === name && !e.isDeleted)) {
    throw new Error(`Ya existe "${name}" en esta carpeta`);
  }

  const folder: DirectoryEntry = {
    name, isDirectory: true, firstCluster: -1, sizeInBytes: 0, isDeleted: false, createdAt: Date.now(),
  };

  writeDirectoryContent(disk, folder, []); // reserva su propio clúster con listado vacío

  entries.push(folder);
  saveDirectory(disk, path, entries);
  return folder;
}