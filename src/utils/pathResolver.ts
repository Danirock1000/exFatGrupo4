// src/utils/pathResolver.ts — reescrito

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";
import { readDirectoryContent, writeDirectoryContent } from "./directoryIO";

// Lista las entradas visibles en una ruta (reemplaza a resolveDirectory).
export function listDirectory(disk: VirtualDisk, path: string[]): DirectoryEntry[] {
  if (path.length === 0) {
    return readDirectoryContent(disk, disk.bootSector.firstClusterOfRootDirectory);
  }

  let entries = readDirectoryContent(disk, disk.bootSector.firstClusterOfRootDirectory);
  let folder: DirectoryEntry | undefined;

  for (const segment of path) {
    folder = entries.find((e) => e.name === segment && e.isDirectory && !e.isDeleted);
    if (!folder) throw new Error(`No se encontró la carpeta "${segment}"`);
    entries = readDirectoryContent(disk, folder.firstCluster);
  }

  return entries;
}

// Guarda un listado modificado en la ruta dada, propagando el cambio de
// firstCluster hacia las carpetas padres (porque cada reescritura mueve
// la carpeta a una nueva cadena de clústeres).
export function saveDirectory(disk: VirtualDisk, path: string[], entries: DirectoryEntry[]): void {
  if (path.length === 0) {
    const rootPlaceholder: DirectoryEntry = {
      name: "",
      isDirectory: true,
      firstCluster: disk.bootSector.firstClusterOfRootDirectory,
      sizeInBytes: 0,
      isDeleted: false,
      createdAt: 0,
    };
    writeDirectoryContent(disk, rootPlaceholder, entries);
    disk.bootSector.firstClusterOfRootDirectory = rootPlaceholder.firstCluster;
    return;
  }

  const parentPath = path.slice(0, -1);
  const folderName = path[path.length - 1];
  const parentEntries = listDirectory(disk, parentPath);
  const folder = parentEntries.find((e) => e.name === folderName && e.isDirectory && !e.isDeleted);
  if (!folder) throw new Error(`No se encontró la carpeta "${folderName}"`);

  writeDirectoryContent(disk, folder, entries);
  saveDirectory(disk, parentPath, parentEntries);
}

// Recorre todo el árbol y devuelve los archivos (no carpetas) de cualquier nivel.
export function collectAllFiles(disk: VirtualDisk): DirectoryEntry[] {
  function walk(entries: DirectoryEntry[]): DirectoryEntry[] {
    const files: DirectoryEntry[] = [];
    for (const e of entries) {
      if (e.isDeleted) continue;
      if (e.isDirectory) {
        files.push(...walk(readDirectoryContent(disk, e.firstCluster)));
      } else {
        files.push(e);
      }
    }
    return files;
  }
  return walk(readDirectoryContent(disk, disk.bootSector.firstClusterOfRootDirectory));
}