// Routeur de l'application (adresses en #/…) : chaque vue reçoit la zone principale et ses paramètres
import { vueAccueil } from './vues/accueil.js';
import { vueProblemes } from './vues/problemes.js';
import { vueRush } from './vues/rush.js';
import { vueJouer } from './vues/jouer.js';
import { vueAnalyse } from './vues/revue-partie.js';
import { vueLecons, vueLecon } from './vues/lecons.js';
import { vueProgres } from './vues/progres.js';
import { vueEntrainement } from './vues/entrainement.js';
import { vueCases } from './vues/cases.js';
import { vueProfils } from './vues/profils.js';
import { joueurChoisi } from './profil.js';
import { param, changer, chargerParametres, surChangementParametre } from './parametres.js';
import { appliquerApparence, PALETTES } from './apparence.js';
import { vueParametres } from './vues/parametres.js';
import { echapper } from './outils.js';
import { ICONES } from './icones.js';
import { basculerSon, sonActif } from './sons.js';
import { basculerVoix, voixActive, surChangementVoix } from './voix.js';

const ROUTES = [
  { motif: /^\/$/, vue: vueAccueil, nav: 'accueil' },
  { motif: /^\/problemes$/, vue: vueProblemes, nav: 'problemes' },
  { motif: /^\/rush$/, vue: vueRush, nav: 'rush' },
  { motif: /^\/entrainement$/, vue: vueEntrainement, nav: 'entrainement' },
  { motif: /^\/entrainement\/cases$/, vue: vueCases, nav: 'entrainement' },
  { motif: /^\/jouer$/, vue: vueJouer, nav: 'jouer' },
  { motif: /^\/analyse\/(\d+)$/, vue: vueAnalyse, nav: 'jouer' },
  { motif: /^\/lecons$/, vue: vueLecons, nav: 'lecons' },
  { motif: /^\/lecons\/([\w-]+)$/, vue: vueLecon, nav: 'lecons' },
  { motif: /^\/progres$/, vue: vueProgres, nav: 'progres' },
  { motif: /^\/profils$/, vue: vueProfils, nav: 'profils' },
  { motif: /^\/parametres$/, vue: vueParametres, nav: 'parametres' },
  { motif: /^\/parametres\/([\w-]+)$/, vue: vueParametres, nav: 'parametres' },
];

// Icônes du menu et bouton son
document.querySelectorAll('.navigation a[data-route]').forEach((a) => {
  a.querySelector('.nav-icone').outerHTML = ICONES[a.dataset.route];
});
const boutonSon = document.getElementById('bouton-son');
const majBoutonSon = () => { boutonSon.innerHTML = `${sonActif() ? ICONES.son : ICONES.muet}<span>Sons ${sonActif() ? 'activés' : 'coupés'}</span>`; };
boutonSon.addEventListener('click', () => { basculerSon(); majBoutonSon(); });
majBoutonSon();
const boutonVoix = document.getElementById('bouton-voix');
const majBoutonVoix = () => { boutonVoix.innerHTML = `${voixActive() ? ICONES.voix : ICONES.voixCoupee}<span>Voix ${voixActive() ? 'activée' : 'coupée'}</span>`; };
boutonVoix.addEventListener('click', basculerVoix);
surChangementVoix(majBoutonVoix);
majBoutonVoix();

// Pastilles de couleurs du menu : raccourci vers Paramètres > Thème
const choixTheme = document.getElementById('choix-theme');
function majPastilles() {
  const palette = PALETTES.find((t) => t.id === param('theme.palette')) || PALETTES[0];
  choixTheme.innerHTML = `<span class="choix-theme-titre">Couleurs · <strong>${palette.nom}</strong></span>
    <span class="pastilles-theme">${PALETTES.map((t) => `<button type="button" data-theme="${t.id}" title="${t.nom}" class="${t.id === palette.id ? 'actif' : ''}"
      style="background:linear-gradient(135deg, ${t.fond} 50%, ${t.accent} 50%)" aria-label="Couleurs ${t.nom}"></button>`).join('')}</span>`;
}
choixTheme.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-theme]');
  if (b) changer('theme.palette', b.dataset.theme);
});
surChangementParametre((cle) => { if (!cle || cle === 'theme.palette') majPastilles(); });
appliquerApparence();
majPastilles();
const parametresPrets = chargerParametres();

const main = document.getElementById('contenu');
let nettoyage = null;

// Profil actif : pastille en haut du menu ; avec plusieurs joueurs, « Qui joue ? » à chaque ouverture
const infosProfils = fetch('/api/profils').then((r) => r.json()).catch(() => null);
infosProfils.then((i) => {
  const p = i?.profils.find((x) => x.id === i.actif);
  if (!p) return;
  const puce = document.getElementById('profil-puce');
  puce.hidden = false;
  puce.innerHTML = `<span class="avatar-profil" style="background:${p.couleur}">${p.avatar}</span>
    <span class="profil-texte"><strong>${echapper(p.nom)}</strong><small>Changer de joueur</small></span>`;
});

async function afficher() {
  let [chemin, requete = ''] = (location.hash.slice(1) || '/').split('?');
  const [infos] = await Promise.all([infosProfils, parametresPrets]);
  if (infos && infos.profils.length > 1 && param('social.quiJoue') && !joueurChoisi() && chemin !== '/profils') chemin = '/profils';
  const route = ROUTES.find((r) => r.motif.test(chemin)) || ROUTES[0];
  const params = Object.fromEntries(new URLSearchParams(requete));
  params.id = chemin.match(route.motif)?.[1];

  // La vue précédente arrête ses minuteurs et son moteur
  if (typeof nettoyage === 'function') nettoyage();
  nettoyage = null;
  document.querySelectorAll('.navigation a[data-route]').forEach((a) => a.classList.toggle('actif', a.dataset.route === route.nav));
  main.innerHTML = '';
  main.style.animation = 'none';
  void main.offsetWidth;   // relance l'animation d'apparition
  main.style.animation = '';
  window.scrollTo(0, 0);
  try {
    nettoyage = await route.vue(main, params);
  } catch (e) {
    main.innerHTML = `<div class="carte"><h2>Oups</h2><p class="doux">${e.message}</p><a class="bouton" href="#/">Retour à l'accueil</a></div>`;
  }
}

window.addEventListener('hashchange', afficher);
afficher();
