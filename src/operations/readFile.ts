// src/operations/readFile.ts

import type { VirtualDisk } from "../models/virtualDisk";
import { FAT_END_OF_CHAIN } from "../models/virtualDisk";

export function readFile(disk: VirtualDisk, name: string): string {
  const entry = disk.rootDirectory.find(
    (e) => e.name === name && !e.isDeleted
  );
  if (!entry) {
    throw new Error(`No se encontró un archivo llamado "${name}"`);
  }

  return readChain(disk, entry.firstCluster);
}

// Recorre la cadena de clústeres en la FAT y concatena el contenido en orden,
// sin asumir que los clústeres son contiguos.
function readChain(disk: VirtualDisk, firstCluster: number): string {
  let current = firstCluster;
  let content = "";

  while (current !== FAT_END_OF_CHAIN) {
    content += disk.clusters[current].data;
    current = disk.fat[current];
  }

  return content;
}