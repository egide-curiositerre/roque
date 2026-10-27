// Stockfish 19 (version « lite », un seul fil) dans un Web Worker, piloté en UCI.
// Fonctionne hors ligne : le moteur est servi par le serveur local.
let instance = null;

export function moteur() {
  if (!instance) instance = new Moteur();
  return instance;
}

class Moteur {
  constructor() {
    this.worker = new Worker('/roque/lib/stockfish/stockfish-19-lite-single.js');
    this.ecouteurs = new Set();
    this.worker.onmessage = (e) => { for (const f of [...this.ecouteurs]) f(String(e.data)); };
    this.file = Promise.resolve();
    this.pret = this.#attendre('uciok', () => this.envoyer('uci')).then(() => this.#prepare());
  }

  envoyer(cmd) { this.worker.postMessage(cmd); }

  #attendre(motCle, avant) {
    return new Promise((resolve) => {
      const f = (ligne) => {
        if (ligne.startsWith(motCle)) {
          this.ecouteurs.delete(f);
          resolve(ligne);
        }
      };
      this.ecouteurs.add(f);
      avant?.();
    });
  }

  #prepare() {
    return this.#attendre('readyok', () => this.envoyer('isready'));
  }

  // Les demandes passent l'une après l'autre (le moteur ne fait qu'une recherche à la fois)
  #enFile(tache) {
    const p = this.file.then(() => this.pret).then(tache);
    this.file = p.catch(() => {});
    return p;
  }

  /**
   * Analyse une position.
   * @returns {Promise<{lignes: {multipv:number, cp?:number, mate?:number, pv:string[], profondeur:number}[], meilleur:string}>}
   * Les scores sont donnés du point de vue du camp qui a le trait.
   */
  analyser(fen, { profondeur = 12, multipv = 1, tempsMs = null, elo = null } = {}) {
    return this.#enFile(async () => {
      const lignes = new Map();
      if (elo) {
        this.envoyer('setoption name UCI_LimitStrength value true');
        this.envoyer(`setoption name UCI_Elo value ${elo}`);
      } else {
        this.envoyer('setoption name UCI_LimitStrength value false');
      }
      this.envoyer(`setoption name MultiPV value ${multipv}`);
      await this.#prepare();
      const collecte = (l) => {
        if (!l.startsWith('info') || !l.includes(' pv ')) return;
        const m = l.match(/multipv (\d+)/);
        const n = m ? Number(m[1]) : 1;
        const cp = l.match(/score cp (-?\d+)/);
        const mate = l.match(/score mate (-?\d+)/);
        const prof = l.match(/ depth (\d+)/);
        lignes.set(n, {
          multipv: n,
          ...(cp ? { cp: Number(cp[1]) } : {}),
          ...(mate ? { mate: Number(mate[1]) } : {}),
          pv: l.split(' pv ')[1].trim().split(' '),
          profondeur: prof ? Number(prof[1]) : 0,
        });
      };
      this.ecouteurs.add(collecte);
      this.envoyer(`position fen ${fen}`);
      const fin = await this.#attendre('bestmove', () =>
        this.envoyer(tempsMs ? `go movetime ${tempsMs}` : `go depth ${profondeur}`));
      this.ecouteurs.delete(collecte);
      const meilleur = fin.split(' ')[1];
      return { lignes: [...lignes.values()].sort((a, b) => a.multipv - b.multipv), meilleur: meilleur === '(none)' ? null : meilleur };
    });
  }
}

// Probabilité de gain (0 à 100) à partir d'une évaluation, formule utilisée par Lichess
export function pourcentageGain(ligne) {
  if (!ligne) return 50;
  if (ligne.mate !== undefined) return ligne.mate > 0 ? 100 : 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * ligne.cp)) - 1);
}

export function texteEval(ligne, trait) {
  if (!ligne) return '…';
  // Affichage toujours du point de vue des Blancs
  const signe = trait === 'w' ? 1 : -1;
  if (ligne.mate !== undefined) return `#${ligne.mate * signe}`;
  const v = (ligne.cp * signe) / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
}
