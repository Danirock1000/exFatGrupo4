// src/diskService.ts

import { type VirtualDisk, formatVolume } from "./models/virtualDisk";
import { createFile } from "./operations/createFile";
import { deleteFile } from "./operations/deleteFile";
import { writeFile } from "./operations/writeFile";
import { saveDisk, loadDisk } from "./persistence/persistence";
import type { DirectoryEntry } from "./models/virtualDisk";

const DEFAULT_CLUSTER_COUNT = 32;

// Carga el disco guardado si existe; si no, formatea uno nuevo.
export async function loadOrInitDisk(): Promise<VirtualDisk> {
  const stored = await loadDisk();
  if (stored) return stored;

  const disk = formatVolume(DEFAULT_CLUSTER_COUNT);
  await saveDisk(disk);
  return disk;
}

// Envuelve createFile: ejecuta la operación pura y persiste el resultado.
export async function createFileAndSave(
  disk: VirtualDisk,
  name: string,
  content: string
): Promise<DirectoryEntry> {
  const entry = createFile(disk, name, content);
  await saveDisk(disk);
  return entry;
}

// Envuelve deleteFile: misma idea.
export async function deleteFileAndSave(
  disk: VirtualDisk,
  name: string
): Promise<void> {
  deleteFile(disk, name);
  await saveDisk(disk);
}

export async function writeFileAndSave(
  disk: VirtualDisk,
  name: string,
  content: string
): Promise<DirectoryEntry> {
  const entry = writeFile(disk, name, content);
  await saveDisk(disk);
  return entry;
}