// src/operations/deleteFile.ts

import { type VirtualDisk, FAT_FREE, FAT_END_OF_CHAIN } from "../models/virtualDisk";

export function deleteFile(disk: VirtualDisk, name: string): void {
  const entry = disk.rootDirectory.find(
    (e) => e.name === name && !e.isDeleted
  );
  if (!entry) {
    throw new Error(`No se encontró un archivo llamado "${name}"`);
  }

  freeChain(disk, entry.firstCluster);
  entry.isDeleted = true;
}

// Recorre la cadena en la FAT a partir del primer clúster, liberando
// cada uno en el bitmap y limpiando su entrada en la FAT.
export function freeChain(disk: VirtualDisk, firstCluster: number): void {
  let current = firstCluster;

  while (current !== FAT_END_OF_CHAIN) {
    const next = disk.fat[current];

    disk.bitmap[current] = false;
    disk.fat[current] = FAT_FREE;
    disk.clusters[current].data = "";

    current = next;
  }
}