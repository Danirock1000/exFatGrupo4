// src/operations/readWrite.test.ts

import { describe, it, expect } from "vitest";
import { formatVolume } from "../models/virtualDisk";
import { createFile } from "./createFile";
import { readFile } from "./readFile";
import { writeFile } from "./writeFile";
import { deleteFile } from "./deleteFile";

describe("readFile", () => {
  it("devuelve el mismo contenido que se escribió al crear", () => {
    const disk = formatVolume(32);
    createFile(disk, "notas.txt", "contenido original");

    expect(readFile(disk, "notas.txt")).toBe("contenido original");
  });
});

describe("writeFile", () => {
  it("sobrescribe el contenido de un archivo existente", () => {
    const disk = formatVolume(32);
    createFile(disk, "notas.txt", "viejo");
    writeFile(disk, "notas.txt", "nuevo contenido");

    expect(readFile(disk, "notas.txt")).toBe("nuevo contenido");
  });

  it("reutiliza clústeres liberados por un archivo borrado (fragmentación)", () => {
    const disk = formatVolume(6); // clústeres 2-5 disponibles
    createFile(disk, "a.txt", "a");
    const b = createFile(disk, "b.txt", "b");
    createFile(disk, "c.txt", "c");

    deleteFile(disk, "b.txt");

    const clusterSize = disk.bootSector.bytesPerSector * disk.bootSector.sectorsPerCluster;
    const bigContent = "x".repeat(clusterSize + 1); // necesita 2 clústeres

    const entry = createFile(disk, "d.txt", bigContent);

    // el primer clúster de d.txt debería ser el que liberó b.txt
    expect(entry.firstCluster).toBe(b.firstCluster);
  });
});