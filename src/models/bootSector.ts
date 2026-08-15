// src/models/bootSector.ts

export interface BootSector {
  bytesPerSector: number;       // tamaño de sector (ej. 512)
  sectorsPerCluster: number;    // sectores por clúster (ej. 8)
  fatOffset: number;            // índice donde empieza la FAT (en "sectores" simulados)
  fatLength: number;            // cantidad de entradas en la FAT
  clusterHeapOffset: number;    // índice donde empieza el cluster heap
  clusterCount: number;         // cantidad total de clústeres
  firstClusterOfRootDirectory: number; // primer clúster del directorio raíz
  volumeLabel: string;
}

export function createBootSector(clusterCount: number): BootSector {
  return {
    bytesPerSector: 512,
    sectorsPerCluster: 8,
    fatOffset: 0,
    fatLength: clusterCount,
    clusterHeapOffset: clusterCount, // la FAT ocupa [0, clusterCount)
    clusterCount,
    firstClusterOfRootDirectory: 2, // clústeres 0 y 1 están reservados, como en exFAT real
    volumeLabel: "SIMULATED_EXFAT",
  };
}