// src/operations/deleteFile.test.ts

import { describe, it, expect } from "vitest";
import { formatVolume } from "../models/virtualDisk";
import { createFile } from "./createFile";
import { deleteFile } from "./deleteFile";
import { listDirectory } from "../utils/pathResolver";

describe("deleteFile", () => {
  it("marca la entrada como borrada sin removerla del listado serializado", () => {
    const disk = formatVolume(32);
    createFile(disk, [], "notas.txt", "hola");
    deleteFile(disk, [], "notas.txt");

    const entries = listDirectory(disk, []);
    const entry = entries.find((e) => e.name === "notas.txt");

    expect(entry?.isDeleted).toBe(true);
    expect(entries.length).toBe(1);
  });

  it("libera los clústeres del archivo en el bitmap", () => {
    const disk = formatVolume(32);
    const entry = createFile(disk, [], "notas.txt", "hola");
    deleteFile(disk, [], "notas.txt");

    expect(disk.bitmap[entry.firstCluster]).toBe(false);
  });

  it("lanza un error si el archivo no existe", () => {
    const disk = formatVolume(32);
    expect(() => deleteFile(disk, [], "inexistente.txt")).toThrow();
  });

  it("permite crear un archivo con el mismo nombre después de borrar el anterior", () => {
    const disk = formatVolume(32);
    createFile(disk, [], "notas.txt", "viejo");
    deleteFile(disk, [], "notas.txt");

    expect(() => createFile(disk, [], "notas.txt", "nuevo")).not.toThrow();
  });
});