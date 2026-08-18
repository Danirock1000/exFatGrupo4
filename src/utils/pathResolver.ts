// src/utils/pathResolver.ts

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";

// Devuelve el array de entradas que vive en la ruta dada.
// path es una lista de nombres de carpetas, ej. ["fotos", "2024"].
// Un path vacío devuelve el directorio raíz.
export function resolveDirectory(disk: VirtualDisk, path: string[]): DirectoryEntry[] {
  let current = disk.rootDirectory;

  for (const folderName of path) {
    const folder = current.find(
      (e) => e.name === folderName && e.isDirectory && !e.isDeleted
    );
    if (!folder) {
      throw new Error(`No se encontró la carpeta "${folderName}"`);
    }
    if (!folder.children) folder.children = [];
    current = folder.children;
  }

  return current;
}

// Recolecta todos los archivos (no carpetas) del árbol completo, sin
// importar en qué subcarpeta estén. Útil para el bitmap y la validación
// de espacio, que operan sobre el disco entero, no solo la carpeta actual.
export function collectAllFiles(entries: DirectoryEntry[]): DirectoryEntry[] {
  const files: DirectoryEntry[] = [];
  for (const e of entries) {
    if (e.isDeleted) continue;
    if (e.isDirectory) {
      files.push(...collectAllFiles(e.children ?? []));
    } else {
      files.push(e);
    }
  }
  return files;
}