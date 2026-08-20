// src/operations/deleteFolder.ts

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";
import { FAT_FREE } from "../models/virtualDisk";
import { listDirectory, saveDirectory } from "../utils/pathResolver";
import { readDirectoryContent } from "../utils/directoryIO";
import { getClusterChain } from "../utils/clusterChain";

export function deleteFolder(disk: VirtualDisk, path: string[], name: string): void {
  const entries = listDirectory(disk, path);
  const folder = entries.find((e) => e.name === name && e.isDirectory && !e.isDeleted);
  if (!folder) throw new Error(`No se encontró la carpeta "${name}"`);

  freeRecursively(disk, folder);
  folder.isDeleted = true;
  saveDirectory(disk, path, entries);
}

function freeRecursively(disk: VirtualDisk, folder: DirectoryEntry): void {
  for (const child of readDirectoryContent(disk, folder.firstCluster)) {
    if (child.isDeleted) continue;
    if (child.isDirectory) {
      freeRecursively(disk, child);
    } else {
      freeChain(disk, child.firstCluster);
    }
  }
  freeChain(disk, folder.firstCluster); // libera el propio clúster de listado de la carpeta
}

function freeChain(disk: VirtualDisk, firstCluster: number): void {
  for (const clusterId of getClusterChain(disk, firstCluster)) {
    disk.bitmap[clusterId] = false;
    disk.fat[clusterId] = FAT_FREE;
    disk.clusters[clusterId].data = "";
  }
}