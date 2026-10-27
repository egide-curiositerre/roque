// Progrès : courbe du niveau jour par jour, forces et faiblesses par thème, activité, parties
import { api, echapper, dureeTexte, dateCourte, signe } from '../outils.js';
import { choisirNiveau } from '../niveau.js';
import { ICONES } from '../icones.js';
import { parler, taire } from '../voix.js';
import { param } from '../parametres.js';

// Courbe SVG : classement problèmes (avec bande d'incertitude ± RD) et Elo estimé en partie
function graphique(historique) {
  if (historique.length < 2) {
    return '<p class="doux">La courbe apparaîtra dès ton deuxième jour d\'entraînement. Reviens demain !</p>';
  }
  const L = 760, H = 260, G = 44, D = 12, Hh = 14, B = 28;
  const valeurs = historique.flatMap((h) => [h.elo - h.rd, h.elo + h.rd, h.eloPartie].filter((v) => v != null));
  let min = Math.floor(Math.min(...valeurs) / 100) * 100;
  let max = Math.ceil(Math.max(...valeurs) / 100) * 100;
  if (max - min < 200) { min -= 100; max += 100; }
  const x = (i) => G + (i * (L - G - D)) / (historique.length - 1);
  const y = (v) => Hh + ((max - v) * (H - Hh - B)) / (max - min);
  const pas = Math.max(100, Math.ceil((max - min) / 500) * 100);
  let svg = '';
  for (let v = min; v <= max; v += pas) {
    svg += `<line class="axe" x1="${G}" x2="${L - D}" y1="${y(v)}" y2="${y(v)}" stroke-dasharray="3 5"/><text x="${G - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  }
  const bande = historique.map((h, i) => `${x(i)},${y(h.elo + h.rd)}`).join(' ') + ' '
    + historique.map((h, i) => `${x(i)},${y(h.elo - h.rd)}`).reverse().join(' ');
  svg += `<polygon class="bande-elo" points="${bande}"/>`;
  svg += `<polyline points="${historique.map((h, i) => `${x(i)},${y(h.elo)}`).join(' ')}" class="courbe-elo" fill="none" stroke-width="3" stroke-linejoin="round"/>`;
  const partie = historique.map((h, i) => (h.eloPartie != null ? `${x(i)},${y(h.eloPartie)}` : null)).filter(Boolean);
  if (partie.length > 1) svg += `<polyline points="${partie.join(' ')}" class="courbe-partie" fill="none" stroke-width="2" stroke-dasharray="6 4"/>`;
  const etiquettes = Math.min(6, historique.length);
  for (let k = 0; k < etiquettes; k++) {
    const i = Math.round((k * (historique.length - 1)) / (etiquettes - 1));
    svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${dateCourte(historique[i].jour)}</text>`;
  }
  return `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Évolution du classement">${svg}</svg>`;
}

// Classement entre les joueurs de l'ordinateur (Paramètres > Social)
function classementJoueurs({ profils, actif }) {
  const classes = profils.filter((p) => p.configure).sort((a, b) => b.elo - a.elo);
  if (!param('social.classement') || classes.length < 2) return '';
  const medailles = ['🥇', '🥈', '🥉'];
  return `<section class="carte" style="margin-top:18px"><h2>Classement des joueurs</h2>
    ${classes.map((p, i) => `<div class="ligne-classement ${p.id === actif ? 'moi' : ''}"><span class="rang">${medailles[i] || i + 1}</span>
      <span class="avatar-profil" style="background:${p.couleur}">${p.avatar}</span><strong>${echapper(p.nom)}</strong>
      <span class="doux petit-texte">${echapper(p.niveau)}${p.serie ? ` · 🔥 ${p.serie}` : ''}</span><span class="chiffre">${p.elo}</span></div>`).join('')}
  </section>`;
}

export async function vueProgres(main) {
  const [etat, stats, joueurs] = await Promise.all([api('/etat'), api('/bilan'), api('/profils')]);
  if (!etat.configure) return choisirNiveau(main, () => vueProgres(main));
  const h = stats.historique;
  const ilYa = (n) => h[Math.max(0, h.length - 1 - n)]?.elo;
  const variation = (n) => (h.length > 1 ? signe(etat.elo - ilYa(n)) : '—');
  const forts = stats.themes.filter((t) => t.tentatives >= 4).slice().reverse().slice(0, 5);
  const faibles = stats.themes.filter((t) => t.tentatives >= 4).slice(0, 5);
  const taux = stats.totaux.problemes ? Math.round((100 * stats.totaux.reussis) / stats.totaux.problemes) : 0;

  const ligneTheme = (t) => `<div class="ligne-theme"><a href="#/problemes?mode=theme&theme=${t.theme}">${echapper(t.nom)}</a>
    <div class="barre"><span style="width:${Math.round(100 * t.taux)}%;background:${t.taux >= 0.7 ? 'var(--vert)' : t.taux >= 0.5 ? 'var(--or)' : 'var(--rouge)'}"></span></div>
    <span class="doux petit-texte">${Math.round(100 * t.taux)} % · ${t.tentatives}</span></div>`;

  main.innerHTML = `
    <div class="entete-page"><div><div class="surtitre">Suivi</div><h1>Ta progression</h1><p class="doux">Ton niveau réel, mesuré jour après jour.</p></div>
      <button class="bouton secondaire" id="ecouter">${ICONES.son} Écouter mon bilan</button></div>
    <div class="grille grille-3">
      <div class="carte"><div class="doux petit-texte">Elo problèmes</div><div class="niveau-chiffre" style="font-size:2.4rem">${etat.elo}</div>
        <div class="doux petit-texte">${etat.niveau} · ±${etat.rd * 2}</div></div>
      <div class="carte"><div class="doux petit-texte">Elo estimé en partie</div><div class="niveau-chiffre" style="font-size:2.4rem;color:var(--bleu)">${etat.eloPartie ?? '—'}</div>
        <div class="doux petit-texte">${etat.eloPartie ? 'Sur tes 20 dernières parties' : 'Joue au moins 3 parties'}</div></div>
      <div class="carte"><div class="doux petit-texte">Évolution</div>
        <div style="font-size:1.05rem;line-height:1.9">7 jours : <strong>${variation(7)}</strong><br>30 jours : <strong>${variation(30)}</strong><br>Depuis le début : <strong>${signe(etat.elo - etat.depart)}</strong></div></div>
    </div>

    ${classementJoueurs(joueurs)}
    <section class="carte graphique" style="margin-top:18px">
      <h2>Courbe de niveau</h2>
      ${graphique(h)}
      <p class="doux petit-texte" style="margin-top:8px"><span style="color:var(--accent)">━</span> Elo problèmes (la zone claire = marge d'incertitude) &nbsp; <span style="color:var(--bleu)">╍</span> Elo estimé en partie</p>
    </section>

    <div class="grille grille-2" style="margin-top:18px">
      <section class="carte"><h2>💪 Tes points forts</h2>${forts.length ? forts.map(ligneTheme).join('') : '<p class="doux">Résous quelques problèmes pour les découvrir.</p>'}</section>
      <section class="carte"><h2>🎯 À travailler</h2>${faibles.length ? faibles.map(ligneTheme).join('') : '<p class="doux">Pas encore assez de données.</p>'}</section>
    </div>

    <div class="grille grille-2" style="margin-top:18px">
      <section class="carte"><h2>Activité des 30 derniers jours</h2>
        <p class="doux petit-texte">${stats.totaux.problemes} problèmes au total · ${taux} % réussis · ${dureeTexte(stats.totaux.duree)} de réflexion</p>
        ${stats.activite.length ? `<table><tr><th>Jour</th><th>Problèmes</th><th>Réussite</th><th>Temps</th></tr>
          ${stats.activite.map((a) => `<tr><td>${dateCourte(a.jour)}</td><td>${a.problemes}</td><td>${Math.round((100 * a.reussis) / a.problemes)} %</td><td>${dureeTexte(a.duree)}</td></tr>`).join('')}</table>` : '<p class="doux">Aucune activité pour l\'instant.</p>'}
      </section>
      <section class="carte"><h2>Parties récentes</h2>
        ${stats.parties.length ? `<table><tr><th>Date</th><th>Niveau</th><th>Résultat</th><th>Précision</th><th></th></tr>
          ${stats.parties.map((p) => `<tr><td>${dateCourte(new Date(p.date).toLocaleDateString('sv-SE'))}</td><td>${p.niveau_moteur}</td>
            <td>${p.resultat === 1 ? '<span class="badge vert">Victoire</span>' : p.resultat === 0 ? '<span class="badge rouge">Défaite</span>' : '<span class="badge">Nulle</span>'}</td>
            <td>${p.precision != null ? `${p.precision} %` : '—'}</td><td><a href="#/analyse/${p.id}">Analyse</a></td></tr>`).join('')}</table>` : '<p class="doux">Aucune partie pour l\'instant. <a href="#/jouer">Jouer maintenant</a></p>'}
      </section>
    </div>`;

  // Bilan parlé
  const pts = (n) => `${Math.abs(n)} point${Math.abs(n) > 1 ? 's' : ''}`;
  const evolution = (n) => (n > 0 ? `tu as gagné ${pts(n)}` : n < 0 ? `tu as perdu ${pts(n)}` : 'ton classement est stable');
  const bilan = [
    `Ton classement en problèmes est de ${etat.elo} : niveau ${etat.niveau}.`,
    h.length > 1 ? `Sur les sept derniers jours, ${evolution(etat.elo - ilYa(7))}.` : '',
    etat.eloPartie ? `En partie, ton niveau estimé est de ${etat.eloPartie}.` : '',
    stats.totaux.problemes ? `Tu as résolu ${stats.totaux.problemes} problèmes au total, avec ${taux} pour cent de réussite.` : "Tu n'as pas encore résolu de problème.",
    forts[0] ? `Ton point fort : ${forts[0].nom}.` : '',
    faibles[0] ? `À travailler en priorité : ${faibles[0].nom}.` : '',
  ].filter(Boolean).join(' ');
  main.querySelector('#ecouter').addEventListener('click', () => parler(bilan));
  return () => taire();
}
