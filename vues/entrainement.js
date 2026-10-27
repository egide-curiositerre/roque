// Entraînement : une partie contre l'ordinateur avec une coach qui parle, comme un entraîneur assis en face de toi.
// Elle commente chacun de tes coups (badge sur l'échiquier), t'arrête après une erreur pour te proposer de réessayer,
// te prévient des menaces, repère les occasions (coups brillants, mats), nomme les ouvertures et donne des indices.
import { Chess } from '/roque/lib/chess.js/chess.js';
import { Plateau, DEPART } from '../echiquier.js';
import { moteur, pourcentageGain } from '../moteur.js';
import { api, echapper, sanFr } from '../outils.js';
import { ICONES } from '../icones.js';
import { son, confettis } from '../sons.js';
import { parler, taire, voixActive } from '../voix.js';
import { nomCoup, piece, kase, estSacrifice, pieceSacrifiee, rejouer, bilanMateriel, quoi, VALEURS } from '../coach.js';
import { coupDuMoteur, NIVEAUX } from './jouer.js';
import { trouverOuverture } from '../ouvertures.js';
import { cleLocale } from '../profil.js';
import { param, changer } from '../parametres.js';

const COACH = 'Léa';
const PROFONDEUR = 12;
const CLE_REGLAGES = () => cleLocale('roque-entrainement');

// Badges posés sur l'échiquier après chaque coup
const BADGES = {
  brillant: { signe: '!!', nom: 'Coup brillant' },
  meilleur: { signe: '★', nom: 'Meilleur coup' },
  excellent: { signe: '!', nom: 'Excellent' },
  bon: { signe: '✓', nom: 'Bon coup' },
  imprecision: { signe: '?!', nom: 'Imprécision' },
  erreur: { signe: '?', nom: 'Erreur' },
  gaffe: { signe: '??', nom: 'Gaffe' },
};

const hasard = (liste) => liste[Math.floor(Math.random() * liste.length)];
// Un coup ou une case dans une phrase : « Cf6 » à l'écrit (en gras), « cavalier en èf 6 » à l'oral
const nc = (c, o) => (o ? nomCoup(c, true) : `<strong>${echapper(sanFr(c.san))}</strong>`);
const kc = (sq, o) => (o ? kase(sq, true) : `<strong>${sq}</strong>`);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Portrait de la coach (dessin vectoriel ; la bouche bouge quand elle parle)
const PORTRAIT = `<svg class="portrait" viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <linearGradient id="fond-portrait" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd9a8"/><stop offset="1" stop-color="#f3a26b"/></linearGradient>
    <linearGradient id="cheveux" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8432c"/><stop offset="1" stop-color="#6e2417"/></linearGradient>
  </defs>
  <circle cx="60" cy="60" r="60" fill="url(#fond-portrait)"/>
  <path d="M24 70c-2-30 13-50 36-50s38 20 36 50c-1 13-5 24-9 32H33c-4-8-8-19-9-32z" fill="url(#cheveux)"/>
  <path d="M51 76h18v15H51z" fill="#e3a982"/>
  <path d="M18 120c3-19 20-30 42-30s39 11 42 30z" fill="#f7f4ee"/>
  <path d="M46 92q14 12 28 0" fill="none" stroke="#e4b04f" stroke-width="1.6"/>
  <circle cx="60" cy="101" r="3.2" fill="#e4b04f"/>
  <ellipse cx="60" cy="57" rx="21" ry="24" fill="#f2c5a0"/>
  <path d="M37 55c1-18 11-29 25-29 13 0 22 9 24 24-9-8-19-11-30-11-8 0-15 6-19 16z" fill="url(#cheveux)"/>
  <path d="M47 50q5-3.5 9 0M64 50q5-3.5 9 0" stroke="#7a2d1d" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <g class="yeux"><ellipse cx="51.5" cy="57" rx="2.6" ry="3.2" fill="#3a2a22"/><ellipse cx="68.5" cy="57" rx="2.6" ry="3.2" fill="#3a2a22"/>
  <circle cx="52.4" cy="56" r=".9" fill="#fff"/><circle cx="69.4" cy="56" r=".9" fill="#fff"/></g>
  <circle cx="46" cy="65" r="3.6" fill="#ee8f7c" opacity=".4"/><circle cx="74" cy="65" r="3.6" fill="#ee8f7c" opacity=".4"/>
  <path d="M58 61q2 3 4 0" stroke="#d9957a" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <path class="bouche" d="M52 68q8 7.5 16 0q-8 3-16 0z" fill="#b5483d" stroke="#a23e34" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;


function lireReglages(conseille) {
  let r = {};
  try { r = JSON.parse(localStorage.getItem(CLE_REGLAGES())) || {}; } catch { r = {}; }
  return {
    niveau: NIVEAUX.includes(r.niveau) ? r.niveau : NIVEAUX.includes(Number(param('jouer.niveau'))) ? Number(param('jouer.niveau')) : conseille,
    couleur: ['w', 'b', 'x'].includes(r.couleur) ? r.couleur : param('jouer.couleur'),
  };
}

/** Pièces de « couleur » attaquées et mal protégées (la plus précieuse d'abord). */
function piecesEnDanger(jeu, couleur) {
  const adverse = couleur === 'w' ? 'b' : 'w';
  const danger = [];
  for (const rangee of jeu.board()) {
    for (const p of rangee) {
      if (!p || p.color !== couleur || p.type === 'k') continue;
      const attaquants = jeu.attackers(p.square, adverse);
      if (!attaquants.length) continue;
      const defenseurs = jeu.attackers(p.square, couleur);
      const plusPetit = Math.min(...attaquants.map((c) => VALEURS[jeu.get(c).type] || 0.5));
      if (!defenseurs.length || plusPetit < VALEURS[p.type]) danger.push(p);
    }
  }
  return danger.sort((a, b) => VALEURS[b.type] - VALEURS[a.type]);
}

export async function vueEntrainement(main) {
  const etat = await api('/etat');
  const conseilleBrut = Math.round(((etat.eloPartie ?? (etat.elo || 1000) - 200)) / 100) * 100;
  const conseille = NIVEAUX.reduce((a, b) => (Math.abs(b - conseilleBrut) < Math.abs(a - conseilleBrut) ? b : a));
  const reglages = lireReglages(conseille);
  const sauver = () => { try { localStorage.setItem(CLE_REGLAGES(), JSON.stringify(reglages)); } catch { /* sans importance */ } };

  main.innerHTML = `
    <div class="entete-page"><div><div class="surtitre">Entraînement</div><h1>Joue avec ta coach</h1>
      <p class="doux">${COACH} te parle pendant toute la partie : elle commente tes coups, te prévient des dangers et t'aide à progresser.</p></div>
      <nav class="onglets">
        <a class="actif" href="#/entrainement">Avec la coach</a>
        <a href="#/entrainement/cases?mode=nommer">Nommer la case</a>
        <a href="#/entrainement/cases?mode=trouver">Trouver la case</a>
      </nav></div>
    <div class="entrainement">
      <div class="colonne-plateau">
        <div class="barre-eval-h" id="barre-eval"><span id="eval-blancs" style="width:50%"></span><b id="eval-texte">0,0</b></div>
        <div class="ligne-joueur"><span class="avatar-joueur ordi">${ICONES.ordi}</span><strong id="nom-ordi">Ordinateur</strong><span class="prises" id="prises-ordi"></span></div>
        <div class="plateau-cadre" id="plateau"></div>
        <div class="ligne-joueur"><span class="avatar-joueur moi">${ICONES.jouer}</span><strong>Toi</strong><span class="prises" id="prises-moi"></span></div>
        <div class="bande-coups" id="bande"></div>
      </div>
        <div class="carte coach-direct">
          <div class="coach-identite">
            <div class="cadre-portrait" id="portrait">${PORTRAIT}</div>
            <div><strong>${COACH}</strong><div class="doux petit-texte">Ta coach · <span id="etat-coach">prête</span></div></div>
          </div>
          <div class="bulle" id="bulle"><p id="bulle-texte"></p><div class="boutons" id="bulle-actions"></div></div>
        </div>
        <div class="barre-actions zone-actions">
          <button id="b-reglages">${ICONES.reglages}<span>Réglages</span></button>
          <button id="b-abandon">${ICONES.drapeau}<span>Abandonner</span></button>
          <button id="b-indice">${ICONES.ampoule}<span>Indice</span></button>
          <button id="b-annuler">${ICONES.annuler}<span>Annuler</span></button>
        </div>
        <div class="carte" id="panneau-reglages" hidden>
          <h3>Réglages de l'entraînement</h3>
          <label class="doux petit-texte">Niveau de l'ordinateur</label>
          <select id="r-niveau" style="width:100%;margin:6px 0 12px">
            ${NIVEAUX.map((n) => `<option value="${n}" ${n === reglages.niveau ? 'selected' : ''}>${n}${n === conseille ? ' (conseillé pour toi)' : ''}</option>`).join('')}
          </select>
          <label class="doux petit-texte">Ta couleur</label>
          <div class="boutons" style="margin:6px 0 14px" id="r-couleur">
            ${[['w', 'Blancs'], ['b', 'Noirs'], ['x', 'Au hasard']].map(([c, n]) => `<button class="bouton petit ${reglages.couleur === c ? '' : 'secondaire'}" data-c="${c}">${n}</button>`).join('')}
          </div>
          <label class="interrupteur"><input type="checkbox" id="r-bavard" ${param('coach.bavard') ? 'checked' : ''}><span>La coach annonce aussi les coups de l'ordinateur</span></label>
          <label class="interrupteur"><input type="checkbox" id="r-pause" ${param('coach.pause') ? 'checked' : ''}><span>S'arrêter après une erreur pour me laisser réessayer</span></label>
          <label class="interrupteur"><input type="checkbox" id="r-barre" ${param('coach.barre') ? 'checked' : ''}><span>Afficher la barre d'évaluation</span></label>
          <button class="bouton large" id="r-nouvelle" style="margin-top:14px">Nouvelle partie avec ces réglages</button>
        </div>
    </div>`;
  const $ = (id) => main.querySelector(`#${id}`);

  // ---------- État de la partie ----------
  let actif = true;
  let gen = 0;               // change à chaque nouvelle partie / annulation : les tâches en cours s'arrêtent
  let moi = 'w';
  let niveau = reglages.niveau;
  let historique = [];       // { coup, cle } pour chaque demi-coup joué
  let analyseIci = null;     // promesse : analyse (2 lignes) de la position où c'est à moi de jouer
  let gainApresMoi = 50;     // mes chances juste après mon dernier coup
  let indiceNiveau = 0;
  let indicesUtilises = 0;
  let annulations = 0;
  let ouvertureDite = null;
  let enCours = false;
  let monTour = false;
  let attenteDecision = false;   // la coach attend « réessayer » ou « continuer »

  const plateau = new Plateau($('plateau'), { prises: { haut: $('prises-ordi'), bas: $('prises-moi') }, onCoup: (coup) => apresMonCoup(coup) });
  plateau.autoriser(null);
  const badge = document.createElement('div');
  badge.className = 'badge-coup';
  badge.hidden = true;
  $('plateau').appendChild(badge);

  // ---------- La coach parle ----------
  let tourParole = 0;
  /** Affiche le texte dans la bulle et le lit à voix haute. Se résout quand la phrase est finie. */
  function coachDit(message, actions = []) {
    if (!actif) return Promise.resolve();   // la page a été quittée : la coach se tait
    const moiTour = ++tourParole;
    const ecrit = typeof message === 'function' ? message(false) : echapper(message);
    const texte = typeof message === 'function' ? message(true) : message;
    $('bulle-texte').innerHTML = ecrit;
    $('bulle').classList.remove('apparition'); void $('bulle').offsetWidth; $('bulle').classList.add('apparition');
    $('bulle-actions').innerHTML = actions.map((a, i) => `<button class="bouton petit ${a.secondaire ? 'secondaire' : ''}" data-action="${i}">${a.texte}</button>`).join('');
    $('bulle-actions').onclick = (e) => {
      const b = e.target.closest('[data-action]');
      if (b) actions[Number(b.dataset.action)].faire();
    };
    $('portrait').classList.add('parle');
    $('etat-coach').textContent = 'te parle';
    return new Promise((resolve) => {
      let fini = false;
      const terminer = () => {
        if (fini) return;
        fini = true;
        // (la page a pu être quittée entre-temps : le portrait n'existe plus)
        if (actif && moiTour === tourParole) { $('portrait').classList.remove('parle'); $('etat-coach').textContent = 'te regarde jouer'; }
        resolve();
      };
      if (voixActive()) {
        parler(texte, terminer);
        setTimeout(terminer, Math.min(15000, 1500 + texte.length * 75));   // sécurité si la fin n'arrive jamais
      } else {
        setTimeout(terminer, Math.min(2200, 500 + texte.length * 12));
      }
    });
  }
  const coachReflechit = () => { if (actif) $('etat-coach').textContent = 'réfléchit…'; };

  // ---------- Affichage ----------
  function majBarre(gainBlancs, ligne, trait) {
    $('barre-eval').hidden = !param('coach.barre');
    $('eval-blancs').style.width = `${gainBlancs}%`;
    let texte = '0,0';
    if (ligne) {
      const s = trait === 'w' ? 1 : -1;
      texte = ligne.mate !== undefined ? `M${Math.abs(ligne.mate)}` : `${(ligne.cp * s) / 100 > 0 ? '+' : ''}${((ligne.cp * s) / 100).toFixed(1).replace('.', ',')}`;
    }
    $('eval-texte').textContent = texte;
    $('eval-texte').classList.toggle('a-gauche', gainBlancs > 50);
  }

  function majBande() {
    $('bande').innerHTML = historique.map((h, i) => `${i % 2 === 0 ? `<span class="num">${i / 2 + 1}.</span>` : ''}<span class="coup ${h.cle ? `c-${h.cle}` : ''} ${i === historique.length - 1 ? 'dernier' : ''}">${echapper(sanFr(h.coup.san))}${h.cle ? `<em>${BADGES[h.cle].signe}</em>` : ''}</span>`).join('');
    $('bande').scrollLeft = $('bande').scrollWidth;
  }

  function poserBadge(caseCible, cle) {
    if (!cle) { badge.hidden = true; return; }
    const f = 'abcdefgh'.indexOf(caseCible[0]);
    const r = Number(caseCible[1]);
    const col = moi === 'w' ? f : 7 - f;
    const lig = moi === 'w' ? 8 - r : r - 1;
    badge.hidden = false;
    badge.className = `badge-coup b-${cle}`;
    badge.textContent = BADGES[cle].signe;
    badge.title = BADGES[cle].nom;
    badge.style.left = `${((col + 1) / 8) * 100}%`;
    badge.style.top = `${(lig / 8) * 100}%`;
  }

  const sansCoups = () => historique.map((h) => h.coup.san);
  const fenActuelle = () => plateau.jeu.fen();

  // ---------- Déroulement ----------
  async function nouvellePartie() {
    gen++;
    taire();
    niveau = reglages.niveau;
    moi = reglages.couleur === 'x' ? (Math.random() < 0.5 ? 'w' : 'b') : reglages.couleur;
    historique = [];
    indiceNiveau = 0; indicesUtilises = 0; annulations = 0; ouvertureDite = null;
    enCours = true; monTour = false; attenteDecision = false;
    gainApresMoi = 50;
    plateau.charger(DEPART, { orientation: moi === 'w' ? 'white' : 'black' });
    plateau.activerPremoves(moi);   // jouer ses coups à l'avance pendant que l'ordinateur et la coach réfléchissent
    plateau.autoriser(null);
    plateau.fleches([]);
    poserBadge(null);
    $('nom-ordi').textContent = `Ordinateur (${niveau})`;
    $('panneau-reglages').hidden = true;
    majBarre(50, null, 'w');
    majBande();
    const g = gen;
    const salut = `${new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'}${etat.profil && etat.profil.nom !== 'Moi' ? ` ${etat.profil.nom}` : ''}`;
    if (moi === 'w') {
      monTour = true;
      plateau.autoriser('w');
      preparerMonTour();
      coachDit(`${salut} ! Je suis ${COACH}, ta coach. On joue ensemble contre l'ordinateur niveau ${niveau} : je te conseille pendant toute la partie. Tu as les Blancs, à toi de commencer. Prends le centre !`);
    } else {
      await coachDit(`${salut} ! Je suis ${COACH}, ta coach. Tu as les Noirs contre l'ordinateur niveau ${niveau}. Il commence : regardons ce qu'il joue.`);
      if (g === gen) tourOrdi(g);
    }
  }

  // Analyse de la position où c'est à moi de jouer (meilleur coup et 2e meilleur, pour l'indice et les occasions)
  function preparerMonTour() {
    indiceNiveau = 0;
    analyseIci = moteur().analyser(fenActuelle(), { profondeur: PROFONDEUR, multipv: 2 });
    return analyseIci;
  }

  // Mon coup vient d'être joué sur l'échiquier
  async function apresMonCoup(coup) {
    if (!enCours || !monTour) return;
    const g = gen;
    monTour = false;
    plateau.autoriser(null);
    plateau.fleches([]);
    const fenAvant = coup.before;
    historique.push({ coup, cle: null });
    majBande();
    coachReflechit();

    const avant = await analyseIci;
    if (g !== gen) return;
    const fin = plateau.jeu.isGameOver();
    const apres = fin ? null : await moteur().analyser(fenActuelle(), { profondeur: PROFONDEUR });
    if (g !== gen) return;

    // Classement du coup
    const [l1, l2] = avant.lignes;
    const gainAvant = pourcentageGain(l1);
    const gainApres = plateau.jeu.isCheckmate() ? 100 : fin ? 50 : 100 - pourcentageGain(apres.lignes[0]);
    const perte = Math.max(0, gainAvant - gainApres);
    const joue = coup.from + coup.to + (coup.promotion || '');
    const meilleur = l1?.pv?.[0];
    let cle;
    if (joue === meilleur || plateau.jeu.isCheckmate()) {
      const ecart = l2 ? pourcentageGain(l1) - pourcentageGain(l2) : 100;
      cle = !plateau.jeu.isCheckmate() && estSacrifice(fenAvant, joue) && ecart >= 8 && gainAvant >= 50 ? 'brillant' : 'meilleur';
    } else if (perte < 2) cle = 'excellent';
    else if (perte < 5) cle = 'bon';
    else if (perte < 10) cle = 'imprecision';
    else if (perte < 15) cle = 'erreur';
    else cle = 'gaffe';
    historique[historique.length - 1].cle = cle;
    gainApresMoi = gainApres;
    majBande();
    poserBadge(coup.to, cle);
    if (apres) majBarre(moi === 'w' ? gainApres : 100 - gainApres, apres.lignes[0], plateau.jeu.turn());

    if (fin) { finDePartie(); return; }

    // Ce que la coach dit de mon coup
    const ouverture = annonceOuverture();
    if (cle === 'brillant') {
      son.succes();
      confettis($('plateau'));
      await coachDit(`Coup brillant !! Tu sacrifies ${pieceSacrifiee(fenAvant, joue, moi) || 'du matériel'}, et c'est de loin le meilleur coup. Magnifique !${ouverture}`);
    } else if (cle === 'meilleur') {
      await coachDit(`${hasard(['Excellent, c\'est le meilleur coup !', 'Parfait, c\'est exactement ce que j\'aurais joué.', 'Très fort : meilleur coup !', 'Oui ! C\'est le coup de l\'ordinateur.'])}${ouverture}`);
    } else if (cle === 'excellent') {
      await coachDit(`${hasard(['Très bon coup.', 'Bien joué !', 'Bon choix, continue comme ça.', 'C\'est solide.'])}${ouverture}`);
    } else if (cle === 'bon') {
      await coachDit(`${hasard(['Pas mal. Il y avait un peu mieux, mais ça va.', 'Correct, même si on pouvait faire un peu mieux.'])}${ouverture}`);
    } else {
      // Imprécision, erreur ou gaffe : on explique pourquoi
      const reponse = rejouer(fenActuelle(), apres.lignes[0].pv, 4);
      const perteMat = -bilanMateriel(reponse, moi);
      let pourquoi;
      if (apres.lignes[0].mate > 0) pourquoi = (o) => (apres.lignes[0].mate === 1 ? `l'ordinateur peut faire mat tout de suite avec ${nc(reponse[0], o)}` : `l'ordinateur a maintenant un mat en ${pluriel(apres.lignes[0].mate, 'coup')}`);
      else if (perteMat >= 1 && reponse[0]) pourquoi = (o) => `l'ordinateur peut répondre ${nc(reponse[0], o)} et te gagner ${quoi(perteMat, 'ta dame')}`;
      else pourquoi = (o) => `tu perds ${Math.round(perte)} ${o ? 'pour cent' : '%'} de chances de gagner`;
      const titre = cle === 'gaffe' ? hasard(['Aïe, c\'est une gaffe !', 'Oh non, c\'est une gaffe !']) : cle === 'erreur' ? 'Attention, c\'est une erreur.' : 'Petite imprécision.';
      if ((cle === 'erreur' || cle === 'gaffe') && param('coach.pause')) {
        attenteDecision = true;
        son.erreur();
        await coachDit((o) => `${titre} Le problème : ${pourquoi(o)}. Tu veux réessayer ?`, [
          { texte: '↺ Réessayer', faire: () => reessayer() },
          { texte: 'Montre-moi le meilleur coup', secondaire: true, faire: () => montrerMeilleur(fenAvant, meilleur) },
          { texte: 'On continue', secondaire: true, faire: () => continuer() },
        ]);
        return;   // la suite attend ta décision
      }
      await coachDit((o) => { const t = pourquoi(o); return `${titre} ${t.charAt(0).toUpperCase()}${t.slice(1)}.${ouverture}`; });
    }
    if (g === gen) tourOrdi(g);
  }

  // Décisions après une erreur
  function reessayer() {
    if (!attenteDecision) return;
    attenteDecision = false;
    annulations++;
    gen++;
    plateau.annuler();
    historique.pop();
    majBande();
    poserBadge(null);
    monTour = true;
    plateau.autoriser(moi);
    preparerMonTour();
    coachDit(hasard(['D\'accord, on reprend. Cherche un meilleur coup !', 'Allez, deuxième essai. Regarde bien les menaces.']));
  }
  function continuer() {
    if (!attenteDecision) return;
    attenteDecision = false;
    const g = gen;
    coachDit('D\'accord, on continue. Voyons ce que joue l\'ordinateur.');
    tourOrdi(g);
  }
  function montrerMeilleur(fenAvant, meilleur) {
    const c = new Chess(fenAvant).move({ from: meilleur.slice(0, 2), to: meilleur.slice(2, 4), promotion: meilleur[4] });
    plateau.fleches([{ orig: meilleur.slice(0, 2), dest: meilleur.slice(2, 4), brush: 'green' }]);
    coachDit((o) => `Le meilleur coup était ${nc(c, o)}. Tu veux le jouer ?`, [
      { texte: '↺ Réessayer', faire: () => reessayer() },
      { texte: 'On continue', secondaire: true, faire: () => continuer() },
    ]);
  }

  // Au tour de l'ordinateur
  async function tourOrdi(g) {
    if (g !== gen || !enCours) return;
    $('etat-coach').textContent = "regarde l'ordinateur réfléchir…";
    const debut = Date.now();
    const uci = await coupDuMoteur(plateau.jeu, niveau);
    await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - debut))));
    if (g !== gen || !actif) return;
    const coup = plateau.jouerUci(uci);
    historique.push({ coup, cle: null });
    majBande();
    poserBadge(null);
    if (plateau.jeu.isGameOver()) { finDePartie(); return; }

    monTour = true;
    const ici = await preparerMonTour();
    if (g !== gen) return;
    plateau.autoriser(moi);
    const [l1, l2] = ici.lignes;
    const gainMoi = pourcentageGain(l1);
    majBarre(moi === 'w' ? gainMoi : 100 - gainMoi, l1, moi);

    // L'ordinateur s'est-il trompé ? (badge sur son coup)
    const gainOrdi = gainMoi - gainApresMoi;   // ce que l'ordinateur m'a laissé gagner
    let cleOrdi = null;
    if (gainOrdi >= 15) cleOrdi = 'gaffe';
    else if (gainOrdi >= 10) cleOrdi = 'erreur';
    if (cleOrdi) { historique[historique.length - 1].cle = cleOrdi; majBande(); poserBadge(coup.to, cleOrdi); }

    coachDit(messageApresOrdi(coup, ici, l1, l2, gainMoi, cleOrdi));
  }

  // Ce que la coach dit après le coup de l'ordinateur : le coup, puis la chose la plus importante à voir
  function messageApresOrdi(coup, ici, l1, l2, gainMoi, cleOrdi) {
    const morceaux = [];
    if (param('coach.bavard')) morceaux.push((o) => `Il joue ${nc(coup, o)}.`);
    const jeu = plateau.jeu;
    const meilleur = l1?.pv?.[0];
    const ecart = l2 ? pourcentageGain(l1) - pourcentageGain(l2) : 100;
    const occasions = param('coach.occasions');   // Paramètres > Entraîneur > Signaler les occasions
    if (occasions && l1?.mate > 0) {
      morceaux.push(l1.mate === 1 ? 'Regarde bien : tu as un mat en un coup !' : `Tu as un mat en ${pluriel(l1.mate, 'coup')} ! Cherche les échecs.`);
    } else if (occasions && meilleur && estSacrifice(fenActuelle(), meilleur) && ecart >= 8 && gainMoi >= 50) {
      morceaux.push('Attention, il y a un coup brillant ici ! Un sacrifice qui gagne. Cherche bien.');
    } else if (occasions && cleOrdi) {
      morceaux.push(cleOrdi === 'gaffe' ? 'L\'ordinateur vient de faire une gaffe ! Il y a quelque chose à gagner, cherche bien.' : 'L\'ordinateur s\'est trompé : profites-en, il y a mieux à jouer.');
    } else if (jeu.inCheck()) {
      morceaux.push('Échec ! Tu dois t\'occuper de ton roi.');
    } else {
      const danger = piecesEnDanger(jeu, moi);
      if (coup.captured) {
        const reprise = jeu.moves({ verbose: true }).some((m) => m.to === coup.to && m.captured);
        morceaux.push(`Il a pris ${piece(coup.captured, moi, moi)}.${reprise ? ' Tu peux reprendre.' : ''}`);
      } else if (danger.length) {
        const d = danger[0];
        morceaux.push((o) => `Attention : ${piece(d.type, moi, moi)} en ${kc(d.square, o)} est en danger.`);
      } else if (ecart >= 20 && gainMoi >= 55) {
        morceaux.push('Il y a un coup bien meilleur que les autres ici. Prends ton temps.');
      } else {
        const ouverture = annonceOuverture();
        if (ouverture) morceaux.push(ouverture.trim());
        else if (param('coach.conseils') && (historique.length % 6 === 1 || !param('coach.bavard'))) morceaux.push(conseilDuMoment());
        else morceaux.push(hasard(['À toi.', 'À toi de jouer.', 'Ton tour.', 'À toi, réfléchis bien.']));
      }
    }
    if (!morceaux.length) morceaux.push('À toi de jouer.');
    return (o) => morceaux.map((m) => (typeof m === 'function' ? m(o) : echapper(m))).join(' ');
  }

  function annonceOuverture() {
    if (!param('coach.ouvertures')) return '';
    if (historique.length > 14) return '';
    const o = trouverOuverture(sansCoups());
    if (!o || o.nom === ouvertureDite) return '';
    ouvertureDite = o.nom;
    return ` On est dans ${o.nom}. ${o.idee}`;
  }

  // Petit conseil général selon le moment de la partie
  function conseilDuMoment() {
    const jeu = plateau.jeu;
    const n = Math.ceil(historique.length / 2);
    const rangee = moi === 'w' ? '1' : '8';
    const pieces = jeu.board().flat().filter((p) => p && p.type !== 'k' && p.type !== 'p').length;
    const nonSorties = ['b', 'c', 'f', 'g'].filter((f) => {
      const p = jeu.get(`${f}${rangee}`);
      return p && p.color === moi && (p.type === 'n' || p.type === 'b');
    }).length;
    const roi = jeu.board().flat().find((p) => p && p.type === 'k' && p.color === moi);
    const roque = roi && ['g', 'c'].includes(roi.square[0]) && roi.square[1] === rangee;
    if (pieces <= 6) return 'On arrive en finale : active ton roi, il devient une pièce forte.';
    if (n <= 12 && nonSorties >= 2) return 'Pense à sortir tes cavaliers et tes fous avant de lancer une attaque.';
    if (n <= 15 && !roque && roi?.square === `e${rangee}`) return 'Ton roi est encore au centre : pense à roquer pour le mettre à l\'abri.';
    return hasard([
      'Avant chaque coup, regarde les échecs, les prises et les menaces.',
      'Demande-toi : que veut faire l\'ordinateur avec son dernier coup ?',
      'Cherche ta pièce la moins active, et trouve-lui une meilleure case.',
      'Vérifie que toutes tes pièces sont bien protégées.',
    ]);
  }

  // ---------- Indice en trois temps : l'idée, la pièce, puis le coup ----------
  async function indice() {
    if (!enCours) return;
    if (!monTour || attenteDecision) { coachDit(attenteDecision ? 'Choisis d\'abord : réessayer ou continuer ?' : 'Attends, c\'est au tour de l\'ordinateur.'); return; }
    const g = gen;
    coachReflechit();
    const ici = await analyseIci;
    if (g !== gen || !monTour) return;
    const l1 = ici.lignes[0];
    if (!l1?.pv?.length) return;
    const meilleur = l1.pv[0];
    const c = new Chess(fenActuelle()).move({ from: meilleur.slice(0, 2), to: meilleur.slice(2, 4), promotion: meilleur[4] });
    indiceNiveau++;
    indicesUtilises++;
    if (indiceNiveau === 1) {
      let idee;
      if (l1.mate > 0) idee = `Il y a un mat en ${pluriel(l1.mate, 'coup')} ! Cherche les échecs.`;
      else if (estSacrifice(fenActuelle(), meilleur)) idee = 'Ose ! Un sacrifice fonctionne ici.';
      else if (c.san.includes('+')) idee = 'Cherche un échec : il fait mal ici.';
      else if (c.captured) idee = 'Regarde les prises : une pièce adverse est mal protégée.';
      else if (piecesEnDanger(plateau.jeu, moi).length) idee = 'Une de tes pièces est en danger : commence par la mettre à l\'abri.';
      else idee = 'Cherche à améliorer ta pièce la moins active.';
      coachDit(`${idee} Si tu veux, redemande un indice.`);
    } else if (indiceNiveau === 2) {
      plateau.fleches([{ orig: c.from, brush: 'yellow' }]);
      coachDit((o) => `C'est ${piece(c.piece, moi, moi)} en ${kc(c.from, o)} qui doit bouger.`);
    } else {
      plateau.fleches([{ orig: c.from, dest: c.to, brush: 'green' }]);
      coachDit((o) => `Joue ${nc(c, o)}.`);
    }
  }

  // ---------- Annuler le dernier coup ----------
  function annuler() {
    if (!enCours) return;
    if (attenteDecision) { reessayer(); return; }
    if (!monTour) { coachDit('Attends que l\'ordinateur ait joué, puis tu pourras annuler.'); return; }
    if (historique.length < 2 || (moi === 'b' && historique.length < 3)) { coachDit('Il n\'y a pas encore de coup à annuler.'); return; }
    gen++;
    annulations++;
    plateau.annuler();
    plateau.annuler();
    historique.pop();
    historique.pop();
    majBande();
    poserBadge(null);
    plateau.fleches([]);
    monTour = true;
    plateau.autoriser(moi);
    preparerMonTour();
    coachDit('D\'accord, on revient en arrière. À toi de rejouer.');
  }

  // ---------- Fin de partie ----------
  async function finDePartie(abandon = false) {
    if (!enCours) return;
    enCours = false;
    monTour = false;
    attenteDecision = false;
    plateau.activerPremoves(null);
    plateau.autoriser(null);
    const jeu = plateau.jeu;
    let resultat = 0.5;
    let fin = 'Partie nulle';
    if (abandon) { resultat = 0; fin = 'Abandon'; }
    else if (jeu.isCheckmate()) { resultat = jeu.turn() === moi ? 0 : 1; fin = 'Échec et mat'; }
    else if (jeu.isStalemate()) fin = 'Pat';
    else if (jeu.isThreefoldRepetition()) fin = 'Répétition';
    else if (jeu.isInsufficientMaterial()) fin = 'Matériel insuffisant';
    jeu.header('Event', 'Roque · Entraînement', 'Date', new Date().toISOString().slice(0, 10).replaceAll('-', '.'),
      'White', moi === 'w' ? 'Moi' : `Stockfish ${niveau}`, 'Black', moi === 'b' ? 'Moi' : `Stockfish ${niveau}`,
      'Result', resultat === 0.5 ? '1/2-1/2' : (resultat === 1) === (moi === 'w') ? '1-0' : '0-1');
    const { id } = await api('/partie', { couleur: moi, niveau_moteur: niveau, resultat, fin, pgn: jeu.pgn() });
    if (!actif) return;
    const mesCoups = historique.filter((h) => h.coup.color === moi);
    const compte = (cles) => mesCoups.filter((h) => cles.includes(h.cle)).length;
    const bons = compte(['brillant', 'meilleur', 'excellent']);
    const fautes = compte(['erreur', 'gaffe']);
    const bilan = `Tu as joué ${bons} ${bons > 1 ? 'excellents coups' : 'excellent coup'}${fautes ? ` et fait ${pluriel(fautes, 'erreur')}` : ' sans erreur'}${indicesUtilises ? `, avec ${pluriel(indicesUtilises, 'indice')}` : ''}.`;
    let phrase;
    if (resultat === 1) { phrase = `Échec et mat ! Bravo, tu as gagné ! ${bilan}`; son.succes(); confettis($('plateau')); }
    else if (abandon) phrase = `D'accord, on arrête cette partie. ${bilan} On regarde l'analyse ensemble ?`;
    else if (resultat === 0) phrase = `Échec et mat… Ce n'est pas grave : on apprend de chaque partie. ${bilan}`;
    else phrase = `${fin} : partie nulle. ${bilan}`;
    coachDit(`${phrase} Tu veux voir l'analyse complète, ou rejouer ?`, [
      { texte: 'Voir l\'analyse complète', faire: () => { location.hash = `#/analyse/${id}`; } },
      { texte: 'Nouvelle partie', secondaire: true, faire: () => nouvellePartie() },
    ]);
  }

  // ---------- Boutons ----------
  $('b-indice').addEventListener('click', indice);
  $('b-annuler').addEventListener('click', annuler);
  $('b-abandon').addEventListener('click', () => {
    if (!enCours) { nouvellePartie(); return; }
    coachDit('Tu veux vraiment abandonner cette partie ?', [
      { texte: 'Oui, abandonner', faire: () => { gen++; finDePartie(true); } },
      { texte: 'Non, on continue', secondaire: true, faire: () => coachDit('Bonne décision : on ne lâche rien !') },
    ]);
  });
  $('b-reglages').addEventListener('click', () => { $('panneau-reglages').hidden = !$('panneau-reglages').hidden; });
  $('r-couleur').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-c]');
    if (!b) return;
    reglages.couleur = b.dataset.c;
    $('r-couleur').querySelectorAll('button').forEach((x) => x.classList.toggle('secondaire', x !== b));
    sauver();
  });
  $('r-niveau').addEventListener('change', () => { reglages.niveau = Number($('r-niveau').value); sauver(); });
  // Ces trois cases sont les mêmes réglages que dans Paramètres > Entraîneur
  $('r-bavard').addEventListener('change', () => changer('coach.bavard', $('r-bavard').checked));
  $('r-pause').addEventListener('change', () => changer('coach.pause', $('r-pause').checked));
  $('r-barre').addEventListener('change', () => { changer('coach.barre', $('r-barre').checked); $('barre-eval').hidden = !$('r-barre').checked; });
  $('r-nouvelle').addEventListener('click', nouvellePartie);

  nouvellePartie();
  return () => { actif = false; gen++; taire(); };
}
