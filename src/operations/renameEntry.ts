// src/operations/renameEntry.ts

import type { VirtualDisk } from "../models/virtualDisk";
import { listDirectory, saveDirectory } from "../utils/pathResolver";

export function renameEntry(
  disk: VirtualDisk,
  path: string[],
  oldName: string,
  newName: string
): void {
  const entries = listDirectory(disk, path);
  const entry = entries.find((e) => e.name === oldName && !e.isDeleted);
  if (!entry) {
    throw new Error(`No se encontró "${oldName}"`);
  }

  const collision = entries.find(
    (e) => e.name === newName && !e.isDeleted && e !== entry
  );
  if (collision) {
    throw new Error(`Ya existe "${newName}" en esta carpeta`);
  }

  entry.name = newName;
  saveDirectory(disk, path, entries);
}