// Pièces prises par chaque joueur, avec l'avantage matériel (« +3 ») après la dernière pièce, comme chess.com
import { VALEURS } from './coach.js';

const DEPART = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const NOMS = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };   // classes des dessins de l'échiquier

/** Remplit les deux lignes : `elMoi` (pièces que j'ai prises) et `elAdverse` (celles que l'adversaire a prises). */
export function afficherPrises(jeu, moi, elMoi, elAdverse) {
  const reste = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const rangee of jeu.board()) for (const p of rangee) if (p && p.type !== 'k') reste[p.color][p.type]++;
  const materiel = (c) => Object.entries(reste[c]).reduce((s, [t, n]) => s + VALEURS[t] * n, 0);
  const html = (prisPar) => {
    const victime = prisPar === 'w' ? 'b' : 'w';
    // Un groupe par type (pions, cavaliers, fous, tours, dame), pièces d'un même groupe qui se chevauchent ;
    // une promotion peut faire dépasser le compte de départ : on ne descend jamais sous zéro
    const couleur = victime === 'w' ? 'white' : 'black';
    const groupes = ['p', 'n', 'b', 'r', 'q'].map((t) => {
      const n = Math.max(0, DEPART[t] - reste[victime][t]);
      return n ? `<span class="groupe">${`<piece class="${NOMS[t]} ${couleur}"></piece>`.repeat(n)}</span>` : '';
    }).join('');
    const ecart = materiel(prisPar) - materiel(victime);
    return `<span class="pieces-prises cg-wrap">${groupes}</span>${ecart > 0 ? `<span class="ecart">+${ecart}</span>` : ''}`;
  };
  elMoi.innerHTML = html(moi);
  elAdverse.innerHTML = html(moi === 'w' ? 'b' : 'w');
}
