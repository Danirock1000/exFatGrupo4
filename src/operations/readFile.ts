// src/operations/readFile.ts

import type { VirtualDisk } from "../models/virtualDisk";
import { resolveDirectory } from "../utils/pathResolver";
import { getClusterChain } from "../utils/clusterChain";

export function readFile(disk: VirtualDisk, path: string[], name: string): string {
  const entries = resolveDirectory(disk, path);
  const entry = entries.find((e) => e.name === name && !e.isDirectory && !e.isDeleted);
  if (!entry) {
    throw new Error(`No se encontró un archivo llamado "${name}"`);
  }

  return getClusterChain(disk, entry.firstCluster)
    .map((id) => disk.clusters[id].data)
    .join("");
}