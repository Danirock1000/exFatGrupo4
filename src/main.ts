// src/main.ts

import type { VirtualDisk } from "./models/virtualDisk";
import {
  loadOrInitDisk,
  createFileAndSave,
  deleteFileAndSave,
  writeFileAndSave,
  createFolderAndSave,
  deleteFolderAndSave,
  reformatDiskAndSave,
} from "./diskService";
import { readFile } from "./operations/readFile";
import { getClusterChain } from "./utils/clusterChain";
import { resolveDirectory, collectAllFiles } from "./utils/pathResolver";
import { exportDiskToFile, importDiskFromFile } from "./persistence/exportImport";
import { saveDisk } from "./persistence/persistence";
import type { DirectoryEntry } from "./models/virtualDisk";

let disk: VirtualDisk;
let currentPath: string[] = [];
let editingFileName: string | null = null;

const FILE_COLORS = [
  "#378ADD", // azul
  "#D85A30", // coral
  "#639922", // verde
  "#BA7517", // ámbar
  "#993556", // rosa
  "#534AB7", // morado
];
const RESERVED_COLOR = "#888780";
const FREE_COLOR = "#5DCAA5";

async function init() {
  disk = await loadOrInitDisk();
  render();

  document.getElementById("create-form")!.addEventListener("submit", handleCreate);
  document.getElementById("create-folder-form")!.addEventListener("submit", handleCreateFolder);
  document.getElementById("editor-cancel")!.addEventListener("click", closeEditor);
  document.getElementById("editor-save")!.addEventListener("click", handleSave);

  document.getElementById("export-btn")!.addEventListener("click", handleExport);
  document.getElementById("import-btn")!.addEventListener("click", () => {
    document.getElementById("import-input")!.click();
  });
  document.getElementById("import-input")!.addEventListener("change", handleImport);

  document.getElementById("reformat-btn")!.addEventListener("click", handleReformat);
}

function navigateTo(path: string[]) {
  currentPath = path;
  render();
}

async function handleCreate(e: Event) {
  e.preventDefault();
  const nameInput = document.getElementById("file-name") as HTMLInputElement;
  const contentInput = document.getElementById("file-content") as HTMLTextAreaElement;
  const errorEl = document.getElementById("error-message")!;
  errorEl.textContent = "";

  try {
    await createFileAndSave(disk, currentPath, nameInput.value, contentInput.value);
    nameInput.value = "";
    contentInput.value = "";
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  }
}

async function handleCreateFolder(e: Event) {
  e.preventDefault();
  const input = document.getElementById("folder-name") as HTMLInputElement;
  const errorEl = document.getElementById("error-message")!;
  errorEl.textContent = "";

  try {
    await createFolderAndSave(disk, currentPath, input.value);
    input.value = "";
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  }
}

async function handleDeleteFile(name: string) {
  await deleteFileAndSave(disk, currentPath, name);
  render();
}

async function handleDeleteFolder(name: string) {
  await deleteFolderAndSave(disk, currentPath, name);
  render();
}

function openEditor(name: string) {
  editingFileName = name;
  const content = readFile(disk, currentPath, name);

  document.getElementById("editor-title")!.textContent = name;
  (document.getElementById("editor-content") as HTMLTextAreaElement).value = content;
  document.getElementById("editor-error")!.textContent = "";
  document.getElementById("editor-overlay")!.classList.add("open");
}

function closeEditor() {
  editingFileName = null;
  document.getElementById("editor-overlay")!.classList.remove("open");
}

async function handleSave() {
  if (!editingFileName) return;

  const newContent = (document.getElementById("editor-content") as HTMLTextAreaElement).value;
  const errorEl = document.getElementById("editor-error")!;

  try {
    await writeFileAndSave(disk, currentPath, editingFileName, newContent);
    closeEditor();
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  }
}

function handleExport() {
  exportDiskToFile(disk);
}

async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  const errorEl = document.getElementById("import-error")!;
  errorEl.textContent = "";

  if (!file) return;

  try {
    disk = await importDiskFromFile(file);
    currentPath = [];
    await saveDisk(disk);
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  } finally {
    input.value = "";
  }
}

async function handleReformat() {
  const input = document.getElementById("cluster-count") as HTMLInputElement;
  const clusterCount = parseInt(input.value, 10);

  if (isNaN(clusterCount) || clusterCount < 4) {
    alert("Ingresa una cantidad válida de clústeres (mínimo 4).");
    return;
  }

  const confirmed = confirm(
    `Esto borrará todos los archivos actuales y creará un volumen nuevo de ${clusterCount} clústeres. ¿Continuar?`
  );
  if (!confirmed) return;

  disk = await reformatDiskAndSave(clusterCount);
  currentPath = [];
  render();
}

function render() {
  renderBreadcrumb();
  renderFileList();
  renderBitmap();
  renderFatChains();
}

function renderBreadcrumb() {
  const el = document.getElementById("breadcrumb")!;
  el.innerHTML = "";

  const rootSpan = document.createElement("span");
  rootSpan.textContent = "raíz";
  rootSpan.onclick = () => navigateTo([]);
  el.appendChild(rootSpan);

  currentPath.forEach((segment, i) => {
    el.appendChild(document.createTextNode(" / "));
    const span = document.createElement("span");
    span.textContent = segment;
    span.onclick = () => navigateTo(currentPath.slice(0, i + 1));
    el.appendChild(span);
  });
}

function renderFileList() {
  const list = document.getElementById("file-list")!;
  list.innerHTML = "";

  const entries = resolveDirectory(disk, currentPath).filter((e) => !e.isDeleted);

  for (const entry of entries) {
    const li = document.createElement("li");

    const icon = document.createElement("span");
    icon.className = "entry-icon";
    icon.textContent = entry.isDirectory ? "📁" : "📄";
    li.appendChild(icon);

    if (entry.isDirectory) {
      const nameBtn = document.createElement("span");
      nameBtn.textContent = entry.name;
      nameBtn.style.cursor = "pointer";
      nameBtn.onclick = () => navigateTo([...currentPath, entry.name]);
      li.appendChild(nameBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Borrar";
      deleteBtn.onclick = () => handleDeleteFolder(entry.name);
      li.appendChild(deleteBtn);
    } else {
      const nameSpan = document.createElement("span");
      nameSpan.textContent = `${entry.name} — ${entry.sizeInBytes} bytes — clúster ${entry.firstCluster}`;
      li.appendChild(nameSpan);

      const editBtn = document.createElement("button");
      editBtn.textContent = "Editar";
      editBtn.onclick = () => openEditor(entry.name);
      li.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Borrar";
      deleteBtn.onclick = () => handleDeleteFile(entry.name);
      li.appendChild(deleteBtn);
    }

    list.appendChild(li);
  }
}

function buildClusterOwnerMap(allFiles: DirectoryEntry[]): Map<number, string> {
  const ownerMap = new Map<number, string>();
  for (const entry of allFiles) {
    for (const clusterId of getClusterChain(disk, entry.firstCluster)) {
      ownerMap.set(clusterId, entry.name);
    }
  }
  return ownerMap;
}

function colorForFile(allFiles: DirectoryEntry[], name: string): string {
  const index = allFiles.findIndex((e) => e.name === name);
  return FILE_COLORS[index % FILE_COLORS.length];
}

function renderBitmap() {
  const grid = document.getElementById("bitmap-grid")!;
  grid.innerHTML = "";

  const allFiles = collectAllFiles(disk.rootDirectory);
  const ownerMap = buildClusterOwnerMap(allFiles);

  disk.bitmap.forEach((occupied, id) => {
    const cell = document.createElement("div");
    cell.style.width = "24px";
    cell.style.height = "24px";

    if (id < 2) {
      cell.style.backgroundColor = RESERVED_COLOR;
      cell.title = `Clúster ${id}: reservado`;
    } else if (!occupied) {
      cell.style.backgroundColor = FREE_COLOR;
      cell.title = `Clúster ${id}: libre`;
    } else {
      const owner = ownerMap.get(id);
      cell.style.backgroundColor = owner ? colorForFile(allFiles, owner) : "#D85A30";
      cell.title = owner ? `Clúster ${id}: ${owner}` : `Clúster ${id}: ocupado`;
    }

    grid.appendChild(cell);
  });

  renderBitmapLegend(allFiles);
}

function renderBitmapLegend(allFiles: DirectoryEntry[]) {
  const legend = document.getElementById("bitmap-legend")!;
  legend.innerHTML = "";

  for (const entry of allFiles) {
    const item = document.createElement("div");
    item.className = "legend-item";

    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.backgroundColor = colorForFile(allFiles, entry.name);

    const label = document.createElement("span");
    label.textContent = entry.name;

    item.appendChild(swatch);
    item.appendChild(label);
    legend.appendChild(item);
  }
}

function renderFatChains() {
  const container = document.getElementById("fat-chains")!;
  container.innerHTML = "";

  const allFiles = collectAllFiles(disk.rootDirectory);

  if (allFiles.length === 0) {
    container.textContent = "Sin archivos todavía.";
    return;
  }

  for (const entry of allFiles) {
    const chain = getClusterChain(disk, entry.firstCluster);

    const row = document.createElement("div");
    row.className = "chain-row";

    const nameEl = document.createElement("span");
    nameEl.className = "chain-name";
    nameEl.textContent = entry.name;
    row.appendChild(nameEl);

    chain.forEach((clusterId, i) => {
      const badge = document.createElement("span");
      badge.className = "chain-badge";
      badge.textContent = String(clusterId);
      row.appendChild(badge);

      if (i < chain.length - 1) {
        const arrow = document.createElement("span");
        arrow.className = "chain-arrow";
        arrow.textContent = "→";
        row.appendChild(arrow);
      }
    });

    const eof = document.createElement("span");
    eof.className = "chain-arrow";
    eof.textContent = "→ EOF";
    row.appendChild(eof);

    container.appendChild(row);
  }
}

init();