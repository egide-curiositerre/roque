// Paramètres du joueur : valeurs par défaut, lecture immédiate (copie dans le navigateur) et enregistrement sur le serveur
import { cleLocale } from './profil.js';

export const DEFAUTS = {
  // Accueil
  'accueil.objectif': 'normal',          // leger | normal | intense : taille du plan du jour
  'accueil.resumeVocal': false,          // lire le résumé de la journée à l'ouverture de l'accueil
  'accueil.raccourcis': true,            // cartes de raccourcis en bas de l'accueil
  // Entraîneur (coach)
  'coach.voix': 'auto',                  // identifiant de la voix (auto = la plus naturelle)
  'coach.debit': 'normale',              // lente | normale | rapide
  'coach.bavard': true,                  // annonce aussi les coups de l'ordinateur
  'coach.pause': true,                   // s'arrête après une erreur pour proposer de réessayer
  'coach.barre': true,                   // barre d'évaluation pendant l'entraînement
  'coach.ouvertures': true,              // nomme les ouvertures
  'coach.conseils': true,                // conseils généraux (roque, développement, finale…)
  'coach.occasions': true,               // signale mats et coups brillants possibles
  // Records de l'entraînement « Les cases » (60 secondes)
  'cases.recordNommer': 0,
  'cases.recordTrouver': 0,
  // Notifications du Mac
  'notif.rappel': false,
  'notif.heure': '18:00',
  'notif.serie': false,
  'notif.voix': false,
  // Thème
  'theme.palette': 'classique',
  'theme.taille': 'normale',             // normale | grande | tres-grande
  'theme.animations': true,
  // Icône de l'app
  'icone': 'cavalier',
  // Échiquier
  'plateau.couleurs': 'palette',         // palette | vert | bois | bleu | gris | marron | violet
  'plateau.coordonnees': true,
  'plateau.coupsPossibles': true,
  'plateau.dernierCoup': true,
  'plateau.animation': 'normale',        // aucune | rapide | normale | lente
  'plateau.promotionAuto': false,
  // Jouer
  'jouer.niveau': 'conseille',           // conseille | 400 … 2600
  'jouer.couleur': 'w',                  // w | b | x
  'jouer.confirmerAbandon': true,
  'jouer.voix': true,
  // Social (plusieurs joueurs)
  'social.quiJoue': true,
  'social.classement': true,
  // Problèmes
  'problemes.difficulte': 'normale',     // facile | normale | difficile
  'problemes.enchainer': false,
  'problemes.chrono': false,
  'problemes.voix': true,
  'problemes.celebrations': true,
  // Analyse
  'analyse.profondeur': 'normale',       // rapide | normale | profonde
  'analyse.fleches': true,
  'analyse.barre': true,
  'analyse.brillants': true,
  'analyse.resumeVocal': true,
  'analyse.pause': 'normale',            // courte | normale | longue (entre deux coups de la lecture commentée)
  // Ton avis
  'avis.note': 0,
  'avis.texte': '',
};

const CLE = () => cleLocale('roque-parametres');
let valeurs = { ...DEFAUTS };
try { valeurs = { ...DEFAUTS, ...JSON.parse(localStorage.getItem(CLE())) }; } catch { /* copie absente */ }
const ecouteurs = new Set();

/** Valeur d'un paramètre (toujours disponible tout de suite). */
export const param = (cle) => (cle in valeurs ? valeurs[cle] : DEFAUTS[cle]);

/** Recharge les paramètres depuis le serveur (au démarrage de l'application). */
export async function chargerParametres() {
  try {
    const r = await fetch('/api/parametres').then((x) => x.json());
    valeurs = { ...DEFAUTS, ...valeurs, ...r };
    try { localStorage.setItem(CLE(), JSON.stringify(valeurs)); } catch { /* stockage indisponible */ }
  } catch { /* serveur injoignable : on garde la copie */ }
  for (const f of ecouteurs) f(null);
}

/** Change un paramètre : effet immédiat, puis enregistrement sur le serveur. */
export function changer(cle, valeur) {
  valeurs[cle] = valeur;
  try { localStorage.setItem(CLE(), JSON.stringify(valeurs)); } catch { /* stockage indisponible */ }
  for (const f of ecouteurs) f(cle);
  return fetch('/api/parametres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [cle]: valeur }) }).catch(() => {});
}

export function surChangementParametre(f) {
  ecouteurs.add(f);
  return () => ecouteurs.delete(f);
}
