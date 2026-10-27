// Échiquier interactif : affichage chessground + règles chess.js + choix de la promotion
import { Chessground } from '/roque/lib/chessground/chessground.js';
import { Chess } from '/roque/lib/chess.js/chess.js';
import { son } from './sons.js';
import { param } from './parametres.js';
import { afficherPrises } from './prises.js';

// Paramètres > Échiquier > Vitesse des pièces (durée de l'animation en ms)
const DUREES = { aucune: 0, rapide: 100, normale: 200, lente: 380 };

export const DEPART = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const couleurLongue = (c) => (c === 'w' ? 'white' : 'black');

// Coups légaux au format chessground : Map(case de départ → [cases d'arrivée])
function destinations(jeu) {
  const dests = new Map();
  for (const c of jeu.moves({ verbose: true })) {
    if (!dests.has(c.from)) dests.set(c.from, []);
    dests.get(c.from).push(c.to);
  }
  return dests;
}

// Son adapté au coup qui vient d'être joué
function jouerSon(jeu, coup) {
  if (jeu.inCheck()) son.echec();
  else if (coup.captured) son.prise();
  else son.coup();
}

// Même son que pendant la partie, d'après la notation du coup (pour rejouer une partie déjà jouée)
export function sonDuCoup(coup) {
  if (/[+#]$/.test(coup.san)) son.echec();
  else if (coup.captured) son.prise();
  else son.coup();
}

export function uciVersCoup(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

export class Plateau {
  /**
   * @param {HTMLElement} cadre élément .plateau-cadre
   * @param {{fen?:string, orientation?:'white'|'black', joueur?:'w'|'b'|'les-deux'|null, onCoup?:(coup)=>void,
   *          prises?:{haut:HTMLElement, bas:HTMLElement}}} options  prises : lignes des pièces capturées (au-dessus / en dessous)
   */
  constructor(cadre, { fen = DEPART, orientation = 'white', joueur = null, onCoup = null, prises = null } = {}) {
    this.cadre = cadre;
    this.prises = prises;
    this.onCoup = onCoup;
    this.joueur = joueur;
    this.jeu = new Chess(fen);
    const zone = document.createElement('div');
    cadre.appendChild(zone);
    this.cg = Chessground(zone, {
      fen,
      orientation,
      coordinates: param('plateau.coordonnees'),
      animation: { enabled: param('plateau.animation') !== 'aucune', duration: DUREES[param('plateau.animation')] ?? 200 },
      highlight: { lastMove: param('plateau.dernierCoup'), check: true },
      premovable: { enabled: false },
      draggable: { showGhost: true },
      movable: { free: false, showDests: param('plateau.coupsPossibles'), events: { after: (o, d) => this.#apresCoupJoueur(o, d) } },
      drawable: { enabled: true, visible: true },
      events: { select: (cle) => this.clicCase?.(cle) },
    });
    this.#synchroniser();
  }

  get fen() { return this.jeu.fen(); }
  get trait() { return this.jeu.turn(); }

  charger(fen, { orientation, dernierCoup } = {}) {
    this.jeu = new Chess(fen === 'start' ? DEPART : fen);
    this.cg.set({ fen: this.jeu.fen(), lastMove: dernierCoup || undefined, ...(orientation ? { orientation } : {}) });
    this.cg.setAutoShapes([]);
    this.#synchroniser();
  }

  // Qui peut bouger les pièces : 'w', 'b', 'les-deux' ou null (plateau figé)
  autoriser(joueur) {
    this.joueur = joueur;
    this.#synchroniser();
  }

  // Joue un coup UCI (par le programme : réponse adverse, solution, moteur)
  jouerUci(uci) {
    const coup = this.jeu.move(uciVersCoup(uci));
    if (!coup) return null;
    this.cg.move(coup.from, coup.to);
    // Prise en passant, roque, promotion : on recale l'affichage sur la position exacte
    if (coup.flags.match(/[epkq]/) || coup.promotion) this.cg.set({ fen: this.jeu.fen() });
    this.cg.set({ lastMove: [coup.from, coup.to] });
    this.#synchroniser();
    jouerSon(this.jeu, coup);
    return coup;
  }

  // Revient d'un coup en arrière (pour rejouer après une erreur dans un exercice)
  annuler() {
    this.jeu.undo();
    this.cg.set({ fen: this.jeu.fen(), lastMove: undefined });
    this.#synchroniser();
  }

  fleches(formes) { this.cg.setAutoShapes(formes || []); }

  // Exercices sur les cases : clic sur une case (f(case) ou null pour arrêter), pièces posées
  // librement sans les règles du jeu (pas besoin de rois), coordonnées masquées
  surClicCase(f) { this.clicCase = f; }
  poser(placement) {
    this.cg.set({ fen: placement, lastMove: undefined, selected: undefined, movable: { color: undefined, dests: new Map() } });
    this.cg.selectSquare(null);
  }
  masquerCoordonnees(oui) { this.cadre.classList.toggle('sans-coordonnees', oui); }
  orienter(orientation) { this.cg.set({ orientation }); this.#synchroniser(); }

  #synchroniser() {
    // Pièces prises : la ligne du bas est celle du camp affiché en bas de l'échiquier
    if (this.prises) afficherPrises(this.jeu, this.cg.state.orientation === 'white' ? 'w' : 'b', this.prises.bas, this.prises.haut);
    const actif = this.joueur === 'les-deux' || this.joueur === this.jeu.turn();
    this.cg.set({
      turnColor: couleurLongue(this.jeu.turn()),
      check: this.jeu.inCheck(),
      movable: {
        color: actif ? couleurLongue(this.jeu.turn()) : undefined,
        dests: actif && !this.jeu.isGameOver() ? destinations(this.jeu) : new Map(),
      },
    });
  }

  async #apresCoupJoueur(from, to) {
    const piece = this.jeu.get(from);
    let promotion;
    if (piece?.type === 'p' && (to[1] === '8' || to[1] === '1')) promotion = param('plateau.promotionAuto') ? 'q' : await this.#choisirPromotion(piece.color);
    const coup = this.jeu.move({ from, to, promotion });
    if (!coup) { this.#synchroniser(); return; }
    if (coup.flags.match(/[epkq]/) || coup.promotion) this.cg.set({ fen: this.jeu.fen() });
    this.#synchroniser();
    jouerSon(this.jeu, coup);
    this.onCoup?.(coup, from + to + (coup.promotion || ''));
  }

  #choisirPromotion(couleur) {
    return new Promise((resolve) => {
      const voile = document.createElement('div');
      voile.className = 'promotion';
      const choix = couleur === 'w' ? ['♕', '♖', '♗', '♘'] : ['♛', '♜', '♝', '♞'];
      voile.innerHTML = `<div>${['q', 'r', 'b', 'n'].map((p, i) =>
        `<button data-p="${p}" aria-label="${['Dame', 'Tour', 'Fou', 'Cavalier'][i]}" style="font-size:44px">${choix[i]}</button>`).join('')}</div>`;
      voile.addEventListener('click', (e) => {
        const p = e.target.closest('button')?.dataset.p || 'q';
        voile.remove();
        resolve(p);
      });
      this.cadre.appendChild(voile);
    });
  }
}
