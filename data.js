/* Données AMDEC, Sujet 1 Séance 2
   Équipement : Convoyeur à bande motorisé (type stage ouvrier logistique / agroalimentaire)
   Échelles F/G/D de 1 à 5. C = F x G x D (max 125)
*/

const ECHELLES = {
  F: [
    { n: 1, label: "Très rare", def: "Moins d'1 fois par an. Jamais vu en stage." },
    { n: 2, label: "Rare", def: "Environ 1 fois par an. Entendu en réunion / rapport." },
    { n: 3, label: "Occasionnel", def: "Quelques fois par an (≈ 1 fois / trimestre). Vu au moins une fois." },
    { n: 4, label: "Fréquent", def: "Environ 1 fois par mois. Panne récurrente d'atelier." },
    { n: 5, label: "Très fréquent", def: "Plusieurs fois par mois, voire hebdomadaire." }
  ],
  G: [
    { n: 1, label: "Mineure", def: "Pas d'arrêt. Léger réglage par l'opérateur." },
    { n: 2, label: "Significative", def: "Ralentissement / micro-arrêts < 15 min. Pas de risque." },
    { n: 3, label: "Majeure", def: "Arrêt 15 min – 2 h. Retard production, intervention maintenance." },
    { n: 4, label: "Critique", def: "Arrêt > 2 h ou lot dégradé / non-conformité qualité." },
    { n: 5, label: "Catastrophique", def: "Risque sécurité (blessure, incendie, électrisation) ou arrêt > 1 jour." }
  ],
  D: [
    { n: 1, label: "Évidente", def: "Détection immédiate : alarme, voyant, bruit évident. Opérateur réagit." },
    { n: 2, label: "Facile", def: "Détectable en ronde / contrôle visuel régulier." },
    { n: 3, label: "Moyenne", def: "Nécessite inspection ou mesure (vibration, température)." },
    { n: 4, label: "Difficile", def: "Panne cachée : découverte seulement à la défaillance (protection, isolant)." },
    { n: 5, label: "Indétectable", def: "Aucun signe avant-coureur, aucun contrôle existant (ex. arrêt d'urgence jamais testé)." }
  ]
};

// Seuils de criticité (C max = 125)
const SEUILS = [
  { max: 15, label: "Acceptable", color: "#16a34a", bg: "#dcfce7" },
  { max: 30, label: "Sous surveillance", color: "#b45309", bg: "#fef3c7" },
  { max: 60, label: "Action nécessaire", color: "#c2410c", bg: "#ffedd5" },
  { max: 125, label: "Inacceptable", color: "#b91c1c", bg: "#fee2e2" }
];

function classeCriticite(c) {
  for (const s of SEUILS) if (c <= s.max) return s;
  return SEUILS[SEUILS.length - 1];
}

// Étude exemple : 18 modes de défaillance (≥ 15 exigés)
const ETUDE_EXEMPLE = [
  { composant: "Bande transporteuse", mode: "Dérive latérale / désalignement", cause: "Mauvais réglage des rouleaux, charge excentrée", effet: "Usure des bords, bourrage, arrêt pour recentrage", F: 3, G: 3, D: 2, origine: "observé", action: "Recentrage + butées de guidage, formation chargement centré" },
  { composant: "Bande transporteuse", mode: "Déchirure longitudinale", cause: "Objet tranchant / corps étranger tombé sur la bande", effet: "Arrêt machine, remplacement d'un tronçon de bande", F: 2, G: 5, D: 3, origine: "rapporté", action: "Grille de protection + contrôle corps étrangers en amont" },
  { composant: "Bande transporteuse", mode: "Patinage sur tambour moteur", cause: "Tension insuffisante, humidité / graisse sur tambour", effet: "Perte de débit, échauffement, usure prématurée", F: 3, G: 3, D: 2, origine: "observé", action: "Retension périodique, nettoyage tambour (gamme mensuelle)" },
  { composant: "Moteur électrique", mode: "Échauffement anormal / surcharge", cause: "Surcharge convoyeur, ailettes de ventilation encrassées", effet: "Déclenchement thermique, arrêt jusqu'à refroidissement", F: 3, G: 4, D: 2, origine: "observé", action: "Soufflage ventilation hebdo + limitation charge, relais thermique réglé" },
  { composant: "Moteur électrique", mode: "Court-circuit bobinage", cause: "Humidité, vieillissement de l'isolant", effet: "Arrêt prolongé, rebobinage ou remplacement moteur", F: 1, G: 5, D: 4, origine: "rapporté", action: "Contrôle isolement annuel (mégohmmètre), capot anti-projection" },
  { composant: "Moteur électrique", mode: "Bruit / vibration anormale", cause: "Roulement moteur usé, désalignement accouplement", effet: "Dégradation progressive puis casse", F: 2, G: 3, D: 3, origine: "observé", action: "Écoute vibratoire trimestrielle, remplacement roulements" },
  { composant: "Réducteur / transmission", mode: "Fuite d'huile", cause: "Joint spi usé", effet: "Pollution, niveau bas → grippage à terme", F: 3, G: 3, D: 1, origine: "observé", action: "Remplacement joint + bac de rétention, contrôle niveau mensuel" },
  { composant: "Réducteur / transmission", mode: "Rupture dent de pignon", cause: "Fatigue, surcharge par à-coups (démarrage en charge)", effet: "Arrêt brutal, remplacement réducteur", F: 1, G: 5, D: 3, origine: "hypothèse", action: "Démarrage progressif (variateur), vidange + analyse huile" },
  { composant: "Réducteur / transmission", mode: "Surchauffe de l'huile", cause: "Niveau bas, surcharge continue", effet: "Usure accélérée des engrenages", F: 2, G: 3, D: 2, origine: "rapporté", action: "Thermomètre + niveau à voyant, gamme de graissage" },
  { composant: "Tambours + roulements", mode: "Blocage d'un roulement", cause: "Manque de graissage, poussière / farine compactée", effet: "Arrêt, échauffement, risque d'incendie (poussières)", F: 2, G: 5, D: 2, origine: "rapporté", action: "Plan de graissage + paliers étanches, dépoussiérage" },
  { composant: "Tambours + roulements", mode: "Usure du revêtement tambour", cause: "Abrasion par produits transportés", effet: "Patinage, perte d'adhérence", F: 3, G: 2, D: 3, origine: "observé", action: "Regarnissage / remplacement, contrôle adhérence semestriel" },
  { composant: "Tambours + roulements", mode: "Rupture d'axe de tambour", cause: "Fatigue, corrosion en milieu humide", effet: "Arrêt long, chute de bande (risque sécurité)", F: 1, G: 5, D: 4, origine: "hypothèse", action: "Contrôle ressuage / magnétoscopie tous les 2 ans" },
  { composant: "Capteurs / automatisme", mode: "Fin de course déréglé", cause: "Vibrations, choc d'un chariot", effet: "Fausse détection, arrêts intempestifs", F: 4, G: 2, D: 1, origine: "observé", action: "Protège-capteur + réglage avec contre-écrou, contrôle hebdo" },
  { composant: "Capteurs / automatisme", mode: "Cellule photoélectrique encrassée", cause: "Poussière accumulée sur l'optique", effet: "Arrêts intempestifs, perte de cadence", F: 4, G: 2, D: 1, origine: "observé", action: "Nettoyage optique quotidien (gamme opérateur 2 min)" },
  { composant: "Capteurs / automatisme", mode: "Arrêt d'urgence inopérant", cause: "Contact oxydé, câblage arraché, jamais testé", effet: "Risque grave : impossibilité d'arrêter en cas de danger", F: 1, G: 5, D: 5, origine: "hypothèse", action: "Test mensuel documenté des AU + câblage protégé (priorité 1)" },
  { composant: "Armoire électrique", mode: "Déclenchement disjoncteur intempestif", cause: "Surintensité au démarrage, réglage inadapté", effet: "Arrêt production, réarmement", F: 3, G: 3, D: 1, origine: "observé", action: "Réglage courbe disjoncteur + démarreur progressif" },
  { composant: "Armoire électrique", mode: "Relais thermique défaillant (ne déclenche pas)", cause: "Vieillissement, contact collé", effet: "Moteur non protégé → destruction en cas de surcharge", F: 2, G: 4, D: 4, origine: "rapporté", action: "Test annuel au banc + remplacement préventif 5 ans" },
  { composant: "Armoire électrique", mode: "Câble d'alimentation sectionné", cause: "Frottement sur arête, rongeur", effet: "Arrêt + risque d'électrisation", F: 2, G: 5, D: 2, origine: "rapporté", action: "Chemin de câble + gaine renforcée, contrôle visuel semestriel" }
];
