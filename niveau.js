// Choix du niveau de départ, affiché sur place par toute page qui en a besoin
import { api } from './outils.js';
import { ICONES } from './icones.js';
import { parler } from './voix.js';

const NIVEAUX = [
  { elo: 400, titre: 'Je découvre les échecs', detail: 'Je connais à peine les règles', icone: '🌱' },
  { elo: 800, titre: 'Débutant', detail: 'Je connais les règles, je joue de temps en temps', icone: '♙' },
  { elo: 1200, titre: 'Intermédiaire', detail: 'Je joue régulièrement, je connais quelques ouvertures', icone: '♘' },
  { elo: 1600, titre: 'Confirmé', detail: 'Je joue en club, ou plus de 1500 en ligne', icone: '♗' },
  { elo: 2000, titre: 'Fort', detail: 'Plus de 1900 en ligne', icone: '♕' },
];

/** Affiche le choix du niveau, puis appelle apres() une fois le niveau enregistré. */
export function choisirNiveau(main, apres) {
  main.innerHTML = `
    <div class="carte heros" style="max-width:720px;margin:10px auto;grid-template-columns:1fr">
      <div>
        <div class="surtitre">Bienvenue</div>
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
          <h1>Commençons par ton niveau</h1>
          <button class="bouton-ecoute" id="ecouter-niveau" title="Écouter">${ICONES.son}</button>
        </div>
        <p class="doux">Choisis ce qui te ressemble le plus. Aucune pression : ton classement se corrige tout seul
        en quelques dizaines de problèmes, et il mesurera ensuite ton vrai niveau, jour après jour.</p>
        <div class="choix-niveau">
          ${NIVEAUX.map((n) => `<button data-elo="${n.elo}">
            <span style="font-size:28px;width:34px;text-align:center">${n.icone}</span>
            <span><strong>${n.titre}</strong><br><span class="doux petit-texte">${n.detail}</span></span>
            <span class="niveau-elo">~${n.elo}</span></button>`).join('')}
        </div>
      </div>
    </div>`;
  main.querySelector('#ecouter-niveau').addEventListener('click', () => parler(
    `Commençons par ton niveau. Choisis ce qui te ressemble le plus : ${NIVEAUX.map((n) => `${n.titre}, ${n.detail.toLowerCase()}`).join(' ; ')}. Aucune pression : ton classement se corrige tout seul.`));
  main.querySelector('.choix-niveau').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    b.disabled = true;
    b.innerHTML += ` ${ICONES.coche}`;
    await api('/demarrer', { elo: Number(b.dataset.elo) });
    apres(Number(b.dataset.elo));
  });
}
