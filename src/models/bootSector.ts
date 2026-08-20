// src/models/bootSector.ts

export interface BootSector {
  bytesPerSector: number;
  sectorsPerCluster: number;
  fatOffset: number;
  fatLength: number;
  clusterHeapOffset: number;
  clusterCount: number;
  firstClusterOfRootDirectory: number;
  volumeLabel: string;
}

export function createBootSector(clusterCount: number, sectorsPerCluster: number): BootSector {
  return {
    bytesPerSector: 512,
    sectorsPerCluster,
    fatOffset: 0,
    fatLength: clusterCount,
    clusterHeapOffset: clusterCount,
    clusterCount,
    firstClusterOfRootDirectory: 2,
    volumeLabel: "SIMULATED_EXFAT",
  };
}