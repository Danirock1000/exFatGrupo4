// src/utils/fragmentation.ts

import type { VirtualDisk, DirectoryEntry } from "../models/virtualDisk";
import { getClusterChain } from "./clusterChain";

export interface FileFragmentationInfo {
  name: string;
  chainLength: number;
  fragmentCount: number; // cuántos tramos contiguos separados tiene la cadena
  isContiguous: boolean;
}

// Cuenta "fragmentos" como tramos de clústeres consecutivos dentro de la
// cadena. Una cadena [4,5,6] tiene 1 fragmento (contigua). Una cadena
// [4,5,9,10,11] tiene 2 fragmentos: [4,5] y [9,10,11].
export function analyzeFragmentation(disk: VirtualDisk, entry: DirectoryEntry): FileFragmentationInfo {
  const chain = getClusterChain(disk, entry.firstCluster);

  let fragmentCount = chain.length > 0 ? 1 : 0;
  for (let i = 1; i < chain.length; i++) {
    if (chain[i] !== chain[i - 1] + 1) {
      fragmentCount++;
    }
  }

  return {
    name: entry.name,
    chainLength: chain.length,
    fragmentCount,
    isContiguous: fragmentCount <= 1,
  };
}

export interface FragmentationSummary {
  totalFiles: number;
  contiguousFiles: number;
  fragmentedFiles: number;
  averageFragments: number;
  mostFragmented: FileFragmentationInfo | null;
}

export function summarizeFragmentation(disk: VirtualDisk, allFiles: DirectoryEntry[]): FragmentationSummary {
  const details = allFiles.map((entry) => analyzeFragmentation(disk, entry));

  const contiguousFiles = details.filter((d) => d.isContiguous).length;
  const fragmentedFiles = details.length - contiguousFiles;
  const averageFragments =
    details.length === 0
      ? 0
      : details.reduce((sum, d) => sum + d.fragmentCount, 0) / details.length;

  const mostFragmented = details.reduce<FileFragmentationInfo | null>((worst, d) => {
    if (!worst || d.fragmentCount > worst.fragmentCount) return d;
    return worst;
  }, null);

  return {
    totalFiles: details.length,
    contiguousFiles,
    fragmentedFiles,
    averageFragments,
    mostFragmented: mostFragmented && mostFragmented.fragmentCount > 1 ? mostFragmented : null,
  };
}