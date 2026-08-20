// src/operations/createFile.test.ts — actualizado

import { describe, it, expect } from "vitest";
import { formatVolume } from "../models/virtualDisk";
import { createFile } from "./createFile";
import { listDirectory } from "../utils/pathResolver";

describe("createFile", () => {
  it("crea un archivo y lo agrega al directorio raíz", () => {
    const disk = formatVolume(32);
    const entry = createFile(disk, [], "notas.txt", "hola mundo");

    expect(entry.name).toBe("notas.txt");
    expect(entry.sizeInBytes).toBe(10);
    expect(listDirectory(disk, []).find((e) => e.name === "notas.txt")).toBeDefined();
  });

  it("marca el primer clúster asignado como ocupado en el bitmap", () => {
    const disk = formatVolume(32);
    const entry = createFile(disk, [], "notas.txt", "hola");

    expect(disk.bitmap[entry.firstCluster]).toBe(true);
  });

  it("lanza un error si el nombre ya existe", () => {
    const disk = formatVolume(32);
    createFile(disk, [], "notas.txt", "hola");

    expect(() => createFile(disk, [], "notas.txt", "otro contenido")).toThrow();
  });

  it("lanza un error si no hay espacio suficiente", () => {
    const disk = formatVolume(4); // clúster 2 lo toma el directorio raíz, solo queda el 3 libre
    const clusterSize = disk.bootSector.bytesPerSector * disk.bootSector.sectorsPerCluster;
    const tooBig = "x".repeat(clusterSize * 5);

    expect(() => createFile(disk, [], "grande.txt", tooBig)).toThrow();
  });
});