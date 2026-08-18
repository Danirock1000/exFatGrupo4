// src/operations/writeFile.ts

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";
import { FAT_FREE } from "../models/virtualDisk";
import { resolveDirectory } from "../utils/pathResolver";
import { getClusterChain } from "../utils/clusterChain";
import { findFreeClusters, allocateChain, writeContent } from "./createFile";

export function writeFile(
  disk: VirtualDisk,
  path: string[],
  name: string,
  newContent: string
): DirectoryEntry {
  const entries = resolveDirectory(disk, path);
  const entry = entries.find((e) => e.name === name && !e.isDirectory && !e.isDeleted);
  if (!entry) {
    throw new Error(`No se encontró un archivo llamado "${name}"`);
  }

  for (const clusterId of getClusterChain(disk, entry.firstCluster)) {
    disk.bitmap[clusterId] = false;
    disk.fat[clusterId] = FAT_FREE;
    disk.clusters[clusterId].data = "";
  }

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