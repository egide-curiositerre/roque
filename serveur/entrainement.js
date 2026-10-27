// Logique d'entraînement : niveau du joueur, choix des problèmes, révisions, plan du jour, statistiques
import { jourLocal } from './schema.js';
import { mettreAJour, vieillir, performance, RD_MAX } from './glicko.js';
import { THEMES_TRAVAIL, nomTheme } from './themes.js';

const JOUR_MS = 24 * 3600 * 1000;
const MODES_CLASSES = new Set(['classe', 'theme', 'echauffement']);  // modes qui font évoluer le classement

export function niveauTexte(elo) {
  if (elo < 800) return 'Débutant';
  if (elo < 1200) return 'Novice';
  if (elo < 1600) return 'Joueur de club';
  if (elo < 2000) return 'Confirmé';
  if (elo < 2400) return 'Expert';
  return 'Maître';
}

export function creerEntrainement(db, { maintenant = () => Date.now() } = {}) {
  const lireReglage = db.prepare('SELECT valeur FROM reglages WHERE cle = ?');
  const ecrireReglage = db.prepare('INSERT INTO reglages (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur');
  const reglage = (cle, defaut = null) => {
    const r = lireReglage.get(cle);
    return r ? JSON.parse(r.valeur) : defaut;
  };
  const definir = (cle, valeur) => ecrireReglage.run(cle, JSON.stringify(valeur));

  const q = {
    probleme: db.prepare('SELECT * FROM problemes WHERE id = ?'),
    dejaTente: db.prepare('SELECT COUNT(*) AS n FROM tentatives WHERE probleme_id = ?'),
    ajouterTentative: db.prepare(`INSERT INTO tentatives (probleme_id, date, jour, reussi, duree_ms, mode, elo_avant, elo_apres)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    revision: db.prepare('SELECT * FROM revisions WHERE probleme_id = ?'),
    planifierRevision: db.prepare(`INSERT INTO revisions (probleme_id, prochaine, intervalle_j, reussites) VALUES (?, ?, ?, ?)
      ON CONFLICT(probleme_id) DO UPDATE SET prochaine = excluded.prochaine, intervalle_j = excluded.intervalle_j, reussites = excluded.reussites`),
    retirerRevision: db.prepare('DELETE FROM revisions WHERE probleme_id = ?'),
    revisionsDues: db.prepare('SELECT COUNT(*) AS n FROM revisions WHERE prochaine <= ?'),
    prochaineRevision: db.prepare(`SELECT p.* FROM revisions r JOIN problemes p ON p.id = r.probleme_id
      WHERE r.prochaine <= ? AND p.id <> ? ORDER BY r.prochaine LIMIT 1`),
    instantane: db.prepare(`INSERT INTO quotidien (jour, elo, rd, elo_partie) VALUES (?, ?, ?, ?)
      ON CONFLICT(jour) DO UPDATE SET elo = excluded.elo, rd = excluded.rd, elo_partie = excluded.elo_partie`),
    partiesRecentes: db.prepare('SELECT niveau_moteur, resultat FROM parties WHERE resultat IS NOT NULL ORDER BY date DESC LIMIT 20'),
  };

  // ---------- Joueur ----------

  function joueur() {
    const j = reglage('joueur');
    if (!j) return null;
    const jours = Math.floor((maintenant() - j.derniere) / JOUR_MS);
    return { ...vieillir(j, jours), derniere: j.derniere };
  }

  function eloPartie() {
    const parties = q.partiesRecentes.all();
    return parties.length >= 3 ? performance(parties) : null;
  }

  function photographier(j) {
    q.instantane.run(jourLocal(new Date(maintenant())), j.elo, j.rd, eloPartie());
  }

  function demarrer(eloInitial) {
    const elo = Math.min(2400, Math.max(400, Number(eloInitial) || 1200));
    const j = { elo, rd: RD_MAX, vol: 0.09, derniere: maintenant(), depart: elo, debut: maintenant() };
    definir('joueur', j);
    photographier(j);
    return j;
  }

  function serie() {
    // Jours consécutifs avec au moins une activité, jusqu'à aujourd'hui (ou hier si rien encore aujourd'hui)
    const jours = new Set(db.prepare(`SELECT jour FROM tentatives UNION SELECT jour FROM parties
      UNION SELECT jour FROM lecons_faites UNION SELECT jour FROM rush`).all().map((r) => r.jour));
    let n = 0;
    const d = new Date(maintenant());
    if (!jours.has(jourLocal(d))) d.setDate(d.getDate() - 1);
    while (jours.has(jourLocal(d))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  function etat() {
    const j = joueur();
    if (!j) return { configure: false };
    const aujourdhui = jourLocal(new Date(maintenant()));
    const t = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(reussi), 0) AS r FROM tentatives WHERE jour = ?').get(aujourdhui);
    return {
      configure: true,
      elo: Math.round(j.elo),
      rd: Math.round(j.rd),
      // Intervalle à ~95 % : le vrai niveau se situe très probablement entre ces deux bornes
      fourchette: [Math.round(j.elo - 2 * j.rd), Math.round(j.elo + 2 * j.rd)],
      provisoire: j.rd > 110,
      niveau: niveauTexte(j.elo),
      eloPartie: eloPartie(),
      depart: j.depart,
      serie: serie(),
      revisionsDues: q.revisionsDues.get(maintenant()).n,
      aujourdhui: { problemes: t.n, reussis: t.r },
      recordRush: db.prepare('SELECT MAX(score) AS m FROM rush').get().m || 0,
    };
  }

  // ---------- Problèmes ----------

  function formater(p) {
    return {
      id: p.id, fen: p.fen, coups: p.coups.split(' '), elo: p.elo,
      themes: p.themes.trim().split(' '), nomsThemes: p.themes.trim().split(' ').map(nomTheme),
    };
  }

  // Problème autour d'un classement cible, non tenté depuis 30 jours ; la fenêtre s'élargit si besoin
  function chercher(cible, { theme = null, exclure = '' } = {}) {
    const depuis = maintenant() - 30 * JOUR_MS;
    for (const marge of [60, 150, 300, 600, 3000]) {
      const p = db.prepare(`SELECT * FROM problemes WHERE elo BETWEEN ? AND ? AND id <> ?
        ${theme ? 'AND themes LIKE ?' : ''}
        AND id NOT IN (SELECT probleme_id FROM tentatives WHERE date > ?)
        ORDER BY random() LIMIT 1`)
        .get(...[cible - marge, cible + marge, exclure, ...(theme ? [`% ${theme} %`] : []), depuis]);
      if (p) return p;
    }
    return null;
  }

  function probleme({ mode = 'classe', theme = null, n = 0, exclure = '', ecart = 0 } = {}) {
    const j = joueur() || { elo: 1200 };
    // Réglage « difficulté des problèmes » : décalage de la cible (borné à ± 400 points)
    const decalage = Math.max(-400, Math.min(400, Number(ecart) || 0));
    let p = null;
    if (mode === 'revision') p = q.prochaineRevision.get(maintenant(), exclure);
    else if (mode === 'echauffement') p = chercher(j.elo - 300 + decalage, { exclure });
    else if (mode === 'theme') p = chercher(j.elo - 100 + decalage, { theme, exclure });
    // Rush : difficulté croissante à partir de 600 points sous le niveau
    else if (mode === 'rush') p = chercher(Math.max(400, j.elo - 600) + 55 * Number(n), { exclure });
    else p = chercher(j.elo + decalage, { exclure });
    return p ? formater(p) : null;
  }

  function enregistrerTentative({ id, reussi, duree_ms = null, mode = 'classe' }) {
    const p = q.probleme.get(id);
    if (!p) throw new Error('Problème inconnu');
    const ok = reussi ? 1 : 0;
    const t = maintenant();
    let j = joueur();
    if (!j) j = demarrer(1200);
    const avant = j.elo;
    let apres = j.elo;

    // Seule la première tentative d'un problème compte pour le classement (comme sur Lichess)
    if (MODES_CLASSES.has(mode) && q.dejaTente.get(id).n === 0) {
      const nouveau = mettreAJour(j, { elo: p.elo, rd: p.rd }, ok);
      j = { ...j, ...nouveau };
      apres = j.elo;
    }
    j.derniere = t;
    definir('joueur', j);
    q.ajouterTentative.run(id, t, jourLocal(new Date(t)), ok, duree_ms, mode, avant, apres);

    // Révisions espacées : un échec revient demain ; chaque réussite triple l'intervalle ; 3 réussites = acquis
    const r = q.revision.get(id);
    if (!ok) q.planifierRevision.run(id, t + JOUR_MS, 1, 0);
    else if (r && mode === 'revision') {
      if (r.reussites + 1 >= 3) q.retirerRevision.run(id);
      else q.planifierRevision.run(id, t + r.intervalle_j * 3 * JOUR_MS, r.intervalle_j * 3, r.reussites + 1);
    }

    photographier(j);
    return { eloAvant: Math.round(avant), eloApres: Math.round(apres), delta: Math.round(apres - avant), elo: Math.round(j.elo), rd: Math.round(j.rd) };
  }

  // ---------- Statistiques ----------

  function statsThemes(jours = 90) {
    const depuis = maintenant() - jours * JOUR_MS;
    const lignes = db.prepare(`SELECT p.themes, t.reussi FROM tentatives t JOIN problemes p ON p.id = t.probleme_id
      WHERE t.date > ? AND t.mode <> 'lecon'`).all(depuis);
    const stats = {};
    for (const l of lignes) {
      for (const th of l.themes.trim().split(' ')) {
        if (!THEMES_TRAVAIL.includes(th)) continue;
        stats[th] ??= { theme: th, nom: nomTheme(th), tentatives: 0, reussis: 0 };
        stats[th].tentatives++;
        stats[th].reussis += l.reussi;
      }
    }
    return Object.values(stats).map((s) => ({
      ...s,
      taux: s.reussis / s.tentatives,
      // Taux « prudent » : tiré vers 60 % tant qu'il y a peu de tentatives, pour ne pas juger sur 2 essais
      score: (s.reussis + 0.6 * 5) / (s.tentatives + 5),
    })).sort((a, b) => a.score - b.score);
  }

  // Thème du jour : le point faible le plus net, sinon un thème clé pas encore assez travaillé
  function themeDuJour() {
    const stats = statsThemes();
    const essayes = stats.filter((s) => s.tentatives >= 4);
    if (essayes.length && essayes[0].score < 0.6) return { theme: essayes[0].theme, decouverte: false };
    const vus = new Set(stats.filter((s) => s.tentatives >= 8).map((s) => s.theme));
    const nouveau = THEMES_TRAVAIL.find((t) => !vus.has(t));
    if (nouveau) return { theme: nouveau, decouverte: true };
    return { theme: essayes[0]?.theme || 'fork', decouverte: false };
  }

  // ---------- Plan du jour ----------

  function plan(lecons) {
    const j = joueur();
    if (!j) return null;
    const aujourdhui = jourLocal(new Date(maintenant()));
    // Le plan est figé pour la journée (même thème du matin au soir)
    let base = reglage(`plan:${aujourdhui}`);
    if (!base) {
      const lecon = lecons.find((l) => !db.prepare('SELECT 1 FROM lecons_faites WHERE lecon_id = ?').get(l.id));
      base = {
        ...themeDuJour(),
        lecon: lecon ? { id: lecon.id, titre: lecon.titre } : null,
        niveauPartie: Math.round(((eloPartie() ?? j.elo - 200) + 50) / 50) * 50,
        revisions: Math.min(10, q.revisionsDues.get(maintenant()).n),
      };
      definir(`plan:${aujourdhui}`, base);
    }
    const fait = (mode) => db.prepare('SELECT COUNT(*) AS n FROM tentatives WHERE jour = ? AND mode = ?').get(aujourdhui, mode).n;
    const faitTheme = db.prepare(`SELECT COUNT(*) AS n FROM tentatives t JOIN problemes p ON p.id = t.probleme_id
      WHERE t.jour = ? AND t.mode = 'theme' AND p.themes LIKE ?`).get(aujourdhui, `% ${base.theme} %`).n;
    const parties = db.prepare('SELECT COUNT(*) AS n FROM parties WHERE jour = ?').get(aujourdhui).n;
    const leconFaite = base.lecon && db.prepare('SELECT 1 FROM lecons_faites WHERE lecon_id = ? AND jour = ?').get(base.lecon.id, aujourdhui);

    // Réglage « objectif du plan du jour » (Paramètres > Accueil)
    const facteur = { leger: 0.5, normal: 1, intense: 1.5 }[(reglage('parametres', {}) || {})['accueil.objectif']] || 1;
    const nb = (n) => Math.max(1, Math.round(n * facteur));
    const etapes = [
      { id: 'echauffement', titre: 'Échauffement', detail: `${nb(5)} problèmes faciles pour se mettre en route`, objectif: nb(5), fait: fait('echauffement'), lien: '#/problemes?mode=echauffement' },
    ];
    if (base.revisions > 0) {
      etapes.push({ id: 'revision', titre: 'Révision de tes erreurs', detail: 'Les problèmes ratés reviennent jusqu\'à ce qu\'ils soient acquis', objectif: base.revisions, fait: fait('revision'), lien: '#/problemes?mode=revision' });
    }
    etapes.push(
      base.decouverte
        ? { id: 'theme', titre: `Thème à découvrir : ${nomTheme(base.theme)}`, detail: 'Une idée clé que tu n\'as pas encore assez travaillée', objectif: nb(10), fait: faitTheme, lien: `#/problemes?mode=theme&theme=${base.theme}` }
        : { id: 'theme', titre: `Point faible : ${nomTheme(base.theme)}`, detail: 'Le thème où tu réussis le moins en ce moment', objectif: nb(10), fait: faitTheme, lien: `#/problemes?mode=theme&theme=${base.theme}` },
      { id: 'classe', titre: 'Problèmes classés', detail: 'À ton niveau : c\'est ce qui mesure ta progression', objectif: nb(10), fait: fait('classe'), lien: '#/problemes?mode=classe' },
    );
    if (base.lecon) {
      etapes.push({ id: 'lecon', titre: `Leçon : ${base.lecon.titre}`, detail: 'La suite de ton parcours, de A à Z', objectif: 1, fait: leconFaite ? 1 : 0, lien: `#/lecons/${base.lecon.id}` });
    }
    etapes.push({ id: 'partie', titre: `Partie contre l'ordinateur (${base.niveauPartie})`, detail: 'Mettre en pratique, puis lire l\'analyse de tes erreurs', objectif: 1, fait: Math.min(1, parties), lien: `#/jouer?niveau=${base.niveauPartie}` });

    const total = etapes.reduce((s, e) => s + e.objectif, 0);
    const realise = etapes.reduce((s, e) => s + Math.min(e.fait, e.objectif), 0);
    return { jour: aujourdhui, etapes, avancement: Math.round((100 * realise) / total) };
  }

  function historique(jours = 120) {
    return db.prepare('SELECT * FROM quotidien ORDER BY jour DESC LIMIT ?').all(jours).reverse().map((r) => ({
      jour: r.jour, elo: Math.round(r.elo), rd: Math.round(r.rd), eloPartie: r.elo_partie,
    }));
  }

  function activiteParJour(jours = 30) {
    const depuis = jourLocal(new Date(maintenant() - jours * JOUR_MS));
    return db.prepare(`SELECT jour, COUNT(*) AS problemes, SUM(reussi) AS reussis, SUM(COALESCE(duree_ms, 0)) AS duree
      FROM tentatives WHERE jour >= ? GROUP BY jour ORDER BY jour DESC`).all(depuis);
  }

  function enregistrerPartie(p) {
    const t = maintenant();
    const r = db.prepare(`INSERT INTO parties (date, jour, couleur, niveau_moteur, resultat, fin, pgn, precision, gaffes, erreurs, imprecisions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(t, jourLocal(new Date(t)), p.couleur === 'b' ? 'b' : 'w',
      Number(p.niveau_moteur), p.resultat ?? null, p.fin ?? null, String(p.pgn || ''), p.precision ?? null,
      p.gaffes ?? null, p.erreurs ?? null, p.imprecisions ?? null);
    const j = joueur();
    if (j) photographier(j);
    return { id: Number(r.lastInsertRowid), eloPartie: eloPartie() };
  }

  // Résultat de l'analyse automatique (calculée dans le navigateur par Stockfish)
  function enregistrerAnalyse(id, a) {
    db.prepare('UPDATE parties SET precision = ?, gaffes = ?, erreurs = ?, imprecisions = ? WHERE id = ?')
      .run(Number(a.precision), Number(a.gaffes), Number(a.erreurs), Number(a.imprecisions), Number(id));
    return { ok: true };
  }

  return {
    joueur, demarrer, etat, probleme, enregistrerTentative, plan, historique, activiteParJour,
    statsThemes, enregistrerPartie, enregistrerAnalyse, eloPartie, reglage, definir,
  };
}
