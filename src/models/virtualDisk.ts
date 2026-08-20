// src/models/virtualDisk.ts — actualizado

import { type BootSector, createBootSector } from "./bootSector";

export const FAT_FREE = 0;
export const FAT_END_OF_CHAIN = 0xffffffff;

export interface Cluster {
  id: number;
  data: string;
}

export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  firstCluster: number;   // archivo: su contenido. carpeta: su listado de hijos serializado.
  sizeInBytes: number;
  isDeleted: boolean;
  createdAt: number;
  // "children" ya no existe: el listado vive en el cluster chain de firstCluster
}

export interface VirtualDisk {
  bootSector: BootSector;
  fat: number[];
  bitmap: boolean[];
  clusters: Cluster[];
  // "rootDirectory" ya no existe como array: bootSector.firstClusterOfRootDirectory
  // apunta a la cadena que contiene el listado raíz, igual que cualquier carpeta.
}

export function formatVolume(clusterCount: number): VirtualDisk {
  const bootSector = createBootSector(clusterCount);
  const fat = new Array(clusterCount).fill(FAT_FREE);
  const bitmap = new Array(clusterCount).fill(false);
  const clusters: Cluster[] = Array.from({ length: clusterCount }, (_, id) => ({ id, data: "" }));

  bitmap[0] = true;
  bitmap[1] = true;
  fat[0] = FAT_END_OF_CHAIN;
  fat[1] = FAT_END_OF_CHAIN;

  // el directorio raíz también necesita su propio clúster, con un listado vacío
  const rootClusterId = 2;
  bitmap[rootClusterId] = true;
  fat[rootClusterId] = FAT_END_OF_CHAIN;
  clusters[rootClusterId].data = JSON.stringify([]);
  bootSector.firstClusterOfRootDirectory = rootClusterId;

  return { bootSector, fat, bitmap, clusters };
}