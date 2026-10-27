// Paramètres : toutes les rubriques (sur le modèle de chess.com), chacune avec des réglages qui agissent vraiment
import { api, echapper, toast } from '../outils.js';
import { ICONES } from '../icones.js';
import { param, changer } from '../parametres.js';
import { PALETTES, PLATEAUX, ICONES_APP, iconeSvg } from '../apparence.js';
import { basculerVoix, voixActive, parler } from '../voix.js';
import { basculerSon, sonActif, son } from '../sons.js';
import { cleLocale } from '../profil.js';
import { NIVEAUX } from './jouer.js';

const SECTIONS = [
  { id: 'profil', titre: 'Profil', icone: 'personne' },
  { id: 'accueil', titre: 'Accueil', icone: 'accueil' },
  { id: 'compte', titre: 'Compte et données', icone: 'cadenas' },
  { id: 'entraineur', titre: 'Entraîneur', icone: 'diplome' },
  { id: 'notifications', titre: 'Notifications', icone: 'cloche' },
  { id: 'theme', titre: 'Thème', icone: 'pinceau' },
  { id: 'icone', titre: 'Icône de l\'app', icone: 'pion' },
  { id: 'echiquier', titre: 'Échiquier', icone: 'damier' },
  { id: 'jouer', titre: 'Jouer', icone: 'jouer' },
  { id: 'social', titre: 'Social', icone: 'amis' },
  { id: 'problemes', titre: 'Problèmes', icone: 'problemes' },
  { id: 'analyse', titre: 'Analyse', icone: 'loupe' },
  { id: 'avis', titre: 'Noter cette app', icone: 'etoile' },
  { id: 'apps', titre: 'Plus d\'apps', icone: 'applis' },
  { id: 'confidentialite', titre: 'Paramètres de confidentialité', icone: 'bouclier' },
  { id: 'deconnexion', titre: 'Changer de joueur', icone: 'sortie' },
];

// Réglages simples, décrits une fois : interrupteur (oui/non), choix (boutons), liste (menu déroulant), heure
const REGLAGES = {
  accueil: [
    { cle: 'accueil.objectif', type: 'choix', titre: 'Objectif du plan du jour', aide: 'Le nombre de problèmes proposés chaque jour.', options: [['leger', 'Léger'], ['normal', 'Normal'], ['intense', 'Intense']] },
    { cle: 'accueil.resumeVocal', type: 'interrupteur', titre: 'Lire le résumé de la journée à l\'ouverture', aide: 'La coach te dit ton niveau et ton plan dès que tu ouvres l\'accueil.' },
    { cle: 'accueil.raccourcis', type: 'interrupteur', titre: 'Afficher les raccourcis', aide: 'Les cartes Entraînement, Problèmes, Rush et Jouer en bas de l\'accueil.' },
  ],
  entraineur: [
    { special: 'voix' },
    { cle: 'coach.debit', type: 'choix', titre: 'Vitesse de parole', options: [['lente', 'Lente'], ['normale', 'Normale'], ['rapide', 'Rapide']], essai: true },
    { cle: 'coach.bavard', type: 'interrupteur', titre: 'Annoncer les coups de l\'ordinateur', aide: 'Pendant l\'entraînement, la coach dit chaque coup adverse.' },
    { cle: 'coach.pause', type: 'interrupteur', titre: 'S\'arrêter après une erreur', aide: 'Elle te propose de réessayer avant que l\'ordinateur réponde.' },
    { cle: 'coach.occasions', type: 'interrupteur', titre: 'Signaler les occasions', aide: 'Mat possible, coup brillant, gaffe de l\'ordinateur.' },
    { cle: 'coach.ouvertures', type: 'interrupteur', titre: 'Nommer les ouvertures', aide: 'Partie italienne, défense sicilienne… avec leur idée principale.' },
    { cle: 'coach.conseils', type: 'interrupteur', titre: 'Donner des conseils généraux', aide: 'Roquer, sortir ses pièces, activer son roi en finale…' },
    { cle: 'coach.barre', type: 'interrupteur', titre: 'Barre d\'évaluation pendant l\'entraînement' },
  ],
  notifications: [
    { cle: 'notif.rappel', type: 'interrupteur', titre: 'Rappel quotidien', aide: 'Une notification du Mac si ton plan du jour n\'est pas terminé.' },
    { cle: 'notif.heure', type: 'heure', titre: 'Heure du rappel' },
    { cle: 'notif.serie', type: 'interrupteur', titre: 'Série en danger', aide: 'À 20 h, si tu n\'as encore rien fait aujourd\'hui.' },
    { cle: 'notif.voix', type: 'interrupteur', titre: 'La coach annonce le rappel à voix haute' },
    { special: 'essai-notification' },
  ],
  theme: [
    { special: 'palettes' },
    { cle: 'theme.taille', type: 'choix', titre: 'Taille du texte', options: [['normale', 'Normale'], ['grande', 'Grande'], ['tres-grande', 'Très grande']] },
    { cle: 'theme.animations', type: 'interrupteur', titre: 'Animations', aide: 'Apparitions, confettis, jauge qui se remplit. Coupe-les si tu préfères un affichage immobile.' },
  ],
  icone: [{ special: 'icones' }],
  echiquier: [
    { special: 'plateaux' },
    { special: 'sons' },
    { cle: 'plateau.coordonnees', type: 'interrupteur', titre: 'Coordonnées (a–h, 1–8)' },
    { cle: 'plateau.coupsPossibles', type: 'interrupteur', titre: 'Montrer les coups possibles', aide: 'Des points sur les cases où la pièce choisie peut aller.' },
    { cle: 'plateau.dernierCoup', type: 'interrupteur', titre: 'Surligner le dernier coup' },
    { cle: 'plateau.animation', type: 'choix', titre: 'Vitesse des pièces', options: [['aucune', 'Instantanée'], ['rapide', 'Rapide'], ['normale', 'Normale'], ['lente', 'Lente']] },
    { cle: 'plateau.promotionAuto', type: 'interrupteur', titre: 'Promotion automatique en dame', aide: 'Sans fenêtre de choix quand un pion arrive au bout.' },
  ],
  jouer: [
    { cle: 'jouer.niveau', type: 'liste', titre: 'Niveau de l\'ordinateur par défaut', options: [['conseille', 'Conseillé pour moi'], ...NIVEAUX.map((n) => [String(n), String(n)])] },
    { cle: 'jouer.couleur', type: 'choix', titre: 'Ma couleur par défaut', options: [['w', 'Blancs'], ['b', 'Noirs'], ['x', 'Au hasard']] },
    { cle: 'jouer.premoves', type: 'interrupteur', titre: 'Prémoves (jouer à l\'avance)', aide: 'Joue tes coups pendant que l\'ordinateur réfléchit, autant que tu veux, jusqu\'au mat. Ils partent dès que c\'est ton tour ; un prémove devenu impossible annule la suite.' },
    { cle: 'jouer.confirmerAbandon', type: 'interrupteur', titre: 'Demander confirmation avant d\'abandonner' },
    { cle: 'jouer.voix', type: 'interrupteur', titre: 'Annonces vocales pendant la partie', aide: 'Début de partie, « Échec ! », résultat.' },
  ],
  social: [
    { cle: 'social.quiJoue', type: 'interrupteur', titre: 'Demander « Qui joue ? » à chaque ouverture', aide: 'Quand plusieurs joueurs partagent l\'ordinateur.' },
    { cle: 'social.classement', type: 'interrupteur', titre: 'Classement entre joueurs', aide: 'Affiché sur la page Progrès quand il y a plusieurs profils.' },
    { special: 'joueurs' },
  ],
  problemes: [
    { cle: 'problemes.difficulte', type: 'choix', titre: 'Difficulté', aide: 'Des problèmes un peu sous ou au-dessus de ton classement.', options: [['facile', 'Plus facile'], ['normale', 'À mon niveau'], ['difficile', 'Plus difficile']] },
    { cle: 'problemes.enchainer', type: 'interrupteur', titre: 'Passer tout seul au problème suivant', aide: 'Après une réussite, le suivant arrive au bout d\'une seconde et demie.' },
    { cle: 'problemes.chrono', type: 'interrupteur', titre: 'Afficher le chronomètre' },
    { cle: 'problemes.voix', type: 'interrupteur', titre: 'Commentaires à voix haute' },
    { cle: 'problemes.celebrations', type: 'interrupteur', titre: 'Confettis quand je réussis' },
  ],
  analyse: [
    { cle: 'analyse.profondeur', type: 'choix', titre: 'Force de l\'analyse', aide: 'Plus profonde = plus juste, mais plus lente.', options: [['rapide', 'Rapide'], ['normale', 'Normale'], ['profonde', 'Profonde']] },
    { cle: 'analyse.fleches', type: 'interrupteur', titre: 'Flèches du meilleur coup' },
    { cle: 'analyse.barre', type: 'interrupteur', titre: 'Barre d\'évaluation' },
    { cle: 'analyse.brillants', type: 'interrupteur', titre: 'Chercher les coups brillants' },
    { cle: 'analyse.resumeVocal', type: 'interrupteur', titre: 'Lire le bilan à voix haute quand l\'analyse est finie' },
    { cle: 'analyse.pause', type: 'choix', titre: 'Pause entre deux coups (lecture commentée)', options: [['courte', 'Courte'], ['normale', 'Normale'], ['longue', 'Longue']] },
  ],
};

const interrupteur = (id, actif) => `<button class="interrupteur-bouton ${actif ? 'actif' : ''}" role="switch" aria-checked="${actif}" data-basculer="${id}"><span></span></button>`;

function ligneReglage(r) {
  const v = param(r.cle);
  let controle = '';
  if (r.type === 'interrupteur') controle = interrupteur(r.cle, v);
  else if (r.type === 'choix') controle = `<div class="segments">${r.options.map(([val, nom]) => `<button data-cle="${r.cle}" data-valeur="${val}" class="${String(v) === val ? 'actif' : ''}">${nom}</button>`).join('')}</div>`;
  else if (r.type === 'liste') controle = `<select data-cle="${r.cle}">${r.options.map(([val, nom]) => `<option value="${val}" ${String(v) === val ? 'selected' : ''}>${nom}</option>`).join('')}</select>`;
  else if (r.type === 'heure') controle = `<input type="time" class="champ heure" data-cle="${r.cle}" value="${v}">`;
  const empile = r.type === 'choix' || r.type === 'liste';
  return `<div class="reglage ${empile ? 'empile' : ''}"><div><div class="reglage-titre">${r.titre}</div>${r.aide ? `<div class="doux petit-texte">${r.aide}</div>` : ''}</div>${controle}</div>`;
}

export async function vueParametres(main, params) {
  const section = SECTIONS.find((s) => s.id === params.id) || null;
  const [etat, profils, apropos] = await Promise.all([api('/etat'), api('/profils'), api('/apropos')]);

  main.innerHTML = `
    <div class="entete-page"><div><div class="surtitre">Réglages</div><h1>Paramètres</h1></div></div>
    <div class="banniere-parametres">
      <span class="avatar-profil" style="background:${etat.profil.couleur}">${etat.profil.avatar}</span>
      <div><strong>Donne le meilleur de toi-même${etat.profil.nom === 'Moi' ? '' : `, ${echapper(etat.profil.nom)}`} !</strong>
        <div class="petit-texte">${etat.configure ? `${etat.elo} points · ${echapper(etat.niveau)}${etat.serie ? ` · 🔥 ${etat.serie} jour${etat.serie > 1 ? 's' : ''} d'affilée` : ''}` : 'Choisis ton niveau pour commencer.'}</div></div>
    </div>
    <div class="parametres ${section ? 'avec-detail' : ''}">
      <nav class="liste-parametres">
        ${SECTIONS.map((s) => `<a href="#/parametres/${s.id}" class="${s.id === section?.id ? 'actif' : ''}">${ICONES[s.icone]}<span>${s.titre}</span>${ICONES.chevron}</a>`).join('')}
        <div class="version">Roque v${apropos.version} · 100 % sur ton Mac</div>
      </nav>
      <section class="carte detail-parametres" id="detail"></section>
    </div>`;
  const detail = main.querySelector('#detail');

  function afficherDetail() {
    if (!section) {
      detail.innerHTML = `<div class="detail-vide">${ICONES.parametres}<p class="doux">Choisis une rubrique à gauche.</p></div>`;
      return;
    }
    const retour = '<a class="retour-parametres" href="#/parametres">← Paramètres</a>';
    detail.innerHTML = `${retour}<h2>${section.titre}</h2>${contenu(section.id)}`;
  }

  function contenu(id) {
    if (REGLAGES[id]) return REGLAGES[id].map((r) => (r.special ? special(r.special) : ligneReglage(r))).join('');
    return special(id);
  }

  // Rubriques et réglages qui demandent un affichage particulier
  function special(nom) {
    const p = etat.profil;
    switch (nom) {
      case 'profil': return `
        <div class="profil-detail"><span class="avatar-profil grand" style="background:${p.couleur}">${p.avatar}</span>
          <div><div class="reglage-titre" style="font-size:1.3rem">${echapper(p.nom)}</div>
          <div class="doux">${etat.configure ? `${etat.elo} points · ${echapper(etat.niveau)} · niveau en partie : ${etat.eloPartie ?? '—'}` : 'Pas encore de niveau'}</div></div></div>
        <label class="doux petit-texte" for="p-nom">Prénom ou pseudo</label>
        <input id="p-nom" class="champ" maxlength="24" value="${echapper(p.nom)}">
        <div class="doux petit-texte" style="margin-top:14px">Avatar</div>
        <div class="choix-avatar">${profils.avatars.map((a) => `<button data-avatar="${a}" class="${a === p.avatar ? 'actif' : ''}">${a}</button>`).join('')}</div>
        <div class="doux petit-texte" style="margin-top:14px">Couleur</div>
        <div class="choix-couleur">${profils.couleurs.map((c) => `<button data-couleur="${c}" class="${c === p.couleur ? 'actif' : ''}" style="background:${c}"></button>`).join('')}</div>
        <div class="boutons" style="margin-top:18px"><button class="bouton" id="p-enregistrer">Enregistrer</button>
          <a class="bouton secondaire" href="#/profils">Voir tous les joueurs</a></div>`;
      case 'compte': return `
        <p class="doux">Pas de compte ni de mot de passe : tout est enregistré sur ton Mac, dans le dossier de Roque. Chaque joueur a sa propre sauvegarde.</p>
        <div class="reglage"><div><div class="reglage-titre">Télécharger ma sauvegarde</div><div class="doux petit-texte">Une copie complète de ta progression (fichier .db), à garder en lieu sûr.</div></div>
          <a class="bouton secondaire petit" href="/api/sauvegarde" download>${ICONES.telecharger} Télécharger</a></div>
        <div class="reglage"><div><div class="reglage-titre">Remettre ma progression à zéro</div><div class="doux petit-texte">Classement, problèmes, parties et leçons. Une copie est gardée dans la corbeille de Roque.</div></div>
          <button class="bouton danger petit" id="remise-a-zero">Remettre à zéro</button></div>
        <div class="reglage"><div><div class="reglage-titre">Supprimer ce joueur</div><div class="doux petit-texte">Depuis l'écran « Qui joue ? » (choisis d'abord un autre joueur).</div></div>
          <a class="bouton secondaire petit" href="#/profils">Gérer les joueurs</a></div>`;
      case 'voix': return `
        <div class="reglage"><div><div class="reglage-titre">Voix de la coach</div><div class="doux petit-texte">Elle te parle dans l'entraînement, l'analyse, les problèmes et les leçons.</div></div>
          ${interrupteur('voix-globale', voixActive())}</div>
        <div class="reglage empile"><div><div class="reglage-titre">Choix de la voix</div><div class="doux petit-texte" id="voix-aide">Chargement des voix…</div></div>
          <div class="ligne-voix"><select id="choix-voix"></select><button class="bouton secondaire petit" id="essai-voix">${ICONES.son} Écouter</button></div></div>`;
      case 'essai-notification': return `
        <div class="reglage"><div><div class="reglage-titre">Essayer</div><div class="doux petit-texte">Affiche une notification maintenant. La première fois, le Mac peut te demander d'autoriser les notifications.</div></div>
          <button class="bouton secondaire petit" id="essai-notif">${ICONES.cloche} Tester</button></div>`;
      case 'palettes': return `<div class="reglage-titre" style="margin:6px 0 10px">Couleurs de l'application</div>
        <div class="grille-palettes">${PALETTES.map((t) => `<button data-cle="theme.palette" data-valeur="${t.id}" class="palette ${param('theme.palette') === t.id ? 'actif' : ''}">
          <span class="apercu-palette" style="background:${t.fond}"><i style="background:${t.accent}"></i><i style="background:${t.accent};opacity:.5"></i></span>${t.nom}</button>`).join('')}</div>`;
      case 'icones': return `<p class="doux">L'icône de l'onglet du navigateur et le logo du menu.</p>
        <div class="grille-icones">${ICONES_APP.map((i) => `<button data-cle="icone" data-valeur="${i.id}" class="${param('icone') === i.id ? 'actif' : ''}">${iconeSvg(i, 56)}<span>${i.nom}</span></button>`).join('')}</div>`;
      case 'plateaux': return `<div class="reglage-titre" style="margin:6px 0 10px">Couleurs de l'échiquier</div>
        <div class="grille-plateaux">${PLATEAUX.map((b) => {
          const claire = b.claire || 'var(--case-claire)';
          const foncee = b.foncee || 'var(--case-foncee)';
          return `<button data-cle="plateau.couleurs" data-valeur="${b.id}" class="${param('plateau.couleurs') === b.id ? 'actif' : ''}">
            <span class="mini-plateau" style="background:repeating-conic-gradient(${foncee} 0 25%, ${claire} 0 50%) 0 0 / 50% 50%"></span>${b.nom}</button>`;
        }).join('')}</div>`;
      case 'sons': return `<div class="reglage"><div><div class="reglage-titre">Sons des coups</div><div class="doux petit-texte">Pièce posée, prise, échec, réussite.</div></div>${interrupteur('sons-globaux', sonActif())}</div>`;
      case 'joueurs': return `<div class="reglage-titre" style="margin:14px 0 8px">Joueurs sur cet ordinateur</div>
        ${profils.profils.map((x) => `<div class="reglage"><div style="display:flex;gap:12px;align-items:center"><span class="avatar-profil" style="background:${x.couleur}">${x.avatar}</span>
          <div><div class="reglage-titre">${echapper(x.nom)}</div><div class="doux petit-texte">${x.configure ? `${x.elo} · ${echapper(x.niveau)}` : 'Nouveau joueur'}</div></div></div>${x.id === profils.actif ? '<span class="badge vert">C\'est toi</span>' : ''}</div>`).join('')}
        <a class="bouton secondaire" href="#/profils" style="margin-top:12px">Ajouter ou gérer les joueurs</a>`;
      case 'avis': {
        const note = param('avis.note');
        return `<p class="doux">Qu'est-ce que tu penses de Roque ? Ton avis reste sur ton Mac : dis-le aussi à Claude pour qu'il améliore l'application.</p>
          <div class="etoiles" id="etoiles">${[1, 2, 3, 4, 5].map((n) => `<button data-note="${n}" class="${n <= note ? 'actif' : ''}" aria-label="${n} étoile${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
          <textarea class="champ" id="avis-texte" rows="4" placeholder="Ce que tu aimes, ce qui manque…">${echapper(param('avis.texte'))}</textarea>
          <button class="bouton" id="avis-envoyer" style="margin-top:12px">Enregistrer mon avis</button>`;
      }
      case 'apps': return `<p class="doux">Les autres applications installées sur ton Mac.</p>
        ${apropos.apps.map((a) => `<div class="reglage"><div><div class="reglage-titre">${echapper(a.nom)}</div><div class="doux petit-texte">${echapper(a.description)} · ${a.enMarche ? '<span style="color:var(--vert)">en marche</span>' : 'arrêtée en ce moment'}</div></div>
          ${a.enMarche ? `<a class="bouton secondaire petit" href="${a.adresse}" target="_blank" rel="noopener">Ouvrir</a>` : ''}</div>`).join('')}`;
      case 'confidentialite': return `
        <div class="encart-confiance">${ICONES.bouclier}<div><strong>Tes données ne quittent jamais ton Mac.</strong><br>
          <span class="doux">Pas de compte, pas de publicité, pas de suivi. L'ordinateur adverse (Stockfish) et la voix tournent sur ton Mac, sans Internet.</span></div></div>
        <div class="reglage"><div><div class="reglage-titre">Effacer les analyses gardées dans le navigateur</div><div class="doux petit-texte">Elles seront refaites à la prochaine ouverture d'une partie.</div></div>
          <button class="bouton secondaire petit" id="vider-analyses">Effacer</button></div>
        <div class="reglage"><div><div class="reglage-titre">Effacer les phrases enregistrées de la voix</div><div class="doux petit-texte">Utilisées sur téléphone ou tablette ; elles se recréent toutes seules.</div></div>
          <button class="bouton secondaire petit" id="vider-voix">Effacer</button></div>
        <div class="reglage"><div><div class="reglage-titre">Mes données</div><div class="doux petit-texte">Télécharge une copie complète dans « Compte et données ».</div></div>
          <a class="bouton secondaire petit" href="#/parametres/compte">Voir</a></div>`;
      case 'deconnexion': return `<p class="doux">Laisse la place à un autre joueur : tu retrouveras ta progression en choisissant ton profil.</p>
        <button class="bouton" id="changer-joueur">${ICONES.sortie} Changer de joueur</button>`;
      default: return '';
    }
  }

  afficherDetail();
  if (section?.id === 'entraineur') remplirVoix();

  async function remplirVoix() {
    const info = await fetch('/api/voix/info').then((r) => r.json()).catch(() => ({ choix: [] }));
    const select = detail.querySelector('#choix-voix');
    if (!select) return;
    const actuelle = param('coach.voix');
    select.innerHTML = `<option value="auto">Automatique (la plus naturelle)</option>${(info.choix || []).map((v) => `<option value="${v.id}" ${v.id === actuelle ? 'selected' : ''}>${echapper(v.nom)}</option>`).join('')}`;
    detail.querySelector('#voix-aide').textContent = info.mac ? 'Toutes les voix sont des voix de femme françaises installées sur ton Mac.' : 'Le choix de la voix est disponible quand Roque est ouvert sur le Mac lui-même.';
    select.onchange = () => { changer('coach.voix', select.value); essaiVoix(); };
  }
  const essaiVoix = () => parler(`Bonjour${etat.profil.nom === 'Moi' ? '' : ` ${etat.profil.nom}`} ! Je suis Léa, ta coach. Voici ma voix.`);
  const enregistre = () => toast('Enregistré ✓');

  detail.addEventListener('click', async (e) => {
    const b = e.target.closest('button, a');
    if (!b) return;
    // Interrupteurs
    if (b.dataset.basculer) {
      const cle = b.dataset.basculer;
      let actif;
      if (cle === 'voix-globale') actif = basculerVoix();
      else if (cle === 'sons-globaux') { actif = basculerSon(); if (actif) son.coup(); }
      else { actif = !param(cle); changer(cle, actif); }
      b.classList.toggle('actif', actif);
      b.setAttribute('aria-checked', actif);
      enregistre();
      return;
    }
    // Boutons de choix (segments, palettes, icônes, échiquiers)
    if (b.dataset.cle && b.dataset.valeur !== undefined) {
      changer(b.dataset.cle, b.dataset.valeur);
      b.parentElement.querySelectorAll(`[data-cle="${b.dataset.cle}"]`).forEach((x) => x.classList.toggle('actif', x === b));
      if (b.dataset.cle === 'coach.debit') essaiVoix();
      enregistre();
      return;
    }
    if (b.id === 'essai-voix') { essaiVoix(); return; }
    if (b.id === 'essai-notif') {
      const r = await api('/notifications/essai', {});
      toast(r.ok ? 'Notification envoyée ✓' : 'Le Mac a refusé la notification : autorise-la dans Réglages Système > Notifications.');
      return;
    }
    if (b.dataset.avatar) { detail.querySelectorAll('[data-avatar]').forEach((x) => x.classList.toggle('actif', x === b)); return; }
    if (b.dataset.couleur) { detail.querySelectorAll('[data-couleur]').forEach((x) => x.classList.toggle('actif', x === b)); return; }
    if (b.id === 'p-enregistrer') {
      try {
        await api(`/profils/${etat.profil.id}`, {
          nom: detail.querySelector('#p-nom').value,
          avatar: detail.querySelector('[data-avatar].actif')?.dataset.avatar,
          couleur: detail.querySelector('[data-couleur].actif')?.dataset.couleur,
        });
        toast('Profil enregistré ✓');
        location.reload();
      } catch (err) { toast(err.message); }
      return;
    }
    if (b.id === 'remise-a-zero') {
      if (b.dataset.confirme !== '1') { b.dataset.confirme = '1'; b.textContent = 'Vraiment ? Clique encore'; return; }
      await api('/reinitialiser', {});
      toast('Progression remise à zéro');
      location.hash = '#/';
      return;
    }
    if (b.dataset.note) {
      const n = Number(b.dataset.note);
      changer('avis.note', n);
      detail.querySelectorAll('[data-note]').forEach((x) => x.classList.toggle('actif', Number(x.dataset.note) <= n));
      return;
    }
    if (b.id === 'avis-envoyer') {
      changer('avis.texte', detail.querySelector('#avis-texte').value.slice(0, 2000));
      toast('Merci pour ton avis !');
      parler(param('avis.note') >= 4 ? 'Merci beaucoup ! Ça me fait très plaisir.' : 'Merci pour ton avis : on va améliorer tout ça.');
      return;
    }
    if (b.id === 'vider-analyses') {
      let n = 0;
      for (const k of Object.keys(localStorage)) {
        const ok = k.startsWith('roque-analyse-') || k.startsWith('roque-brillants-');
        const suffixe = cleLocale('');   // '' pour le profil principal, ':<id>' pour les autres
        const duJoueur = suffixe ? k.endsWith(suffixe) : !k.includes(':');
        if (ok && duJoueur) { localStorage.removeItem(k); n++; }
      }
      toast(`${n} analyse${n > 1 ? 's' : ''} effacée${n > 1 ? 's' : ''}`);
      return;
    }
    if (b.id === 'vider-voix') { await api('/vider-cache-voix', {}); toast('Phrases effacées ✓'); return; }
    if (b.id === 'changer-joueur') {
      try { sessionStorage.removeItem('roque-qui-joue'); } catch { /* sans importance */ }
      location.hash = '#/profils';
    }
  });
  detail.addEventListener('change', (e) => {
    const c = e.target.closest('[data-cle]');
    if (c && (c.tagName === 'SELECT' || c.tagName === 'INPUT')) { changer(c.dataset.cle, c.value); enregistre(); }
  });
}
