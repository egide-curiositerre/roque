// Apparence choisie dans Paramètres : palette, taille du texte, animations, icône de l'app, couleurs de l'échiquier
import { param, changer, surChangementParametre } from './parametres.js';
import { cleLocale } from './profil.js';

export const PALETTES = [
  { id: 'classique', nom: 'Classique', fond: '#312e2b', accent: '#81b64c' },
  { id: 'clair', nom: 'Clair', fond: '#f2f0eb', accent: '#2f6fd1' },
  { id: 'ocean', nom: 'Océan', fond: '#0c1822', accent: '#38bdf8' },
  { id: 'or', nom: 'Or', fond: '#0b0e14', accent: '#e4b04f' },
  { id: 'emeraude', nom: 'Émeraude', fond: '#0b0d12', accent: '#34d399' },
];

// Couleurs d'échiquier indépendantes de la palette (« palette » = celles de la palette choisie)
export const PLATEAUX = [
  { id: 'palette', nom: 'Comme la palette' },
  { id: 'vert', nom: 'Vert', claire: '#ebecd0', foncee: '#779556' },
  { id: 'marron', nom: 'Marron', claire: '#f0d9b5', foncee: '#b58863' },
  { id: 'bois', nom: 'Bois', claire: '#efdfc2', foncee: '#b3865f' },
  { id: 'bleu', nom: 'Bleu', claire: '#dee3e6', foncee: '#8ca2ad' },
  { id: 'gris', nom: 'Gris', claire: '#e8e8e8', foncee: '#9a9a9a' },
  { id: 'violet', nom: 'Violet', claire: '#efe6f5', foncee: '#9b7bb8' },
  { id: 'corail', nom: 'Corail', claire: '#f6e6dc', foncee: '#d08770' },
];

// Icônes de l'application (onglet du navigateur et logo du menu)
export const ICONES_APP = [
  { id: 'cavalier', nom: 'Cavalier', piece: '♞', fond: '#81b64c' },
  { id: 'roi', nom: 'Roi', piece: '♚', fond: '#e4b04f' },
  { id: 'dame', nom: 'Dame', piece: '♛', fond: '#a855f7' },
  { id: 'tour', nom: 'Tour', piece: '♜', fond: '#3b82f6' },
  { id: 'fou', nom: 'Fou', piece: '♝', fond: '#ef4444' },
  { id: 'pion', nom: 'Pion', piece: '♟', fond: '#14b8a6' },
];

export function iconeSvg(icone, taille = 64) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${taille}" height="${taille}"><rect width="64" height="64" rx="15" fill="${icone.fond}"/><text x="32" y="46" font-size="42" text-anchor="middle" fill="#fff" font-family="DejaVu Sans, Apple Symbols, Segoe UI Symbol, sans-serif">${icone.piece}</text></svg>`;
}

/** Applique toute l'apparence (et seulement ce qui a changé quand une clé est donnée). */
export function appliquerApparence(cle = null) {
  const html = document.documentElement;
  if (!cle || cle === 'theme.palette') {
    const p = PALETTES.find((x) => x.id === param('theme.palette')) || PALETTES[0];
    html.dataset.theme = p.id;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.fond);
    // Copie lue par le petit script du <head> (palette appliquée avant l'affichage, sans clignotement)
    try { localStorage.setItem(cleLocale('roque-theme'), p.id); } catch { /* stockage indisponible */ }
  }
  if (!cle || cle === 'theme.taille') html.dataset.taille = param('theme.taille');
  if (!cle || cle === 'theme.animations') html.classList.toggle('sans-animations', !param('theme.animations'));
  if (!cle || cle === 'plateau.couleurs') {
    const b = PLATEAUX.find((x) => x.id === param('plateau.couleurs'));
    if (b?.claire) { html.style.setProperty('--case-claire', b.claire); html.style.setProperty('--case-foncee', b.foncee); }
    else { html.style.removeProperty('--case-claire'); html.style.removeProperty('--case-foncee'); }
  }
  if (!cle || cle === 'icone') {
    const icone = ICONES_APP.find((x) => x.id === param('icone')) || ICONES_APP[0];
    let lien = document.querySelector('link[rel="icon"]');
    if (!lien) { lien = document.createElement('link'); lien.rel = 'icon'; document.head.appendChild(lien); }
    lien.type = 'image/svg+xml';
    lien.href = `data:image/svg+xml,${encodeURIComponent(iconeSvg(icone))}`;
    const logo = document.querySelector('.logo-icone');
    if (logo) { logo.textContent = icone.piece; logo.style.background = icone.id === 'cavalier' ? '' : icone.fond; }
  }
}

// Ancienne palette gardée dans le navigateur (avant les Paramètres) : on la reprend une fois
try {
  const ancienne = localStorage.getItem(cleLocale('roque-theme'));
  if (ancienne && ancienne !== param('theme.palette') && !localStorage.getItem(cleLocale('roque-parametres'))) changer('theme.palette', ancienne);
} catch { /* stockage indisponible */ }

surChangementParametre((cle) => appliquerApparence(cle));
