/* Calculateur AMDEC : logique applicative (100 % client, localStorage) */
const LS_KEY = "amdec-lignes-v1";
let lignes = [];
let triDecroissant = true;
let chartPareto = null;
let filtre = "";

const $ = (id) => document.getElementById(id);

function uid() { return "id-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6); }
function calcC(l) { return (Number(l.F) || 0) * (Number(l.G) || 0) * (Number(l.D) || 0); }

/* ---------- persistance ---------- */
function save() { localStorage.setItem(LS_KEY, JSON.stringify(lignes)); }
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { lignes = JSON.parse(raw); return; }
  } catch (e) { /* ignore */ }
  lignes = ETUDE_EXEMPLE.map((r) => ({ id: uid(), ...structuredClone(r) }));
  save();
}

/* ---------- onglets ---------- */
function initTabs() {
  const btns = [...document.querySelectorAll(".tab-btn")];
  btns.forEach((b, i) => {
    b.addEventListener("click", () => selectTab(b));
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const n = (i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length;
      btns[n].focus(); selectTab(btns[n]);
    });
  });
}
function selectTab(b) {
  document.querySelectorAll(".tab-btn").forEach((x) => { x.classList.remove("active"); x.setAttribute("aria-selected", "false"); });
  document.querySelectorAll(".tab-panel").forEach((x) => x.classList.remove("active"));
  b.classList.add("active");
  b.setAttribute("aria-selected", "true");
  $("tab-" + b.dataset.tab).classList.add("active");
  if (b.dataset.tab === "graphiques") renderCharts();
}

/* ---------- tableau calculateur ---------- */
function lignesVisibles() {
  let arr = lignes.map((l) => ({ ...l, C: calcC(l) }));
  if (filtre) {
    const f = filtre.toLowerCase();
    arr = arr.filter((l) => [l.composant, l.mode, l.cause, l.effet, l.origine, l.action].join(" ").toLowerCase().includes(f));
  }
  if (triDecroissant) arr.sort((a, b) => b.C - a.C);
  return arr;
}

function badgeClasse(c) {
  const s = classeCriticite(c);
  return `<span class="badge" style="color:${s.color};background:${s.bg}">${c} · ${s.label}</span>`;
}

function renderTable() {
  const arr = lignesVisibles();
  const tb = $("tbody");
  tb.innerHTML = "";
  if (arr.length === 0) {
    const tr = document.createElement("tr");
    tr.className = "empty-row";
    tr.innerHTML = `<td colspan="12"><div class="empty-box">
      <p>${lignes.length === 0 ? "Aucun mode de défaillance saisi pour le moment." : "Aucun mode ne correspond au filtre."}</p>
      ${lignes.length === 0 ? `<button class="btn primary" data-action="add-first">Ajouter le premier mode</button>
      <button class="btn" data-action="load-exemple">Charger l'étude exemple (18)</button>` : ""}
    </div></td>`;
    tb.appendChild(tr);
    const add = tb.querySelector('[data-action="add-first"]');
    if (add) add.addEventListener("click", () => openModal(null));
    const ex = tb.querySelector('[data-action="load-exemple"]');
    if (ex) ex.addEventListener("click", chargerExemple);
  }
  arr.forEach((l, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="num">${i + 1}</td>
      <td><strong>${esc(l.composant)}</strong></td>
      <td>${esc(l.mode)}</td>
      <td class="small">${esc(l.cause)}</td>
      <td class="small">${esc(l.effet)}</td>
      <td class="center"><span class="idx" title="${tip("F", l.F)}">F${l.F}</span></td>
      <td class="center"><span class="idx" title="${tip("G", l.G)}">G${l.G}</span></td>
      <td class="center"><span class="idx" title="${tip("D", l.D)}">D${l.D}</span></td>
      <td class="center"><strong>${l.C}</strong></td>
      <td>${badgeClasse(l.C)}</td>
      <td class="center"><span class="origine origine-${esc(l.origine)}">${esc(l.origine)}</span></td>
      <td class="row-actions">
        <button class="btn xs" data-edit="${l.id}" aria-label="Modifier : ${esc(l.mode)}">Modifier</button>
        <button class="btn xs danger" data-del="${l.id}" aria-label="Supprimer : ${esc(l.mode)}">Suppr.</button>
      </td>`;
    tb.appendChild(tr);
  });
  $("count").textContent = `${arr.length} mode(s), ${lignes.length} au total`;
  renderStats(arr);
  bindRowButtons();
}

function chargerExemple() {
  lignes = ETUDE_EXEMPLE.map((r) => ({ id: uid(), ...structuredClone(r) }));
  save(); renderAll(); toast("Étude exemple (18 modes) chargée.");
}

function tip(lettre, n) {
  const e = (ECHELLES[lettre] || []).find((x) => x.n === Number(n));
  return e ? `${e.label} : ${e.def}` : "";
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function bindRowButtons() {
  document.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    lignes = lignes.filter((l) => l.id !== b.dataset.del);
    save(); renderAll();
  }));
  document.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openModal(lignes.find((l) => l.id === b.dataset.edit))));
}

function renderStats(arr) {
  const cs = arr.map((l) => l.C);
  const max = cs.length ? Math.max(...cs) : 0;
  const moy = cs.length ? (cs.reduce((a, b) => a + b, 0) / cs.length) : 0;
  const nbCrit = cs.filter((c) => c > 30).length;
  $("stat-total").textContent = lignes.length;
  $("stat-max").textContent = max;
  $("stat-moy").textContent = moy.toFixed(1);
  $("stat-crit").textContent = nbCrit;
  $("top3").innerHTML = arr.slice(0, 3).map((l, i) =>
    `<div class="top-item"><span class="rank">#${i + 1}</span> <strong>${esc(l.mode)}</strong> <span class="muted">(${esc(l.composant)}, C=${l.C})</span></div>`).join("") || `<p class="muted">Aucune donnée.</p>`;
}

/* ---------- formulaire modal ---------- */
let editingId = null;
function openModal(ligne) {
  editingId = ligne ? ligne.id : null;
  $("m-title").textContent = ligne ? "Modifier le mode de défaillance" : "Ajouter un mode de défaillance";
  $("f-composant").value = ligne?.composant || "";
  $("f-mode").value = ligne?.mode || "";
  $("f-cause").value = ligne?.cause || "";
  $("f-effet").value = ligne?.effet || "";
  $("f-F").value = ligne?.F ?? 3;
  $("f-G").value = ligne?.G ?? 3;
  $("f-D").value = ligne?.D ?? 2;
  $("f-origine").value = ligne?.origine || "observé";
  $("f-action").value = ligne?.action || "";
  updateModalC();
  $("modal").classList.add("open");
  $("f-composant").focus();
}
function closeModal() { $("modal").classList.remove("open"); }
function updateModalC() {
  const c = Number($("f-F").value) * Number($("f-G").value) * Number($("f-D").value);
  $("modal-c").innerHTML = `Criticité calculée : <strong>${c}</strong> ${badgeClasse(c)}`;
}
function submitModal() {
  const obj = {
    composant: $("f-composant").value.trim() || "Sans composant",
    mode: $("f-mode").value.trim() || "Mode non nommé",
    cause: $("f-cause").value.trim(),
    effet: $("f-effet").value.trim(),
    F: Number($("f-F").value), G: Number($("f-G").value), D: Number($("f-D").value),
    origine: $("f-origine").value, action: $("f-action").value.trim()
  };
  if (editingId) {
    const i = lignes.findIndex((l) => l.id === editingId);
    if (i >= 0) lignes[i] = { id: editingId, ...obj };
  } else lignes.push({ id: uid(), ...obj });
  save(); closeModal(); renderAll();
}

/* ---------- graphiques ---------- */
function renderCharts() {
  const arr = lignesVisibles();
  renderPareto(arr);
  renderMatrice(arr);
}

function renderPareto(arr) {
  const ctx = $("paretoChart");
  if (!ctx) return;
  if (typeof window.Chart === "undefined") {
    $("pareto-note").textContent = "Graphique indisponible : la librairie Chart.js n'a pas chargé (hors ligne). Le tableau reste utilisable.";
    return;
  }
  if (chartPareto) { chartPareto.destroy(); chartPareto = null; }
  const top = arr.slice(0, 15);
  const labels = top.map((l) => (l.mode.length > 28 ? l.mode.slice(0, 27) + "…" : l.mode));
  const data = top.map((l) => l.C);
  const total = data.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  const cumul = data.map((v) => { cum += v; return +(cum / total * 100).toFixed(1); });
  const colors = data.map((c) => classeCriticite(c).color);
  chartPareto = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [
      { type: "bar", label: "Criticité C", data, backgroundColor: colors, borderWidth: 1 },
      { type: "line", label: "% cumulé", data: cumul, yAxisID: "y1", tension: 0.25, pointRadius: 3 }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "top" }, tooltip: { callbacks: { afterBody: (items) => {
        const l = top[items[0].dataIndex]; return l ? `${l.composant} · F${l.F} G${l.G} D${l.D}` : "";
      }}}},
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
        y: { beginAtZero: true, title: { display: true, text: "Criticité C = F×G×D" } },
        y1: { beginAtZero: true, max: 100, position: "right", grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + "%" } }
      }
    }
  });
  const pct80 = cumul.findIndex((v) => v >= 80);
  $("pareto-note").innerHTML = top.length
    ? `Principe 80/20 : les <strong>${pct80 >= 0 ? pct80 + 1 : top.length} premiers modes</strong> concentrent ≥ 80 % de la criticité cumulée. Traitez-les en priorité.`
    : "Ajoutez des modes pour afficher le Pareto.";
}

function renderMatrice(arr) {
  const grid = $("matrixGrid");
  grid.innerHTML = "";
  // en-tête G
  grid.appendChild(cell("corner", "F ↓ · G →"));
  for (let g = 1; g <= 5; g++) grid.appendChild(cell("head", "G" + g));
  for (let f = 5; f >= 1; f--) {
    grid.appendChild(cell("head", "F" + f));
    for (let g = 1; g <= 5; g++) {
      const dans = arr.filter((l) => Number(l.F) === f && Number(l.G) === g);
      const maxC = dans.length ? Math.max(...dans.map((l) => l.C)) : 0;
      const s = maxC ? classeCriticite(maxC) : null;
      const d = document.createElement("div");
      d.className = "mx";
      d.style.background = s ? s.bg : "#f8fafc";
      d.style.borderColor = s ? s.color : "#e2e8f0";
      d.title = dans.map((l) => `${l.mode} (C=${l.C}, D=${l.D})`).join("\n") || "Aucun mode";
      d.innerHTML = dans.length
        ? `<strong style="color:${s.color}">${maxC}</strong><span>${dans.length} mode(s)</span>`
        : `<span class="muted">·</span>`;
      grid.appendChild(d);
    }
  }
  function cell(cls, txt) { const d = document.createElement("div"); d.className = cls; d.textContent = txt; return d; }
}

/* ---------- exports ---------- */
function rowsExport() {
  return lignesVisibles().map((l, i) => ({
    "N°": i + 1, "Composant": l.composant, "Mode de défaillance": l.mode,
    "Cause": l.cause, "Effet": l.effet, "F": l.F, "G": l.G, "D": l.D,
    "Criticité C": l.C, "Classe": classeCriticite(l.C).label,
    "Origine info": l.origine, "Action proposée": l.action || ""
  }));
}

function exportExcel() {
  if (typeof window.XLSX === "undefined") { toast("Export indisponible : librairie XLSX non chargée (hors ligne).", true); return; }
  const ws = XLSX.utils.json_to_sheet(rowsExport());
  ws["!cols"] = [{ wch: 5 }, { wch: 22 }, { wch: 30 }, { wch: 32 }, { wch: 32 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 11 }, { wch: 18 }, { wch: 13 }, { wch: 38 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AMDEC");
  const ws2 = XLSX.utils.json_to_sheet([
    ...ECHELLES.F.map((e) => ({ Échelle: "F" + e.n + " " + e.label, Définition: e.def })),
    ...ECHELLES.G.map((e) => ({ Échelle: "G" + e.n + " " + e.label, Définition: e.def })),
    ...ECHELLES.D.map((e) => ({ Échelle: "D" + e.n + " " + e.label, Définition: e.def }))
  ]);
  XLSX.utils.book_append_sheet(wb, ws2, "Échelles FGD");
  XLSX.writeFile(wb, "AMDEC-convoyeur-bande.xlsx");
}

function exportCSV() {
  if (typeof window.XLSX === "undefined") { toast("Export indisponible : librairie XLSX non chargée (hors ligne).", true); return; }
  const ws = XLSX.utils.json_to_sheet(rowsExport());
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  dl(URL.createObjectURL(blob), "AMDEC-convoyeur-bande.csv");
}
function dl(href, name) { const a = document.createElement("a"); a.href = href; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(href), 2000); }

function exportJSON() {
  dl(URL.createObjectURL(new Blob([JSON.stringify(lignes, null, 2)], { type: "application/json" })), "AMDEC-donnees.json");
}

function importJSON(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!Array.isArray(data)) throw new Error("format");
      lignes = data.map((l) => ({ id: uid(), composant: l.composant || "", mode: l.mode || "", cause: l.cause || "", effet: l.effet || "", F: clamp(l.F), G: clamp(l.G), D: clamp(l.D), origine: l.origine || "hypothèse", action: l.action || "" }));
      save(); renderAll(); toast("Import JSON réussi.");
    } catch { toast("Fichier JSON invalide.", true); }
  };
  r.readAsText(file);
}
function clamp(v) { v = Number(v); return v >= 1 && v <= 5 ? v : 3; }

function exportPDF() {
  if (typeof window.jspdf === "undefined") { toast("Export indisponible : librairie jsPDF non chargée (hors ligne).", true); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14); doc.text("Étude AMDEC : Convoyeur à bande motorisé (C = F x G x D)", 14, 12);
  doc.setFontSize(9); doc.setTextColor(100);
  doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}, ${lignes.length} modes, triés par criticité décroissante`, 14, 18);
  doc.autoTable({
    startY: 22,
    head: [["N°", "Composant", "Mode", "Cause", "Effet", "F", "G", "D", "C", "Classe", "Origine"]],
    body: lignesVisibles().map((l, i) => [i + 1, l.composant, l.mode, l.cause, l.effet, l.F, l.G, l.D, l.C, classeCriticite(l.C).label, l.origine]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
    didParseCell(d) { if (d.section === "body" && d.column.index === 8) {
      const c = Number(d.cell.raw); const s = classeCriticite(c);
      d.cell.styles.textColor = s.color; d.cell.styles.fontStyle = "bold";
    }}
  });
  // Pareto image if available
  try {
    const img = $("paretoChart").toDataURL("image/png");
    doc.addPage(); doc.setFontSize(12); doc.setTextColor(0); doc.text("Diagramme de Pareto des criticités", 14, 12);
    doc.addImage(img, "PNG", 14, 18, 265, 120);
  } catch { /* canvas tainted? ignore */ }
  doc.save("AMDEC-convoyeur-bande.pdf");
}

function toast(msg, err) {
  const t = $("toast"); t.textContent = msg;
  t.style.background = err ? "#b91c1c" : "#0f172a";
  t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- sections statiques ---------- */
function renderEchelles() {
  const mk = (arr) => arr.map((e) => `<div class="scale-row"><span class="scale-n">${e.n}</span><div><strong>${esc(e.label)}</strong><p>${esc(e.def)}</p></div></div>`).join("");
  $("ech-F").innerHTML = mk(ECHELLES.F);
  $("ech-G").innerHTML = mk(ECHELLES.G);
  $("ech-D").innerHTML = mk(ECHELLES.D);
  $("seuils").innerHTML = SEUILS.map((s) => `<div class="seuil" style="background:${s.bg};border-color:${s.color}"><strong style="color:${s.color}">C ≤ ${s.max} : ${s.label}</strong></div>`).join("");
}

function renderEtude() {
  const tb = $("seance2-body");
  tb.innerHTML = "";
  ETUDE_EXEMPLE.forEach((l) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${esc(l.composant)}</strong></td><td>${esc(l.mode)}</td><td class="small">${esc(l.cause)}</td><td class="small">${esc(l.effet)}</td><td class="center"><span class="origine origine-${esc(l.origine)}">${esc(l.origine)}</span></td>`;
    tb.appendChild(tr);
  });
}

/* ---------- init ---------- */
function renderAll() { renderTable(); }

document.addEventListener("DOMContentLoaded", () => {
  load(); initTabs(); renderEchelles(); renderEtude(); renderAll();
  $("btn-add").addEventListener("click", () => openModal(null));
  $("btn-exemple").addEventListener("click", chargerExemple);
  $("btn-clear").addEventListener("click", () => {
    if (confirm("Tout effacer ?")) { lignes = []; save(); renderAll(); }
  });
  $("btn-sort").addEventListener("click", (e) => {
    triDecroissant = !triDecroissant;
    e.currentTarget.textContent = triDecroissant ? "Tri : criticité ↓" : "Tri : ordre de saisie";
    renderAll();
  });
  $("search").addEventListener("input", (e) => { filtre = e.target.value; renderTable(); });
  $("btn-excel").addEventListener("click", exportExcel);
  $("btn-csv").addEventListener("click", exportCSV);
  $("btn-pdf").addEventListener("click", exportPDF);
  $("btn-json").addEventListener("click", exportJSON);
  $("btn-print").addEventListener("click", () => window.print());
  $("btn-print-guide").addEventListener("click", () => window.print());
  $("btn-import").addEventListener("click", () => $("file-import").click());
  $("file-import").addEventListener("change", (e) => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ""; });
  // modal
  $("modal-close").addEventListener("click", closeModal);
  $("modal-cancel").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  $("modal-save").addEventListener("click", submitModal);
  ["f-F", "f-G", "f-D"].forEach((id) => $(id).addEventListener("change", updateModalC));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
});
