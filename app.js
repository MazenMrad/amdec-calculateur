/* Calculateur AMDEC : logique applicative (100 % client, localStorage) */
const LS_KEY = "amdec-lignes-v2";
const LS_META = "amdec-meta-v1";
let lignes = [];
let meta = { ...META_EXEMPLE };
let triDecroissant = true;
let chartPareto = null;
let chartComparaison = null;
let filtre = "";

const $ = (id) => document.getElementById(id);

function uid() { return "id-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6); }
function calcC(l) { return (Number(l.F) || 0) * (Number(l.G) || 0) * (Number(l.D) || 0); }
function calcCp(l) { return (Number(l.Fp ?? l.F) || 0) * (Number(l.Gp ?? l.G) || 0) * (Number(l.D) || 0); }
function clamp(v) { v = Number(v); return v >= 1 && v <= 5 ? v : 3; }

// Normalise une ligne (migration des données saisies avant les colonnes actions/suivi)
function normalize(l) {
  return {
    id: l.id || uid(),
    composant: l.composant || "",
    mode: l.mode || "",
    cause: l.cause || "",
    effet: l.effet || "",
    F: clamp(l.F), G: clamp(l.G), D: clamp(l.D),
    origine: l.origine || "hypothèse",
    action: l.action || "",
    responsable: l.responsable || "",
    echeance: l.echeance || "",
    Fp: clamp(l.Fp ?? l.F),
    Gp: clamp(l.Gp ?? l.G)
  };
}

/* ---------- machines (une table AMDEC par machine) ---------- */
const LS_MACHINES = "amdec-machines-v1";
let machines = [];
let currentId = null;

function currentMachine() {
  return machines.find((m) => m.id === currentId) || null;
}

function saveMachines() {
  localStorage.setItem(LS_MACHINES, JSON.stringify(machines));
}

function save() {
  const m = currentMachine();
  if (!m) return;
  m.lignes = lignes;
  saveMachines();
}

function saveMeta() {
  const m = currentMachine();
  if (!m) return;
  m.meta = meta;
  if ((meta.systeme || "").trim()) m.nom = meta.systeme.trim();
  saveMachines();
  updateMachineChrome();
}

function normalizeMachine(m) {
  const metaM = { ...META_EXEMPLE, ...(m.meta || {}) };
  const nom = String(m.nom || metaM.systeme || "Machine").trim() || "Machine";
  if (!String(metaM.systeme || "").trim()) metaM.systeme = nom;
  return {
    id: m.id || uid(),
    nom,
    createdAt: m.createdAt || new Date().toISOString(),
    meta: metaM,
    lignes: Array.isArray(m.lignes) ? m.lignes.map(normalize) : []
  };
}

function loadLegacyMachine() {
  let legacyLignes = null;
  let legacyMeta = null;
  let hadLignes = false;
  let hadMeta = false;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { legacyLignes = JSON.parse(raw); hadLignes = true; }
  } catch (e) { /* ignore */ }
  try {
    const raw = localStorage.getItem(LS_META);
    if (raw) { legacyMeta = JSON.parse(raw); hadMeta = true; }
  } catch (e) { /* ignore */ }
  if (!hadLignes && !hadMeta) return null;
  const metaMig = { ...META_EXEMPLE, ...(legacyMeta && typeof legacyMeta === "object" ? legacyMeta : {}) };
  const nom = String(metaMig.systeme || "Machine existante").trim() || "Machine existante";
  return normalizeMachine({
    nom,
    createdAt: new Date().toISOString(),
    meta: metaMig,
    lignes: Array.isArray(legacyLignes) ? legacyLignes : []
  });
}

function loadMachines() {
  try {
    const raw = localStorage.getItem(LS_MACHINES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        machines = parsed.map(normalizeMachine);
        return;
      }
    }
  } catch (e) { /* ignore */ }
  const legacy = loadLegacyMachine();
  machines = legacy ? [legacy] : [];
  saveMachines();
}

function renderMeta() {
  $("m-projet").value = meta.projet || "";
  $("m-responsable").value = meta.responsable || "";
  $("m-systeme").value = meta.systeme || "";
  $("m-equipe").value = meta.equipe || "";
  $("m-date").value = meta.date || "";
  $("m-revision").value = meta.revision || "";
}

function parseRoute() {
  const h = (location.hash || "#/").replace(/^#/, "") || "/";
  const match = h.match(/^\/m\/([^/?#]+)/);
  if (match) return { view: "table", id: decodeURIComponent(match[1]) };
  return { view: "machines" };
}

function goToMachine(id) {
  location.hash = "#/m/" + encodeURIComponent(id);
}

function updateMachineChrome() {
  const m = currentMachine();
  if (!m) return;
  const crumb = $("machine-crumb");
  crumb.hidden = false;
  crumb.innerHTML = `<a href="#/">Machines</a> <span aria-hidden="true">/</span> <strong>${esc(m.nom)}</strong>`;
  $("hero-sub").textContent = `Tableau spécifique à « ${m.nom} ». Les modes, l'entête et les graphiques de cette machine restent séparés des autres. Enregistrement local dans ce navigateur.`;
  $("table-machine").textContent = `· ${m.nom}`;
  document.title = `AMDEC : ${m.nom}`;
}

function renderMachinesView() {
  currentId = null;
  $("view-machines").hidden = false;
  $("view-app").hidden = true;
  $("main-tabs").hidden = true;
  $("machine-crumb").hidden = true;
  $("hero-sub").textContent = "Ajoutez une machine pour ouvrir son tableau AMDEC. Chaque machine conserve ses modes, son entête et ses graphiques. Outil 100 % local, aucune donnée envoyée en ligne.";
  document.title = "Calculateur AMDEC : machines";
  renderMachinesList();
}

function openMachine(machine) {
  currentId = machine.id;
  lignes = (machine.lignes || []).map(normalize);
  meta = { ...META_EXEMPLE, ...(machine.meta || {}) };
  $("view-machines").hidden = true;
  $("view-app").hidden = false;
  $("main-tabs").hidden = false;
  updateMachineChrome();
  renderMeta();
  renderAll();
  const calc = document.querySelector('.tab-btn[data-tab="calculateur"]');
  if (calc) selectTab(calc);
  const panel = $("tab-calculateur");
  if (panel) panel.focus();
}

function renderRoute() {
  const route = parseRoute();
  if (route.view === "table") {
    const machine = machines.find((m) => m.id === route.id);
    if (!machine) {
      if (location.hash !== "#/") location.hash = "#/";
      else renderMachinesView();
      return;
    }
    openMachine(machine);
    return;
  }
  renderMachinesView();
}

function renderMachinesList() {
  const box = $("machines-list");
  box.innerHTML = "";
  if (!machines.length) {
    box.innerHTML = `<p class="muted machine-empty">Aucune machine pour le moment. Créez-en une avec le formulaire : vous serez redirigé vers son tableau.</p>`;
    return;
  }
  machines.forEach((m) => {
    const cs = (m.lignes || []).map((l) => calcC(l));
    const max = cs.length ? Math.max(...cs) : 0;
    const crit = cs.filter((c) => c > 30).length;
    const date = m.createdAt ? new Date(m.createdAt) : null;
    const dateTxt = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("fr-FR") : "";
    const art = document.createElement("article");
    art.className = "machine-card";
    art.innerHTML = `
      <h3>${esc(m.nom)}</h3>
      <p class="muted">${esc(m.meta?.projet || "Projet non renseigné")}${m.meta?.equipe ? " · " + esc(m.meta.equipe) : ""}${dateTxt ? " · " + dateTxt : ""}</p>
      <p>${m.lignes.length} mode(s) · C max ${max}${crit ? ` · ${crit} au-dessus de 30` : ""}</p>
      <div class="toolbar">
        <a class="btn primary" href="#/m/${encodeURIComponent(m.id)}">Ouvrir le tableau</a>
        <button type="button" class="btn danger-ghost" data-del-machine="${esc(m.id)}">Supprimer</button>
      </div>`;
    box.appendChild(art);
  });
  box.querySelectorAll("[data-del-machine]").forEach((b) => {
    b.addEventListener("click", () => deleteMachine(b.dataset.delMachine));
  });
}

function deleteMachine(id) {
  const m = machines.find((x) => x.id === id);
  if (!m) return;
  if (!confirm(`Supprimer « ${m.nom} » et tout son tableau AMDEC ?`)) return;
  machines = machines.filter((x) => x.id !== id);
  saveMachines();
  renderMachinesList();
  toast("Machine supprimée.");
}

function submitMachine(e) {
  e.preventDefault();
  const nom = $("new-nom").value.trim();
  if (!nom) {
    toast("Indiquez le nom de la machine.", true);
    $("new-nom").focus();
    return;
  }
  const machine = normalizeMachine({
    id: uid(),
    nom,
    createdAt: new Date().toISOString(),
    meta: {
      projet: $("new-projet").value.trim(),
      responsable: $("new-responsable").value.trim(),
      systeme: nom,
      equipe: $("new-equipe").value.trim(),
      date: new Date().toLocaleDateString("fr-FR"),
      revision: "V1.0"
    },
    lignes: []
  });
  machines.push(machine);
  saveMachines();
  $("form-machine").reset();
  toast(`Machine « ${nom} » créée.`);
  goToMachine(machine.id);
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
  let arr = lignes.map((l) => ({ ...l, C: calcC(l), Cp: calcCp(l) }));
  if (filtre) {
    const f = filtre.toLowerCase();
    arr = arr.filter((l) => [l.composant, l.mode, l.cause, l.effet, l.origine, l.action, l.responsable].join(" ").toLowerCase().includes(f));
  }
  if (triDecroissant) arr.sort((a, b) => b.C - a.C);
  return arr;
}

function cellC(c) {
  const s = classeCriticite(c);
  return `<span class="badge" style="color:${s.color};background:${s.bg}">${c}</span>`;
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
    tr.innerHTML = `<td colspan="17"><div class="empty-box">
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
      <td class="small">${esc(l.effet)}</td>
      <td class="small">${esc(l.cause)}</td>
      <td class="center"><span class="idx" title="${tip("F", l.F)}">F${l.F}</span></td>
      <td class="center"><span class="idx" title="${tip("G", l.G)}">G${l.G}</span></td>
      <td class="center"><span class="idx" title="${tip("D", l.D)}">D${l.D}</span></td>
      <td class="center">${cellC(l.C)}</td>
      <td class="small">${esc(l.action) || "<span class='muted'>à définir</span>"}</td>
      <td class="small">${esc(l.responsable) || "<span class='muted'>à définir</span>"}</td>
      <td class="center small">${esc(l.echeance) || "<span class='muted'>à définir</span>"}</td>
      <td class="center"><span class="idx">F'${l.Fp}</span></td>
      <td class="center"><span class="idx">G'${l.Gp}</span></td>
      <td class="center">${cellC(l.Cp)}</td>
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
  const cps = arr.map((l) => l.Cp);
  $("stat-maxp").textContent = cps.length ? Math.max(...cps) : 0;
  $("stat-gain").textContent = cs.reduce((a, b) => a + b, 0) - cps.reduce((a, b) => a + b, 0);
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
  $("f-responsable").value = ligne?.responsable || "";
  $("f-echeance").value = ligne?.echeance || "";
  $("f-Fp").value = ligne?.Fp ?? ligne?.F ?? 3;
  $("f-Gp").value = ligne?.Gp ?? ligne?.G ?? 3;
  updateModalC();
  $("modal").classList.add("open");
  $("f-composant").focus();
}
function closeModal() { $("modal").classList.remove("open"); }
function updateModalC() {
  const c = Number($("f-F").value) * Number($("f-G").value) * Number($("f-D").value);
  const cp = Number($("f-Fp").value) * Number($("f-Gp").value) * Number($("f-D").value);
  $("modal-c").innerHTML = `Criticité : <strong>${c}</strong> ${badgeClasse(c)} &nbsp; C' après action : <strong>${cp}</strong> ${badgeClasse(cp)}`;
}
function submitModal() {
  const obj = normalize({
    id: editingId || undefined,
    composant: $("f-composant").value.trim() || "Sans composant",
    mode: $("f-mode").value.trim() || "Mode non nommé",
    cause: $("f-cause").value.trim(),
    effet: $("f-effet").value.trim(),
    F: Number($("f-F").value), G: Number($("f-G").value), D: Number($("f-D").value),
    origine: $("f-origine").value, action: $("f-action").value.trim(),
    responsable: $("f-responsable").value.trim(),
    echeance: $("f-echeance").value.trim(),
    Fp: Number($("f-Fp").value), Gp: Number($("f-Gp").value)
  });
  if (editingId) {
    const i = lignes.findIndex((l) => l.id === editingId);
    if (i >= 0) lignes[i] = obj;
  } else lignes.push(obj);
  save(); closeModal(); renderAll();
}

/* ---------- graphiques ---------- */
function renderCharts() {
  const arr = lignesVisibles();
  renderPareto(arr);
  renderMatrice(arr);
  renderComparaison(arr);
}

function renderComparaison(arr) {
  const ctx = $("comparaisonChart");
  if (!ctx) return;
  if (typeof window.Chart === "undefined") {
    $("comparaison-note").textContent = "Graphique indisponible : la librairie Chart.js n'a pas chargé (hors ligne).";
    return;
  }
  if (chartComparaison) { chartComparaison.destroy(); chartComparaison = null; }
  const top = [...arr].sort((a, b) => b.C - a.C).slice(0, 10);
  const labels = top.map((l) => (l.mode.length > 26 ? l.mode.slice(0, 25) + "…" : l.mode));
  chartComparaison = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [
      { label: "C avant", data: top.map((l) => l.C), backgroundColor: "#1d4ed8" },
      { label: "C' après", data: top.map((l) => l.Cp), backgroundColor: "#16a34a" }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
        y: { beginAtZero: true, title: { display: true, text: "Criticité" } }
      }
    }
  });
  const gain = top.reduce((a, l) => a + l.C - l.Cp, 0);
  const restants = top.filter((l) => l.Cp > 30).length;
  $("comparaison-note").innerHTML = top.length
    ? `Sur le top 10, les actions font gagner <strong>${gain} points</strong> de criticité. ${restants === 0 ? "Tous les C' passent sous le seuil de 30." : `<strong>${restants} mode(s)</strong> restent au-dessus de 30 : renforcez leurs actions.`}`
    : "Ajoutez des modes pour afficher la comparaison.";
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
    "N°": i + 1, "Fonction": l.composant, "Mode de défaillance": l.mode,
    "Effet": l.effet, "Cause": l.cause, "F": l.F, "G": l.G, "D": l.D,
    "Criticité C": l.C, "Classe": classeCriticite(l.C).label,
    "Action corrective": l.action || "", "Responsable": l.responsable || "",
    "Échéance": l.echeance || "", "F'": l.Fp, "G'": l.Gp, "Criticité C'": l.Cp,
    "Origine info": l.origine
  }));
}

function exportExcel() {
  if (typeof window.XLSX === "undefined") { toast("Export indisponible : librairie XLSX non chargée (hors ligne).", true); return; }
  const head = ["N°", "Fonction", "Mode de défaillance", "Effet", "Cause", "F", "G", "D", "C", "Action corrective", "Responsable", "Échéance", "F'", "G'", "C'", "Origine"];
  const aoa = [
    ["ANALYSE DES MODES DE DÉFAILLANCE, DE LEURS EFFETS ET DE LEUR CRITICITÉ (AMDEC)"],
    [`Projet/Processus: ${meta.projet}`, "", "", "", "", "", "", "", "Date:", meta.date || ""],
    [`Responsable: ${meta.responsable}`, "", "", "", "", "", "", "", "Révision:", meta.revision || ""],
    [`Système: ${meta.systeme}`, "", "", "", "", "", "", "", "Équipe:", meta.equipe || ""],
    [],
    head,
    ...lignesVisibles().map((l, i) => [i + 1, l.composant, l.mode, l.effet, l.cause, l.F, l.G, l.D, l.C, l.action, l.responsable, l.echeance, l.Fp, l.Gp, l.Cp, l.origine])
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 5 }, { wch: 22 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 8 }, { wch: 34 }, { wch: 14 }, { wch: 12 }, { wch: 5 }, { wch: 5 }, { wch: 8 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AMDEC Analyse");
  const ws2 = XLSX.utils.json_to_sheet([
    ...ECHELLES.F.map((e) => ({ Échelle: "F" + e.n + " " + e.label, Définition: e.def })),
    ...ECHELLES.G.map((e) => ({ Échelle: "G" + e.n + " " + e.label, Définition: e.def })),
    ...ECHELLES.D.map((e) => ({ Échelle: "D" + e.n + " " + e.label, Définition: e.def }))
  ]);
  XLSX.utils.book_append_sheet(wb, ws2, "Grille d'évaluation");
  XLSX.writeFile(wb, exportBaseName() + ".xlsx");
}

function exportCSV() {
  if (typeof window.XLSX === "undefined") { toast("Export indisponible : librairie XLSX non chargée (hors ligne).", true); return; }
  const ws = XLSX.utils.json_to_sheet(rowsExport());
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  dl(URL.createObjectURL(blob), exportBaseName() + ".csv");
}
function dl(href, name) { const a = document.createElement("a"); a.href = href; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(href), 2000); }

function exportJSON() {
  dl(URL.createObjectURL(new Blob([JSON.stringify(lignes, null, 2)], { type: "application/json" })), exportBaseName() + ".json");
}

function importJSON(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!Array.isArray(data)) throw new Error("format");
      lignes = data.map((l) => normalize(l));
      save(); renderAll(); toast("Import JSON réussi.");
    } catch { toast("Fichier JSON invalide.", true); }
  };
  r.readAsText(file);
}

function exportPDF() {
  if (typeof window.jspdf === "undefined") { toast("Export indisponible : librairie jsPDF non chargée (hors ligne).", true); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14); doc.text("Analyse des modes de défaillance, de leurs effets et de leur criticité (AMDEC)", 14, 12);
  doc.setFontSize(9); doc.setTextColor(100);
  doc.text(`Projet: ${meta.projet} | Système: ${meta.systeme} | Responsable: ${meta.responsable}`, 14, 18);
  doc.text(`Équipe: ${meta.equipe} | Date: ${meta.date} | Révision: ${meta.revision} | ${lignes.length} modes, triés par criticité décroissante`, 14, 23);
  doc.autoTable({
    startY: 27,
    head: [["N°", "Fonction", "Mode", "Effet", "Cause", "F", "G", "D", "C", "Action", "Resp.", "Éch.", "F'", "G'", "C'"]],
    body: lignesVisibles().map((l, i) => [i + 1, l.composant, l.mode, l.effet, l.cause, l.F, l.G, l.D, l.C, l.action, l.responsable, l.echeance, l.Fp, l.Gp, l.Cp]),
    styles: { fontSize: 6, cellPadding: 1.2 },
    headStyles: { fillColor: [15, 23, 42] },
    didParseCell(d) { if (d.section === "body" && (d.column.index === 8 || d.column.index === 14)) {
      const c = Number(d.cell.raw); const s = classeCriticite(c);
      d.cell.styles.textColor = s.color; d.cell.styles.fontStyle = "bold";
    }}
  });
  // Pareto image if available
  try {
    const img = $("paretoChart").toDataURL("image/png");
    doc.addPage(); doc.setFontSize(12); doc.setTextColor(0); doc.text("Diagramme de Pareto des criticités", 14, 12);
    doc.addImage(img, "PNG", 14, 18, 265, 120);
  } catch { /* canvas vide : ignore */ }
  try {
    const img2 = $("comparaisonChart").toDataURL("image/png");
    if (img2.length > 5000) {
      doc.addPage(); doc.setFontSize(12); doc.setTextColor(0); doc.text("Comparaison C avant / C' après actions", 14, 12);
      doc.addImage(img2, "PNG", 14, 18, 265, 120);
    }
  } catch { /* canvas vide : ignore */ }
  doc.save(exportBaseName() + ".pdf");
}

function exportBaseName() {
  const nom = (currentMachine()?.nom || "machine")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "machine";
  return "AMDEC-" + nom;
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
  loadMachines(); initTabs(); renderEchelles(); renderEtude();
  $("form-machine").addEventListener("submit", submitMachine);
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
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
  ["f-F", "f-G", "f-D", "f-Fp", "f-Gp"].forEach((id) => $(id).addEventListener("change", updateModalC));
  [["m-projet", "projet"], ["m-responsable", "responsable"], ["m-systeme", "systeme"], ["m-equipe", "equipe"], ["m-date", "date"], ["m-revision", "revision"]].forEach(([id, key]) => {
    $(id).addEventListener("change", (e) => { meta[key] = e.target.value; saveMeta(); });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
});
