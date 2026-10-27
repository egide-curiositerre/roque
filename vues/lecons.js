// Leçons : parcours de A à Z, et lecteur de leçon pas à pas
import { Chess } from '/roque/lib/chess.js/chess.js';
import { Plateau, DEPART, uciVersCoup } from '../echiquier.js';
import { api, echapper, md, sanFr, toast } from '../outils.js';
import { ICONES } from '../icones.js';
import { parler, taire } from '../voix.js';
import { nomCoup } from '../coach.js';
import { son } from '../sons.js';

export async function vueLecons(main) {
  const { modules, lecons } = await api('/lecons');
  const faites = lecons.filter((l) => l.faite).length;
  const prochaine = lecons.find((l) => !l.faite);
  main.innerHTML = `
    <div class="entete-page">
      <div><div class="surtitre">Parcours de A à Z</div><h1>Leçons</h1><p class="doux">${faites} leçon${faites > 1 ? 's' : ''} terminée${faites > 1 ? 's' : ''} sur ${lecons.length}</p></div>
      ${prochaine ? `<a class="bouton" href="#/lecons/${prochaine.id}">Continuer : ${echapper(prochaine.titre)}</a>` : '<span class="badge vert">Parcours terminé 🏆</span>'}
    </div>
    <div class="barre" style="margin-bottom:26px"><span style="width:${(100 * faites) / lecons.length}%"></span></div>
    ${modules.map((m, i) => {
      const liste = lecons.filter((l) => l.module === m.id);
      const n = liste.filter((l) => l.faite).length;
      return `<section class="module">
        <div class="module-titre"><span class="module-num">${i + 1}</span><h2 style="margin:0">${echapper(m.titre)}</h2><span class="badge ${n === liste.length ? 'vert' : ''}">${n}/${liste.length}</span></div>
        <p class="doux">${echapper(m.description)}</p>
        <div class="liste-lecons">
          ${liste.map((l) => `<a class="lecon-tuile ${l.faite ? 'faite' : ''}" href="#/lecons/${l.id}">
            ${l.faite ? `<span class="coin badge vert">${ICONES.coche}</span>` : ''}<strong>${echapper(l.titre)}</strong><span class="doux petit-texte">${echapper(l.resume)}</span></a>`).join('')}
        </div>
      </section>`;
    }).join('')}`;
}

export async function vueLecon(main, params) {
  const lecon = await api(`/lecons/${params.id}`);
  main.innerHTML = `
    <div class="entete-page">
      <div><a href="#/lecons" class="petit-texte">← Toutes les leçons</a><h1 style="margin-top:6px">${echapper(lecon.titre)}</h1></div>
      <span class="badge" id="compteur"></span>
    </div>
    <div class="zone-jeu">
      <div class="colonne-jeu">
        <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-haut"></span></div>
        <div class="plateau-cadre" id="plateau"></div>
        <div class="ligne-joueur ligne-prises"><span class="prises" id="prises-bas"></span></div>
      </div>
      <aside class="panneau">
        <div class="carte texte-lecon" id="texte-carte">
          <button class="bouton-ecoute coin-ecoute" id="ecouter" title="Écouter cette étape">${ICONES.son}</button>
          <div id="texte"></div>
        </div>
        <div class="statut" id="statut"></div>
        <div class="boutons" id="controles-sequence" hidden>
          <button class="bouton petit" id="seq-lecture">⏸ Pause</button>
          <button class="bouton secondaire petit" id="seq-debut" title="Revenir au début">⏮</button>
          <button class="bouton secondaire petit" id="seq-prec" title="Coup précédent">◀</button>
          <button class="bouton secondaire petit" id="seq-suiv" title="Coup suivant">▶</button>
          <span class="doux petit-texte" id="seq-coup" style="align-self:center"></span>
        </div>
        <div class="carte note-sequence" id="seq-note" hidden></div>
        <div class="boutons">
          <button class="bouton secondaire" id="precedent">← Précédent</button>
          <button class="bouton" id="suivant">Suivant →</button>
        </div>
        <div class="carte" id="fin" hidden></div>
      </aside>
    </div>`;
  const $ = (id) => main.querySelector(`#${id}`);
  const plateau = new Plateau($('plateau'), { prises: { haut: $('prises-haut'), bas: $('prises-bas') }, onCoup: (coup, uci) => coupExercice(uci) });
  plateau.autoriser(null);

  let etape = 0;
  let exo = null;          // { solution, index, mat, resolu }
  let seq = null;          // { depart, coups, notes, index, lecture }
  let rep = null;          // repérage : { cases, index, explication, bloque }
  const minuteurs = new Set();
  const plusTard = (f, ms) => { const t = setTimeout(() => { minuteurs.delete(t); f(); }, ms); minuteurs.add(t); };

  // Texte de l'étape lu à voix haute (le texte affiché, sans la mise en forme)
  const lireEtape = () => parler(`${$('texte').textContent} ${$('statut').textContent}`);

  // Flèches vertes = idées, rouges = attaques, cases jaunes = cases importantes
  const formes = (e) => [
    ...(e.fleches || []).map(([o, d]) => ({ orig: o, dest: d, brush: 'green' })),
    ...(e.menaces || []).map(([o, d]) => ({ orig: o, dest: d, brush: 'red' })),
    ...(e.cases || []).map((c) => ({ orig: c, brush: 'yellow' })),
  ];

  function afficherEtape() {
    const e = lecon.etapes[etape];
    exo = null; seq = null; rep = null;
    $('compteur').textContent = `Étape ${etape + 1} / ${lecon.etapes.length}`;
    $('texte').innerHTML = md(e.texte || '');
    $('statut').textContent = '';
    $('statut').className = 'statut';
    $('controles-sequence').hidden = e.type !== 'sequence';
    $('seq-note').hidden = true;
    $('precedent').disabled = etape === 0;
    $('suivant').textContent = etape === lecon.etapes.length - 1 ? 'Terminer la leçon ✓' : 'Suivant →';
    $('fin').hidden = true;

    const fen = e.fen === 'start' || !e.fen ? DEPART : e.fen;
    const jeu = new Chess(fen);
    const orientation = e.orientation || (e.type === 'exercice' ? (jeu.turn() === 'w' ? 'white' : 'black') : 'white');
    plateau.charger(fen, { orientation });
    plateau.autoriser(null);
    plateau.fleches(formes(e));
    plateau.masquerCoordonnees(!!e.sansCoordonnees);

    if (e.type === 'reperage') {
      plateau.poser('8/8/8/8/8/8/8/8');
      rep = { cases: e.cases, index: 0, explication: e.explication, bloque: false };
      // La consigne est lue, puis la première case est demandée
      parler($('texte').textContent, () => { if (rep && rep.index === 0) demanderCase(); });
      demanderCase(false);
      return;
    }

    if (e.type === 'exercice') {
      exo = { solution: e.solution, index: 0, mat: !!e.mat, resolu: false, explication: e.explication };
      plateau.autoriser(jeu.turn());
      $('statut').textContent = `À toi de jouer (${jeu.turn() === 'w' ? 'Blancs' : 'Noirs'})`;
    } else if (e.type === 'sequence') {
      const s = seq = { depart: fen, coups: e.coups, notes: e.notes || [], index: 0, lecture: false, fleches: formes(e) };
      majSequence();
      boutonLecture();
      // L'introduction est lue, puis l'animation démarre toute seule
      parler(`${$('texte').textContent}`, () => plusTard(() => { if (seq === s && s.index === 0) lancerLecture(); }, 700));
      return;
    }
    lireEtape();
  }

  // ---------- Repérage : toucher les cases demandées ----------
  function demanderCase(dire = true) {
    const c = rep.cases[rep.index];
    $('statut').innerHTML = `Touche la case <strong class="case-demandee">${c}</strong> <span class="doux">(${rep.index + 1}/${rep.cases.length})</span>`;
    $('statut').className = 'statut';
    if (dire) parler(`Touche la case ${c}.`);
  }

  plateau.surClicCase((k) => {
    if (!rep || rep.bloque || !k) return;
    const attendue = rep.cases[rep.index];
    if (k !== attendue) {
      son.erreur();
      plateau.fleches([{ orig: k, brush: 'red' }]);
      $('statut').innerHTML = `✗ Ça, c'est <strong>${k}</strong>. Cherche <strong class="case-demandee">${attendue}</strong>.`;
      $('statut').className = 'statut rouge';
      parler(`Non, ça c'est ${k}. Cherche ${attendue}.`);
      return;
    }
    son.succes();
    rep.index++;
    plateau.fleches(rep.cases.slice(0, rep.index).map((x) => ({ orig: x, brush: 'green' })));
    if (rep.index < rep.cases.length) { demanderCase(); return; }
    rep.bloque = true;
    $('statut').textContent = '✓ Bravo !';
    $('statut').className = 'statut vert';
    if (rep.explication) $('texte').innerHTML += `<div class="explication" id="explication">${md(rep.explication)}</div>`;
    parler(`Bravo ! ${$('explication')?.textContent || ''}`);
  });

  // ---------- Séquences : coup par coup ou en animation ----------
  function legende(dernier, jeu) {
    $('seq-coup').textContent = dernier
      ? `${Math.ceil(seq.index / 2)}.${seq.index % 2 === 0 ? '..' : ''} ${sanFr(dernier.san)}${jeu.isCheckmate() ? ' — échec et mat !' : ''}`
      : 'Position de départ';
    const note = seq.index ? seq.notes[seq.index - 1] : null;
    $('seq-note').hidden = !note;
    $('seq-note').innerHTML = note ? md(note.texte) : '';
    $('seq-note').style.animation = 'none';
    void $('seq-note').offsetHeight;          // relance le fondu à chaque coup
    $('seq-note').style.animation = '';
    plateau.fleches(note ? formes(note) : seq.index ? [] : seq.fleches);
  }

  // Position après `seq.index` coups, sans animation (début, retour en arrière)
  function majSequence() {
    const jeu = new Chess(seq.depart);
    let dernier = null;
    for (let i = 0; i < seq.index; i++) dernier = jeu.move(uciVersCoup(seq.coups[i]));
    plateau.charger(jeu.fen(), { dernierCoup: dernier ? [dernier.from, dernier.to] : undefined });
    plateau.autoriser(null);
    legende(dernier, jeu);
    return dernier;
  }

  // Joue le coup suivant avec son mouvement et son bruit
  function avancer() {
    if (seq.index >= seq.coups.length) return null;
    const coup = plateau.jouerUci(seq.coups[seq.index]);
    seq.index++;
    legende(coup, plateau.jeu);
    return coup;
  }

  // Ce que la coach dit pour un coup : son explication, sinon le coup lui-même
  const phrase = (coup) => seq.notes[seq.index - 1]?.texte
    || `${coup.color === 'w' ? 'Les Blancs' : 'Les Noirs'} jouent ${nomCoup(coup, true)}${coup.san.endsWith('#') ? '' : '.'}`;
  const direSequence = (coup) => { if (coup) parler(phrase(coup)); };

  function boutonLecture() {
    $('seq-lecture').textContent = seq.lecture ? '⏸ Pause' : seq.index >= seq.coups.length ? '↻ Revoir' : '▶ Lecture';
  }

  function lancerLecture() {
    if (seq.index >= seq.coups.length) { seq.index = 0; majSequence(); }
    seq.lecture = true;
    boutonLecture();
    coupSuivantAnime(seq);
  }

  function arreterLecture() {
    if (!seq) return;
    seq.lecture = false;
    boutonLecture();
  }

  // Un coup, son explication dite à voix haute, puis le coup suivant (au moins ~2 s par coup)
  function coupSuivantAnime(s) {
    if (seq !== s || !s.lecture) return;
    const coup = avancer();
    if (!coup) { arreterLecture(); return; }
    const debut = Date.now();
    const texte = phrase(coup);
    let fait = false;
    const suite = () => {
      if (fait) return;
      fait = true;
      if (s.index >= s.coups.length) { arreterLecture(); return; }
      plusTard(() => coupSuivantAnime(s), Math.max(900, 2200 - (Date.now() - debut)));
    };
    parler(texte, suite);
    plusTard(suite, 3000 + texte.length * 75);   // si la voix ne prévient pas de la fin
  }

  function coupExercice(uci) {
    if (!exo || exo.resolu) return;
    const attendu = exo.solution[exo.index];
    const bon = uci === attendu || (exo.mat && plateau.jeu.isCheckmate());
    if (!bon) {
      $('statut').textContent = '✗ Pas tout à fait… réessaie !';
      $('statut').className = 'statut rouge';
      parler('Pas tout à fait… réessaie !');
      plateau.autoriser(null);
      plusTard(() => { plateau.annuler(); plateau.autoriser(plateau.trait); }, 700);
      return;
    }
    exo.index++;
    if (exo.index >= exo.solution.length || plateau.jeu.isCheckmate()) {
      exo.resolu = true;
      plateau.autoriser(null);
      $('statut').textContent = '✓ Bravo !';
      $('statut').className = 'statut vert';
      if (exo.explication) $('texte').innerHTML += `<div class="explication" id="explication">${md(exo.explication)}</div>`;
      parler(`Bravo ! ${$('explication')?.textContent || ''}`);
      return;
    }
    // Réponse de l'adversaire, puis de nouveau au joueur
    plateau.autoriser(null);
    plusTard(() => {
      plateau.jouerUci(exo.solution[exo.index]);
      exo.index++;
      plateau.autoriser(plateau.trait);
      $('statut').textContent = '✓ Bon coup, continue !';
      $('statut').className = 'statut vert';
      parler('Bon coup, continue !');
    }, 500);
  }

  async function terminer() {
    await api(`/lecons/${lecon.id}/faite`, {});
    toast('Leçon terminée ✓');
    parler(`Leçon terminée, bravo !${lecon.suivante ? ' Tu peux passer à la leçon suivante.' : ''}`);
    $('fin').hidden = false;
    $('fin').innerHTML = `<h3>Leçon terminée ✓</h3>
      ${lecon.pratique ? `<p class="doux">Pour ancrer cette idée, rien ne vaut la pratique sur de vraies positions.</p>
        <a class="bouton large" href="#/problemes?mode=theme&theme=${lecon.pratique.theme}" style="margin-bottom:10px">${echapper(lecon.pratique.texte)}</a>` : ''}
      ${lecon.suivante ? `<a class="bouton secondaire large" href="#/lecons/${lecon.suivante}">Leçon suivante →</a>` : '<a class="bouton secondaire large" href="#/lecons">Retour aux leçons</a>'}`;
  }

  $('suivant').addEventListener('click', () => {
    if (etape < lecon.etapes.length - 1) { etape++; afficherEtape(); } else terminer();
  });
  $('precedent').addEventListener('click', () => { if (etape > 0) { etape--; afficherEtape(); } });
  // Les boutons coup par coup mettent l'animation en pause
  $('seq-lecture').addEventListener('click', () => { if (seq.lecture) { arreterLecture(); taire(); } else lancerLecture(); });
  $('seq-debut').addEventListener('click', () => { arreterLecture(); seq.index = 0; majSequence(); taire(); boutonLecture(); });
  $('seq-prec').addEventListener('click', () => { arreterLecture(); seq.index = Math.max(0, seq.index - 1); direSequence(majSequence()); boutonLecture(); });
  $('seq-suiv').addEventListener('click', () => { arreterLecture(); direSequence(avancer()); boutonLecture(); });
  $('ecouter').addEventListener('click', lireEtape);

  afficherEtape();
  return () => { minuteurs.forEach(clearTimeout); taire(); };
}
