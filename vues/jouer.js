// Partie contre Stockfish, du débutant (400) au très fort (2600)
import { Plateau, DEPART } from '../echiquier.js';
import { moteur } from '../moteur.js';
import { api, echapper, sanFr } from '../outils.js';
import { parler as parlerVoix, taire } from '../voix.js';
import { param } from '../parametres.js';
import { ICONES } from '../icones.js';

// Paramètres > Jouer > Annonces vocales pendant la partie
const parler = (texte) => { if (param('jouer.voix')) parlerVoix(texte); };

export const NIVEAUX = [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2400, 2600];

// Choix du coup du moteur selon le niveau.
// ≥ 1350 : bridage officiel de Stockfish (UCI_Elo).
// < 1350 : Stockfish ne descend pas plus bas ; on imite un joueur humain en choisissant parmi
// ses meilleurs coups avec une part de hasard, et quelques vraies gaffes aux plus bas niveaux.
export async function coupDuMoteur(jeu, niveau) {
  const fen = jeu.fen();
  if (niveau >= 1350) {
    const r = await moteur().analyser(fen, { elo: niveau, tempsMs: 500 });
    return r.meilleur;
  }
  const coups = jeu.moves({ verbose: true });
  if (Math.random() < (1350 - niveau) / 2400) {
    const c = coups[Math.floor(Math.random() * coups.length)];
    return c.from + c.to + (c.promotion || '');
  }
  const profondeur = Math.max(1, Math.round((niveau - 250) / 160));
  const r = await moteur().analyser(fen, { profondeur, multipv: 5 });
  const valeur = (l) => (l.mate !== undefined ? (l.mate > 0 ? 10000 - l.mate : -10000 - l.mate) : l.cp);
  const temperature = 25 + (1350 - niveau) / 3;
  const meilleure = valeur(r.lignes[0]);
  const poids = r.lignes.map((l) => Math.exp((valeur(l) - meilleure) / temperature));
  let tirage = Math.random() * poids.reduce((a, b) => a + b, 0);
  for (let i = 0; i < poids.length; i++) {
    tirage -= poids[i];
    if (tirage <= 0) return r.lignes[i].pv[0];
  }
  return r.meilleur;
}

export async function vueJouer(main, params) {
  const etat = await api('/etat');
  // Niveau : celui demandé (analyse, plan du jour), sinon celui des Paramètres, sinon le niveau conseillé
  const conseille = Number(params.niveau) || Number(param('jouer.niveau')) || Math.round(((etat.eloPartie ?? (etat.elo || 1000) - 200)) / 100) * 100;
  const parDefaut = NIVEAUX.reduce((a, b) => (Math.abs(b - conseille) < Math.abs(a - conseille) ? b : a));

  main.innerHTML = `
    <div class="entete-page"><div><div class="surtitre">Partie</div><h1>Jouer contre l'ordinateur</h1><p class="doux">Prends ton temps : applique « échecs, prises, menaces » à chaque coup.</p></div></div>
    <div class="zone-jeu">
      <div class="colonne-jeu">
        <div class="ligne-joueur"><span class="avatar-joueur ordi">${ICONES.ordi}</span><strong id="nom-ordi">Ordinateur</strong><span class="prises" id="prises-ordi"></span></div>
        <div class="plateau-cadre" id="plateau"></div>
        <div class="ligne-joueur"><span class="avatar-joueur moi">${ICONES.jouer}</span><strong>Toi</strong><span class="prises" id="prises-moi"></span></div>
      </div>
      <aside class="panneau">
        <div class="carte" id="reglages">
          <h3>Nouvelle partie</h3>
          <label class="doux petit-texte">Niveau de l'ordinateur</label>
          <select id="niveau" style="width:100%;margin:6px 0 12px">
            ${NIVEAUX.map((n) => `<option value="${n}" ${n === parDefaut ? 'selected' : ''}>${n}${n === parDefaut ? ' (conseillé pour toi)' : ''}</option>`).join('')}
          </select>
          <label class="doux petit-texte">Ta couleur</label>
          <div class="boutons" style="margin:6px 0 14px" id="couleurs">
            <button class="bouton petit" data-c="w">Blancs</button>
            <button class="bouton petit secondaire" data-c="b">Noirs</button>
            <button class="bouton petit secondaire" data-c="x">Au hasard</button>
          </div>
          <button class="bouton large" id="commencer">Commencer</button>
        </div>
        <div class="carte" id="partie" hidden>
          <div class="statut" id="statut"></div>
          <p class="doux petit-texte" id="adversaire" style="margin:.3em 0 .8em"></p>
          <div class="liste-coups" id="coups"></div>
          <div class="boutons" style="margin-top:12px">
            <button class="bouton secondaire petit" id="abandonner">Abandonner</button>
          </div>
        </div>
        <div class="carte" id="fin" hidden></div>
      </aside>
    </div>`;
  const $ = (id) => main.querySelector(`#${id}`);

  let choixCouleur = ['w', 'b', 'x'].includes(params.couleur) ? params.couleur : param('jouer.couleur');
  let couleur = 'w';
  let niveau = parDefaut;
  let enCours = false;
  let actif = true;   // vue encore affichée

  const plateau = new Plateau($('plateau'), { prises: { haut: $('prises-ordi'), bas: $('prises-moi') }, onCoup: () => apresCoupJoueur() });
  plateau.autoriser(null);

  $('couleurs').querySelectorAll('button').forEach((x) => x.classList.toggle('secondaire', x.dataset.c !== choixCouleur));
  $('couleurs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    choixCouleur = b.dataset.c;
    $('couleurs').querySelectorAll('button').forEach((x) => x.classList.toggle('secondaire', x !== b));
  });

  function afficherCoups() {
    const h = plateau.jeu.history();
    let html = '';
    for (let i = 0; i < h.length; i += 2) {
      html += `<span class="num">${i / 2 + 1}.</span><button>${echapper(sanFr(h[i]))}</button><button>${echapper(sanFr(h[i + 1] || ''))}</button>`;
    }
    $('coups').innerHTML = html;
    $('coups').scrollTop = $('coups').scrollHeight;
  }

  function statut() {
    $('statut').textContent = plateau.trait === couleur ? 'À toi de jouer' : 'L\'ordinateur réfléchit…';
  }

  async function tourDuMoteur() {
    if (!enCours) return;
    statut();
    const debut = Date.now();
    const uci = await coupDuMoteur(plateau.jeu, niveau);
    // Un temps de réflexion minimal, pour que le coup ne tombe pas instantanément
    await new Promise((r) => setTimeout(r, Math.max(0, 450 - (Date.now() - debut))));
    if (!enCours || !actif) return;
    plateau.jouerUci(uci);
    afficherCoups();
    if (!verifierFin()) {
      plateau.autoriser(couleur);
      statut();
      if (plateau.jeu.inCheck()) parler('Échec ! Protège ton roi.');
    }
  }

  function apresCoupJoueur() {
    afficherCoups();
    if (verifierFin()) return;
    plateau.autoriser(null);
    tourDuMoteur();
  }

  function verifierFin() {
    const j = plateau.jeu;
    if (!j.isGameOver()) return false;
    let resultat = 0.5;
    let fin = 'Partie nulle';
    if (j.isCheckmate()) {
      resultat = j.turn() === couleur ? 0 : 1;
      fin = 'Échec et mat';
    } else if (j.isStalemate()) fin = 'Pat';
    else if (j.isThreefoldRepetition()) fin = 'Répétition';
    else if (j.isInsufficientMaterial()) fin = 'Matériel insuffisant';
    terminer(resultat, fin);
    return true;
  }

  async function terminer(resultat, fin) {
    enCours = false;
    plateau.autoriser(null);
    const j = plateau.jeu;
    j.header('Event', 'Roque', 'Date', new Date().toISOString().slice(0, 10).replaceAll('-', '.'),
      'White', couleur === 'w' ? 'Moi' : `Stockfish ${niveau}`, 'Black', couleur === 'b' ? 'Moi' : `Stockfish ${niveau}`,
      'Result', resultat === 0.5 ? '1/2-1/2' : (resultat === 1) === (couleur === 'w') ? '1-0' : '0-1');
    const { id } = await api('/partie', { couleur, niveau_moteur: niveau, resultat, fin, pgn: j.pgn() });
    const titre = resultat === 1 ? 'Victoire ! 🎉' : resultat === 0 ? 'Défaite' : 'Partie nulle';
    $('statut').textContent = `${titre} — ${fin}`;
    $('fin').hidden = false;
    const phraseFin = resultat === 1 ? `Victoire ! ${fin}, bravo !` : resultat === 0 ? (fin === 'Abandon' ? 'Tu as abandonné la partie.' : `Défaite. ${fin}.`) : `Partie nulle. ${fin}.`;
    parler(`${phraseFin} Tu peux maintenant analyser la partie : je t'expliquerai chaque coup.`);
    $('fin').innerHTML = `<h3>${titre}</h3><p class="doux">${fin} contre l'ordinateur niveau ${niveau}.</p>
      <div class="boutons"><a class="bouton" href="#/analyse/${id}">Analyser la partie</a>
      <button class="bouton secondaire" id="rejouer">Nouvelle partie</button></div>`;
    $('rejouer').addEventListener('click', nouvellePartie);
  }

  function nouvellePartie() {
    $('reglages').hidden = false;
    $('partie').hidden = true;
    $('fin').hidden = true;
    plateau.charger(DEPART, { orientation: 'white' });
    plateau.autoriser(null);
  }

  $('commencer').addEventListener('click', () => {
    niveau = Number($('niveau').value);
    couleur = choixCouleur === 'x' ? (Math.random() < 0.5 ? 'w' : 'b') : choixCouleur;
    enCours = true;
    plateau.charger(DEPART, { orientation: couleur === 'w' ? 'white' : 'black' });
    $('reglages').hidden = true;
    $('partie').hidden = false;
    $('fin').hidden = true;
    $('adversaire').textContent = `Ordinateur niveau ${niveau} · tu as les ${couleur === 'w' ? 'Blancs' : 'Noirs'}`;
    $('nom-ordi').textContent = `Ordinateur · ${niveau}`;
    afficherCoups();
    parler(`Nouvelle partie contre l'ordinateur niveau ${niveau}. Tu as les ${couleur === 'w' ? 'Blancs : à toi de commencer' : 'Noirs : l\'ordinateur commence'}. Bonne partie !`);
    if (couleur === 'w') { plateau.autoriser('w'); statut(); } else tourDuMoteur();
  });

  // Venue de l'analyse avec « Nouvelle partie » : mêmes réglages, la partie démarre tout de suite
  if (params.lancer) {
    history.replaceState(null, '', '#/jouer');
    $('commencer').click();
  }

  $('abandonner').addEventListener('click', () => {
    if (enCours && (!param('jouer.confirmerAbandon') || confirm('Abandonner la partie ?'))) terminer(0, 'Abandon');
  });

  return () => { actif = false; enCours = false; taire(); };
}
