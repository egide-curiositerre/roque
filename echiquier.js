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

// Position où c'est à `couleur` de jouer (pour enchaîner des prémoves : l'adversaire « passe » son tour)
function auTraitDe(fen, couleur) {
  const champs = fen.split(' ');
  champs[1] = couleur;
  champs[3] = '-';
  try { return new Chess(champs.join(' ')); } catch { return null; }
}

function essayer(jeu, coup) {
  try { return jeu.move(coup); } catch { return null; }   // chess.js lève une erreur sur un coup illégal
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
    this.couleurPremoves = null;   // camp du joueur qui peut jouer à l'avance (null : prémoves désactivés)
    this.premoves = [];            // file de prémoves, sans limite : { from, to, promotion }
    const zone = document.createElement('div');
    cadre.appendChild(zone);
    // Rappel du nombre de prémoves (ne bloque aucun clic : on annule en touchant une case vide)
    this.infoPremoves = document.createElement('div');
    this.infoPremoves.className = 'info-premoves';
    this.infoPremoves.hidden = true;
    cadre.appendChild(this.infoPremoves);
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
      events: { select: (cle) => { this.#clicPourAnnuler(cle); this.clicCase?.(cle); } },
    });
    this.#synchroniser();
  }

  get fen() { return this.jeu.fen(); }
  get trait() { return this.jeu.turn(); }

  charger(fen, { orientation, dernierCoup } = {}) {
    this.premoves = [];
    this.jeu = new Chess(fen === 'start' ? DEPART : fen);
    this.cg.set({ fen: this.jeu.fen(), lastMove: dernierCoup || undefined, ...(orientation ? { orientation } : {}) });
    this.cg.setAutoShapes([]);
    this.#synchroniser();
  }

  // Qui peut bouger les pièces : 'w', 'b', 'les-deux' ou null (plateau figé)
  autoriser(joueur) {
    this.joueur = joueur;
    // C'est de nouveau au joueur : son prochain prémove part tout seul
    if (joueur && joueur === this.couleurPremoves && this.premoves.length) setTimeout(() => this.#jouerPremove(), 90);
    this.#synchroniser();
  }

  // Prémoves (Jouer, Entraînement) : le joueur peut jouer ses coups à l'avance pendant que l'adversaire réfléchit,
  // autant qu'il veut. Réglage Paramètres > Jouer > Prémoves.
  activerPremoves(couleur) {
    this.couleurPremoves = couleur && param('jouer.premoves') ? couleur : null;
    this.premoves = [];
    this.#synchroniser();
  }

  annulerPremoves() {
    if (!this.premoves.length) return;
    this.premoves = [];
    this.cg.set({ fen: this.jeu.fen() });
    this.#synchroniser();
  }

  // Toucher une case vide ou une pièce adverse (hors coup possible) annule les prémoves, comme sur chess.com
  #clicPourAnnuler(cle) {
    if (!this.premoves.length || !cle) return;
    const s = this.cg.state;
    if (s.selected && s.movable.dests?.get(s.selected)?.includes(cle)) return;   // c'est un coup, pas une annulation
    if (s.pieces.get(cle)?.color === couleurLongue(this.couleurPremoves)) return;  // on prend une de ses pièces
    this.annulerPremoves();
  }

  // Position affichée pendant les prémoves : la vraie position + les prémoves en attente.
  // Un prémove devenu impossible (l'adversaire a changé la position) annule toute la suite, comme sur chess.com.
  #jeuVirtuel() {
    let jeu = auTraitDe(this.jeu.fen(), this.couleurPremoves);
    for (let i = 0; jeu && i < this.premoves.length; i++) {
      if (!essayer(jeu, this.premoves[i])) { this.premoves = this.premoves.slice(0, i); break; }
      jeu = auTraitDe(jeu.fen(), this.couleurPremoves);
    }
    return jeu;
  }

  #jouerPremove() {
    if (!this.premoves.length || this.joueur !== this.couleurPremoves || this.jeu.turn() !== this.couleurPremoves || this.jeu.isGameOver()) return;
    const coup = essayer(this.jeu, this.premoves.shift());
    if (!coup) {   // l'adversaire a rendu le coup impossible : on abandonne la file
      this.premoves = [];
      this.cg.set({ fen: this.jeu.fen() });
      this.#synchroniser();
      return;
    }
    this.cg.set({ fen: this.jeu.fen(), lastMove: [coup.from, coup.to] });
    this.#synchroniser();
    jouerSon(this.jeu, coup);
    this.onCoup?.(coup, coup.from + coup.to + (coup.promotion || ''));
  }

  // Joue un coup UCI (par le programme : réponse adverse, solution, moteur)
  jouerUci(uci) {
    const coup = essayer(this.jeu, uciVersCoup(uci));
    if (!coup) return null;
    // Avec des prémoves en attente, l'échiquier affiché n'est pas la vraie position : il est recalculé plus bas
    if (!this.premoves.length) this.cg.move(coup.from, coup.to);
    // Prise en passant, roque, promotion : on recale l'affichage sur la position exacte
    if (coup.flags.match(/[epkq]/) || coup.promotion) this.cg.set({ fen: this.jeu.fen() });
    this.cg.set({ lastMove: [coup.from, coup.to] });
    this.#synchroniser();
    jouerSon(this.jeu, coup);
    return coup;
  }

  // Revient d'un coup en arrière (pour rejouer après une erreur dans un exercice)
  annuler() {
    this.premoves = [];
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
    // Pas le tour du joueur, mais il peut jouer à l'avance (sur la position « après ses prémoves »)
    const virtuel = !actif && this.couleurPremoves && !this.jeu.isGameOver() ? this.#jeuVirtuel() : null;
    if (this.premoves.length) this.cg.set({ fen: (virtuel || this.jeu).fen() });
    this.cg.set({
      turnColor: couleurLongue(virtuel ? this.couleurPremoves : this.jeu.turn()),
      check: this.jeu.inCheck(),
      highlight: { custom: new Map(this.premoves.flatMap((p) => [[p.from, 'premove-case'], [p.to, 'premove-case']])) },
      movable: {
        color: virtuel ? couleurLongue(this.couleurPremoves) : actif ? couleurLongue(this.jeu.turn()) : undefined,
        dests: virtuel ? destinations(virtuel) : actif && !this.jeu.isGameOver() ? destinations(this.jeu) : new Map(),
      },
    });
    this.infoPremoves.hidden = !this.premoves.length;
    this.infoPremoves.textContent = `${this.premoves.length} prémove${this.premoves.length > 1 ? 's' : ''} · touche une case vide pour annuler`;
  }

  async #apresCoupJoueur(from, to) {
    // Coup joué à l'avance : il rejoint la file et partira quand ce sera le tour du joueur
    if (this.couleurPremoves && !(this.joueur === this.jeu.turn() || this.joueur === 'les-deux')) {
      const virtuel = this.#jeuVirtuel();
      const piece = virtuel?.get(from);
      let promotion;
      if (piece?.type === 'p' && (to[1] === '8' || to[1] === '1')) promotion = param('plateau.promotionAuto') ? 'q' : await this.#choisirPromotion(piece.color);
      if (virtuel && essayer(virtuel, { from, to, promotion })) this.premoves.push({ from, to, promotion });
      this.#synchroniser();
      return;
    }
    const piece = this.jeu.get(from);
    let promotion;
    if (piece?.type === 'p' && (to[1] === '8' || to[1] === '1')) promotion = param('plateau.promotionAuto') ? 'q' : await this.#choisirPromotion(piece.color);
    const coup = essayer(this.jeu, { from, to, promotion });
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
