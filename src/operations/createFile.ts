// src/operations/createFile.ts

import {
  type VirtualDisk,
  FAT_END_OF_CHAIN,
} from "../models/virtualDisk";
import type { DirectoryEntry } from "../models/virtualDisk";

export function createFile(
  disk: VirtualDisk,
  name: string,
  content: string
): DirectoryEntry {
  const existing = disk.rootDirectory.find(
    (e) => e.name === name && !e.isDeleted
  );
  if (existing) {
    throw new Error(`Ya existe un archivo llamado "${name}"`);
  }

  const clusterSizeBytes =
    disk.bootSector.bytesPerSector * disk.bootSector.sectorsPerCluster;
  const clustersNeeded = Math.max(1, Math.ceil(content.length / clusterSizeBytes));

  const freeClusterIds = findFreeClusters(disk, clustersNeeded);
  if (freeClusterIds.length < clustersNeeded) {
    throw new Error("No hay espacio suficiente en el disco");
  }

  allocateChain(disk, freeClusterIds);
  writeContent(disk, freeClusterIds, content, clusterSizeBytes);

  const entry: DirectoryEntry = {
    name,
    firstCluster: freeClusterIds[0],
    sizeInBytes: content.length,
    isDeleted: false,
    createdAt: Date.now(),
  };

  disk.rootDirectory.push(entry);
  return entry;
}

// Primer ajuste (first-fit): recorre el bitmap y toma los primeros clústeres
// libres que encuentra, sin forzar contigüidad. Esto es lo que produce
// fragmentación cuando el disco ya tiene huecos de operaciones anteriores.
export function findFreeClusters(disk: VirtualDisk, count: number): number[] {
  const found: number[] = [];
  for (let i = 2; i < disk.bitmap.length && found.length < count; i++) {
    if (!disk.bitmap[i]) {
      found.push(i);
    }
  }
  return found;
}

export function allocateChain(disk: VirtualDisk, clusterIds: number[]): void {
  for (let i = 0; i < clusterIds.length; i++) {
    const id = clusterIds[i];
    disk.bitmap[id] = true;
    const isLast = i === clusterIds.length - 1;
    disk.fat[id] = isLast ? FAT_END_OF_CHAIN : clusterIds[i + 1];
  }
}

export function writeContent(
  disk: VirtualDisk,
  clusterIds: number[],
  content: string,
  clusterSizeBytes: number
): void {
  for (let i = 0; i < clusterIds.length; i++) {
    const chunk = content.slice(
      i * clusterSizeBytes,
      (i + 1) * clusterSizeBytes
    );
    disk.clusters[clusterIds[i]].data = chunk;
  }
}