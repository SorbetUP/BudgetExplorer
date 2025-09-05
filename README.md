# BudgetExplorer

Visualiser le budget de l'État français (PLF/LFI) et estimer votre contribution via l'impôt sur le revenu. SPA 100% front (Vite + React + D3) et pipeline data TypeScript sans backend. Déployé sur GitHub Pages.

## Demo

- Pages: à activer via GitHub Actions (voir plus bas). L’URL par défaut sera: `https://<votre-compte>.github.io/BudgetExplorer/`.

## Fonctionnalités

- Découverte automatique des datasets (Opendatasoft: data.economie.gouv.fr) par année, scoring mots-clés.
- Téléchargement paginé, normalisation (alias LOLF, nombres FR), agrégation CP/AE en arbre Mission → Programme → Action → Sous‑action.
- JSON générés dans `public/data`: arbre (`state_budget_tree_YYYY.json`), recettes (`state_revenues_YYYY.json`), budget vert (`budget_vert_YYYY.json` si dispo), trace catalogue (`catalog_YYYY.json`).
- SPA: vue « Budget total » (circle packing zoomable), vue « Ma contribution » (calcul IR client + redistribution pro‑rata).
- CI (lint + test) et déploiement GitHub Pages.

## Stack

- Data: Node 18+, TypeScript, `fetch` natif.
- Front: React + Vite + TypeScript + D3.
- Qualité: ESLint, Prettier, Vitest.

## Démarrage rapide

1) Installer les dépendances et préparer les workspaces:

```bash
npm run bootstrap
```

2) (Optionnel) Générer des jeux de données pour 2025:

```bash
npm run fetch
```

3) Lancer la SPA:

```bash
npm run dev
```

4) Build de production:

```bash
npm run build
```

5) Lint & tests:

```bash
npm run lint
npm run test
```

## Données & formats

- Arbre LOLF `public/data/state_budget_tree_YYYY.json` (extrait):

```json
{
  "year": 2025,
  "name": "État",
  "level": "etat",
  "cp": 450000000000,
  "ae": 460000000000,
  "children": [
    { "code": "129", "name": "Éducation", "level": "mission", "cp": 60000000000, "children": [] }
  ],
  "sources": { "spendingDatasetId": "...", "license": "Licence Ouverte 2.0" }
}
```

- Recettes `public/data/state_revenues_YYYY.json`: tableau d’objets `{ source, montant }`.
- Budget vert s’il existe: `public/data/budget_vert_YYYY.json`.
- Trace catalogue: `public/data/catalog_YYYY.json`.

## Déploiement GitHub Pages

- Les workflows CI et déploiement sont fournis dans `.github/workflows/`.
- Dans les paramètres du repo, activer Pages « Build and deployment » = « GitHub Actions ».
- À chaque `push` sur `main`, le workflow `deploy.yml` construit `web/dist` et publie via `actions/deploy-pages`.

## Sources et licences

- Données: Opendatasoft (data.economie.gouv.fr, OFGL, etc.) — Licence Ouverte 2.0. Les crédits/sources sont affichés dans l’UI.
- Code: MIT (voir LICENSE).

## Limites connues

- Le calcul IR est un MVP (célibataire, 1 part). Le code est prêt pour étendre au quotient familial.
- La découverte de datasets repose sur un scoring heuristique. Un fallback CSV/XLS est prévu si aucun dataset fiable n’est trouvé.

## Roadmap

- Niveaux « Local » et « Sécu ».
- Filtres par périmètre, exemples concrets plus riches.

