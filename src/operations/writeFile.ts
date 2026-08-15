// src/operations/writeFile.ts

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";
import { findFreeClusters, allocateChain, writeContent } from "./createFile";
import { freeChain } from "./deleteFile";

export function writeFile(
  disk: VirtualDisk,
  name: string,
  newContent: string
): DirectoryEntry {
  const entry = disk.rootDirectory.find(
    (e) => e.name === name && !e.isDeleted
  );
  if (!entry) {
    throw new Error(`No se encontró un archivo llamado "${name}"`);
  }

  // Estrategia simple: liberar la cadena vieja por completo y asignar una
  // nueva. Más fácil de razonar que intentar reutilizar clústeres parciales,
  // aunque genere más fragmentación con ediciones frecuentes — vale la pena
  // mencionar este trade-off en el informe.
  freeChain(disk, entry.firstCluster);

  const clusterSizeBytes =
    disk.bootSector.bytesPerSector * disk.bootSector.sectorsPerCluster;
  const clustersNeeded = Math.max(1, Math.ceil(newContent.length / clusterSizeBytes));

  const freeClusterIds = findFreeClusters(disk, clustersNeeded);
  if (freeClusterIds.length < clustersNeeded) {
    throw new Error("No hay espacio suficiente en el disco");
  }

  allocateChain(disk, freeClusterIds);
  writeContent(disk, freeClusterIds, newContent, clusterSizeBytes);

  entry.firstCluster = freeClusterIds[0];
  entry.sizeInBytes = newContent.length;

  return entry;
}