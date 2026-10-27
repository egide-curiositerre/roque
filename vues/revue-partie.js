// Analyse d'une partie : évaluation de chaque coup par Stockfish, coach qui explique les coups (texte et voix),
// meilleur coup proposé par l'ordinateur (et rejoué sur l'échiquier), coups brillants joués ou manqués (avec défi pour les retrouver),
// gaffes, erreurs, imprécisions et précision
import { Chess } from '/roque/lib/chess.js/chess.js';
import { Plateau, sonDuCoup } from '../echiquier.js';
import { moteur, pourcentageGain, texteEval } from '../moteur.js';
import { api, echapper, sanFr } from '../outils.js';
import { ICONES } from '../icones.js';
import { surChangementVoix } from '../voix.js';
import { expliquer, conseil, parler, preparer, taire, voixActive, basculerVoix, voixPossible, estSacrifice, pieceSacrifiee, nomCoup } from '../coach.js';
import { son, confettis } from '../sons.js';
import { cleLocale } from '../profil.js';
import { param } from '../parametres.js';

// Paramètres > Analyse > Force de l'analyse (profondeur de calcul de Stockfish)
const PROFONDEURS = { rapide: 9, normale: 11, profonde: 14 };
const PROFONDEUR = () => PROFONDEURS[param('analyse.profondeur')] || 11;
// Perte de « chances de gain » (en points de %) — mêmes seuils que Lichess
const SEUILS = [{ min: 15, cle: 'gaffe', signe: '??', nom: 'Gaffe' }, { min: 10, cle: 'erreur', signe: '?', nom: 'Erreur' }, { min: 5, cle: 'imprecision', signe: '?!', nom: 'Imprécision' }];

// Précision d'un coup selon la perte de chances de gain (formule de Lichess)
const precisionCoup = (perte) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * perte) - 3.1669));

export async function vueAnalyse(main, params) {
  const partie = await api(`/partie/${params.id}`);
  const jeu = new Chess();
  jeu.loadPgn(partie.pgn);
  const coups = jeu.history({ verbose: true });
  const positions = [coups[0]?.before || jeu.fen(), ...coups.map((c) => c.after)];
  if (!coups.length) positions[0] = new Chess().fen();

  const resultatTexte = partie.resultat === 1 ? 'Victoire' : partie.resultat === 0 ? 'Défaite' : 'Nulle';
  const moi = partie.couleur;
  main.innerHTML = `
    <div class="entete-page"><div><div class="surtitre">Après la partie</div><h1>Analyse de la partie</h1>
      <p class="doux">${resultatTexte} · ${echapper(partie.fin || '')} · ordinateur niveau ${partie.niveau_moteur} · tu avais les ${moi === 'w' ? 'Blancs' : 'Noirs'}</p></div>
      <div class="boutons">
        <a class="bouton secondaire" href="#/jouer?niveau=${partie.niveau_moteur}&couleur=${moi}">Changer les réglages</a>
        <a class="bouton" href="#/jouer?niveau=${partie.niveau_moteur}&couleur=${moi}&lancer=1">${ICONES.jouer} Nouvelle partie</a>
      </div></div>
    <div class="zone-jeu">
      <div class="colonne-jeu">
        <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-haut"></span></div>
        <div style="position:relative"><div class="barre-eval" ${param('analyse.barre') ? '' : 'hidden'}><span id="barre" style="height:50%"></span></div><div class="plateau-cadre" id="plateau"></div></div>
        <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-bas"></span></div>
      </div>
      <aside class="panneau">
        <div class="carte" id="resume"><div class="statut">Analyse en cours…</div><div class="barre" style="margin-top:10px"><span id="avancement" style="width:0%"></span></div></div>
        <div class="carte coach">
          <div class="coach-tete">
            <span class="coach-avatar">♞</span>
            <div style="flex:1"><strong>Ton coach</strong><div class="doux petit-texte">Évaluation : <span id="eval">…</span></div></div>
            ${voixPossible() ? '<button class="bouton petit secondaire" id="voix"></button>' : ''}
          </div>
          <div id="verdict"></div>
          <p id="commentaire" class="coach-texte"></p>
          <div id="bandeau-mode" class="bandeau-mode" hidden></div>
          <div id="occasion" class="occasion" hidden></div>
          <div id="conseil" class="conseil" hidden></div>
          <button class="bouton secondaire large" id="meilleur" style="margin-bottom:10px">${ICONES.ampoule} Meilleur coup</button>
          <div class="coach-commandes">
            <button class="bouton petit secondaire" id="debut" title="Début">⏮</button>
            <button class="bouton petit secondaire" id="prec" title="Coup précédent">←</button>
            <button class="bouton petit" id="lecture">▶ Lecture</button>
            <button class="bouton petit secondaire" id="suiv" title="Coup suivant">→</button>
            <button class="bouton petit secondaire" id="ecouter" title="Réécouter">${ICONES.son}</button>
          </div>
        </div>
        <div class="carte"><div class="liste-coups" id="coups"></div></div>
      </aside>
    </div>`;
  const $ = (id) => main.querySelector(`#${id}`);
  const plateau = new Plateau($('plateau'), { prises: { haut: $('prises-haut'), bas: $('prises-bas') }, fen: positions[0], orientation: moi === 'w' ? 'white' : 'black', onCoup: (coup, uci) => coupDefi(uci) });
  plateau.autoriser(null);

  let actif = true;
  let courant = 0;
  let lecture = false;     // lecture commentée en cours
  let minuteur = null;
  let oral = '';           // texte du coup affiché, prêt à être lu
  const evals = new Array(positions.length).fill(null);   // { gainBlancs, ligne, trait }
  const notes = new Array(coups.length).fill(null);      // classement de chaque coup
  const brillants = new Map();   // n° du coup → { uci, pv, joue } : coup brillant possible pour moi à ce moment
  let mode = 'partie';           // 'partie' | 'variante' (ligne de l'ordinateur rejouée) | 'defi' (trouver le coup brillant)
  let defi = null;
  const minuteursMode = new Set();
  const plusTard = (f, ms) => { const t = setTimeout(() => { minuteursMode.delete(t); f(); }, ms); minuteursMode.add(t); };

  function listeCoups() {
    let html = '';
    for (let i = 0; i < coups.length; i += 2) {
      const btn = (k) => {
        if (!coups[k]) return '<span></span>';
        const n = notes[k];
        const b = brillants.get(k);
        const occasion = b && !b.joue ? '<span class="marque-brillant" title="Coup brillant possible ici">✨</span>' : '';
        return `<button data-i="${k + 1}" class="${courant === k + 1 ? 'courant' : ''} ${n ? `c-${n.cle}` : ''}">${echapper(sanFr(coups[k].san))}${n ? n.signe : ''}${occasion}</button>`;
      };
      html += `<span class="num">${i / 2 + 1}.</span>${btn(i)}${btn(i + 1)}`;
    }
    $('coups').innerHTML = html;
    $('coups').querySelector('.courant')?.scrollIntoView({ block: 'nearest' });
  }

  function aller(i, { dire = false, fin = null } = {}) {
    sortirMode();
    const precedent = courant;
    courant = Math.max(0, Math.min(positions.length - 1, i));
    if (courant !== precedent && courant > 0) sonDuCoup(coups[courant - 1]);
    plateau.charger(positions[courant], { dernierCoup: courant ? [coups[courant - 1].from, coups[courant - 1].to] : undefined });
    plateau.autoriser(null);
    const e = evals[courant];
    $('eval').textContent = e ? texteEval(e.ligne, e.trait) : '…';
    $('barre').style.height = `${e ? e.gainBlancs : 50}%`;

    // Explication du coup qui vient d'être joué
    const fleches = [];
    if (courant) {
      const x = expliquer(courant - 1, { coups, positions, evals, moi });
      const b = brillants.get(courant - 1);
      if (b?.joue) {
        // Coup brillant joué : on le célèbre à la place du « meilleur coup » ordinaire
        const sacrifie = pieceSacrifiee(positions[courant - 1], b.uci, moi);
        const bravo = `Coup brillant ! Tu sacrifies ${sacrifie || 'du matériel'}, et c'est de loin le meilleur coup. Superbe !`;
        x.verdict = { cle: 'brillant', nom: 'Coup brillant', signe: '!!' };
        x.html = x.html.replace("C'est exactement le coup que l'ordinateur aurait joué. Bravo !", bravo);
        x.oral = x.oral.replace("C'est exactement le coup que l'ordinateur aurait joué. Bravo !", bravo);
      }
      $('verdict').innerHTML = x.verdict ? `<span class="verdict v-${x.verdict.cle}">${x.verdict.nom}${x.verdict.signe ? ` ${x.verdict.signe}` : ''}</span>` : '';
      $('commentaire').innerHTML = x.html;
      oral = x.oral;
      if (x.alternative && param('analyse.fleches')) fleches.push({ orig: x.alternative.slice(0, 2), dest: x.alternative.slice(2, 4), brush: 'green' });
      // Coup brillant manqué : on le signale et on propose de le chercher
      $('occasion').hidden = !(b && !b.joue);
      if (b && !b.joue) {
        $('occasion').innerHTML = `<div><strong>✨ Il y avait un coup brillant ici !</strong><br><span class="doux petit-texte">Un sacrifice qui gagne. Sauras-tu le trouver ?</span></div>
          <div class="boutons"><button class="bouton petit" data-defi="${courant - 1}">Trouve-le toi-même</button>
          <button class="bouton petit secondaire" data-voir-brillant="${courant - 1}">Voir le coup</button></div>`;
        oral += " Attention : à ce moment, il y avait un coup brillant. Appuie sur Trouve-le toi-même pour le chercher.";
      }
    } else {
      $('verdict').innerHTML = '';
      $('occasion').hidden = true;
      $('commentaire').textContent = 'Position de départ. Appuie sur « Lecture » : je t\'explique la partie coup par coup, à voix haute.';
      oral = 'Position de départ. Appuie sur lecture, et je t\'explique la partie coup par coup.';
    }

    // Meilleur coup selon l'ordinateur dans la position affichée (flèche bleue)
    const proposition = e?.ligne?.pv?.length ? conseil(positions[courant], e.ligne, moi) : null;
    $('conseil').hidden = !proposition;
    if (proposition) {
      $('conseil').innerHTML = `<span class="conseil-icone">${ICONES.ampoule}</span><span>${proposition.html}</span>`;
      if (param('analyse.fleches')) fleches.push({ orig: proposition.uci.slice(0, 2), dest: proposition.uci.slice(2, 4), brush: 'blue' });
      if (!courant) oral += ` ${proposition.oral}`;
    }
    plateau.fleches(fleches);
    listeCoups();
    if (dire) {
      parler(oral, fin);
      // Prépare déjà la phrase du coup suivant : la lecture s'enchaîne sans attente
      if (courant < coups.length) preparer(expliquer(courant, { coups, positions, evals, moi }).oral);
    }
  }

  // Lecture commentée : avance d'un coup, le lit, attend la fin de la phrase puis continue
  function arreterLecture() {
    lecture = false;
    clearTimeout(minuteur);
    $('lecture').innerHTML = '▶ Lecture';
  }
  function etape() {
    if (!lecture || !actif) return;
    if (courant >= positions.length - 1) { arreterLecture(); return; }
    aller(courant + 1, { dire: true, fin: () => { minuteur = setTimeout(etape, voixActive() ? ({ courte: 250, normale: 700, longue: 1800 }[param('analyse.pause')] ?? 700) : 0); } });
    if (!voixActive()) { clearTimeout(minuteur); minuteur = setTimeout(etape, 2500); }
  }
  $('lecture').addEventListener('click', () => {
    if (lecture) { arreterLecture(); taire(); return; }
    lecture = true;
    $('lecture').innerHTML = '⏸ Pause';
    if (courant >= positions.length - 1) aller(0);
    etape();
  });

  // Navigation à la main : arrête la lecture et commente le coup choisi
  const naviguer = (i) => { arreterLecture(); aller(i, { dire: true }); };
  $('coups').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) naviguer(Number(b.dataset.i)); });
  $('debut').addEventListener('click', () => naviguer(0));
  $('prec').addEventListener('click', () => naviguer(courant - 1));
  $('suiv').addEventListener('click', () => naviguer(courant + 1));
  $('ecouter').addEventListener('click', () => { if (!voixActive()) { basculerVoix(); majVoix(); } parler(oral); });
  const majVoix = () => { if ($('voix')) $('voix').innerHTML = `${voixActive() ? ICONES.voix : ICONES.voixCoupee}<span>Voix ${voixActive() ? 'activée' : 'coupée'}</span>`; };
  $('voix')?.addEventListener('click', basculerVoix);
  const desabonner = surChangementVoix(majVoix);   // reste synchronisé avec le bouton du menu
  majVoix();
  const clavier = (e) => {
    if (e.key === 'ArrowLeft') naviguer(courant - 1);
    if (e.key === 'ArrowRight') naviguer(courant + 1);
  };
  document.addEventListener('keydown', clavier);

  // ---------- Modes « variante » et « défi » ----------
  function sortirMode() {
    minuteursMode.forEach(clearTimeout);
    minuteursMode.clear();
    if (mode === 'partie') return;
    mode = 'partie';
    defi = null;
    $('bandeau-mode').hidden = true;
    $('meilleur').hidden = false;
    plateau.autoriser(null);
  }
  const revenir = () => { aller(courant); taire(); };

  function bandeau(html) {
    $('bandeau-mode').hidden = false;
    $('bandeau-mode').innerHTML = `<div>${html}</div><button class="bouton petit secondaire" data-revenir>↩ Revenir à la partie</button>`;
  }

  // Rejoue sur l'échiquier une ligne de l'ordinateur, un coup par seconde
  function jouerVariante(base, pv, titre, phrase) {
    sortirMode();
    arreterLecture();
    mode = 'variante';
    const suite = [];
    const j = new Chess(base);
    for (const u of pv.slice(0, 6)) {
      try { suite.push(j.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })); } catch { break; }
    }
    plateau.charger(base);
    plateau.autoriser(null);
    plateau.fleches([]);
    $('meilleur').hidden = true;
    $('conseil').hidden = true;
    $('occasion').hidden = true;
    bandeau(`<strong>${titre}</strong><br><span class="ligne-variante">${suite.map((c, i) => `<span data-v="${i}">${echapper(sanFr(c.san))}</span>`).join(' ')}</span>`);
    parler(phrase);
    let i = 0;
    const avancer = () => {
      if (mode !== 'variante' || i >= suite.length) return;
      plateau.jouerUci(suite[i].from + suite[i].to + (suite[i].promotion || ''));
      main.querySelectorAll('.ligne-variante span').forEach((el) => el.classList.toggle('jouee', Number(el.dataset.v) <= i));
      i++;
      plusTard(avancer, 1100);
    };
    plusTard(avancer, 700);
  }

  // Bouton « Meilleur coup » : ce qu'il fallait jouer à la place du coup affiché, sinon le meilleur coup dans la position
  function montrerMeilleur() {
    const avant = courant ? evals[courant - 1] : null;
    const joue = courant ? coups[courant - 1] : null;
    const different = avant?.ligne?.pv?.[0] && joue && avant.ligne.pv[0] !== joue.from + joue.to + (joue.promotion || '');
    if (different) {
      const premier = new Chess(positions[courant - 1]).move({ from: avant.ligne.pv[0].slice(0, 2), to: avant.ligne.pv[0].slice(2, 4), promotion: avant.ligne.pv[0][4] });
      jouerVariante(positions[courant - 1], avant.ligne.pv, `Au lieu de ${echapper(sanFr(joue.san))}, le meilleur coup était :`,
        `Au lieu de ${nomCoup(joue, true)}, le meilleur coup était ${nomCoup(premier, true)}. Regarde la suite prévue par l'ordinateur.`);
      return;
    }
    const ici = evals[courant];
    if (!ici?.ligne?.pv?.length) { parler(courant === positions.length - 1 ? 'La partie est terminée : il n\'y a plus de coup à jouer.' : 'Je calcule encore cette position, réessaie dans un instant.'); return; }
    const premier = new Chess(positions[courant]).move({ from: ici.ligne.pv[0].slice(0, 2), to: ici.ligne.pv[0].slice(2, 4), promotion: ici.ligne.pv[0][4] });
    jouerVariante(positions[courant], ici.ligne.pv, 'Meilleur coup dans cette position :',
      `${joue ? 'Ton coup était déjà le meilleur. ' : ''}Ici, le meilleur coup est ${nomCoup(premier, true)}. Regarde la suite prévue par l'ordinateur.`);
  }

  // Défi : revenir au moment où un coup brillant était possible, et le trouver soi-même
  function lancerDefi(k) {
    const b = brillants.get(k);
    if (!b) return;
    sortirMode();
    arreterLecture();
    mode = 'defi';
    defi = { k, b, essais: 0 };
    courant = k + 1;   // en revenant, on retombe sur le coup réellement joué
    plateau.charger(positions[k], { dernierCoup: k ? [coups[k - 1].from, coups[k - 1].to] : undefined });
    plateau.fleches([]);
    plateau.autoriser(moi);
    listeCoups();
    $('meilleur').hidden = true;
    $('conseil').hidden = true;
    $('occasion').hidden = true;
    $('verdict').innerHTML = '<span class="verdict v-brillant">✨ Défi : coup brillant</span>';
    $('commentaire').innerHTML = `Dans la partie, tu as joué <strong>${echapper(sanFr(coups[k].san))}</strong>. Mais il y avait un <strong>coup brillant</strong> : un sacrifice qui gagne. À toi de le trouver !`;
    bandeau(`<strong>✨ Trouve le coup brillant</strong><br><span class="doux petit-texte">Joue directement sur l'échiquier.</span>`);
    parler(`Dans la partie, tu as joué ${nomCoup(coups[k], true)}. Mais il y avait un coup brillant : un sacrifice qui gagne. À toi de le trouver !`);
  }

  function coupDefi(uci) {
    if (mode !== 'defi' || !defi) return;
    const { b, k } = defi;
    if (uci === b.uci || plateau.jeu.isCheckmate()) {
      plateau.autoriser(null);
      son.succes();
      confettis($('plateau'));
      $('plateau').classList.remove('erreur');
      $('plateau').classList.add('succes');
      bandeau('<strong>✨ Coup brillant trouvé !</strong><br><span class="doux petit-texte">Regarde la suite prévue par l\'ordinateur.</span>');
      plusTard(() => $('plateau').classList.remove('succes'), 1800);
      const sacrifie = pieceSacrifiee(positions[k], b.uci, moi);
      const premier = new Chess(positions[k]).move({ from: b.uci.slice(0, 2), to: b.uci.slice(2, 4), promotion: b.uci[4] });
      $('verdict').innerHTML = '<span class="verdict v-brillant">Coup brillant !!</span>';
      $('commentaire').innerHTML = `Bravo, tu l'as trouvé : <strong>${echapper(sanFr(premier.san))}</strong> !! Tu sacrifies ${sacrifie || 'du matériel'} pour prendre l'avantage. Regarde la suite.`;
      parler(`Bravo, tu l'as trouvé ! ${nomCoup(premier, true)}. Tu sacrifies ${sacrifie || 'du matériel'} pour prendre l'avantage. Regarde la suite.`);
      // La suite de l'ordinateur, coup par coup
      let i = 1;
      const avancer = () => {
        if (mode !== 'defi' || i >= Math.min(b.pv.length, 6)) return;
        plateau.jouerUci(b.pv[i]);
        i++;
        plusTard(avancer, 1100);
      };
      plusTard(avancer, 1600);
      return;
    }
    defi.essais++;
    son.erreur();
    $('plateau').classList.remove('erreur');
    void $('plateau').offsetWidth;
    $('plateau').classList.add('erreur');
    plateau.autoriser(null);
    plusTard(() => { plateau.annuler(); plateau.autoriser(moi); }, 650);
    if (defi.essais === 1) {
      $('commentaire').innerHTML = 'Ce n\'est pas ça. Cherche un coup qui <strong>sacrifie une pièce</strong> : regarde les échecs et les prises.';
      parler('Ce n\'est pas ça. Cherche un coup qui sacrifie une pièce. Regarde les échecs et les prises.');
    } else if (defi.essais === 2) {
      const p = new Chess(positions[k]).get(b.uci.slice(0, 2));
      plusTard(() => plateau.fleches([{ orig: b.uci.slice(0, 2), brush: 'yellow' }]), 700);
      $('commentaire').innerHTML = 'Indice : c\'est la pièce entourée qui doit bouger.';
      parler(`Indice : c'est ${p ? `ta pièce en ${b.uci.slice(0, 2)}` : 'la pièce entourée'} qui doit bouger.`);
    } else {
      const premier = new Chess(positions[k]).move({ from: b.uci.slice(0, 2), to: b.uci.slice(2, 4), promotion: b.uci[4] });
      plusTard(() => jouerVariante(positions[k], b.pv, '✨ Le coup brillant était :',
        `Le coup brillant était ${nomCoup(premier, true)}. Regarde bien la suite : tu pourras le retrouver la prochaine fois.`), 700);
    }
  }

  $('meilleur').addEventListener('click', montrerMeilleur);
  main.addEventListener('click', (e) => {
    const d = e.target.closest('[data-defi]');
    if (d) { lancerDefi(Number(d.dataset.defi)); return; }
    const v = e.target.closest('[data-voir-brillant]');
    if (v) {
      const k = Number(v.dataset.voirBrillant);
      const b = brillants.get(k);
      const premier = new Chess(positions[k]).move({ from: b.uci.slice(0, 2), to: b.uci.slice(2, 4), promotion: b.uci[4] });
      jouerVariante(positions[k], b.pv, '✨ Le coup brillant était :', `Le coup brillant était ${nomCoup(premier, true)}. Regarde la suite.`);
      return;
    }
    if (e.target.closest('[data-revenir]')) revenir();
  });

  aller(0);

  // L'analyse tourne à part : la vue rend la main tout de suite et s'arrête si on change de page
  analyser();
  return () => { actif = false; clearTimeout(minuteur); minuteursMode.forEach(clearTimeout); taire(); desabonner(); document.removeEventListener('keydown', clavier); };

  // ---------- Coups brillants ----------
  // Un coup brillant est un sacrifice (une pièce laissée à prendre) qui est aussi, et de loin, le meilleur coup.
  // On cherche à chacun de mes coups si un tel coup existait (joué ou manqué). Résultat gardé dans le navigateur.
  async function chercherBrillants() {
    const cle = cleLocale(`roque-brillants-${partie.id}`);
    try {
      const memo = JSON.parse(localStorage.getItem(cle));
      if (Array.isArray(memo)) { for (const [k, b] of memo) brillants.set(k, b); return; }
    } catch { /* rien en mémoire */ }
    for (let k = 0; k < coups.length; k++) {
      if (coups[k].color !== moi || !evals[k]?.ligne?.pv?.length) continue;
      const gain = pourcentageGain(evals[k].ligne);            // mes chances avec le meilleur coup
      const avant = k > 0 ? 100 - pourcentageGain(evals[k - 1].ligne) : 50;   // mes chances avant le coup adverse
      if (gain < 50 || avant >= 97) continue;                   // position perdue, ou déjà gagnée d'avance : pas de brillance
      if (!estSacrifice(positions[k], evals[k].ligne.pv[0])) continue;
      // Le sacrifice doit être nettement meilleur que tout autre coup
      const r = await moteur().analyser(positions[k], { profondeur: 12, multipv: 2 });
      if (!actif) return;
      const [l1, l2] = r.lignes;
      if (!l1?.pv?.length || !estSacrifice(positions[k], l1.pv[0])) continue;
      const ecart = l2 ? pourcentageGain(l1) - pourcentageGain(l2) : 100;
      if (ecart < 8 || pourcentageGain(l1) < 50) continue;
      const joue = coups[k].from + coups[k].to + (coups[k].promotion || '');
      brillants.set(k, { uci: l1.pv[0], pv: l1.pv.slice(0, 8), joue: joue === l1.pv[0] });
    }
    try { localStorage.setItem(cle, JSON.stringify([...brillants])); } catch { /* stockage indisponible */ }
  }

  // ---------- Analyse (mise en cache dans le navigateur : une partie n'est analysée qu'une fois) ----------
  async function analyser() {
    const cle = cleLocale(`roque-analyse-${partie.id}${param('analyse.profondeur') === 'normale' ? '' : `-${param('analyse.profondeur')}`}`);
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem(cle)); } catch { cache = null; }

    for (let i = 0; i < positions.length; i++) {
      const p = new Chess(positions[i]);
      const trait = p.turn();
      let ligne;
      if (p.isCheckmate()) ligne = { mate: -1, pv: [] };    // le camp au trait est mat : 0 % de gain
      else if (cache?.[i]) ligne = cache[i];
      else if (p.isGameOver()) ligne = { cp: 0, pv: [] };    // pat ou nulle
      else ligne = (await moteur().analyser(positions[i], { profondeur: PROFONDEUR() })).lignes[0] || { cp: 0, pv: [] };
      if (!actif) return;
      const gainTrait = pourcentageGain(ligne);
      evals[i] = { ligne, trait, gainBlancs: trait === 'w' ? gainTrait : 100 - gainTrait };
      $('avancement').style.width = `${Math.round((100 * (i + 1)) / positions.length)}%`;
      if (i === courant && mode === 'partie') aller(courant);
    }
    try { localStorage.setItem(cle, JSON.stringify(evals.map((e) => e.ligne))); } catch { /* stockage indisponible */ }

    // Classement des coups et précision par camp
    const parCamp = { w: [], b: [] };
    const compte = { w: { gaffe: 0, erreur: 0, imprecision: 0 }, b: { gaffe: 0, erreur: 0, imprecision: 0 } };
    coups.forEach((c, k) => {
      const avant = c.color === 'w' ? evals[k].gainBlancs : 100 - evals[k].gainBlancs;
      const apres = c.color === 'w' ? evals[k + 1].gainBlancs : 100 - evals[k + 1].gainBlancs;
      const perte = Math.max(0, avant - apres);
      parCamp[c.color].push(precisionCoup(perte));
      const s = SEUILS.find((x) => perte >= x.min);
      if (s) { notes[k] = { ...s, perte }; compte[c.color][s.cle]++; }
    });
    const moyenne = (t) => (t.length ? t.reduce((a, b) => a + b, 0) / t.length : 100);
    const precision = Math.round(moyenne(parCamp[moi]) * 10) / 10;
    await api(`/partie/${partie.id}/correction`, { precision, gaffes: compte[moi].gaffe, erreurs: compte[moi].erreur, imprecisions: compte[moi].imprecision });

    $('resume').innerHTML = '<div class="statut">Recherche des coups brillants…</div><div class="barre" style="margin-top:10px"><span style="width:100%"></span></div>';
    if (param('analyse.brillants')) await chercherBrillants();
    if (!actif) return;
    for (const [k, b] of brillants) if (b.joue) notes[k] = { cle: 'brillant', signe: '!!', nom: 'Coup brillant' };
    const manques = [...brillants].filter(([, b]) => !b.joue).map(([k]) => k);
    const reussis = [...brillants].filter(([, b]) => b.joue).length;
    const numero = (k) => `${Math.floor(k / 2) + 1}${coups[k].color === 'w' ? '.' : '...'}`;
    const premiere = notes.findIndex((n, k) => n && n.cle !== 'imprecision' && n.cle !== 'brillant' && coups[k].color === moi);
    $('resume').innerHTML = `
      <div class="statut">Ta précision : ${precision} %</div>
      <div class="boutons" style="margin:10px 0">
        <span class="badge rouge">${compte[moi].gaffe} gaffe${compte[moi].gaffe > 1 ? 's' : ''}</span>
        <span class="badge or">${compte[moi].erreur} erreur${compte[moi].erreur > 1 ? 's' : ''}</span>
        <span class="badge">${compte[moi].imprecision} imprécision${compte[moi].imprecision > 1 ? 's' : ''}</span>
      </div>
      <p class="doux petit-texte">Ordinateur : ${Math.round(moyenne(parCamp[moi === 'w' ? 'b' : 'w']))} % de précision.</p>
      ${reussis ? `<p class="petit-texte brillant-texte">✨ Tu as joué ${reussis} coup${reussis > 1 ? 's' : ''} brillant${reussis > 1 ? 's' : ''} !!</p>` : ''}
      ${manques.length ? `<div class="occasions"><div class="petit-texte"><strong>✨ ${manques.length} coup${manques.length > 1 ? 's' : ''} brillant${manques.length > 1 ? 's' : ''} à retrouver</strong></div>
        <div class="boutons" style="margin-top:8px">${manques.map((k) => `<button class="bouton petit" data-defi="${k}">Coup ${numero(k)}</button>`).join('')}</div></div>` : ''}
      ${premiere >= 0 ? `<button class="bouton petit secondaire" id="voir-faute" style="margin-top:10px">Voir ta première faute</button>` : '<p class="petit-texte" style="color:var(--vert)">Aucune gaffe ni erreur : bravo !</p>'}`;
    $('voir-faute')?.addEventListener('click', () => naviguer(premiere + 1));
    if (!lecture && courant === 0 && param('analyse.resumeVocal')) {
      const n = (k, mot) => `${k} ${mot}${k > 1 ? 's' : ''}`;
      const brillance = (reussis ? ` Tu as joué ${n(reussis, 'coup')} brillant${reussis > 1 ? 's' : ''}, bravo !` : '')
        + (manques.length ? ` Et il y avait ${n(manques.length, 'coup')} brillant${manques.length > 1 ? 's' : ''} à trouver : essaie de ${manques.length > 1 ? 'les' : 'le'} retrouver.` : '');
      parler(`Analyse terminée. Ta précision est de ${String(precision).replace('.', ',')} pour cent, avec ${n(compte[moi].gaffe, 'gaffe')}, ${n(compte[moi].erreur, 'erreur')} et ${n(compte[moi].imprecision, 'imprécision')}.${brillance} Appuie sur Lecture pour que je t'explique la partie coup par coup.`);
    }
    listeCoups();
    if (mode === 'partie') aller(courant);
  }
}
