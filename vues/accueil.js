// Accueil : niveau réel (jauge), journée en cours et plan du jour
import { api, echapper, signe } from '../outils.js';
import { ICONES } from '../icones.js';
import { choisirNiveau } from '../niveau.js';
import { parler, taire } from '../voix.js';
import { param } from '../parametres.js';

const PALIERS = [
  { min: 0, max: 800, nom: 'Débutant' }, { min: 800, max: 1200, nom: 'Novice' },
  { min: 1200, max: 1600, nom: 'Joueur de club' }, { min: 1600, max: 2000, nom: 'Confirmé' },
  { min: 2000, max: 2400, nom: 'Expert' }, { min: 2400, max: 3200, nom: 'Maître' },
];
const ICONE_ETAPE = { echauffement: 'flamme', revision: 'refresh', theme: 'cible', classe: 'problemes', lecon: 'livre', partie: 'jouer' };

function jauge(elo) {
  const i = PALIERS.findIndex((p) => elo < p.max);
  const palier = PALIERS[i === -1 ? PALIERS.length - 1 : i];
  const part = Math.max(0.03, Math.min(1, (elo - palier.min) / (palier.max - palier.min)));
  const r = 82;
  const tour = 2 * Math.PI * r;
  const suivant = PALIERS[i + 1];
  return {
    html: `<div class="jauge">
      <svg viewBox="0 0 190 190"><defs><linearGradient id="degrade-jauge" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" style="stop-color:var(--accent-clair)"/><stop offset="1" style="stop-color:var(--accent-fonce)"/></linearGradient></defs>
        <circle class="fond-jauge" cx="95" cy="95" r="${r}" fill="none" stroke-width="13"/>
        <circle class="arc" cx="95" cy="95" r="${r}" fill="none" stroke-width="13" stroke-dasharray="${tour}" stroke-dashoffset="${tour}" data-cible="${tour * (1 - part)}"/>
      </svg>
      <div class="jauge-centre"><div class="chiffre">${elo}</div><div class="doux">${palier.nom}</div></div>
    </div>`,
    suite: suivant ? `Encore <strong>${palier.max - elo}</strong> points pour devenir <strong>${suivant.nom}</strong>` : 'Tu es au sommet',
  };
}

export async function vueAccueil(main) {
  const etat = await api('/etat');
  if (!etat.configure) return choisirNiveau(main, () => vueAccueil(main));

  const plan = await api('/plan');
  const progression = etat.elo - etat.depart;
  const j = jauge(etat.elo);
  const heure = new Date().getHours();
  const salut = heure < 5 ? 'Bonne nuit' : heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
  const prochaine = plan.etapes.find((e) => e.fait < e.objectif);

  main.innerHTML = `
    <div class="entete-page">
      <div><div class="surtitre">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h1>${salut}${etat.profil && etat.profil.nom !== 'Moi' ? ` ${echapper(etat.profil.nom)}` : ''} 👋</h1><p class="doux">${plan.avancement === 100 ? 'Plan du jour terminé : bravo, tu as progressé aujourd\'hui.' : 'Voici ton entraînement du jour, adapté à tes points faibles.'}</p></div>
      <div class="boutons">
        <button class="bouton secondaire" id="ecouter">${ICONES.son} Écouter</button>
        ${prochaine ? `<a class="bouton" href="${prochaine.lien}">${ICONES.fleche} Continuer : ${echapper(prochaine.titre.split(' : ')[0])}</a>` : ''}
      </div>
    </div>

    <section class="carte heros">
      ${j.html}
      <div>
        <div class="surtitre">Ton niveau réel</div>
        <h2 style="font-size:1.6rem;margin-bottom:.3em">${etat.niveau} ${etat.provisoire ? '<span class="badge or">provisoire</span>' : ''}</h2>
        <p class="doux" style="margin:0">${j.suite}.
          ${etat.provisoire ? `Ton classement se précise encore (entre ${etat.fourchette[0]} et ${etat.fourchette[1]}).` : `Ton vrai niveau se situe entre <strong>${etat.fourchette[0]}</strong> et <strong>${etat.fourchette[1]}</strong>.`}</p>
        <div class="stats-heros">
          <div class="stat"><div class="chiffre" style="color:var(--or)">🔥 ${etat.serie}</div><div class="doux">jour${etat.serie > 1 ? 's' : ''} d'affilée</div></div>
          <div class="stat"><div class="chiffre">${etat.aujourdhui.reussis}<span class="doux" style="font-size:1rem">/${etat.aujourdhui.problemes}</span></div><div class="doux">réussis aujourd'hui</div></div>
          <div class="stat"><div class="chiffre" style="color:${progression >= 0 ? 'var(--vert)' : 'var(--rouge)'}">${signe(progression)}</div><div class="doux">depuis le début</div></div>
        </div>
        ${etat.eloPartie ? `<p class="doux petit-texte" style="margin:14px 0 0">Elo estimé en partie : <strong style="color:var(--texte)">${etat.eloPartie}</strong></p>` : ''}
      </div>
    </section>

    <section class="carte" style="margin-top:20px">
      <div class="entete-page" style="margin-bottom:10px;align-items:center">
        <h2 style="margin:0">Ton plan du jour</h2>
        <div style="display:flex;align-items:center;gap:12px;min-width:220px">
          <div class="barre" style="flex:1"><span style="width:${plan.avancement}%"></span></div>
          <strong class="chiffre">${plan.avancement} %</strong>
        </div>
      </div>
      ${plan.etapes.map((e) => {
        const fini = e.fait >= e.objectif;
        return `<a class="etape-plan" href="${e.lien}">
          <span class="pastille ${fini ? 'fait' : ''}">${fini ? ICONES.coche : ICONES[ICONE_ETAPE[e.id]] || ICONES.problemes}</span>
          <span><span class="etape-titre">${echapper(e.titre)}</span><br><span class="doux petit-texte">${echapper(e.detail)}</span></span>
          <span style="display:flex;align-items:center;gap:12px">
            <span class="mini-barre barre"><span style="width:${Math.min(100, (100 * e.fait) / e.objectif)}%"></span></span>
            <span class="badge ${fini ? 'vert' : ''}">${Math.min(e.fait, e.objectif)}/${e.objectif}</span>
          </span>
        </a>`;
      }).join('')}
    </section>

    <div class="grille grille-3" style="margin-top:20px" ${param('accueil.raccourcis') ? '' : 'hidden'}>
      <a class="carte action" href="#/entrainement"><span class="action-icone saphir">${ICONES.entrainement}</span>
        <span><h3>Entraînement</h3><span class="doux petit-texte">Joue avec ta coach : elle te parle et t'aide à chaque coup.</span></span></a>
      <a class="carte action" href="#/problemes"><span class="action-icone or">${ICONES.problemes}</span>
        <span><h3>Problèmes classés</h3><span class="doux petit-texte">Résoudre à ton niveau et faire monter ton classement.</span></span></a>
      <a class="carte action" href="#/rush"><span class="action-icone corail">${ICONES.rush}</span>
        <span><h3>Rush</h3><span class="doux petit-texte">3 minutes, 3 erreurs. Ton record : <strong style="color:var(--or)">${etat.recordRush}</strong></span></span></a>
      <a class="carte action" href="#/jouer"><span class="action-icone saphir">${ICONES.jouer}</span>
        <span><h3>Jouer</h3><span class="doux petit-texte">Contre l'ordinateur, avec l'analyse de tes erreurs.</span></span></a>
    </div>`;

  // Résumé parlé de la journée
  const resume = [
    `${salut}${etat.profil && etat.profil.nom !== 'Moi' ? ` ${etat.profil.nom}` : ''} !`,
    `Ton niveau réel est de ${etat.elo} : ${etat.niveau}.`,
    j.suite.replace(/<[^>]+>/g, '') + '.',
    etat.serie > 1 ? `Tu t'entraînes depuis ${etat.serie} jours d'affilée.` : '',
    etat.aujourdhui.problemes ? `Aujourd'hui, tu as réussi ${etat.aujourdhui.reussis} problème${etat.aujourdhui.reussis > 1 ? 's' : ''} sur ${etat.aujourdhui.problemes}.` : '',
    plan.avancement === 100 ? 'Ton plan du jour est terminé, bravo !' : `Ton plan du jour est fait à ${plan.avancement} pour cent.`,
    prochaine ? `Prochaine étape : ${prochaine.titre}.` : '',
  ].filter(Boolean).join(' ');
  main.querySelector('#ecouter').addEventListener('click', () => parler(resume));
  // Paramètres > Accueil : résumé lu tout seul, une fois par visite
  try {
    if (param('accueil.resumeVocal') && !sessionStorage.getItem('roque-resume-lu')) { sessionStorage.setItem('roque-resume-lu', '1'); parler(resume); }
  } catch { /* stockage indisponible */ }

  // Remplissage animé de la jauge
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const arc = main.querySelector('.arc');
    if (arc) arc.style.strokeDashoffset = arc.dataset.cible;
  }));
  return () => taire();
}
