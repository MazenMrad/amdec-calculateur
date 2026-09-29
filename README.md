# Calculateur AMDEC : Sujet 1 (Convoyeur à bande)

Outil web + site de rendu final. **Stack choisie : site statique (HTML/CSS/JS)**. Aucun backend, aucune installation, démo live immédiate, publication gratuite.

| Choix | Pourquoi |
|---|---|
| HTML + CSS + JS vanilla (pas de build) | S'ouvre en double-clic, marche hors-ligne après 1er chargement, jury sans Node/Python |
| Chart.js (CDN) | Pareto barres + courbe % cumulé |
| SheetJS `xlsx` (CDN) | Export `.xlsx` (onglets AMDEC + Échelles) + CSV |
| jsPDF + autotable (CDN) | Export PDF (tableau + image Pareto) |
| localStorage | Sauvegarde auto dans le navigateur + import/export JSON |

Excel/VBA a été écarté (mono-poste, macros bloquées en soutenance) et Python/Flask aussi (serveur à installer, pas « public » en 1 clic). Le statique se publie sur **GitHub Pages / Netlify / Vercel / Cloudflare Pages** gratuitement.

## Fonctionnalités (exigences du sujet)
- [x] Bloc d'entête : projet, responsable, système, équipe, date, révision (sauvegardé, repris en exports)
- [x] Saisie fonction, mode, effet, cause, F/G/D (+ origine observé/rapporté/hypothèse)
- [x] `C = F × G × D` auto + `C' = F' × G' × D` résiduel après action, tri décroissant, Top 3, stats (max, moyenne, nb C>30, C' max, gain total)
- [x] Actions correctives avec responsable et échéance, F'/G' estimés
- [x] Pareto (top 15 + % cumulé + lecture 80/20) + matrice G×F + comparaison C avant / C' après
- [x] Exports Excel (onglets AMDEC Analyse + Grille d'évaluation) / PDF (tableau + graphes) / CSV / JSON, import JSON, impression
- [x] Étude 18 modes (≥ 15) sur convoyeur à bande, 6 fonctions
- [x] Échelles F/G/D 1–5 + seuils (≤15 / 16–30 / 31–60 / >60)
- [x] Tableau Séance 2 + guide utilisateur intégrés (onglets)

## Lancer en local
Double-cliquez `index.html`, ou :
```powershell
cd amdec-calculator
python -m http.server 8000
# → http://localhost:8000
```

## Publier le site (choisir UNE option)

### Option A : GitHub Pages (recommandé, gratuit)
```powershell
cd amdec-calculator
git init; git add .; git commit -m "Calculateur AMDEC Sujet 1"
gh repo create amdec-calculateur --public --source=. --push
# Puis : repo → Settings → Pages → Deploy from branch → main → / (root)
# URL : https://VOTRE-PSEUDO.github.io/amdec-calculateur/
```

### Option B : Netlify Drop (le plus rapide, sans compte Git)
1. Glissez le dossier `amdec-calculator` sur https://app.netlify.com/drop
2. URL publique immédiate (renommable dans Site settings).

### Option C : Vercel
```powershell
npx vercel --prod
# (acceptez les défauts : framework = Other, output = ./)
```

## Fichiers
- `index.html` : site + app (5 onglets)
- `data.js` : échelles + étude 18 modes (modifiez l'équipement ici)
- `app.js` : calculs, Pareto, matrice, exports
- `styles.css` : mise en page + impression

## Soutenance : démo live (3 min)
1. Onglet Calculateur, **Ajouter** un mode en direct, montrer C et le re-tri.
2. Onglet Graphiques, montrer le Pareto qui bouge + la case rouge en matrice.
3. **Export PDF** devant le jury (tableau + Pareto). Gardez un export JSON de secours sur clé USB si le CDN est bloqué (partage de connexion).
