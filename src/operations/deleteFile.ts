// src/operations/deleteFile.ts

import type { VirtualDisk } from "../models/virtualDisk";
import { FAT_FREE } from "../models/virtualDisk";
import { listDirectory, saveDirectory } from "../utils/pathResolver";
import { getClusterChain } from "../utils/clusterChain";

export function deleteFile(disk: VirtualDisk, path: string[], name: string): void {
  const entries = listDirectory(disk, path);
  const entry = entries.find((e) => e.name === name && !e.isDirectory && !e.isDeleted);
  if (!entry) {
    throw new Error(`No se encontró un archivo llamado "${name}"`);
  }

  for (const clusterId of getClusterChain(disk, entry.firstCluster)) {
    disk.bitmap[clusterId] = false;
    disk.fat[clusterId] = FAT_FREE;
    disk.clusters[clusterId].data = "";
  }

  entry.isDeleted = true;
  saveDirectory(disk, path, entries);
}