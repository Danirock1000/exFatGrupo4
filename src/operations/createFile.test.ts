// src/operations/createFile.test.ts

import { describe, it, expect } from "vitest";
import { formatVolume } from "../models/virtualDisk";
import { createFile } from "./createFile";

describe("createFile", () => {
  it("crea un archivo y lo agrega al directorio raíz", () => {
    const disk = formatVolume(32);
    const entry = createFile(disk, "notas.txt", "hola mundo");

    expect(entry.name).toBe("notas.txt");
    expect(entry.sizeInBytes).toBe(10);
    expect(disk.rootDirectory).toContain(entry);
  });

  it("marca el primer clúster asignado como ocupado en el bitmap", () => {
    const disk = formatVolume(32);
    const entry = createFile(disk, "notas.txt", "hola");

    expect(disk.bitmap[entry.firstCluster]).toBe(true);
  });

  it("lanza un error si el nombre ya existe", () => {
    const disk = formatVolume(32);
    createFile(disk, "notas.txt", "hola");

    expect(() => createFile(disk, "notas.txt", "otro contenido")).toThrow();
  });

  it("lanza un error si no hay espacio suficiente", () => {
    const disk = formatVolume(3); // solo 1 clúster libre (0 y 1 reservados)
    const clusterSize = disk.bootSector.bytesPerSector * disk.bootSector.sectorsPerCluster;
    const tooBig = "x".repeat(clusterSize * 5);

    expect(() => createFile(disk, "grande.txt", tooBig)).toThrow();
  });
});