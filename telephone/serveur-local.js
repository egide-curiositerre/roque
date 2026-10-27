// Serveur de Roque DANS le téléphone : mêmes adresses /api/… que server.js, même logique (entrainement.js),
// base SQLite en mémoire (sql.js), sauvegardée dans le téléphone (IndexedDB). Aucun réseau nécessaire.
import { SCHEMA } from '../serveur/schema.js';
import { creerEntrainement } from '../serveur/entrainement.js';
import { LECONS, MODULES } from '../serveur/lecons.js';
import { NOMS_THEMES, THEMES_TRAVAIL } from '../serveur/themes.js';
import { envelopper } from './base-navigateur.js';

const VERSION = '20261027105952';
// Mêmes choix que profils.js (un seul joueur sur le téléphone)
const AVATARS = ['♔', '♕', '♘', '♗', '♖', '🦁', '🐯', '🦊', '🐼', '🐸', '🦄', '🐙', '🚀', '⭐', '⚽', '🎮'];
const COULEURS = ['#81b64c', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#ec4899', '#64748b'];

let brute = null;   // base sql.js
let db = null;      // même interface que node:sqlite
let ent = null;

// ---------- Sauvegarde dans le téléphone (IndexedDB) ----------
const ouvrirStockage = () => new Promise((ok, ko) => {
  const r = indexedDB.open('roque', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('bases');
  r.onsuccess = () => ok(r.result);
  r.onerror = () => ko(r.error);
});
async function lireSauvegarde() {
  const idb = await ouvrirStockage();
  return new Promise((ok) => {
    const r = idb.transaction('bases').objectStore('bases').get('principal');
    r.onsuccess = () => ok(r.result || null);
    r.onerror = () => ok(null);
  });
}
async function ecrireSauvegarde(octets) {
  const idb = await ouvrirStockage();
  return new Promise((ok, ko) => {
    const t = idb.transaction('bases', 'readwrite');
    t.objectStore('bases').put(octets, 'principal');
    t.oncomplete = ok;
    t.onerror = () => ko(t.error);
  });
}

let minuteur = null;
export function sauverMaintenant() {
  clearTimeout(minuteur);
  minuteur = null;
  if (!brute) return Promise.resolve();
  const octets = brute.export();
  brute.exec('PRAGMA foreign_keys = ON;');   // export() remet les réglages de connexion à zéro
  return ecrireSauvegarde(octets).catch((e) => console.error('Sauvegarde impossible', e));
}
// Les écritures arrivent par rafales (une tentative = plusieurs requêtes) : une seule sauvegarde peu après
const planifierSauvegarde = () => { clearTimeout(minuteur); minuteur = setTimeout(sauverMaintenant, 800); };

/** Charge la base : la progression déjà enregistrée, sinon une base neuve avec tous les problèmes. */
export async function ouvrir(base) {
  const SQL = await window.initSqlJs({ locateFile: (f) => `${base}lib/sql.js/${f}` });
  let octets = await lireSauvegarde().catch(() => null);
  if (!octets) octets = new Uint8Array(await (await fetch(`${base}donnees/problemes.db`)).arrayBuffer());
  brute = new SQL.Database(octets);
  brute.exec(SCHEMA.replace('PRAGMA journal_mode = WAL;', ''));
  db = envelopper(brute, planifierSauvegarde);
  ent = creerEntrainement(db);
}

// ---------- Les adresses /api/… (copie de server.js, sans ce qui n'existe que sur le Mac) ----------
function profil() {
  const p = ent.reglage('profilTelephone', null) || { nom: 'Moi', avatar: '♔', couleur: COULEURS[0] };
  return { id: 'principal', ...p };
}

const ROUTES = [
  ['POST', /^\/journal$/, ({ corps }) => { console.error('[Roque]', corps?.message); return {}; }],
  ['GET', /^\/etat$/, () => ({ ...ent.etat(), profil: profil() })],
  ['POST', /^\/demarrer$/, ({ corps }) => ent.demarrer(corps.elo)],
  ['GET', /^\/probleme$/, ({ q }) => {
    const p = ent.probleme({ mode: q.mode, theme: q.theme, n: q.n, exclure: q.exclure, ecart: q.ecart });
    if (!p) throw new Error('Aucun problème disponible pour ce choix');
    return p;
  }],
  ['POST', /^\/tentative$/, ({ corps }) => ent.enregistrerTentative(corps)],
  ['GET', /^\/plan$/, () => ent.plan(LECONS)],
  ['GET', /^\/bilan$/, () => ({
    historique: ent.historique(),
    themes: ent.statsThemes(),
    activite: ent.activiteParJour(),
    parties: db.prepare('SELECT id, date, couleur, niveau_moteur, resultat, fin, precision, gaffes, erreurs, imprecisions FROM parties ORDER BY date DESC LIMIT 30').all(),
    totaux: db.prepare('SELECT COUNT(*) AS problemes, COALESCE(SUM(reussi), 0) AS reussis, COALESCE(SUM(duree_ms), 0) AS duree FROM tentatives').get(),
    rush: db.prepare('SELECT jour, MAX(score) AS score FROM rush GROUP BY jour ORDER BY jour DESC LIMIT 30').all(),
  })],
  ['GET', /^\/themes$/, () => ({ noms: NOMS_THEMES, travail: THEMES_TRAVAIL })],
  ['POST', /^\/partie$/, ({ corps }) => ent.enregistrerPartie(corps)],
  ['POST', /^\/partie\/(\d+)\/correction$/, ({ m, corps }) => ent.enregistrerAnalyse(m[1], corps)],
  ['GET', /^\/partie\/(\d+)$/, ({ m }) => {
    const p = db.prepare('SELECT * FROM parties WHERE id = ?').get(Number(m[1]));
    if (!p) throw new Error('Partie introuvable');
    return p;
  }],
  ['POST', /^\/rush$/, ({ corps }) => {
    const score = Math.max(0, Math.floor(Number(corps.score) || 0));
    const t = Date.now();
    db.prepare('INSERT INTO rush (date, jour, score) VALUES (?, ?, ?)').run(t, new Date(t).toLocaleDateString('sv-SE'), score);
    return { record: db.prepare('SELECT MAX(score) AS m FROM rush').get().m };
  }],
  ['GET', /^\/lecons$/, () => {
    const faites = new Set(db.prepare('SELECT lecon_id FROM lecons_faites').all().map((r) => r.lecon_id));
    return { modules: MODULES, lecons: LECONS.map(({ id, module, titre, resume }) => ({ id, module, titre, resume, faite: faites.has(id) })) };
  }],
  ['GET', /^\/lecons\/([\w-]+)$/, ({ m }) => {
    const l = LECONS.find((x) => x.id === m[1]);
    if (!l) throw new Error('Leçon introuvable');
    const i = LECONS.indexOf(l);
    return { ...l, suivante: LECONS[i + 1]?.id || null, precedente: LECONS[i - 1]?.id || null };
  }],
  ['POST', /^\/lecons\/([\w-]+)\/faite$/, ({ m }) => {
    if (!LECONS.some((x) => x.id === m[1])) throw new Error('Leçon introuvable');
    const t = Date.now();
    db.prepare(`INSERT INTO lecons_faites (lecon_id, date, jour) VALUES (?, ?, ?)
      ON CONFLICT(lecon_id) DO UPDATE SET date = excluded.date, jour = excluded.jour`).run(m[1], t, new Date(t).toLocaleDateString('sv-SE'));
    return { ok: true };
  }],
  ['GET', /^\/parametres$/, () => ent.reglage('parametres', {}) || {}],
  ['POST', /^\/parametres$/, ({ corps }) => {
    const actuels = ent.reglage('parametres', {}) || {};
    for (const [cle, valeur] of Object.entries(corps || {})) {
      if (!/^[a-z]+(\.[a-zA-Z]+)?$/.test(cle) || cle.length > 40) continue;
      if (!['string', 'number', 'boolean'].includes(typeof valeur) || String(valeur).length > 2000) continue;
      actuels[cle] = valeur;
    }
    ent.definir('parametres', actuels);
    return actuels;
  }],
  ['POST', /^\/reinitialiser$/, () => {
    db.exec(`DELETE FROM tentatives; DELETE FROM revisions; DELETE FROM parties; DELETE FROM rush;
      DELETE FROM lecons_faites; DELETE FROM quotidien; DELETE FROM reglages WHERE cle NOT IN ('parametres', 'profilTelephone');`);
    return { ok: true };
  }],
  ['POST', /^\/notifications\/essai$/, () => ({ ok: false })],
  ['GET', /^\/apropos$/, () => ({ version: VERSION, apps: [] })],
  ['POST', /^\/vider-cache-voix$/, () => ({ ok: true })],
  // Un seul joueur sur le téléphone : son nom, son avatar et sa couleur restent modifiables
  ['GET', /^\/profils$/, () => {
    const e = ent.etat();
    return { profils: [{ ...profil(), configure: e.configure, elo: e.elo, niveau: e.niveau, serie: e.serie }], actif: 'principal', avatars: AVATARS, couleurs: COULEURS };
  }],
  ['POST', /^\/profils$/, () => { throw new Error('Sur le téléphone, il y a un seul joueur.'); }],
  ['POST', /^\/profils\/([\w-]+)$/, ({ corps }) => {
    const p = profil();
    const nom = String(corps.nom ?? p.nom).replace(/\s+/g, ' ').trim().slice(0, 24);
    if (!nom) throw new Error('Choisis un prénom ou un pseudo');
    const nouveau = { nom, avatar: AVATARS.includes(corps.avatar) ? corps.avatar : p.avatar, couleur: COULEURS.includes(corps.couleur) ? corps.couleur : p.couleur };
    ent.definir('profilTelephone', nouveau);
    return { id: 'principal', ...nouveau };
  }],
  ['DELETE', /^\/profils\/([\w-]+)$/, () => { throw new Error('Sur le téléphone, il y a un seul joueur.'); }],
  // Voix : pas de Mac ici, c'est la voix française de l'iPhone qui parle (mode « navigateur » de voix.js)
  ['GET', /^\/voix\/info$/, () => ({ mac: false, voixMac: null, voix: false, choix: [] })],
  ['POST', /^\/voix\/taire$/, () => ({ ok: true })],
];

/** Répond à une requête /api/… : { statut, donnees } */
export function repondre(methode, chemin, q, corps) {
  for (const [m, motif, f] of ROUTES) {
    const r = motif.exec(chemin);
    if (r && m === methode) {
      try {
        return { statut: 200, donnees: f({ m: r, q, corps }) };
      } catch (e) {
        return { statut: 400, donnees: { erreur: e.message } };
      }
    }
  }
  return { statut: 404, donnees: { erreur: 'Indisponible sur le téléphone' } };
}
