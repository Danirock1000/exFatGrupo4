// src/operations/deleteFolder.ts

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";
import { FAT_FREE } from "../models/virtualDisk";
import { resolveDirectory, collectAllFiles } from "../utils/pathResolver";
import { getClusterChain } from "../utils/clusterChain";

export function deleteFolder(disk: VirtualDisk, path: string[], name: string): void {
  const entries = resolveDirectory(disk, path);
  const folder = entries.find((e) => e.name === name && e.isDirectory && !e.isDeleted);

  if (!folder) {
    throw new Error(`No se encontró la carpeta "${name}"`);
  }

  const filesInside = collectAllFiles(folder.children ?? []);
  for (const file of filesInside) {
    for (const clusterId of getClusterChain(disk, file.firstCluster)) {
      disk.bitmap[clusterId] = false;
      disk.fat[clusterId] = FAT_FREE;
      disk.clusters[clusterId].data = "";
    }
    file.isDeleted = true;
  }

  folder.isDeleted = true;
}