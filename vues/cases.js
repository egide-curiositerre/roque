// Entraînement « Les cases » : connaître l'échiquier par cœur, en 60 secondes.
// Nommer : une pièce est marquée au milieu d'autres, posées au hasard → dire sa case (e6, f3…).
// Trouver : une case est annoncée → la toucher sur l'échiquier.
import { Plateau } from '../echiquier.js';
import { ICONES } from '../icones.js';
import { son, confettis } from '../sons.js';
import { parler, taire } from '../voix.js';
import { param, changer } from '../parametres.js';

const DUREE_MS = 60 * 1000;
const COLONNES = 'abcdefgh';
// Nom de la pièce avec l'accord : [nom, blanc, noir]
const NOMS = {
  p: ['ce pion', 'blanc', 'noir'], n: ['ce cavalier', 'blanc', 'noir'], b: ['ce fou', 'blanc', 'noir'],
  r: ['cette tour', 'blanche', 'noire'], q: ['cette dame', 'blanche', 'noire'], k: ['ce roi', 'blanc', 'noir'],
};
const nomPiece = (p) => { const [nom, b, n] = NOMS[p.toLowerCase()]; return `${nom} ${p === p.toUpperCase() ? b : n}`; };
const hasard = (n) => Math.floor(Math.random() * n);
const caseAuHasard = () => COLONNES[hasard(8)] + (hasard(8) + 1);

// Placement (partie « pièces » d'un FEN) à partir de { case: 'N' | 'p' … }
function placement(pieces) {
  const rangees = [];
  for (let r = 8; r >= 1; r--) {
    let ligne = '', vides = 0;
    for (const c of COLONNES) {
      const p = pieces[c + r];
      if (p) { ligne += (vides || '') + p; vides = 0; } else vides++;
    }
    rangees.push(ligne + (vides || ''));
  }
  return rangees.join('/');
}

// 3 à 6 pièces au hasard (pas de pion sur la 1re ni la 8e rangée), dont une à trouver
function piecesAuHasard() {
  const pieces = {};
  const n = 3 + hasard(4);
  while (Object.keys(pieces).length < n) {
    const k = caseAuHasard();
    if (pieces[k]) continue;
    let t = 'pnbrqk'[hasard(6)];
    if (t === 'p' && (k[1] === '1' || k[1] === '8')) t = 'n';
    pieces[k] = Math.random() < 0.5 ? t.toUpperCase() : t;
  }
  const cases = Object.keys(pieces);
  const cible = cases[hasard(cases.length)];
  return { pieces, cible };
}

export async function vueCases(main, params) {
  const mode = params.mode === 'trouver' ? 'trouver' : 'nommer';
  const cleRecord = mode === 'trouver' ? 'cases.recordTrouver' : 'cases.recordNommer';
  main.innerHTML = `
    <div class="entete-page">
      <div><div class="surtitre">Entraînement</div><h1>Les cases de l'échiquier</h1>
        <p class="doux">${mode === 'nommer' ? 'Une pièce est entourée : dis sur quelle case elle se trouve.' : 'Une case est annoncée : touche-la sur l\'échiquier.'} 60 secondes, un maximum de bonnes réponses.</p></div>
      <nav class="onglets">
        <a href="#/entrainement">Avec la coach</a>
        <a class="${mode === 'nommer' ? 'actif' : ''}" href="#/entrainement/cases?mode=nommer">Nommer la case</a>
        <a class="${mode === 'trouver' ? 'actif' : ''}" href="#/entrainement/cases?mode=trouver">Trouver la case</a>
      </nav>
    </div>
    <div class="zone-jeu">
      <div class="colonne-jeu">
        <div class="bandeau-cases" id="bandeau" aria-hidden="true">
          <span class="chrono" data-copie="chrono">1:00</span>
          <span class="bandeau-question"><small data-copie="consigne">Prêt ?</small><strong data-copie="annonce">—</strong><small data-copie="statut"></small></span>
          <span class="chrono" data-copie="score">0</span>
        </div>
        <div class="plateau-cadre" id="plateau"></div>
      </div>
      <aside class="panneau">
        <div class="carte carte-chrono">
          <div><div class="doux petit-texte">Temps</div><div class="chrono" id="chrono">1:00</div></div>
          <div style="text-align:right"><div class="doux petit-texte">Score</div><div class="chrono" id="score">0</div></div>
        </div>
        <div class="carte question-case">
          <div class="doux petit-texte" id="consigne">Prêt ?</div>
          <div class="case-annoncee" id="annonce">—</div>
          <div class="statut" id="statut"></div>
        </div>
        <div class="clavier-cases" id="clavier" hidden>
          <div>${[...COLONNES].map((c) => `<button data-c="${c}">${c}</button>`).join('')}</div>
          <div>${[1, 2, 3, 4, 5, 6, 7, 8].map((r) => `<button data-r="${r}">${r}</button>`).join('')}</div>
        </div>
        <div class="carte" id="reglages">
          <label class="doux petit-texte">Côté de l'échiquier</label>
          <div class="boutons" style="margin:6px 0 12px" id="cotes">
            <button class="bouton petit" data-cote="w">Blancs en bas</button>
            <button class="bouton petit secondaire" data-cote="b">Noirs en bas</button>
            <button class="bouton petit secondaire" data-cote="x">Les deux</button>
          </div>
          <label class="interrupteur-ligne"><input type="checkbox" id="coordonnees"> Afficher les coordonnées (plus facile)</label>
        </div>
        <button class="bouton large" id="demarrer">${ICONES.entrainement} Commencer</button>
        <div class="carte doux petit-texte">Ton record : <strong id="record" style="color:var(--or)">${param(cleRecord) || 0}</strong></div>
        <div class="carte" id="bilan" hidden></div>
      </aside>
    </div>`;
  const $ = (id) => main.querySelector(`#${id}`);

  // Sur téléphone, le bandeau au-dessus de l'échiquier recopie le temps, la question et le score
  const recopier = () => main.querySelectorAll('[data-copie]').forEach((el) => { el.textContent = $(el.dataset.copie).textContent; });
  const observateur = new MutationObserver(recopier);
  for (const id of ['chrono', 'score', 'consigne', 'annonce', 'statut']) observateur.observe($(id), { childList: true, characterData: true, subtree: true });

  const plateau = new Plateau($('plateau'));
  plateau.autoriser(null);
  plateau.poser('8/8/8/8/8/8/8/8');
  plateau.masquerCoordonnees(true);

  let cote = 'w', enCours = false, score = 0, erreurs = 0, fin = 0, horloge = null;
  let cible = null, saisie = '', bloque = false;
  let ratees = [];
  const minuteurs = new Set();
  const plusTard = (f, ms) => { const t = setTimeout(() => { minuteurs.delete(t); f(); }, ms); minuteurs.add(t); };

  $('cotes').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    cote = b.dataset.cote;
    $('cotes').querySelectorAll('button').forEach((x) => x.classList.toggle('secondaire', x !== b));
  });
  $('coordonnees').addEventListener('change', () => plateau.masquerCoordonnees(!$('coordonnees').checked));

  function question() {
    bloque = false;
    saisie = '';
    const orientation = cote === 'x' ? (Math.random() < 0.5 ? 'white' : 'black') : cote === 'w' ? 'white' : 'black';
    plateau.orienter(orientation);
    $('statut').textContent = '';
    $('statut').className = 'statut';
    if (mode === 'nommer') {
      const q = piecesAuHasard();
      cible = q.cible;
      plateau.poser(placement(q.pieces));
      plateau.fleches([{ orig: cible, brush: 'yellow' }]);
      $('consigne').textContent = `Sur quelle case est ${nomPiece(q.pieces[cible])} ?`;
      $('annonce').textContent = '_ _';
    } else {
      cible = caseAuHasard();
      plateau.poser('8/8/8/8/8/8/8/8');
      plateau.fleches([]);
      $('consigne').textContent = 'Touche la case :';
      $('annonce').textContent = cible;
    }
  }

  function repondre(reponse) {
    if (!enCours || bloque) return;
    if (reponse === cible) {
      score++;
      $('score').textContent = score;
      son.succes();
      plateau.fleches([{ orig: cible, brush: 'green' }]);
      bloque = true;
      plusTard(question, 250);
      return;
    }
    erreurs++;
    ratees.push(cible);
    son.erreur();
    bloque = true;
    $('statut').textContent = `✗ C'était ${cible}${mode === 'trouver' ? ` (tu as touché ${reponse})` : ` (tu as dit ${reponse})`}`;
    $('statut').className = 'statut rouge';
    plateau.fleches([{ orig: cible, brush: 'green' }, ...(mode === 'trouver' ? [{ orig: reponse, brush: 'red' }] : [])]);
    plusTard(question, 1100);
  }

  // Nommer : une lettre puis un chiffre (clavier à l'écran ou clavier du Mac)
  function taper(t) {
    if (!enCours || bloque || mode !== 'nommer') return;
    if (COLONNES.includes(t)) saisie = t;
    else if (/^[1-8]$/.test(t) && saisie.length === 1) saisie += t;
    else return;
    $('annonce').textContent = saisie.length === 1 ? `${saisie} _` : saisie;
    if (saisie.length === 2) repondre(saisie);
  }
  $('clavier').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) taper(b.dataset.c || b.dataset.r);
  });
  const clavier = (e) => { if (!e.metaKey && !e.ctrlKey) taper(e.key.toLowerCase()); };
  document.addEventListener('keydown', clavier);

  // Trouver : clic sur une case de l'échiquier
  plateau.surClicCase((k) => { if (mode === 'trouver' && k) repondre(k); });

  function tic() {
    const reste = Math.max(0, fin - Date.now());
    $('chrono').textContent = `0:${String(Math.ceil(reste / 1000)).padStart(2, '0')}`;
    if (reste <= 0) terminer();
  }

  function terminer() {
    if (!enCours) return;
    enCours = false;
    clearInterval(horloge);
    minuteurs.forEach(clearTimeout);
    const record = Math.max(score, param(cleRecord) || 0);
    const nouveau = score > (param(cleRecord) || 0);
    if (nouveau) { changer(cleRecord, score); confettis($('plateau')); }
    $('record').textContent = record;
    $('clavier').hidden = true;
    $('reglages').hidden = false;
    $('demarrer').hidden = false;
    $('demarrer').textContent = 'Rejouer';
    $('consigne').textContent = 'Temps écoulé !';
    $('annonce').textContent = score;
    $('statut').textContent = nouveau ? 'Nouveau record 🏆' : '';
    $('statut').className = 'statut vert';
    const uniques = [...new Set(ratees)];
    $('bilan').hidden = false;
    $('bilan').innerHTML = `<strong>${score} bonne${score > 1 ? 's' : ''} réponse${score > 1 ? 's' : ''}, ${erreurs} erreur${erreurs > 1 ? 's' : ''}</strong>
      ${uniques.length ? `<p class="doux petit-texte" style="margin:.5em 0 0">Cases à revoir : <strong>${uniques.join(', ')}</strong></p>` : '<p class="doux petit-texte" style="margin:.5em 0 0">Aucune erreur, bravo !</p>'}`;
    plateau.fleches(uniques.map((c) => ({ orig: c, brush: 'red' })));
    parler(`Temps écoulé ! ${score} bonne${score > 1 ? 's' : ''} réponse${score > 1 ? 's' : ''}.${nouveau ? ' Nouveau record, bravo !' : ''}`);
  }

  $('demarrer').addEventListener('click', () => {
    score = 0; erreurs = 0; ratees = []; enCours = true;
    $('score').textContent = '0';
    $('demarrer').hidden = true;
    $('reglages').hidden = true;
    $('bilan').hidden = true;
    $('clavier').hidden = mode !== 'nommer';
    fin = Date.now() + DUREE_MS;
    horloge = setInterval(tic, 200);
    parler(mode === 'nommer' ? 'C\'est parti ! Dis la case de la pièce entourée.' : 'C\'est parti ! Touche la case annoncée.');
    question();
    // Sur téléphone : le bandeau et l'échiquier en haut de l'écran pendant toute la minute
    if (getComputedStyle($('bandeau')).display !== 'none') $('bandeau').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  return () => { enCours = false; clearInterval(horloge); minuteurs.forEach(clearTimeout); taire(); observateur.disconnect(); document.removeEventListener('keydown', clavier); };
}
