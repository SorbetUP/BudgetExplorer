#!/usr/bin/env node
/**
 * BudgetExplorer - Fetcher "tout-en-un"
 * Node >= 18 (fetch natif)
 *
 * Utilisation :
 *   node fetch_all.mjs --year 2025 --out out
 *
 * Sorties (selon disponibilité) :
 *   out/state_budget_tree_YYYY.json         # Arbre LOLF agrégé (CP/AE)
 *   out/state_depenses_dest_YYYY.json       # Tableau brut "dépenses selon destination"
 *   out/state_depenses_dest_nature_YYYY.json# Tableau brut "destination × nature (titres)"
 *   out/state_revenues_YYYY.json            # Recettes du budget général (plat)
 *   out/state_performance_YYYY.json         # Indicateurs (PAP/RAP) (plat)
 *   out/state_budget_vert_YYYY.json         # Budget vert (plat)
 *   out/ofgl_communes_YYYY.json             # Finances locales (communes) (plat, exemple)
 *   out/catalog_YYYY.json                   # Jeux identifiés (traçabilité)
 *
 * IMPORTANT :
 * - Ce script privilégie les APIs (CORS OK) et tente de découvrir les datasets par "search".
 * - Les IDs changent chaque année (plf25-..., lfi24-...). On score la meilleure correspondance.
 * - Pour les sources sans API commode (PDF/XLS), des LIENS sont fournis en commentaire.
 */

import fs from "node:fs/promises";
import path from "node:path";

// --------- CLI args ----------
const YEAR = Number(getArg("--year", "2025"));
const OUT_DIR = getArg("--out", "out");

// --------- Constants ----------
const ECO_API = "https://data.economie.gouv.fr/api/explore/v2.1"; // Opendatasoft MEFSIN
const OFGL_API = "https://data.ofgl.fr/api";                       // Opendatasoft OFGL

// --------- Helpers ----------
function getArg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : def;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toNum = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
function lowerKeys(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k.toLowerCase()] = v;
  return out;
}
function addBudgetFields(target, rec) {
  for (const k of ["cp", "ae", "montant", "value"]) {
    if (k in rec) target[k] = (target[k] ?? 0) + toNum(rec[k]);
  }
  return target;
}
const normLabel = (s) => (s == null ? null : String(s).trim());
const normCode = (s) => (s == null ? null : String(s).trim());

// --------- HTTP ----------
async function apiJSON(base, pathname, params = {}) {
  const url = new URL(base + pathname);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${url}\n${t}`);
  }
  return res.json();
}
async function fetchAllRecords(base, dataset_id, params = {}, delayMs = 120) {
  const limit = 100;
  let offset = 0;
  let all = [];
  for (;;) {
    const page = await apiJSON(base, `/catalog/datasets/${dataset_id}/records`, { limit, offset, ...params });
    const rows = page.results ?? [];
    all = all.concat(rows);
    if (rows.length < limit) break;
    offset += limit;
    await sleep(delayMs);
  }
  // déballer .record si présent
  return all.map((r) => r.record ?? r);
}

// --------- Dataset discovery (score best match) ----------
async function findDatasetIdEco({ year, keywords = [] }) {
  const search = [String(year), ...keywords].join(" ");
  const data = await apiJSON(ECO_API, "/catalog/datasets", { search, limit: 100 });
  const canon = (s) => (s || "").toLowerCase();
  const kws = keywords.map((k) => k.toLowerCase());

  let best = null;
  for (const d of data.results ?? []) {
    const id = d.dataset_id || "";
    const title = d.dataset?.metas?.title || "";
    const bag = canon(id) + " " + canon(title);
    const hits = kws.reduce((acc, kw) => acc + (bag.includes(kw) ? 1 : 0), 0);
    const prefer = /^plf\d{2}|^lfi\d{2}/.test(id) ? 1 : 0;
    const score = hits * 10 + prefer;
    if (!best || score > best.score) best = { id, title, score };
  }
  return best?.id ?? null;
}

// --------- LOLF normalization + tree ----------
function normalizeLOLF(rec) {
  const r = lowerKeys(rec);
  const has = (k) => k in r && r[k] != null && r[k] !== '';

  // Labels and codes with broad synonyms
  const ministere = r.ministere ?? r.intitule_ministere ?? null;

  const mission = r.intitule_mission ?? r.mission_intitule ?? r.mission ?? null;
  const code_mission = r.mission_code ?? r.code_mission ?? r.code_de_la_mission ?? r.mission_numero ?? null;

  const programme_label = r.libelle_programme ?? r.intitule_programme ?? r.programme_intitule ?? null;
  const programme_code = r.programme_code ?? r.code_programme ?? r.programme_numero ?? r.programme ?? null;

  const action_label = r.libelle_action ?? r.intitule_action ?? null;
  const action_code = r.action_code ?? r.code_action ?? r.action ?? null;

  const sous_action_label = r.libelle_sousaction ?? r.intitule_sous_action ?? r.intitule_sousaction ?? null;
  const sous_action_code = r.sous_action_code ?? r.code_sous_action ?? r.sous_action ?? null;

  // Amounts: accept cp/ae, or cp_plf/ae_plf (+ prev_fdc_adp), or generic montant/value
  let cp = 0;
  let ae = 0;
  if (has('cp') || has('ae')) {
    cp = toNum(r.cp);
    ae = toNum(r.ae);
  }
  if (cp === 0 && (has('cp_plf') || has('cp_prev_fdc_adp'))) {
    cp = toNum(r.cp_plf) + toNum(r.cp_prev_fdc_adp);
  }
  if (ae === 0 && (has('ae_plf') || has('ae_prev_fdc_adp'))) {
    ae = toNum(r.ae_plf) + toNum(r.ae_prev_fdc_adp);
  }
  if (cp === 0 && has('montant')) cp = toNum(r.montant);
  if (cp === 0 && has('value')) cp = toNum(r.value);

  return {
    ministere,
    mission: normLabel(mission),
    code_mission: normCode(code_mission),
    programme: normLabel(programme_label ?? programme_code), // prefer label; fallback to code
    code_programme: normCode(programme_code),
    action: normLabel(action_label ?? action_code),
    code_action: normCode(action_code),
    sous_action: normLabel(sous_action_label ?? sous_action_code),
    code_sous_action: normCode(sous_action_code),
    cp,
    ae,
    raw: r,
  };
}

function buildLOLFtree(records, year) {
  const root = {
    id: `etat-${year}`,
    name: `Budget de l'État ${year}`,
    level: "etat",
    cp: 0,
    ae: 0,
    children: [],
    meta: { source: "data.economie.gouv.fr", year },
  };
  const mMap = new Map();

  for (const row of records) {
    const n = normalizeLOLF(row);
    if (!n.mission || !n.programme) continue;

    const mKey = `${n.code_mission || n.mission}`;
    const pKey = `${mKey}::${n.code_programme || n.programme}`;
    const aKey = `${pKey}::${n.code_action || n.action}`;
    const sKey = n.sous_action ? `${aKey}::${n.code_sous_action || n.sous_action}` : null;

    // Mission
    let mNode = mMap.get(mKey);
    if (!mNode) {
      mNode = {
        id: `mission-${mKey}`,
        name: n.mission,
        code: n.code_mission || undefined,
        level: "mission",
        cp: 0,
        ae: 0,
        ministere: n.ministere || undefined,
        children: [],
      };
      mMap.set(mKey, mNode);
      root.children.push(mNode);
    }
    addBudgetFields(mNode, n);

    // Programme
    let pNode = mNode.children.find((c) => c.id === `programme-${pKey}`);
    if (!pNode) {
      pNode = {
        id: `programme-${pKey}`,
        name: n.programme,
        code: n.code_programme || undefined,
        level: "programme",
        cp: 0,
        ae: 0,
        children: [],
      };
      mNode.children.push(pNode);
    }
    addBudgetFields(pNode, n);

    // Action (+ sous-action éventuelle)
    if (n.action) {
      let aNode = pNode.children.find((c) => c.id === `action-${aKey}`);
      if (!aNode) {
        aNode = {
          id: `action-${aKey}`,
          name: n.action,
          code: n.code_action || undefined,
          level: "action",
          cp: 0,
          ae: 0,
          children: [],
        };
        pNode.children.push(aNode);
      }
      addBudgetFields(aNode, n);

      if (n.sous_action) {
        let sNode = aNode.children.find((c) => c.id === `sousaction-${sKey}`);
        if (!sNode) {
          sNode = {
            id: `sousaction-${sKey}`,
            name: n.sous_action,
            code: n.code_sous_action || undefined,
            level: "sous_action",
            cp: 0,
            ae: 0,
          };
          aNode.children.push(sNode);
        }
        addBudgetFields(sNode, n);
      }
    }
    addBudgetFields(root, n);
  }

  // tri CP desc pour UX
  const byCP = (a, b) => (b.cp ?? 0) - (a.cp ?? 0);
  root.children.sort(byCP);
  for (const m of root.children) {
    m.children?.sort(byCP);
    for (const p of m.children || []) p.children?.sort(byCP);
  }
  return root;
}

// --------- Main orchestration ----------
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const catalog = { year: YEAR, datasets: {} };

  // 1) Dépenses selon destination (LOLF)
  const depensesId =
    (await findDatasetIdEco({ year: YEAR, keywords: ["depenses", "destination"] })) ||
    (await findDatasetIdEco({ year: YEAR, keywords: ["depenses", "lolf"] })) ||
    null;

  if (depensesId) {
    const depenses = await fetchAllRecords(ECO_API, depensesId);
    await writeJSON(`state_depenses_dest_${YEAR}.json`, depenses);
    const tree = buildLOLFtree(depenses, YEAR);
    await writeJSON(`state_budget_tree_${YEAR}.json`, tree);
  } else {
    // LIEN (si pas d’ID trouvé automatiquement) :
    // PLF 2025 — Dépenses selon destination :
    // https://data.economie.gouv.fr/explore/dataset/plf25-depenses-2025-selon-destination
    console.warn("! Dépenses 'selon destination' introuvables automatiquement. Voir le lien ci-dessus.");
  }
  catalog.datasets.depenses_destination = depensesId;

  // 2) Dépenses — Destination × Nature (titres)
  const destNatureId =
    (await findDatasetIdEco({ year: YEAR, keywords: ["depenses", "nature", "destination"] })) ||
    null;
  if (destNatureId) {
    const dn = await fetchAllRecords(ECO_API, destNatureId);
    await writeJSON(`state_depenses_dest_nature_${YEAR}.json`, dn);
  } else {
    // LIEN exemple :
    // PLF 2025 — Dépenses du BG et BA selon nomenclatures destination et nature :
    // https://data.economie.gouv.fr/explore/dataset/plf25-depenses-2025-du-bg-et-des-ba-selon-nomenclatures-destination-et-nature
    console.warn("! 'Destination × Nature' introuvable automatiquement. Voir le lien ci-dessus.");
  }
  catalog.datasets.depenses_dest_nature = destNatureId;

  // 3) Recettes du budget général
  const recettesId =
    (await findDatasetIdEco({ year: YEAR, keywords: ["recettes", "budget", "general"] })) ||
    (await findDatasetIdEco({ year: YEAR, keywords: ["recettes", "etat"] })) ||
    null;
  if (recettesId) {
    const recs = await fetchAllRecords(ECO_API, recettesId);
    const flat = recs.map(lowerKeys).map((row) => ({
      ...row,
      montant: toNum(row.montant ?? row.cp ?? row.ae ?? row.value),
    }));
    await writeJSON(`state_revenues_${YEAR}.json`, flat);
  } else {
    // LIEN exemple :
    // PLF 2025 — Recettes du budget général :
    // https://data.economie.gouv.fr/explore/dataset/plf25-recettes-du-budget-general
    console.warn("! 'Recettes' introuvables automatiquement. Voir le lien ci-dessus.");
  }
  catalog.datasets.recettes = recettesId;

  // 4) Performance (PAP/RAP) au niveau (sous-)indicateur
  const perfId =
    (await findDatasetIdEco({
      year: YEAR,
      keywords: ["performance", "execution", "cible", "indicateur"],
    })) || null;
  if (perfId) {
    const perf = await fetchAllRecords(ECO_API, perfId);
    await writeJSON(`state_performance_${YEAR}.json`, perf);
  } else {
    // LIEN générique :
    // https://data.economie.gouv.fr/explore/?sort=modified&refine.theme=Budget+de+l%27Etat&q=performance
    console.warn("! 'Performance' introuvable automatiquement. Voir le lien ci-dessus.");
  }
  catalog.datasets.performance = perfId;

  // 5) Budget vert (étiquetage environnemental)
  const greenId =
    (await findDatasetIdEco({ year: YEAR, keywords: ["budget", "vert"] })) ||
    (await findDatasetIdEco({ year: YEAR, keywords: ["evaluation", "environnementale"] })) ||
    null;
  if (greenId) {
    const greens = await fetchAllRecords(ECO_API, greenId);
    await writeJSON(`state_budget_vert_${YEAR}.json`, greens.map(lowerKeys));
  } else {
    // LIENS exemples :
    // PLF 2025 — Budget vert : https://data.economie.gouv.fr/explore/?q=plf%202025%20budget%20vert
    // PLF 2024 — Budget vert : https://data.economie.gouv.fr/explore/?q=plf%202024%20budget%20vert
    console.warn("! 'Budget vert' introuvable automatiquement. Voir les liens ci-dessus.");
  }
  catalog.datasets.budget_vert = greenId;

  // 6) Finances locales — OFGL (communes + autres jeux clés)
  // API doc portail : https://data.ofgl.fr/
  try {
    const ofgl = await apiJSON(OFGL_API, "/records/1.0/search/", {
      dataset: "ofgl-base-communes",
      rows: 1000,
      [`refine.annee`]: String(YEAR), // si indispo, essaie YEAR-1
    });
    await writeJSON(`ofgl_communes_${YEAR}.json`, ofgl.records?.map((r) => r.fields) ?? []);
    catalog.datasets.ofgl_communes = "ofgl-base-communes";
  } catch (e) {
    // LIEN portail :
    // https://data.ofgl.fr/explore/dataset/ofgl-base-communes
    console.warn("! OFGL communes non récupéré (API). Voir le lien ci-dessus.", e?.message || e);
  }

  // OFGL — départements
  try {
    const dep = await apiJSON(OFGL_API, "/records/1.0/search/", {
      dataset: "ofgl-base-departements",
      rows: 1000,
      [`refine.annee`]: String(YEAR),
    });
    await writeJSON(`ofgl_departements_${YEAR}.json`, dep.records?.map((r) => r.fields) ?? []);
    catalog.datasets.ofgl_departements = "ofgl-base-departements";
  } catch {}

  // OFGL — régions
  try {
    const reg = await apiJSON(OFGL_API, "/records/1.0/search/", {
      dataset: "ofgl-base-regions",
      rows: 1000,
      [`refine.annee`]: String(YEAR),
    });
    await writeJSON(`ofgl_regions_${YEAR}.json`, reg.records?.map((r) => r.fields) ?? []);
    catalog.datasets.ofgl_regions = "ofgl-base-regions";
  } catch {}

  // Dotations départements
  try {
    const dotdep = await apiJSON(OFGL_API, "/records/1.0/search/", {
      dataset: "dotations-departements",
      rows: 1000,
      [`refine.annee`]: String(YEAR),
    });
    await writeJSON(`ofgl_dotations_departements_${YEAR}.json`, dotdep.records?.map((r) => r.fields) ?? []);
    catalog.datasets.dotations_departements = "dotations-departements";
  } catch {}

  // Dotations GFP
  try {
    const gfp = await apiJSON(OFGL_API, "/records/1.0/search/", {
      dataset: "dotations-gfp",
      rows: 1000,
      [`refine.annee`]: String(YEAR),
    });
    await writeJSON(`ofgl_dotations_gfp_${YEAR}.json`, gfp.records?.map((r) => r.fields) ?? []);
    catalog.datasets.dotations_gfp = "dotations-gfp";
  } catch {}

  // REI — Recensement éléments d’imposition
  try {
    const rei = await apiJSON(OFGL_API, "/records/1.0/search/", {
      dataset: "rei",
      rows: 1000,
      [`refine.annee`]: String(YEAR),
    });
    await writeJSON(`ofgl_rei_${YEAR}.json`, rei.records?.map((r) => r.fields) ?? []);
    catalog.datasets.rei = "rei";
  } catch {}

  // 7) PLRG (RAP agrégés & notices) si présent
  try {
    const id = await findDatasetIdEco({ year: YEAR, keywords: ["plrg"] });
    if (id) {
      const rows = await fetchAllRecords(ECO_API, id);
      await writeJSON(`plrg_${YEAR}.json`, rows.map(lowerKeys));
      catalog.datasets.plrg = id;
    }
  } catch {}

  // 8) SMB (Situations Mensuelles de l'État) — pas d’API JSON standard
  // PDF mensuels à parser (si tu veux une timeline infra-annuelle)
  // LIEN : https://www.aft.gouv.fr/fr/publications/situations-mensuelles-de-letat-smb
  // (Étape manuelle : télécharger PDF → parser tables avec un extracteur ; non implémenté ici)

  // 9) "Données chiffrées sous standard ouvert" (XLS/CSV officiels, fallback)
  // Hub PLF 2025 (exemples) :
  // LIEN : https://budget.gouv.fr/documentation/documents-budgetaires/plf-2025-donnees-chiffrees
  // (Étape manuelle : téléchargement + parsing XLS via un script séparé si besoin)

  // 10) Jaunes budgétaires (annexes, parfois XLS) — utile pour détails opérateurs, assoc, etc.
  // Portail :
  // LIEN : https://budget.gouv.fr/documentation/documents-budgetaires/annexes
  // (Scraping à éviter ; privilégier les annexes XLS si présentes)

  await writeJSON(`catalog_${YEAR}.json`, catalog);
  console.log(`✅ Terminé. Fichiers écrits dans ./${OUT_DIR}`);
}

async function writeJSON(basename, data) {
  await fs.writeFile(path.join(OUT_DIR, basename), JSON.stringify(data, null, 2), "utf8");
}

// Lance
main().catch((e) => {
  console.error("\nERREUR:", e?.message || e);
  process.exit(1);
});
