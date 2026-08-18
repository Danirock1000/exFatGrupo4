// src/persistence/exportImport.ts

import type { VirtualDisk } from "../models/virtualDisk";

export function exportDiskToFile(disk: VirtualDisk): void {
  const json = JSON.stringify(disk, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `exfat-disk-${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

export function importDiskFromFile(file: File): Promise<VirtualDisk> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const disk = JSON.parse(reader.result as string) as VirtualDisk;
        if (!isValidDisk(disk)) {
          reject(new Error("El archivo no tiene el formato esperado de un disco exFAT simulado"));
          return;
        }
        resolve(disk);
      } catch {
        reject(new Error("El archivo no es un JSON válido"));
      }
    };

    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsText(file);
  });
}

function isValidDisk(obj: unknown): obj is VirtualDisk {
  if (typeof obj !== "object" || obj === null) return false;
  const disk = obj as Record<string, unknown>;
  return (
    Array.isArray(disk.fat) &&
    Array.isArray(disk.bitmap) &&
    Array.isArray(disk.clusters) &&
    Array.isArray(disk.rootDirectory) &&
    typeof disk.bootSector === "object"
  );
}