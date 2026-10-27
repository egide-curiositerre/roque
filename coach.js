// Coach : explique chaque coup en français, à l'écrit et à voix haute
import { Chess } from '/roque/lib/chess.js/chess.js';
import { echapper, sanFr } from './outils.js';

// La voix (voix de femme, commune à tout le jeu) est dans voix.js
export { parler, taire, preparer, voixActive, basculerVoix, voixPossible } from './voix.js';

// ---------- Description des coups ----------
const PIECES = { p: ['pion', false], n: ['cavalier', false], b: ['fou', false], r: ['tour', true], q: ['dame', true], k: ['roi', false] };
export const VALEURS = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const LETTRES = { a: 'a', b: 'bé', c: 'cé', d: 'dé', e: 'e', f: 'èf', g: 'gé', h: 'hache' };

// Chaque texte existe en deux versions : à lire (cases « e4 ») et à dire (« e 4 », « cé 5 »)
export const kase = (c, oral) => (oral ? `${LETTRES[c[0]]} ${c[1]}` : c);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function piece(type, couleur, moi) {
  const [nom, feminin] = PIECES[type];
  if (couleur === moi) return `${feminin ? 'ta' : 'ton'} ${nom}`;
  return `${feminin ? 'sa' : 'son'} ${nom}`;
}

/** Phrase complète : « Tu prends son fou en c4 avec ton cavalier, échec ! » */
function phraseCoup(c, moi, oral) {
  const toi = c.color === moi;
  const sujet = toi ? 'Tu' : "L'ordinateur";
  const v = (tu, il) => (toi ? tu : il);
  const adverse = c.color === 'w' ? 'b' : 'w';
  let s;
  if (c.flags.includes('k')) s = `${sujet} ${v('fais', 'fait')} le petit roque`;
  else if (c.flags.includes('q')) s = `${sujet} ${v('fais', 'fait')} le grand roque`;
  else if (c.flags.includes('e')) s = `${sujet} ${v('prends', 'prend')} le pion en passant, en ${kase(c.to, oral)}`;
  else if (c.captured) s = `${sujet} ${v('prends', 'prend')} ${piece(c.captured, adverse, moi)} en ${kase(c.to, oral)} avec ${piece(c.piece, c.color, moi)}`;
  else s = `${sujet} ${v('joues', 'joue')} ${piece(c.piece, c.color, moi)} en ${kase(c.to, oral)}`;
  if (c.promotion) s += ` et ${v('le transformes', 'le transforme')} en ${PIECES[c.promotion][0]}`;
  if (c.san.endsWith('#')) return `${s}. Échec et mat !`;
  return c.san.endsWith('+') ? `${s}, échec !` : `${s}.`;
}

/** Nom court d'un coup dans une phrase : « Cxe5 » à l'écrit, « cavalier prend en e 5 » à l'oral. */
export function nomCoup(c, oral) {
  if (!oral) return `<strong>${echapper(sanFr(c.san))}</strong>`;
  let s;
  if (c.flags.includes('k')) s = 'le petit roque';
  else if (c.flags.includes('q')) s = 'le grand roque';
  else s = `${PIECES[c.piece][0]} ${c.captured ? 'prend' : ''} en ${kase(c.to, true)}`.replace('  ', ' ');
  if (c.promotion) s += ` promotion ${PIECES[c.promotion][0]}`;
  if (c.san.endsWith('#')) s += ', échec et mat';
  else if (c.san.endsWith('+')) s += ', échec';
  return s;
}

/** Rejoue une ligne du moteur (coups UCI) et renvoie les coups détaillés. */
export function rejouer(fen, pv, max = 6) {
  const jeu = new Chess(fen);
  const sortie = [];
  for (const uci of (pv || []).slice(0, max)) {
    try { sortie.push(jeu.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })); } catch { break; }
  }
  return sortie;
}

/** Matériel gagné (positif) ou perdu (négatif) par « couleur » le long d'une ligne, arrêtée sur un nombre pair de demi-coups. */
export function bilanMateriel(coups, couleur) {
  const n = coups.length >= 2 ? Math.min(4, coups.length - (coups.length % 2)) : coups.length;
  let bilan = 0;
  for (const c of coups.slice(0, n)) {
    if (!c.captured) continue;
    bilan += (c.color === couleur ? 1 : -1) * VALEURS[c.captured];
  }
  return bilan;
}

export function quoi(valeur, possessifDame) {
  if (valeur >= 8) return possessifDame;
  if (valeur >= 4.5) return 'une tour';
  if (valeur >= 2) return 'une pièce';
  return valeur >= 1.5 ? 'deux pions' : 'un pion';
}

/** Situation du point de vue du joueur, d'après son pourcentage de chances de gain. */
export function situation(gain) {
  if (gain >= 90) return 'tu as une position gagnante';
  if (gain >= 70) return 'tu as un net avantage';
  if (gain >= 57) return 'tu as un léger avantage';
  if (gain > 43) return 'la position est équilibrée';
  if (gain > 30) return "l'ordinateur a un léger avantage";
  if (gain > 10) return "l'ordinateur a un net avantage";
  return 'ta position est perdante';
}

const SEUILS = [{ min: 15, cle: 'gaffe', nom: 'Gaffe', signe: '??' }, { min: 10, cle: 'erreur', nom: 'Erreur', signe: '?' }, { min: 5, cle: 'imprecision', nom: 'Imprécision', signe: '?!' }];

/**
 * Explication du coup n° k (0 = premier coup de la partie).
 * evals[i] = { ligne, trait, gainBlancs } pour chaque position (null si pas encore analysée).
 * @returns {{ html: string, oral: string, verdict: {cle, nom, signe?}|null, alternative: string|null }}
 */
export function expliquer(k, { coups, positions, evals, moi }) {
  const c = coups[k];
  const toi = c.color === moi;
  const morceaux = [];   // chaque morceau : (oral) => texte
  const dire = (f) => morceaux.push(f);
  const rendu = () => ({ html: morceaux.map((f) => f(false)).join(' '), oral: morceaux.map((f) => f(true)).join(' ') });

  dire((oral) => phraseCoup(c, moi, oral));
  const avant = evals[k];
  const apres = evals[k + 1];
  if (!avant || !apres) {
    dire(() => "J'analyse encore ce coup…");
    return { ...rendu(), verdict: null, alternative: null };
  }

  // Perte de chances de gain pour le camp qui vient de jouer
  const gainCamp = (e) => (c.color === 'w' ? e.gainBlancs : 100 - e.gainBlancs);
  const perte = Math.max(0, gainCamp(avant) - gainCamp(apres));
  const meilleurUci = avant.ligne.pv?.[0];
  const joue = c.from + c.to + (c.promotion || '');
  const force = new Chess(positions[k]).moves().length === 1;
  const ligneMeilleure = rejouer(positions[k], avant.ligne.pv);
  const reponse = rejouer(positions[k + 1], apres.ligne.pv);

  let verdict;
  if (c.san.endsWith('#')) verdict = { cle: 'meilleur', nom: 'Mat !' };
  else if (force) verdict = { cle: 'force', nom: 'Coup forcé' };
  else if (meilleurUci === joue) verdict = { cle: 'meilleur', nom: 'Meilleur coup' };
  else if (perte < 2) verdict = { cle: 'excellent', nom: 'Excellent coup' };
  else if (perte < 5) verdict = { cle: 'bon', nom: 'Bon coup' };
  else verdict = SEUILS.find((s) => perte >= s.min);

  const grave = ['imprecision', 'erreur', 'gaffe'].includes(verdict.cle);
  const alternative = !force && meilleurUci !== joue && perte >= 2 ? meilleurUci : null;

  if (c.san.endsWith('#')) return { ...rendu(), verdict, alternative: null };

  if (toi) {
    if (verdict.cle === 'meilleur') dire(() => "C'est exactement le coup que l'ordinateur aurait joué. Bravo !");
    else if (verdict.cle === 'excellent') dire(() => 'Très bon choix, presque aussi fort que le coup de l\'ordinateur.');
    else if (verdict.cle === 'bon' && ligneMeilleure[0]) dire((o) => `Correct, mais il y avait un peu mieux : ${nomCoup(ligneMeilleure[0], o)}.`);
    if (grave) {
      dire(() => `C'est ${verdict.cle === 'gaffe' ? 'une gaffe' : verdict.cle === 'erreur' ? 'une erreur' : 'une imprécision'} : tu perds ${Math.round(perte)} % de chances de gagner.`);
      // Pourquoi : ce que l'adversaire peut faire maintenant
      const pertes = -bilanMateriel(reponse, c.color);
      if (apres.ligne.mate === 1 && reponse[0]) dire((o) => `Maintenant, l'ordinateur peut faire mat tout de suite avec ${nomCoup(reponse[0], o)} !`);
      else if (apres.ligne.mate > 0) dire((o) => `Maintenant, l'ordinateur a un mat en ${pluriel(apres.ligne.mate, 'coup')}${reponse[0] ? `, en commençant par ${nomCoup(reponse[0], o)}` : ''}.`);
      else if (pertes >= 1 && reponse[0]) dire((o) => `Le problème : l'ordinateur peut répondre ${nomCoup(reponse[0], o)} et te gagner ${quoi(pertes, 'ta dame')}.`);
      else if (situation(gainCamp(avant)) === situation(gainCamp(apres))) dire(() => `Ce n'est pas grave, mais tu laisses passer une meilleure occasion.`);
      else dire(() => `Avant ce coup, ${situation(gainCamp(avant))} ; après, ${situation(gainCamp(apres))}.`);
      // Ce qu'il fallait jouer
      if (ligneMeilleure[0]) {
        const gainLigne = bilanMateriel(ligneMeilleure, c.color);
        if (avant.ligne.mate > 0) dire((o) => `Tu avais un mat en ${pluriel(avant.ligne.mate, 'coup')} avec ${nomCoup(ligneMeilleure[0], o)} !`);
        else if (gainLigne >= 1) dire((o) => `Il fallait jouer ${nomCoup(ligneMeilleure[0], o)}, qui gagnait ${quoi(gainLigne, 'la dame')}.`);
        else dire((o) => `Le meilleur coup était ${nomCoup(ligneMeilleure[0], o)}.`);
      }
    }
  } else if (grave) {
    // L'ordinateur s'est trompé : montrer comment en profiter
    dire(() => `L'ordinateur se trompe, c'est ${verdict.cle === 'gaffe' ? 'une gaffe' : verdict.cle === 'erreur' ? 'une erreur' : 'une imprécision'} !`);
    if (reponse[0]) {
      const gainLigne = bilanMateriel(reponse, moi);
      if (apres.ligne.mate > 0) dire((o) => `Tu peux faire mat en ${pluriel(apres.ligne.mate, 'coup')}, en commençant par ${nomCoup(reponse[0], o)}.`);
      else if (gainLigne >= 1) dire((o) => `Tu peux en profiter avec ${nomCoup(reponse[0], o)}, qui gagne ${quoi(gainLigne, 'sa dame')}.`);
      else dire((o) => `Le meilleur coup pour en profiter : ${nomCoup(reponse[0], o)}.`);
    }
  }

  // Bilan de la position après le coup, de ton point de vue
  const gainMoi = moi === 'w' ? apres.gainBlancs : 100 - apres.gainBlancs;
  if (apres.ligne.mate !== undefined && apres.ligne.pv?.length) {
    const auTrait = apres.trait === moi;
    const n = Math.abs(apres.ligne.mate);
    const pourMoi = (apres.ligne.mate > 0) === auTrait;
    if (!grave) dire(() => (pourMoi ? `Tu as un mat forcé en ${pluriel(n, 'coup')} !` : `Attention : l'ordinateur a un mat forcé en ${pluriel(n, 'coup')}.`));
  } else if (!grave || !toi) {
    const s = situation(gainMoi);
    dire(() => `${s[0].toUpperCase()}${s.slice(1)}.`);
  }
  return { ...rendu(), verdict, alternative };
}

/** Meilleur coup dans une position et la suite prévue par l'ordinateur. */
export function conseil(fen, ligne, moi) {
  const suite = rejouer(fen, ligne?.pv, 5);
  if (!suite.length) return null;
  const pourMoi = suite[0].color === moi;
  return {
    uci: ligne.pv[0],
    html: `${pourMoi ? 'Meilleur coup pour toi ici' : "Meilleur coup de l'ordinateur ici"} : <strong>${echapper(sanFr(suite[0].san))}</strong>
      ${suite.length > 1 ? `<span class="doux">· suite : ${suite.slice(1).map((c) => echapper(sanFr(c.san))).join(' ')}</span>` : ''}`,
    oral: `${pourMoi ? 'Ici, le meilleur coup pour toi est' : "Ici, le meilleur coup de l'ordinateur est"} ${nomCoup(suite[0], true)}.`,
  };
}

/**
 * Le coup est-il un sacrifice ? Après lui, l'adversaire peut prendre une pièce (cavalier ou plus)
 * avec une perte nette d'au moins 2 points pour nous, en tenant compte de ce que le coup a déjà pris
 * et d'une éventuelle reprise. Exemple : Fxf7+ suivi de Rxf7.
 */
export function estSacrifice(fen, uci) {
  const jeu = new Chess(fen);
  let c;
  try { c = jeu.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return false; }
  if (!c || jeu.isCheckmate()) return false;
  const deja = c.captured ? VALEURS[c.captured] : 0;
  for (const r of jeu.moves({ verbose: true })) {
    if (!r.captured || VALEURS[r.captured] < 3) continue;
    jeu.move(r);
    const reprise = jeu.moves({ verbose: true }).some((m) => m.to === r.to && m.captured);
    jeu.undo();
    const perte = VALEURS[r.captured] - (reprise ? VALEURS[r.piece] || 0 : 0);
    if (perte - deja >= 2) return true;
  }
  return false;
}

/** Ce que sacrifie le coup, pour l'expliquer : « ton fou », « ta dame »… (pièce la plus précieuse laissée en prise). */
export function pieceSacrifiee(fen, uci, moi) {
  const jeu = new Chess(fen);
  let c;
  try { c = jeu.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return null; }
  if (!c) return null;
  const prises = jeu.moves({ verbose: true }).filter((r) => r.captured && VALEURS[r.captured] >= 3)
    .sort((a, b) => VALEURS[b.captured] - VALEURS[a.captured]);
  return prises[0] ? piece(prises[0].captured, c.color, moi) : null;
}
