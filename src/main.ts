// src/main.ts

import type { VirtualDisk, DirectoryEntry } from "./models/virtualDisk";
import {
  loadOrInitDisk,
  createFileAndSave,
  deleteFileAndSave,
  writeFileAndSave,
  createFolderAndSave,
  deleteFolderAndSave,
  reformatDiskAndSave,
  renameEntryAndSave,
} from "./diskService";
import { readFile } from "./operations/readFile";
import { getClusterChain } from "./utils/clusterChain";
import { listDirectory, collectAllFiles, collectTreeStats } from "./utils/pathResolver";
import { summarizeFragmentation } from "./utils/fragmentation";
import { exportDiskToFile, importDiskFromFile } from "./persistence/exportImport";
import { saveDisk } from "./persistence/persistence";

let disk: VirtualDisk;
let currentPath: string[] = [];
let pathHistory: string[][] = [];
let editingFileName: string | null = null;
let renamingFolderName: string | null = null;

const FILE_COLORS = [
  "#4C8DFF", "#F0997B", "#5DCAA5", "#EF9F27", "#ED93B1", "#AFA9EC",
];
const RESERVED_COLOR = "#3a3f4b";
const FREE_COLOR = "#1e3a2e";

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------

async function init() {
  disk = await loadOrInitDisk();
  setupTabs();
  render();

  document.getElementById("back-btn")!.addEventListener("click", handleBack);

  document.getElementById("open-create-folder-btn")!.addEventListener("click", openCreateFolderModal);
  document.getElementById("create-folder-cancel")!.addEventListener("click", closeCreateFolderModal);
  document.getElementById("create-folder-confirm")!.addEventListener("click", handleConfirmCreateFolder);

  document.getElementById("open-create-file-btn")!.addEventListener("click", openCreateFileModal);
  document.getElementById("create-file-cancel")!.addEventListener("click", closeCreateFileModal);
  document.getElementById("create-file-confirm")!.addEventListener("click", handleConfirmCreateFile);

  document.getElementById("rename-cancel")!.addEventListener("click", closeRenameModal);
  document.getElementById("rename-confirm")!.addEventListener("click", handleConfirmRename);

  document.getElementById("editor-cancel")!.addEventListener("click", closeEditor);
  document.getElementById("editor-save")!.addEventListener("click", handleSave);

  document.getElementById("export-btn")!.addEventListener("click", handleExport);
  document.getElementById("import-btn")!.addEventListener("click", () => {
    document.getElementById("import-input")!.click();
  });
  document.getElementById("import-input")!.addEventListener("change", handleImport);

  document.getElementById("capacity-input")!.addEventListener("input", updateCapacityPreview);
  document.getElementById("capacity-unit")!.addEventListener("change", updateCapacityPreview);
  document.getElementById("allocation-unit-select")!.addEventListener("change", updateCapacityPreview);
  updateCapacityPreview();

  document.getElementById("reformat-btn")!.addEventListener("click", handleReformat);
  document.getElementById("editor-delete")!.addEventListener("click", handleEditorDelete);
}

function setupTabs() {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
  const panels = document.querySelectorAll<HTMLDivElement>(".tab-panel");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`)!.classList.add("active");
    });
  });
}

// ---------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------

function navigateTo(path: string[]) {
  pathHistory.push(currentPath);
  currentPath = path;
  render();
}

function handleBack() {
  if (pathHistory.length === 0) return;
  currentPath = pathHistory.pop()!;
  render();
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ---------------------------------------------------------------------
// Modal: crear carpeta
// ---------------------------------------------------------------------

function openCreateFolderModal() {
  (document.getElementById("new-folder-name") as HTMLInputElement).value = "";
  document.getElementById("create-folder-error")!.textContent = "";
  document.getElementById("create-folder-overlay")!.classList.add("open");
}

function closeCreateFolderModal() {
  document.getElementById("create-folder-overlay")!.classList.remove("open");
}

async function handleConfirmCreateFolder() {
  const input = document.getElementById("new-folder-name") as HTMLInputElement;
  const errorEl = document.getElementById("create-folder-error")!;

  try {
    await createFolderAndSave(disk, currentPath, input.value);
    closeCreateFolderModal();
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  }
}

// ---------------------------------------------------------------------
// Modal: crear archivo
// ---------------------------------------------------------------------

function openCreateFileModal() {
  (document.getElementById("new-file-name") as HTMLInputElement).value = "";
  (document.getElementById("new-file-content") as HTMLTextAreaElement).value = "";
  document.getElementById("create-file-error")!.textContent = "";
  document.getElementById("create-file-overlay")!.classList.add("open");
}

function closeCreateFileModal() {
  document.getElementById("create-file-overlay")!.classList.remove("open");
}

async function handleConfirmCreateFile() {
  const nameInput = document.getElementById("new-file-name") as HTMLInputElement;
  const contentInput = document.getElementById("new-file-content") as HTMLTextAreaElement;
  const errorEl = document.getElementById("create-file-error")!;

  try {
    await createFileAndSave(disk, currentPath, nameInput.value, contentInput.value);
    closeCreateFileModal();
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  }
}

// ---------------------------------------------------------------------
// Modal: renombrar
// ---------------------------------------------------------------------

function openRenameModal(name: string) {
  renamingFolderName = name;
  (document.getElementById("rename-input") as HTMLInputElement).value = name;
  document.getElementById("rename-error")!.textContent = "";
  document.getElementById("rename-overlay")!.classList.add("open");
}

function closeRenameModal() {
  renamingFolderName = null;
  document.getElementById("rename-overlay")!.classList.remove("open");
}

async function handleConfirmRename() {
  if (!renamingFolderName) return;
  const input = document.getElementById("rename-input") as HTMLInputElement;
  const errorEl = document.getElementById("rename-error")!;

  try {
    await renameEntryAndSave(disk, currentPath, renamingFolderName, input.value);
    closeRenameModal();
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  }
}

// ---------------------------------------------------------------------
// Borrar archivo / carpeta
// ---------------------------------------------------------------------


async function handleDeleteFolder(name: string) {
  await deleteFolderAndSave(disk, currentPath, name);
  render();
}

// ---------------------------------------------------------------------
// Editor de archivo (.txt)
// ---------------------------------------------------------------------


function openEditor(name: string) {
  editingFileName = name;
  const content = readFile(disk, currentPath, name);

  (document.getElementById("editor-name") as HTMLInputElement).value = name;
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

  const nameInput = document.getElementById("editor-name") as HTMLInputElement;
  const newName = nameInput.value;
  const newContent = (document.getElementById("editor-content") as HTMLTextAreaElement).value;
  const errorEl = document.getElementById("editor-error")!;

  try {
    if (newName !== editingFileName) {
      await renameEntryAndSave(disk, currentPath, editingFileName, newName);
      editingFileName = newName;
    }
    await writeFileAndSave(disk, currentPath, editingFileName, newContent);
    closeEditor();
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  }
}

async function handleEditorDelete() {
  if (!editingFileName) return;

  const confirmed = confirm(`¿Borrar "${editingFileName}"? Esta acción no se puede deshacer.`);
  if (!confirmed) return;

  await deleteFileAndSave(disk, currentPath, editingFileName);
  closeEditor();
  render();
}

// ---------------------------------------------------------------------
// Respaldo (export / import)
// ---------------------------------------------------------------------

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
    pathHistory = [];
    await saveDisk(disk);
    render();
  } catch (err) {
    errorEl.textContent = (err as Error).message;
  } finally {
    input.value = "";
  }
}

// ---------------------------------------------------------------------
// Configuración de disco (formateo)
// ---------------------------------------------------------------------

function getClusterSizeBytes(): number {
  const select = document.getElementById("allocation-unit-select") as HTMLSelectElement;
  return Number(select.value);
}

function getCapacityBytes(): number {
  const capacityInput = document.getElementById("capacity-input") as HTMLInputElement;
  const unitSelect = document.getElementById("capacity-unit") as HTMLSelectElement;
  return Number(capacityInput.value) * Number(unitSelect.value);
}

function updateCapacityPreview() {
  const capacityBytes = getCapacityBytes();
  const clusterSizeBytes = getClusterSizeBytes();
  const clusterCount = Math.max(4, Math.floor(capacityBytes / clusterSizeBytes));

  document.getElementById("capacity-preview")!.textContent =
    `≈ ${clusterCount} clústeres de ${clusterSizeBytes} bytes cada uno`;
}

async function handleReformat() {
  const clusterSizeBytes = getClusterSizeBytes();
  const capacityBytes = getCapacityBytes();
  const clusterCount = Math.max(4, Math.floor(capacityBytes / clusterSizeBytes));
  const sectorsPerCluster = clusterSizeBytes / 512;

  const confirmed = confirm(
    `Esto borrará todos los archivos actuales y creará un volumen nuevo de ${clusterCount} clústeres (${clusterSizeBytes} bytes cada uno). ¿Continuar?`
  );
  if (!confirmed) return;

  disk = await reformatDiskAndSave(clusterCount, sectorsPerCluster);
  currentPath = [];
  pathHistory = [];
  render();
}

// ---------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------

function render() {
  renderVolumeInfo();
  renderUsage();
  renderTreeStats();
  renderFragmentationSummary();
  renderBreadcrumb();
  renderFileList();
  renderFolderTree();
  renderBitmap();
  renderFatChains();
}

function renderVolumeInfo() {
  const dl = document.getElementById("volume-info")!;
  dl.innerHTML = "";

  const bs = disk.bootSector;
  const fields: [string, string][] = [
    ["Etiqueta de volumen", bs.volumeLabel],
    ["Bytes por sector", String(bs.bytesPerSector)],
    ["Sectores por clúster", String(bs.sectorsPerCluster)],
    ["Bytes por clúster", String(bs.bytesPerSector * bs.sectorsPerCluster)],
    ["Cantidad total de clústeres", String(bs.clusterCount)],
    ["Offset de la región FAT", String(bs.fatOffset)],
    ["Longitud de la FAT", String(bs.fatLength)],
    ["Offset del cluster heap", String(bs.clusterHeapOffset)],
    ["Primer clúster del directorio raíz", String(bs.firstClusterOfRootDirectory)],
  ];

  for (const [label, value] of fields) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
}

function renderUsage() {
  const clusterSizeBytes = disk.bootSector.bytesPerSector * disk.bootSector.sectorsPerCluster;
  const totalClusters = disk.bitmap.length;
  const usedClusters = disk.bitmap.filter(Boolean).length;
  const percent = totalClusters === 0 ? 0 : Math.round((usedClusters / totalClusters) * 100);

  (document.getElementById("usage-bar-fill") as HTMLElement).style.width = `${percent}%`;

  const usedBytes = usedClusters * clusterSizeBytes;
  const totalBytes = totalClusters * clusterSizeBytes;

  document.getElementById("usage-text")!.textContent =
    `${formatBytes(usedBytes)} usados de ${formatBytes(totalBytes)} (${percent}%) — ` +
    `${usedClusters} de ${totalClusters} clústeres`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderTreeStats() {
  const dl = document.getElementById("tree-stats")!;
  dl.innerHTML = "";

  const stats = collectTreeStats(disk);

  const fields: [string, string][] = [
    ["Total de archivos", String(stats.totalFiles)],
    ["Total de carpetas", String(stats.totalFolders)],
    ["Profundidad máxima", `${stats.maxDepth} nivel${stats.maxDepth === 1 ? "" : "es"}`],
  ];

  for (const [label, value] of fields) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
}

function renderFragmentationSummary() {
  const dl = document.getElementById("fragmentation-summary")!;
  dl.innerHTML = "";

  const allFiles = collectAllFiles(disk);
  const summary = summarizeFragmentation(disk, allFiles);

  const fields: [string, string][] = [
    ["Total de archivos", String(summary.totalFiles)],
    ["Contiguos", String(summary.contiguousFiles)],
    ["Fragmentados", String(summary.fragmentedFiles)],
    ["Fragmentos promedio por archivo", summary.averageFragments.toFixed(2)],
    [
      "Archivo más fragmentado",
      summary.mostFragmented
        ? `${summary.mostFragmented.name} (${summary.mostFragmented.fragmentCount} fragmentos)`
        : "— (sin fragmentación)",
    ],
  ];

  for (const [label, value] of fields) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
}

function renderBreadcrumb() {
  const backBtn = document.getElementById("back-btn") as HTMLButtonElement;
  backBtn.disabled = pathHistory.length === 0;

  const el = document.getElementById("breadcrumb")!;
  el.innerHTML = "";

  const rootSpan = document.createElement("span");
  rootSpan.textContent = "Raíz";
  rootSpan.onclick = () => navigateTo([]);
  el.appendChild(rootSpan);

  currentPath.forEach((segment, i) => {
    const sep = document.createElement("i");
    sep.className = "ti ti-chevron-right breadcrumb-sep";
    el.appendChild(sep);

    const span = document.createElement("span");
    span.textContent = segment;
    span.onclick = () => navigateTo(currentPath.slice(0, i + 1));
    el.appendChild(span);
  });
}

function renderFileList() {
  const list = document.getElementById("file-list")!;
  list.innerHTML = "";

  const entries = listDirectory(disk, currentPath).filter((e) => !e.isDeleted);

  for (const entry of entries) {
    const li = document.createElement("li");

    const icon = document.createElement("i");
    icon.className = entry.isDirectory ? "ti ti-folder entry-icon" : "ti ti-file-text entry-icon";
    li.appendChild(icon);

    if (entry.isDirectory) {
      const nameBtn = document.createElement("span");
      nameBtn.textContent = entry.name;
      nameBtn.style.cursor = "pointer";
      nameBtn.onclick = () => navigateTo([...currentPath, entry.name]);
      li.appendChild(nameBtn);

      const renameBtn = document.createElement("button");
      renameBtn.innerHTML = `<i class="ti ti-edit"></i>`;
      renameBtn.title = "Renombrar";
      renameBtn.onclick = () => openRenameModal(entry.name);
      li.appendChild(renameBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = `<i class="ti ti-trash"></i>`;
      deleteBtn.title = "Borrar";
      deleteBtn.onclick = () => handleDeleteFolder(entry.name);
      li.appendChild(deleteBtn);
} else {
  const nameSpan = document.createElement("span");
  nameSpan.textContent = `${entry.name} — ${entry.sizeInBytes} bytes — clúster ${entry.firstCluster}`;
  nameSpan.style.cursor = "pointer";
  nameSpan.onclick = () => openEditor(entry.name);
  li.appendChild(nameSpan);
}

    list.appendChild(li);
  }
}

function renderFolderTree() {
  const container = document.getElementById("folder-tree")!;
  container.innerHTML = "";

  const rootFolders = listDirectory(disk, []).filter((e) => e.isDirectory && !e.isDeleted);

  if (rootFolders.length === 0) {
    container.innerHTML = `<div class="folder-tree-empty">Sin carpetas todavía.</div>`;
    return;
  }

  container.appendChild(buildFolderTreeNode(rootFolders, []));
}

function buildFolderTreeNode(folders: DirectoryEntry[], parentPath: string[]): HTMLElement {
  const ul = document.createElement("ul");
  ul.className = "folder-tree-list";

  for (const folder of folders) {
    const itemPath = [...parentPath, folder.name];
    const li = document.createElement("li");

    const row = document.createElement("div");
    row.className = "folder-tree-row";
    if (arraysEqual(itemPath, currentPath)) row.classList.add("active");

    const subfolders = listDirectory(disk, itemPath).filter((e) => e.isDirectory && !e.isDeleted);
    const hasChildren = subfolders.length > 0;
    let expanded = false;

    const toggle = document.createElement("span");
    toggle.className = "folder-tree-toggle";
    toggle.innerHTML = hasChildren ? `<i class="ti ti-chevron-right"></i>` : "";
    toggle.style.visibility = hasChildren ? "visible" : "hidden";

    const label = document.createElement("span");
    label.className = "folder-tree-label";
    label.textContent = folder.name;
    label.onclick = () => navigateTo(itemPath);

    row.appendChild(toggle);
    row.appendChild(label);
    li.appendChild(row);

    const childrenContainer = document.createElement("div");
    childrenContainer.style.display = "none";
    li.appendChild(childrenContainer);

    toggle.onclick = () => {
      expanded = !expanded;
      toggle.innerHTML = `<i class="ti ${expanded ? "ti-chevron-down" : "ti-chevron-right"}"></i>`;
      childrenContainer.style.display = expanded ? "block" : "none";

      if (expanded && childrenContainer.childElementCount === 0) {
        if (subfolders.length > 0) {
          childrenContainer.appendChild(buildFolderTreeNode(subfolders, itemPath));
        }
      }
    };

    ul.appendChild(li);
  }

  return ul;
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

  const allFiles = collectAllFiles(disk);
  const ownerMap = buildClusterOwnerMap(allFiles);

  disk.bitmap.forEach((occupied, id) => {
    const cell = document.createElement("div");
    cell.className = "bitmap-cell";

    if (id < 2) {
      cell.style.backgroundColor = RESERVED_COLOR;
      cell.title = `Clúster ${id}: reservado`;
    } else if (!occupied) {
      cell.style.backgroundColor = FREE_COLOR;
      cell.title = `Clúster ${id}: libre`;
    } else {
      const owner = ownerMap.get(id);
      cell.style.backgroundColor = owner ? colorForFile(allFiles, owner) : "#D85A30";
      cell.title = owner ? `Clúster ${id}: ${owner}` : `Clúster ${id}: ocupado (directorio)`;
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

  const allFiles = collectAllFiles(disk);

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