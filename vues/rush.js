// Rush : un maximum de problèmes en 3 minutes, difficulté croissante, 3 erreurs et c'est fini
import { Plateau } from '../echiquier.js';
import { api } from '../outils.js';
import { ICONES } from '../icones.js';
import { son, confettis } from '../sons.js';
import { choisirNiveau } from '../niveau.js';
import { parler, taire } from '../voix.js';

const DUREE_MS = 3 * 60 * 1000;

export async function vueRush(main) {
  const etat = await api('/etat');
  if (!etat.configure) return choisirNiveau(main, () => vueRush(main));
  main.innerHTML = `
    <div class="entete-page"><div><div class="surtitre">Défi chronométré</div><h1>Rush</h1><p class="doux">3 minutes, 3 erreurs. Les problèmes deviennent de plus en plus difficiles.</p></div></div>
    <div class="zone-jeu">
      <div class="colonne-jeu">
        <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-haut"></span></div>
        <div class="plateau-cadre" id="plateau"></div>
        <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-bas"></span></div>
      </div>
      <aside class="panneau">
        <div class="carte" style="display:flex;justify-content:space-between;align-items:center">
          <div><div class="doux petit-texte">Temps</div><div class="chrono" id="chrono">3:00</div></div>
          <div style="text-align:right"><div class="doux petit-texte">Score</div><div class="chrono" id="score">0</div></div>
        </div>
        <div class="carte"><div class="doux petit-texte">Erreurs</div><div class="vies" id="vies">○ ○ ○</div>
          <div class="statut" id="statut" style="margin-top:8px">Prêt ?</div></div>
        <button class="bouton large" id="demarrer">${ICONES.rush} Démarrer le Rush</button>
        <div class="carte doux petit-texte">Ton record : <strong id="record" style="color:var(--or)">${etat.recordRush}</strong></div>
      </aside>
    </div>`;
  const $ = (id) => main.querySelector(`#${id}`);

  let p = null, index = 0, couleur = 'w', score = 0, erreurs = 0, fin = 0, enCours = false, precedent = '';
  const minuteurs = new Set();
  const plusTard = (f, ms) => { const t = setTimeout(() => { minuteurs.delete(t); f(); }, ms); minuteurs.add(t); };
  let horloge = null;

  const plateau = new Plateau($('plateau'), { prises: { haut: $('prises-haut'), bas: $('prises-bas') }, onCoup: (coup, uci) => apresCoup(uci) });

  async function suivant() {
    if (!enCours) return;
    p = await api(`/probleme?mode=rush&n=${score + erreurs}&exclure=${precedent}`);
    precedent = p.id;
    index = 0;
    couleur = p.fen.split(' ')[1] === 'w' ? 'b' : 'w';
    plateau.charger(p.fen, { orientation: couleur === 'w' ? 'white' : 'black' });
    plateau.autoriser(null);
    $('statut').textContent = `Aux ${couleur === 'w' ? 'Blancs' : 'Noirs'} de jouer`;
    plusTard(() => { plateau.jouerUci(p.coups[0]); index = 1; plateau.autoriser(couleur); }, 300);
  }

  function apresCoup(uci) {
    if (!enCours) return;
    if (uci === p.coups[index] || plateau.jeu.isCheckmate()) {
      index++;
      if (index >= p.coups.length || plateau.jeu.isCheckmate()) {
        score++;
        $('score').textContent = score;
        son.succes();
        api('/tentative', { id: p.id, reussi: true, mode: 'rush' });
        return suivant();
      }
      plateau.autoriser(null);
      plusTard(() => { plateau.jouerUci(p.coups[index]); index++; plateau.autoriser(couleur); }, 250);
    } else {
      erreurs++;
      son.erreur();
      $('plateau').classList.remove('erreur'); void $('plateau').offsetWidth; $('plateau').classList.add('erreur');
      $('vies').textContent = ['○ ○ ○', '✗ ○ ○', '✗ ✗ ○', '✗ ✗ ✗'][erreurs];
      api('/tentative', { id: p.id, reussi: false, mode: 'rush' });
      if (erreurs >= 3) return terminer('Trois erreurs');
      suivant();
    }
  }

  function tic() {
    const reste = Math.max(0, fin - Date.now());
    $('chrono').textContent = `${Math.floor(reste / 60000)}:${String(Math.floor((reste % 60000) / 1000)).padStart(2, '0')}`;
    if (reste <= 0) terminer('Temps écoulé');
  }

  async function terminer(raison) {
    if (!enCours) return;
    enCours = false;
    clearInterval(horloge);
    plateau.autoriser(null);
    const { record } = await api('/rush', { score });
    $('record').textContent = record;
    $('statut').textContent = `${raison} ! Score : ${score}${score >= record && score > 0 ? ' — nouveau record 🏆' : ''}`;
    if (score >= record && score > 0) confettis($('plateau'));
    $('demarrer').hidden = false;
    $('demarrer').textContent = 'Rejouer';
    const nouveau = score >= record && score > 0;
    parler(`${raison} ! Tu as résolu ${score} problème${score > 1 ? 's' : ''}.${nouveau ? ' C\'est un nouveau record, bravo !' : ` Ton record est de ${record}.`}`);
  }

  $('demarrer').addEventListener('click', () => {
    score = 0; erreurs = 0; enCours = true;
    $('score').textContent = '0';
    $('vies').textContent = '○ ○ ○';
    $('demarrer').hidden = true;
    fin = Date.now() + DUREE_MS;
    horloge = setInterval(tic, 250);
    parler("C'est parti ! Trois minutes, trois erreurs maximum.");
    suivant();
  });

  return () => { enCours = false; clearInterval(horloge); minuteurs.forEach(clearTimeout); taire(); };
}
