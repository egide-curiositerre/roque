// Exercice « reproduire l'ouverture de mémoire » : le joueur joue son camp dans l'ordre, l'adversaire répond tout seul.
// Utilisé par l'étape « reproduction » des leçons et par l'écran « Réviser mes ouvertures ».
import { parler } from './voix.js';
import { son } from './sons.js';

/**
 * @param plateau  le Plateau (son onCoup doit appeler reproduction.coup(uci))
 * @param opts     { coups (UCI), cote ('white'|'black'), statut (élément), surFin(bilan) }
 */
export function creerReproduction(plateau, { coups, cote, statut, surFin }) {
  const moi = cote === 'white' ? 'w' : 'b';
  const minuteurs = new Set();
  const plusTard = (f, ms) => { const t = setTimeout(() => { minuteurs.delete(t); f(); }, ms); minuteurs.add(t); };
  let index = 0, erreurs = 0, indices = 0, fini = false;

  const dire = (texte, classe = 'statut') => { statut.textContent = texte; statut.className = classe; };

  function adversaire() {
    plateau.autoriser(null);
    plusTard(() => {
      plateau.jouerUci(coups[index]);
      index++;
      if (index >= coups.length) return finir();
      plateau.fleches([]);
      plateau.autoriser(moi);
      dire(`À toi (${cote === 'white' ? 'Blancs' : 'Noirs'}) : quel est le prochain coup ?`);
    }, 600);
  }

  function finir() {
    fini = true;
    plateau.autoriser(null);
    plateau.fleches([]);
    const parfait = erreurs === 0 && indices === 0;
    const note = parfait ? 'Sans aucune faute ni indice : ouverture parfaitement mémorisée !'
      : `${erreurs} erreur${erreurs > 1 ? 's' : ''}, ${indices} indice${indices > 1 ? 's' : ''} : refais-la pour viser le sans-faute.`;
    son.succes();
    dire(`✓ Ouverture terminée ! ${note}`, 'statut vert');
    parler(`Ouverture terminée ! ${note}`);
    surFin?.({ erreurs, indices, parfait });
  }

  return {
    demarrer() {
      index = 0; erreurs = 0; indices = 0; fini = false;
      minuteurs.forEach(clearTimeout); minuteurs.clear();
      plateau.charger('start', { orientation: cote });
      plateau.fleches([]);
      if (moi === 'b') { dire('Les Blancs commencent…'); adversaire(); }
      else { plateau.autoriser(moi); dire('À toi (Blancs) : joue le premier coup de l\'ouverture.'); }
    },
    // Appelé après chaque coup du joueur (le trait est déjà passé à l'adversaire)
    coup(uci) {
      if (fini || plateau.trait === moi) return;
      if (uci === coups[index]) {
        index++;
        plateau.fleches([]);
        if (index >= coups.length) return finir();
        dire('✓ Bon coup…', 'statut vert');
        return adversaire();
      }
      erreurs++;
      son.erreur();
      dire('✗ Ce n\'est pas le coup de l\'ouverture. Réessaie !', 'statut rouge');
      parler('Ce n\'est pas le coup de l\'ouverture. Réessaie !');
      plateau.autoriser(null);
      plusTard(() => { plateau.annuler(); plateau.autoriser(moi); }, 700);
    },
    // Montre le coup attendu (compte comme une aide)
    indice() {
      if (fini || plateau.trait !== moi) return;
      indices++;
      const c = coups[index];
      plateau.fleches([{ orig: c.slice(0, 2), dest: c.slice(2, 4), brush: 'green' }]);
      dire(`Indice : joue de ${c.slice(0, 2)} vers ${c.slice(2, 4)}.`);
    },
    arreter() { minuteurs.forEach(clearTimeout); minuteurs.clear(); fini = true; },
  };
}
