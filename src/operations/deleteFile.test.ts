import { resolveDirectory } from "../utils/pathResolver";

export function deleteFile(disk: VirtualDisk, path: string[], name: string): void {
  const entries = resolveDirectory(disk, path);
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
}