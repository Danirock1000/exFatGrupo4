// src/models/virtualDisk.ts

import { type BootSector, createBootSector } from "./bootSector";

export const FAT_FREE = 0;
export const FAT_END_OF_CHAIN = 0xffffffff;

export interface Cluster {
  id: number;
  data: string; // contenido simulado del clúster (texto plano por simplicidad)
}

export interface DirectoryEntry {
  name: string; 
  firstCluster: number;
  sizeInBytes: number;
  isDeleted: boolean;
  createdAt: number;
}

export interface VirtualDisk {
  bootSector: BootSector;
  fat: number[];              // fat[i] = FAT_FREE | FAT_END_OF_CHAIN | id del siguiente clúster
  bitmap: boolean[];          // bitmap[i] = true si el clúster i está ocupado
  clusters: Cluster[];
  rootDirectory: DirectoryEntry[];
}

export function formatVolume(clusterCount: number): VirtualDisk {
  const bootSector = createBootSector(clusterCount);

  const fat = new Array(clusterCount).fill(FAT_FREE);
  const bitmap = new Array(clusterCount).fill(false);
  const clusters: Cluster[] = Array.from({ length: clusterCount }, (_, id) => ({
    id,
    data: "",
  }));

  // clústeres 0 y 1 reservados (igual que en exFAT real)
  bitmap[0] = true;
  bitmap[1] = true;
  fat[0] = FAT_END_OF_CHAIN;
  fat[1] = FAT_END_OF_CHAIN;

  return {
    bootSector,
    fat,
    bitmap,
    clusters,
    rootDirectory: [],
  };
}