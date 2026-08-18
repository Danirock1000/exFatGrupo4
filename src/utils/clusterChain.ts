// src/utils/clusterChain.ts

import type { VirtualDisk } from "../models/virtualDisk";
import { FAT_END_OF_CHAIN } from "../models/virtualDisk";

// Recorre la FAT desde firstCluster y devuelve la lista ordenada de
// clústeres que forman la cadena del archivo.
export function getClusterChain(disk: VirtualDisk, firstCluster: number): number[] {
  const chain: number[] = [];
  let current = firstCluster;

  while (current !== FAT_END_OF_CHAIN) {
    chain.push(current);
    current = disk.fat[current];
  }

  return chain;
}