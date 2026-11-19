// Onglet « Ouvertures » : tout pour s'entraîner une fois les ouvertures apprises en leçon.
//  1. Réviser : rejouer l'ouverture de mémoire (nom seul donné)
//  2. Quel coup ? : une position au milieu d'une de tes ouvertures, trouve le coup du répertoire (10 questions)
//  3. Quelle ouverture ? : reconnaître le nom d'une ouverture d'après les coups (10 questions, toutes les ouvertures connues de Roque)
//  4. Après l'ouverture : on rejoue ton ouverture puis tu continues la partie contre l'ordinateur
import { Chess } from '/roque/lib/chess.js/chess.js';
import { Plateau, uciVersCoup } from '../echiquier.js';
import { api, echapper, sanFr } from '../outils.js';
import { taire, parler } from '../voix.js';
import { creerReproduction } from '../reproduction.js';
import { OUVERTURES } from '../ouvertures.js';
import { coupDuMoteur, NIVEAUX } from './jouer.js';
import { son, confettis } from '../sons.js';
import { param, changer } from '../parametres.js';

const MODES = [
  { id: 'reviser', titre: 'Réviser', besoinApprises: true },
  { id: 'coup', titre: 'Quel coup ?', besoinApprises: true },
  { id: 'nom', titre: 'Quelle ouverture ?', besoinApprises: false },
  { id: 'suite', titre: 'Après l\'ouverture', besoinApprises: true },
];
const NB_QUESTIONS = 10;
const hasard = (n) => Math.floor(Math.random() * n);
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const camp = (cote) => (cote === 'white' ? 'Blancs' : 'Noirs');
const melanger = (liste) => liste.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// Rejoue une suite de coups UCI depuis le départ : renvoie la partie
function rejouer(coups) {
  const jeu = new Chess();
  for (const c of coups) jeu.move(uciVersCoup(c));
  return jeu;
}

const ZONE_JEU = `
  <div class="zone-jeu">
    <div class="colonne-jeu">
      <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-haut"></span></div>
      <div class="plateau-cadre" id="plateau"></div>
      <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-bas"></span></div>
    </div>
    <aside class="panneau" id="panneau"></aside>
  </div>`;

export async function vueOuvertures(main, params) {
  const { ouvertures } = await api('/ouvertures');
  const apprises = ouvertures.filter((o) => o.apprise);
  let mode = MODES.find((m) => m.id === params.mode)?.id || (apprises.length ? 'reviser' : 'nom');
  const def = MODES.find((m) => m.id === mode);

  main.innerHTML = `
    <div class="entete-page">
      <div><div class="surtitre">Entraînement</div><h1>Les ouvertures</h1>
        <p class="doux">${apprises.length
          ? `Tu connais ${apprises.length} ouverture${apprises.length > 1 ? 's' : ''} : révise-les, teste-toi, puis joue la suite.`
          : 'Apprends d\'abord une ouverture en leçon : les entraînements s\'ouvriront ici.'}</p></div>
      <nav class="onglets">${MODES.map((m) => `<a class="${m.id === mode ? 'actif' : ''}" href="#/ouvertures?mode=${m.id}">${m.titre}</a>`).join('')}</nav>
    </div>
    <div id="mode"></div>`;
  const zoneMode = main.querySelector('#mode');

  if (def.besoinApprises && !apprises.length) {
    zoneMode.innerHTML = `<div class="carte"><p>Tu n'as pas encore appris d'ouverture. Termine d'abord la leçon <strong>« Une ouverture avec les Blancs : l'Italienne »</strong> : elle apparaîtra ici.</p>
      <div class="boutons"><a class="bouton" href="#/lecons/italienne">Aller à la leçon</a><a class="bouton secondaire" href="#/ouvertures?mode=nom">Essayer « Quelle ouverture ? »</a></div></div>`;
    return;
  }
  const lancerMode = { reviser: modeReviser, coup: modeCoup, nom: modeNom, suite: modeSuite }[mode];
  return lancerMode(zoneMode, apprises);
}

// ───────────── 1. Réviser ─────────────
function modeReviser(zone, apprises) {
  zone.innerHTML = `
    <p class="doux">Seul le nom t'est donné : rejoue les coups de mémoire, dans l'ordre. L'adversaire joue l'autre camp.</p>
    <div class="liste-lecons" id="choix" style="margin-bottom:22px">
      ${apprises.map((o) => `<button class="lecon-tuile" data-id="${o.id}"><strong>${echapper(majuscule(o.nom))}</strong><span class="doux petit-texte">Tu joues les ${camp(o.cote)}</span></button>`).join('')}
      <button class="lecon-tuile" data-id="hasard"><strong>🎲 Au hasard</strong><span class="doux petit-texte">Une de tes ouvertures apprises</span></button>
    </div>
    <div id="jeu" hidden>${ZONE_JEU}</div>`;
  const $ = (s) => zone.querySelector(s);
  $('#panneau').innerHTML = `
    <div class="carte"><h3 id="nom" style="margin-top:0"></h3><div class="doux" id="camp"></div></div>
    <div class="statut" id="statut"></div>
    <div class="boutons">
      <button class="bouton secondaire" id="indice">💡 Indice</button>
      <button class="bouton secondaire" id="recommencer">↻ Recommencer</button>
    </div>`;
  let courante = null, repro = null;
  const plateau = new Plateau($('#plateau'), { prises: { haut: $('#prises-haut'), bas: $('#prises-bas') }, onCoup: (c, uci) => repro?.coup(uci) });
  plateau.autoriser(null);

  function lancer(o) {
    courante = o;
    repro?.arreter();
    $('#jeu').hidden = false;
    $('#nom').textContent = majuscule(o.nom);
    $('#camp').textContent = `Tu joues les ${camp(o.cote)}.`;
    repro = creerReproduction(plateau, { coups: o.coups, cote: o.cote, statut: $('#statut') });
    repro.demarrer();
    $('#jeu').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#choix').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) lancer(b.dataset.id === 'hasard' ? apprises[hasard(apprises.length)] : apprises.find((o) => o.id === b.dataset.id));
  });
  $('#indice').addEventListener('click', () => repro?.indice());
  $('#recommencer').addEventListener('click', () => courante && lancer(courante));
  return () => { repro?.arreter(); taire(); };
}

// ───────────── 2. Quel coup ? ─────────────
function modeCoup(zone, apprises) {
  zone.innerHTML = `<p class="doux">Une position tirée d'une de tes ouvertures : joue le coup du répertoire. ${NB_QUESTIONS} questions.</p>${ZONE_JEU}`;
  const $ = (s) => zone.querySelector(s);
  $('#panneau').innerHTML = `
    <div class="carte"><div class="doux petit-texte" id="progression">Question 0 / ${NB_QUESTIONS}</div>
      <h3 id="nom" style="margin:.3em 0 0"></h3><div class="doux" id="camp"></div></div>
    <div class="statut" id="statut">Prêt ?</div>
    <button class="bouton large" id="demarrer">Commencer</button>
    <div class="carte doux petit-texte">Ton record : <strong id="record" style="color:var(--or)">${param('ouvertures.recordCoup') || 0}</strong> / ${NB_QUESTIONS}</div>
    <div class="carte" id="bilan" hidden></div>`;
  let moi = null, attendu = null, numero = 0, score = 0, bloque = true, fautes = [];
  const minuteurs = new Set();
  const plusTard = (f, ms) => { const t = setTimeout(() => { minuteurs.delete(t); f(); }, ms); minuteurs.add(t); };
  const plateau = new Plateau($('#plateau'), { prises: { haut: $('#prises-haut'), bas: $('#prises-bas') }, onCoup: (c, uci) => repondre(uci) });
  plateau.autoriser(null);

  function question() {
    numero++;
    bloque = false;
    const o = apprises[hasard(apprises.length)];
    // Un coup du joueur (indices pairs si Blancs, impairs si Noirs), pas forcément le premier
    const indices = o.coups.map((_, i) => i).filter((i) => (o.cote === 'white' ? i % 2 === 0 : i % 2 === 1));
    const i = indices[hasard(indices.length)];
    const avant = rejouer(o.coups.slice(0, i));
    attendu = o.coups[i];
    moi = o.cote === 'white' ? 'w' : 'b';
    plateau.charger(avant.fen(), { orientation: o.cote });
    plateau.fleches([]);
    plateau.autoriser(moi);
    $('#progression').textContent = `Question ${numero} / ${NB_QUESTIONS} · score ${score}`;
    $('#nom').textContent = majuscule(o.nom);
    $('#camp').textContent = `Tu joues les ${camp(o.cote)}${i === 0 ? ' : premier coup' : ` : coup n° ${Math.floor(i / 2) + 1}`}.`;
    $('#statut').textContent = 'Quel est le coup de l\'ouverture ?';
    $('#statut').className = 'statut';
    fautes.o = o; fautes.i = i;
  }

  function repondre(uci) {
    if (bloque) return;
    bloque = true;
    plateau.autoriser(null);
    if (uci === attendu) {
      score++;
      son.succes();
      $('#statut').textContent = '✓ Bon coup !';
      $('#statut').className = 'statut vert';
      plusTard(suivante, 700);
    } else {
      son.erreur();
      fautes.push(fautes.o.nom);
      plateau.annuler();
      plateau.fleches([{ orig: attendu.slice(0, 2), dest: attendu.slice(2, 4), brush: 'green' }]);
      $('#statut').textContent = `✗ Le coup de l'ouverture était ${attendu.slice(0, 2)} → ${attendu.slice(2, 4)}.`;
      $('#statut').className = 'statut rouge';
      plusTard(suivante, 1800);
    }
  }

  function suivante() { if (numero >= NB_QUESTIONS) terminer(); else question(); }

  function terminer() {
    plateau.autoriser(null);
    plateau.fleches([]);
    const nouveau = score > (param('ouvertures.recordCoup') || 0);
    if (nouveau) { changer('ouvertures.recordCoup', score); confettis($('#plateau')); }
    $('#record').textContent = Math.max(score, param('ouvertures.recordCoup') || 0);
    $('#progression').textContent = 'Terminé !';
    $('#statut').textContent = nouveau ? `${score} / ${NB_QUESTIONS} — nouveau record 🏆` : `${score} / ${NB_QUESTIONS}`;
    $('#statut').className = 'statut vert';
    $('#demarrer').hidden = false;
    $('#demarrer').textContent = 'Rejouer';
    const a_revoir = [...new Set(fautes)];
    $('#bilan').hidden = false;
    $('#bilan').innerHTML = a_revoir.length
      ? `<strong>À revoir :</strong><p class="doux petit-texte" style="margin:.5em 0 0">${a_revoir.map((n) => echapper(majuscule(n))).join('<br>')}</p><a class="bouton secondaire petit" style="margin-top:10px" href="#/ouvertures?mode=reviser">Réviser</a>`
      : '<strong>Sans faute, bravo !</strong>';
    parler(`Terminé ! ${score} sur ${NB_QUESTIONS}.`);
  }

  $('#demarrer').addEventListener('click', () => {
    numero = 0; score = 0; fautes = [];
    $('#demarrer').hidden = true;
    $('#bilan').hidden = true;
    question();
  });
  return () => { minuteurs.forEach(clearTimeout); taire(); };
}

// ───────────── 3. Quelle ouverture ? ─────────────
// Ouvertures assez précises pour une question (pas les débuts génériques « une partie ouverte »…)
const BANQUE = (() => {
  const vues = new Set();
  return OUVERTURES.filter((o) => {
    if (/^une /.test(o.nom) || o.coups.split(' ').length < 2 || vues.has(o.nom)) return false;
    vues.add(o.nom);
    return true;
  }).map((o) => ({ ...o, suite: o.coups.split(' ') }));
})();
const estPrefixe = (a, b) => a.length <= b.length && a.every((c, i) => b[i] === c);

function modeNom(zone) {
  zone.innerHTML = `<p class="doux">Les coups sont joués : retrouve le nom de l'ouverture. ${NB_QUESTIONS} questions, avec ${BANQUE.length} ouvertures possibles.</p>${ZONE_JEU}`;
  const $ = (s) => zone.querySelector(s);
  $('#panneau').innerHTML = `
    <div class="carte"><div class="doux petit-texte" id="progression">Question 0 / ${NB_QUESTIONS}</div>
      <div id="coups" class="doux" style="margin-top:.4em"></div></div>
    <div class="statut" id="statut">Prêt ?</div>
    <div id="reponses" class="boutons" style="flex-direction:column;align-items:stretch"></div>
    <button class="bouton large" id="demarrer">Commencer</button>
    <div class="carte doux petit-texte">Ton record : <strong id="record" style="color:var(--or)">${param('ouvertures.recordNom') || 0}</strong> / ${NB_QUESTIONS}</div>
    <div class="carte" id="bilan" hidden></div>`;
  let numero = 0, score = 0, courante = null, bloque = true, fautes = [], deja = new Set();
  const minuteurs = new Set();
  const plusTard = (f, ms) => { const t = setTimeout(() => { minuteurs.delete(t); f(); }, ms); minuteurs.add(t); };
  const plateau = new Plateau($('#plateau'), { prises: { haut: $('#prises-haut'), bas: $('#prises-bas') } });
  plateau.autoriser(null);

  function question() {
    numero++;
    bloque = false;
    const restantes = BANQUE.filter((o) => !deja.has(o.nom));
    courante = restantes[hasard(restantes.length)];
    deja.add(courante.nom);
    // Fausses réponses : d'autres ouvertures qui ne sont pas un début ou une suite de la bonne
    const autres = melanger(BANQUE.filter((o) => o.nom !== courante.nom && !estPrefixe(o.suite, courante.suite) && !estPrefixe(courante.suite, o.suite)
      && o.idee !== courante.idee));
    const noms = [...new Set(autres.map((o) => o.nom))].slice(0, 3);
    const choix = melanger([courante.nom, ...noms]);
    const jeu = new Chess();
    const san = courante.suite.map((c) => { const m = jeu.move(c); return m.san; });
    plateau.charger(jeu.fen(), { orientation: 'white' });
    $('#progression').textContent = `Question ${numero} / ${NB_QUESTIONS} · score ${score}`;
    $('#coups').innerHTML = `<strong>${san.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}. ` : '') + echapper(sanFr(s))).join(' ')}</strong>`;
    $('#statut').textContent = 'Quelle est cette ouverture ?';
    $('#statut').className = 'statut';
    $('#reponses').innerHTML = choix.map((n) => `<button class="bouton secondaire" data-nom="${echapper(n)}">${echapper(majuscule(n))}</button>`).join('');
  }

  $('#reponses').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-nom]');
    if (!b || bloque) return;
    bloque = true;
    const juste = b.dataset.nom === courante.nom;
    $('#reponses').querySelectorAll('button').forEach((x) => {
      if (x.dataset.nom === courante.nom) x.classList.remove('secondaire');
      else if (x === b) x.style.opacity = '.45';
    });
    if (juste) { score++; son.succes(); } else { son.erreur(); fautes.push(courante); }
    $('#statut').innerHTML = `${juste ? '✓ Exact !' : `✗ C'était ${echapper(courante.nom)}.`} <span class="doux">${echapper(courante.idee)}</span>`;
    $('#statut').className = `statut ${juste ? 'vert' : 'rouge'}`;
    plusTard(() => (numero >= NB_QUESTIONS ? terminer() : question()), juste ? 2200 : 3800);
  });

  function terminer() {
    const nouveau = score > (param('ouvertures.recordNom') || 0);
    if (nouveau) { changer('ouvertures.recordNom', score); confettis($('#plateau')); }
    $('#record').textContent = Math.max(score, param('ouvertures.recordNom') || 0);
    $('#progression').textContent = 'Terminé !';
    $('#reponses').innerHTML = '';
    $('#statut').textContent = nouveau ? `${score} / ${NB_QUESTIONS} — nouveau record 🏆` : `${score} / ${NB_QUESTIONS}`;
    $('#statut').className = 'statut vert';
    $('#demarrer').hidden = false;
    $('#demarrer').textContent = 'Rejouer';
    $('#bilan').hidden = false;
    $('#bilan').innerHTML = fautes.length
      ? `<strong>À retenir :</strong><p class="doux petit-texte" style="margin:.5em 0 0">${fautes.map((o) => `<strong>${echapper(majuscule(o.nom))}</strong> : ${echapper(o.idee)}`).join('<br><br>')}</p>`
      : '<strong>Sans faute, bravo !</strong>';
    parler(`Terminé ! ${score} sur ${NB_QUESTIONS}.`);
  }

  $('#demarrer').addEventListener('click', () => {
    numero = 0; score = 0; fautes = []; deja = new Set();
    $('#demarrer').hidden = true;
    $('#bilan').hidden = true;
    question();
  });
  return () => { minuteurs.forEach(clearTimeout); taire(); };
}

// ───────────── 4. Après l'ouverture ─────────────
// L'ouverture est jouée toute seule, puis la partie continue contre l'ordinateur (non enregistrée au classement).
function modeSuite(zone, apprises) {
  const niveaux = NIVEAUX.filter((n) => n <= 2000);
  const defaut = Number(param('jouer.niveau')) || 1000;
  const niveauDefaut = niveaux.reduce((a, b) => (Math.abs(b - defaut) < Math.abs(a - defaut) ? b : a));
  zone.innerHTML = `
    <p class="doux">Ton ouverture est jouée à ta place, puis tu continues la partie : c'est là que commence le vrai jeu. Non comptée au classement.</p>
    <div class="carte" style="margin-bottom:18px">
      <label class="doux petit-texte">Niveau de l'ordinateur</label>
      <select id="niveau" style="margin:6px 0 0">${niveaux.map((n) => `<option value="${n}" ${n === niveauDefaut ? 'selected' : ''}>${n}</option>`).join('')}</select>
    </div>
    <div class="liste-lecons" id="choix" style="margin-bottom:22px">
      ${apprises.map((o) => `<button class="lecon-tuile" data-id="${o.id}"><strong>${echapper(majuscule(o.nom))}</strong><span class="doux petit-texte">Tu joues les ${camp(o.cote)}</span></button>`).join('')}
      <button class="lecon-tuile" data-id="hasard"><strong>🎲 Au hasard</strong><span class="doux petit-texte">Une de tes ouvertures apprises</span></button>
    </div>
    <div id="jeu" hidden>${ZONE_JEU}</div>`;
  const $ = (s) => zone.querySelector(s);
  $('#panneau').innerHTML = `
    <div class="carte"><h3 id="nom" style="margin-top:0"></h3><div class="doux" id="camp"></div></div>
    <div class="statut" id="statut"></div>
    <div class="carte petit-texte"><strong>Après l'ouverture, pose-toi 4 questions :</strong>
      <ol class="doux" style="margin:.5em 0 0;padding-left:1.2em"><li>Mon roi est-il à l'abri (roque) ?</li><li>Toutes mes pièces sont-elles sorties ?</li><li>Quelle menace l'adversaire prépare-t-il ?</li><li>Quel est mon plan (colonne, case, pièce à améliorer) ?</li></ol></div>
    <div class="carte"><div class="doux petit-texte">Coups</div><div id="coups" class="liste-coups"></div></div>
    <div class="boutons"><button class="bouton secondaire" id="rejouer">↻ Recommencer</button></div>`;
  let courante = null, moi = null, enCours = false, actif = true;
  const minuteurs = new Set();
  const plateau = new Plateau($('#plateau'), { prises: { haut: $('#prises-haut'), bas: $('#prises-bas') }, onCoup: () => apresMonCoup() });
  plateau.autoriser(null);

  function afficherCoups() {
    const h = plateau.jeu.history();
    let html = '';
    for (let i = 0; i < h.length; i += 2) html += `<span class="num">${i / 2 + 1}.</span><button>${echapper(sanFr(h[i]))}</button><button>${echapper(sanFr(h[i + 1] || ''))}</button>`;
    $('#coups').innerHTML = html;
    $('#coups').scrollTop = $('#coups').scrollHeight;
  }

  function fin() {
    const j = plateau.jeu;
    if (!j.isGameOver()) return false;
    enCours = false;
    plateau.autoriser(null);
    let t = 'Partie nulle.';
    if (j.isCheckmate()) t = j.turn() === moi ? 'Échec et mat : tu as perdu cette fois.' : 'Échec et mat : tu as gagné ! 🏆';
    $('#statut').textContent = t;
    $('#statut').className = 'statut vert';
    if (j.isCheckmate() && j.turn() !== moi) son.succes();
    return true;
  }

  async function tourDuMoteur() {
    if (!enCours) return;
    $('#statut').textContent = 'L\'ordinateur réfléchit…';
    const debut = Date.now();
    const uci = await coupDuMoteur(plateau.jeu, Number($('#niveau').value));
    await new Promise((r) => setTimeout(r, Math.max(0, 450 - (Date.now() - debut))));
    if (!enCours || !actif) return;
    plateau.jouerUci(uci);
    afficherCoups();
    if (!fin()) { plateau.autoriser(moi); $('#statut').textContent = 'À toi de jouer'; }
  }
  function apresMonCoup() {
    afficherCoups();
    if (fin()) return;
    plateau.autoriser(null);
    tourDuMoteur();
  }

  function lancer(o) {
    courante = o;
    moi = o.cote === 'white' ? 'w' : 'b';
    enCours = false;
    $('#jeu').hidden = false;
    $('#nom').textContent = majuscule(o.nom);
    $('#camp').textContent = `Tu joues les ${camp(o.cote)}.`;
    plateau.autoriser(null);
    plateau.charger('start', { orientation: o.cote });
    $('#coups').innerHTML = '';
    $('#statut').textContent = 'Ouverture en cours…';
    $('#statut').className = 'statut';
    $('#jeu').scrollIntoView({ behavior: 'smooth', block: 'start' });
    // L'ouverture se joue toute seule, coup après coup
    let i = 0;
    const suivant = () => {
      if (!actif || courante !== o) return;
      if (i >= o.coups.length) {
        enCours = true;
        // L'ouverture finit sur un coup du joueur : c'est à l'adversaire de jouer
        return tourDuMoteur();
      }
      plateau.jouerUci(o.coups[i++]);
      afficherCoups();
      const t = setTimeout(() => { minuteurs.delete(t); suivant(); }, 550);
      minuteurs.add(t);
    };
    minuteurs.forEach(clearTimeout); minuteurs.clear();
    suivant();
  }
  $('#choix').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) lancer(b.dataset.id === 'hasard' ? apprises[hasard(apprises.length)] : apprises.find((o) => o.id === b.dataset.id));
  });
  $('#rejouer').addEventListener('click', () => courante && lancer(courante));
  return () => { actif = false; enCours = false; minuteurs.forEach(clearTimeout); taire(); };
}
