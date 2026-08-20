// src/diskService.ts

import { type VirtualDisk, formatVolume } from "./models/virtualDisk";
import { createFile } from "./operations/createFile";
import { deleteFile } from "./operations/deleteFile";
import { writeFile } from "./operations/writeFile";
import { saveDisk, loadDisk } from "./persistence/persistence";
import { createFolder } from "./operations/createFolder";
import { deleteFolder } from "./operations/deleteFolder";
import { renameEntry } from "./operations/renameEntry";


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
// src/diskService.ts — firmas actualizadas (agregar "path: string[]" a cada una)

export async function createFileAndSave(disk: VirtualDisk, path: string[], name: string, content: string) {
  const entry = createFile(disk, path, name, content);
  await saveDisk(disk);
  return entry;
}

export async function createFolderAndSave(disk: VirtualDisk, path: string[], name: string) {
  const folder = createFolder(disk, path, name);
  await saveDisk(disk);
  return folder;
}

export async function deleteFileAndSave(disk: VirtualDisk, path: string[], name: string) {
  deleteFile(disk, path, name);
  await saveDisk(disk);
}

export async function deleteFolderAndSave(disk: VirtualDisk, path: string[], name: string) {
  deleteFolder(disk, path, name);
  await saveDisk(disk);
}

export async function writeFileAndSave(disk: VirtualDisk, path: string[], name: string, content: string) {
  const entry = writeFile(disk, path, name, content);
  await saveDisk(disk);
  return entry;
}

export async function reformatDiskAndSave(clusterCount: number, sectorsPerCluster: number): Promise<VirtualDisk> {
  const disk = formatVolume(clusterCount, sectorsPerCluster);
  await saveDisk(disk);
  return disk;
}


export async function renameEntryAndSave(
  disk: VirtualDisk,
  path: string[],
  oldName: string,
  newName: string
): Promise<void> {
  renameEntry(disk, path, oldName, newName);
  await saveDisk(disk);
}