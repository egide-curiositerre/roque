// Voix du jeu : toujours une voix de femme française, commune à toutes les pages.
// 1. Sur le Mac : la voix Siri naturelle « Marie », prononcée par le Mac lui-même (la plus naturelle).
// 2. Sur un autre appareil : fichier audio fabriqué par le Mac (voix Audrey).
// 3. En dernier recours : voix de femme du navigateur.
import { param } from './parametres.js';

const CLE_VOIX = 'roque-voix';
const VOIX_FEMMES = [/audrey/i, /marie/i, /aur[ée]lie/i, /am[ée]lie/i, /julie/i, /denise/i, /hortense/i, /virginie/i, /google fran/i, /^flo\b/i, /^sandy\b/i, /^shelley\b/i];

let mode = null;          // promesse : 'mac' | 'fichier' | 'navigateur'
let tour = 0;             // numéro de la phrase en cours : une phrase plus récente annule les précédentes
let lecteur = null;       // lecture d'un fichier audio
let utterance = null;     // phrase du navigateur, gardée en mémoire sinon « fin » n'arrive pas toujours
let macParle = false;
const ecouteurs = new Set();

function choisirMode() {
  if (!mode) {
    mode = fetch('/api/voix/info').then((r) => r.json())
      .then((i) => (i.mac ? 'mac' : i.voix ? 'fichier' : 'navigateur'))
      .catch(() => 'navigateur');
  }
  return mode;
}
choisirMode();

export const voixPossible = () => true;

export function voixActive() {
  try { return localStorage.getItem(CLE_VOIX) !== '0'; } catch { return true; }
}

/** Active ou coupe la voix partout dans le jeu. */
export function basculerVoix() {
  const active = !voixActive();
  try { localStorage.setItem(CLE_VOIX, active ? '1' : '0'); } catch { /* stockage indisponible */ }
  if (!active) taire();
  for (const f of ecouteurs) f(active);
  return active;
}

/** Prévient quand la voix est activée ou coupée (pour mettre les boutons à jour). */
export function surChangementVoix(f) {
  ecouteurs.add(f);
  return () => ecouteurs.delete(f);
}

const propre = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const adresse = (texte) => `/api/voix?t=${encodeURIComponent(propre(texte))}`;

/** Fait préparer une phrase à l'avance (seulement utile pour les fichiers audio). */
export async function preparer(texte) {
  if (texte && voixActive() && (await choisirMode()) === 'fichier') fetch(adresse(texte)).catch(() => {});
}

/** Lit le texte à voix haute ; fin() est appelée quand la phrase est terminée (tout de suite si la voix est coupée). */
export async function parler(texte, fin) {
  const t = propre(texte);
  arreterLocal();
  const moi = ++tour;
  if (!t || !voixActive()) { fin?.(); return; }
  const m = await choisirMode();
  if (moi !== tour) return;
  const terminer = () => { if (moi === tour) fin?.(); };

  if (m === 'mac') {
    macParle = true;
    try {
      const r = await fetch('/api/voix/dire', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texte: t, voix: param('coach.voix'), debit: param('coach.debit') }) });
      if (!r.ok) throw new Error();
      const { statut } = await r.json();
      if (moi === tour) macParle = false;
      if (statut === 'fin') terminer();
    } catch {
      if (moi !== tour) return;
      mode = Promise.resolve('fichier');
      parler(t, fin);
    }
    return;
  }

  if (m === 'fichier') {
    const a = new Audio(adresse(t));
    lecteur = a;
    a.onended = terminer;
    a.onerror = () => { if (lecteur === a) { mode = Promise.resolve('navigateur'); parlerNavigateur(t, terminer); } };
    a.play().catch((e) => { if (e.name !== 'AbortError' && lecteur === a) parlerNavigateur(t, terminer); });
    return;
  }
  parlerNavigateur(t, terminer);
}

function voixNavigateur() {
  const fr = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('fr'));
  for (const motif of VOIX_FEMMES) {
    const v = fr.find((x) => motif.test(x.name));
    if (v) return v;
  }
  return null;
}

function parlerNavigateur(texte, fin) {
  if (typeof speechSynthesis === 'undefined') { fin(); return; }
  speechSynthesis.cancel();
  utterance = new SpeechSynthesisUtterance(texte);
  utterance.lang = 'fr-FR';
  const voix = voixNavigateur();
  if (voix) utterance.voice = voix;
  utterance.rate = { lente: 0.85, normale: 1, rapide: 1.15 }[param('coach.debit')] || 1;
  const u = utterance;
  u.onend = () => { if (utterance === u) fin(); };
  speechSynthesis.speak(u);
}

function arreterLocal() {
  if (lecteur) { lecteur.onended = null; lecteur.onerror = null; lecteur.pause(); lecteur = null; }
  utterance = null;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/** Coupe la phrase en cours. */
export function taire() {
  tour++;
  arreterLocal();
  if (macParle) {
    macParle = false;
    fetch('/api/voix/taire', { method: 'POST' }).catch(() => {});
  }
}

// La page se ferme ou se recharge : le Mac se tait aussi
addEventListener('pagehide', () => { if (macParle) navigator.sendBeacon('/api/voix/taire'); });
if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices();
