// Problèmes : classés, par thème, échauffement et révisions
import { Plateau } from '../echiquier.js';
import { api, echapper, signe } from '../outils.js';
import { ICONES } from '../icones.js';
import { son, confettis } from '../sons.js';
import { choisirNiveau } from '../niveau.js';
import { parler, taire } from '../voix.js';
import { nomCoup, piece } from '../coach.js';
import { param } from '../parametres.js';

const TITRES = {
  classe: 'Problèmes classés',
  theme: 'Entraînement par thème',
  echauffement: 'Échauffement',
  revision: 'Révision de tes erreurs',
};

export async function vueProblemes(main, params) {
  const mode = TITRES[params.mode] ? params.mode : 'classe';
  if (mode === 'theme' && !params.theme) return choisirTheme(main);

  const etat = await api('/etat');
  if (!etat.configure) return choisirNiveau(main, () => vueProblemes(main, params));

  main.innerHTML = `
    <div class="entete-page">
      <div><div class="surtitre">Problèmes</div><h1>${TITRES[mode]}</h1><p class="doux" id="sous-titre"></p></div>
      <nav class="onglets">
        <a class="${mode === 'classe' ? 'actif' : ''}" href="#/problemes?mode=classe">Classés</a>
        <a class="${mode === 'theme' ? 'actif' : ''}" href="#/problemes?mode=theme">Par thème</a>
        <a class="${mode === 'revision' ? 'actif' : ''}" href="#/problemes?mode=revision">Révisions${etat.revisionsDues ? ` · ${etat.revisionsDues}` : ''}</a>
      </nav>
    </div>
    <div class="zone-jeu">
      <div class="colonne-jeu">
        <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-haut"></span></div>
        <div class="plateau-cadre" id="plateau"></div>
        <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-bas"></span></div>
      </div>
      <aside class="panneau">
        <div class="carte" style="display:flex;justify-content:space-between;align-items:center">
          <div><div class="doux petit-texte">Ton classement</div>
            <div style="display:flex;align-items:baseline;gap:10px"><span class="chiffre" style="font-size:2.3rem" id="elo">${etat.elo}</span><span id="delta" class="delta"></span></div></div>
          <div style="text-align:right"><div class="chrono-probleme" id="chrono" hidden>0:00</div><div class="doux petit-texte" style="margin-bottom:6px">Cette séance</div><div class="serie-session" id="serie"></div></div>
        </div>
        <div class="carte">
          <div class="trait"><span class="pion-trait" id="pion-trait"></span>
            <div style="flex:1"><div class="statut" id="statut">Chargement…</div><div class="doux" id="detail"></div></div>
            <button class="bouton-ecoute" id="reecouter" title="Réécouter">${ICONES.son}</button></div>
          <div id="infos" class="petit-texte" style="margin-top:14px"></div>
        </div>
        <div class="boutons" id="actions">
          <button class="bouton secondaire" id="indice">${ICONES.ampoule} Indice</button>
          <button class="bouton secondaire" id="solution">${ICONES.oeil} Voir la solution</button>
        </div>
        <button class="bouton large" id="suivant" hidden>Problème suivant ${ICONES.fleche}</button>
        <div class="carte" id="plan-avancement" hidden></div>
      </aside>
    </div>`;

  const $ = (id) => main.querySelector(`#${id}`);
  if (mode === 'theme') $('sous-titre').textContent = `Thème : ${params.themeNom || params.theme}`;
  else if (mode === 'classe') $('sous-titre').textContent = 'À ton niveau : chaque problème fait évoluer ton classement.';
  else if (mode === 'echauffement') $('sous-titre').textContent = 'Des problèmes plus faciles pour se mettre en route.';
  else $('sous-titre').textContent = 'Les problèmes ratés reviennent après 1, 3 puis 9 jours, jusqu\'à ce qu\'ils soient acquis.';

  let p = null;          // problème en cours
  let index = 0;         // prochain coup attendu dans p.coups
  let couleur = 'w';     // couleur du joueur
  let rate = false;      // le joueur s'est trompé ou a demandé de l'aide
  let fini = false;
  let enregistre = false;
  let debut = 0;
  let precedent = '';
  const seance = [];     // résultats de la séance (pastilles vertes et rouges)
  let dernierDelta = 0;
  let phrase = '';       // dernière phrase du coach, pour la réécouter
  // Paramètres > Problèmes : commentaires à voix haute (la phrase reste disponible pour « Réécouter »)
  const dire = (t) => { phrase = t; if (param('problemes.voix')) parler(t); };
  // Chronomètre (Paramètres > Problèmes)
  let horloge = null;
  const arreterChrono = () => clearInterval(horloge);
  const lancerChrono = () => {
    arreterChrono();
    if (!param('problemes.chrono')) return;
    $('chrono').hidden = false;
    const tic = () => { const s = Math.floor((Date.now() - debut) / 1000); $('chrono').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    tic();
    horloge = setInterval(tic, 500);
  };
  const minuteurs = new Set();
  const plusTard = (f, ms) => { const t = setTimeout(() => { minuteurs.delete(t); f(); }, ms); minuteurs.add(t); };

  const plateau = new Plateau($('plateau'), { prises: { haut: $('prises-haut'), bas: $('prises-bas') }, onCoup: (coup, uci) => apresCoup(uci) });

  async function enregistrer(reussi) {
    if (enregistre) return;
    enregistre = true;
    const r = await api('/tentative', { id: p.id, reussi, duree_ms: Date.now() - debut, mode });
    $('elo').textContent = r.elo;
    $('delta').textContent = r.delta ? signe(r.delta) : '';
    $('delta').className = `delta anime ${r.delta >= 0 ? 'plus' : 'moins'}`;
    dernierDelta = r.delta || 0;
    seance.push(reussi);
    $('serie').innerHTML = seance.slice(-12).map((x) => `<span class="${x ? 'ok' : 'ko'}"></span>`).join('');
    afficherPlan();
  }

  async function afficherPlan() {
    const plan = await api('/plan');
    const etape = plan.etapes.find((e) => e.id === mode || (mode === 'theme' && e.id === 'theme' && e.lien.endsWith(params.theme)));
    if (!etape) return;
    const fini = etape.fait >= etape.objectif;
    $('plan-avancement').hidden = false;
    $('plan-avancement').innerHTML = `<div class="doux petit-texte">Plan du jour · ${echapper(etape.titre)}</div>
      <div style="display:flex;justify-content:space-between;margin:6px 0"><strong>${Math.min(etape.fait, etape.objectif)} / ${etape.objectif}</strong>
      ${fini ? '<a href="#/">Étape suivante →</a>' : ''}</div>
      <div class="barre"><span style="width:${Math.min(100, (100 * etape.fait) / etape.objectif)}%"></span></div>`;
  }

  async function charger() {
    try {
      const ecart = { facile: -150, normale: 0, difficile: 150 }[param('problemes.difficulte')] || 0;   // Paramètres > Problèmes > Difficulté
      const q = new URLSearchParams({ mode, exclure: precedent, ecart, ...(params.theme ? { theme: params.theme } : {}) });
      p = await api(`/probleme?${q}`);
    } catch {
      $('statut').textContent = mode === 'revision' ? 'Aucune révision pour aujourd\'hui 🎉' : 'Plus de problème disponible';
      $('detail').textContent = mode === 'revision' ? 'Tes erreurs reviendront quand il sera temps de les revoir.' : '';
      $('actions').hidden = true;
      dire(`${$('statut').textContent.replace('🎉', '')}. ${$('detail').textContent}`);
      return;
    }
    precedent = p.id;
    index = 0; rate = false; fini = false; enregistre = false;
    couleur = p.fen.split(' ')[1] === 'w' ? 'b' : 'w';  // le 1er coup est joué par l'adversaire
    plateau.charger(p.fen, { orientation: couleur === 'w' ? 'white' : 'black' });
    plateau.autoriser(null);
    $('statut').textContent = 'À toi de jouer';
    $('statut').className = 'statut';
    $('pion-trait').className = `pion-trait ${couleur}`;
    $('detail').textContent = `Trouve le meilleur coup pour les ${couleur === 'w' ? 'Blancs' : 'Noirs'}.`;
    $('plateau').classList.remove('succes', 'erreur');
    $('infos').innerHTML = '';
    $('suivant').hidden = true;
    $('actions').hidden = false;
    $('delta').textContent = '';
    plusTard(() => {
      const coup = plateau.jouerUci(p.coups[0]);
      index = 1;
      plateau.autoriser(couleur);
      debut = Date.now();
      lancerChrono();
      dire(`Ton adversaire joue ${nomCoup(coup, true)}. À toi, avec les ${couleur === 'w' ? 'Blancs' : 'Noirs'} : trouve le meilleur coup.`);
    }, 600);
  }

  function apresCoup(uci) {
    if (fini) return;
    const attendu = p.coups[index];
    // Tout coup qui mate est accepté, même s'il diffère de la solution enregistrée
    if (uci === attendu || plateau.jeu.isCheckmate()) {
      index++;
      if (index >= p.coups.length || plateau.jeu.isCheckmate()) return terminer(!rate);
      $('statut').textContent = 'Bon coup, continue !';
      $('statut').className = 'statut vert';
      dire('Bon coup, continue !');
      plateau.autoriser(null);
      plusTard(() => {
        plateau.jouerUci(p.coups[index]);
        index++;
        plateau.autoriser(couleur);
      }, 450);
    } else {
      rate = true;
      enregistrer(false);
      $('statut').textContent = 'Ce n\'est pas le bon coup';
      $('statut').className = 'statut rouge';
      son.erreur();
      $('plateau').classList.remove('erreur');
      void $('plateau').offsetWidth;
      $('plateau').classList.add('erreur');
      $('detail').textContent = 'Réessaie, ou regarde la solution.';
      dire("Ce n'est pas le bon coup. Réessaie.");
      plateau.autoriser(null);
      plusTard(() => { plateau.annuler(); plateau.autoriser(couleur); }, 650);
    }
  }

  async function terminer(reussi) {
    fini = true;
    plateau.autoriser(null);
    plateau.fleches([]);
    await enregistrer(reussi);
    $('statut').textContent = reussi ? 'Bravo, problème résolu !' : 'Problème terminé';
    $('statut').className = `statut ${reussi ? 'vert' : ''}`;
    if (reussi) {
      son.succes();
      $('plateau').classList.remove('erreur');
      $('plateau').classList.add('succes');
      if (param('problemes.celebrations')) confettis($('plateau'));
    }
    $('detail').textContent = reussi ? '' : 'Il reviendra demain dans tes révisions.';
    const points = Math.abs(dernierDelta);
    const bilan = dernierDelta > 0 ? ` Tu gagnes ${points} point${points > 1 ? 's' : ''}.` : dernierDelta < 0 ? ` Tu perds ${points} point${points > 1 ? 's' : ''}.` : '';
    dire(reussi ? `Bravo, problème résolu !${bilan}` : `Problème terminé.${bilan} Il reviendra demain dans tes révisions.`);
    $('infos').innerHTML = `<div class="doux">Classement du problème : <strong style="color:var(--texte)">${p.elo}</strong></div>
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${p.nomsThemes.map((t) => `<span class="badge">${echapper(t)}</span>`).join('')}</div>`;
    $('actions').hidden = true;
    $('suivant').hidden = false;
    $('suivant').focus();
    arreterChrono();
    // Paramètres > Problèmes : passer tout seul au suivant après une réussite
    if (reussi && param('problemes.enchainer')) plusTard(charger, 1500);
  }

  $('indice').addEventListener('click', () => {
    if (fini || index === 0) return;
    rate = true;
    enregistrer(false);
    const coup = p.coups[index];
    plateau.fleches([{ orig: coup.slice(0, 2), brush: 'yellow' }]);
    $('detail').textContent = 'Indice : la pièce entourée doit bouger. (Un problème avec indice compte comme raté.)';
    const pieceIndice = plateau.jeu.get(coup.slice(0, 2));
    if (pieceIndice) dire(`Indice : c'est ${piece(pieceIndice.type, pieceIndice.color, couleur)} qui doit bouger.`);
  });

  $('solution').addEventListener('click', () => {
    if (fini || index === 0) return;
    rate = true;
    plateau.autoriser(null);
    dire('Voici la solution.');
    const rejouer = () => {
      if (index >= p.coups.length) return terminer(false);
      const c = p.coups[index];
      plateau.fleches([{ orig: c.slice(0, 2), dest: c.slice(2, 4), brush: 'green' }]);
      plateau.jouerUci(c);
      index++;
      plusTard(rejouer, 750);
    };
    rejouer();
  });

  $('suivant').addEventListener('click', charger);
  $('reecouter').addEventListener('click', () => parler(phrase || `${$('statut').textContent}. ${$('detail').textContent}`));
  const clavier = (e) => { if (e.key === 'Enter' && !$('suivant').hidden) charger(); };
  document.addEventListener('keydown', clavier);

  await charger();
  afficherPlan();
  return () => {
    minuteurs.forEach(clearTimeout);
    arreterChrono();
    document.removeEventListener('keydown', clavier);
    taire();
  };
}

async function choisirTheme(main) {
  const [{ noms, travail }, stats] = await Promise.all([api('/themes'), api('/bilan')]);
  const parTheme = Object.fromEntries(stats.themes.map((s) => [s.theme, s]));
  main.innerHTML = `
    <div class="entete-page"><div><h1>Entraînement par thème</h1><p class="doux">Choisis une idée tactique à travailler. Ton taux de réussite s'affiche dès que tu as essayé.</p></div>
    <a class="bouton secondaire petit" href="#/problemes?mode=classe">← Problèmes classés</a></div>
    <div class="liste-lecons">
      ${travail.map((t) => {
        const s = parTheme[t];
        const taux = s ? Math.round(100 * s.taux) : null;
        const couleur = taux === null ? '' : taux >= 70 ? 'vert' : taux >= 50 ? 'or' : 'rouge';
        return `<a class="lecon-tuile" href="#/problemes?mode=theme&theme=${t}&themeNom=${encodeURIComponent(noms[t])}">
          <strong>${echapper(noms[t])}</strong><br>
          <span class="badge ${couleur}">${taux === null ? 'Pas encore essayé' : `${taux} % de réussite · ${s.tentatives} essai${s.tentatives > 1 ? 's' : ''}`}</span></a>`;
      }).join('')}
    </div>`;
}
