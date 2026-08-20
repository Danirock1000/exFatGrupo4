// src/utils/directoryIO.ts — nuevo

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";
import { FAT_FREE } from "../models/virtualDisk";
import { getClusterChain } from "./clusterChain";
import { findFreeClusters, allocateChain, writeContent } from "../operations/createFile";

// Lee y deserializa el listado de entradas guardado en una cadena de clústeres.
export function readDirectoryContent(disk: VirtualDisk, firstCluster: number): DirectoryEntry[] {
  if (firstCluster === -1) return [];
  const raw = getClusterChain(disk, firstCluster).map((id) => disk.clusters[id].data).join("");
  return raw ? (JSON.parse(raw) as DirectoryEntry[]) : [];
}

// Serializa y escribe un nuevo listado, liberando la cadena vieja y
// asignando una nueva (mismo patrón que writeFile con archivos normales).
export function writeDirectoryContent(
  disk: VirtualDisk,
  dirEntry: DirectoryEntry,
  entries: DirectoryEntry[]
): void {
  if (dirEntry.firstCluster !== -1) {
    for (const clusterId of getClusterChain(disk, dirEntry.firstCluster)) {
      disk.bitmap[clusterId] = false;
      disk.fat[clusterId] = FAT_FREE;
      disk.clusters[clusterId].data = "";
    }
  }

  const content = JSON.stringify(entries);
  const clusterSizeBytes = disk.bootSector.bytesPerSector * disk.bootSector.sectorsPerCluster;
  const clustersNeeded = Math.max(1, Math.ceil(content.length / clusterSizeBytes));

  const freeClusterIds = findFreeClusters(disk, clustersNeeded);
  if (freeClusterIds.length < clustersNeeded) {
    throw new Error("No hay espacio suficiente en el disco");
  }

  allocateChain(disk, freeClusterIds);
  writeContent(disk, freeClusterIds, content, clusterSizeBytes);

  dirEntry.firstCluster = freeClusterIds[0];
  dirEntry.sizeInBytes = content.length;
}