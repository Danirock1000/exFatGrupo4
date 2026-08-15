// src/main.ts

import type { VirtualDisk } from "./models/virtualDisk";
import { loadOrInitDisk, createFileAndSave, deleteFileAndSave } from "./diskService";
import { readFile } from "./operations/readFile";
import { writeFileAndSave } from "./diskService";


let disk: VirtualDisk;

async function init() {
  disk = await loadOrInitDisk();
  render();

  const form = document.getElementById("create-form") as HTMLFormElement;
  form.addEventListener("submit", handleCreate);
}

async function handleCreate(e: Event) {
  e.preventDefault();
  const nameInput = document.getElementById("file-name") as HTMLInputElement;
  const contentInput = document.getElementById("file-content") as HTMLTextAreaElement;
  const errorEl = document.getElementById("error-message")!;
  errorEl.textContent = "";

  try {
    await createFileAndSave(disk, nameInput.value, contentInput.value);
    nameInput.value = "";
    contentInput.value = "";
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  }
}

async function handleDelete(name: string) {
  await deleteFileAndSave(disk, name);
  render();
}

function render() {
  renderFileList();
  renderBitmap();
}

function renderFileList() {
  const list = document.getElementById("file-list")!;
  list.innerHTML = "";

  const activeFiles = disk.rootDirectory.filter((e) => !e.isDeleted);

  for (const entry of activeFiles) {
    const li = document.createElement("li");
    li.textContent = `${entry.name} (${entry.sizeInBytes} bytes, clúster inicial: ${entry.firstCluster}) `;

    const viewBtn = document.createElement("button");
    viewBtn.textContent = "Ver contenido";
    viewBtn.onclick = () => handleView(entry.name);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Borrar";
    deleteBtn.onclick = () => handleDelete(entry.name);

    li.appendChild(viewBtn);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  }
}

function handleView(name: string) {
  const content = readFile(disk, name);
  const newContent = prompt(`Editar "${name}":`, content);

  if (newContent === null) return; // usuario canceló

  writeFileAndSave(disk, name, newContent).then(() => render());
}

function renderBitmap() {
  const grid = document.getElementById("bitmap-grid")!;
  grid.innerHTML = "";

  disk.bitmap.forEach((occupied, id) => {
    const cell = document.createElement("div");
    cell.style.width = "24px";
    cell.style.height = "24px";
    cell.style.backgroundColor = occupied ? "#D85A30" : "#5DCAA5";
    cell.title = `Clúster ${id}: ${occupied ? "ocupado" : "libre"}`;
    grid.appendChild(cell);
  });
}

init();