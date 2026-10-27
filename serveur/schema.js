// Structure de la base (commune au Mac et à la version téléphone, sans dépendance à Node)
export const SCHEMA = `
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS problemes (
      id TEXT PRIMARY KEY,
      fen TEXT NOT NULL,
      coups TEXT NOT NULL,          -- coups UCI séparés par des espaces ; le 1er est joué par l'adversaire
      elo INTEGER NOT NULL,
      rd INTEGER NOT NULL,
      popularite INTEGER NOT NULL,
      nb_parties INTEGER NOT NULL,
      themes TEXT NOT NULL,         -- « fork pin mateIn2 … » entourés d'espaces pour LIKE '% x %'
      ouverture TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_problemes_elo ON problemes(elo);
    CREATE TABLE IF NOT EXISTS tentatives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      probleme_id TEXT NOT NULL REFERENCES problemes(id),
      date INTEGER NOT NULL,
      jour TEXT NOT NULL,
      reussi INTEGER NOT NULL,
      duree_ms INTEGER,
      mode TEXT NOT NULL,           -- classe, theme, rush, revision, echauffement, lecon
      elo_avant REAL,
      elo_apres REAL
    );
    CREATE INDEX IF NOT EXISTS idx_tentatives_jour ON tentatives(jour);
    CREATE INDEX IF NOT EXISTS idx_tentatives_probleme ON tentatives(probleme_id);
    CREATE TABLE IF NOT EXISTS revisions (
      probleme_id TEXT PRIMARY KEY REFERENCES problemes(id),
      prochaine INTEGER NOT NULL,   -- date (ms) à partir de laquelle le problème revient
      intervalle_j INTEGER NOT NULL,
      reussites INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date INTEGER NOT NULL,
      jour TEXT NOT NULL,
      couleur TEXT NOT NULL,        -- couleur du joueur : w ou b
      niveau_moteur INTEGER NOT NULL,
      resultat REAL,                -- 1 victoire, 0.5 nulle, 0 défaite (point de vue du joueur)
      fin TEXT,
      pgn TEXT NOT NULL,
      precision REAL,
      gaffes INTEGER,
      erreurs INTEGER,
      imprecisions INTEGER
    );
    CREATE TABLE IF NOT EXISTS rush (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date INTEGER NOT NULL,
      jour TEXT NOT NULL,
      score INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lecons_faites (
      lecon_id TEXT PRIMARY KEY,
      date INTEGER NOT NULL,
      jour TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quotidien (
      jour TEXT PRIMARY KEY,
      elo REAL NOT NULL,
      rd REAL NOT NULL,
      elo_partie REAL
    );
    CREATE TABLE IF NOT EXISTS reglages (cle TEXT PRIMARY KEY, valeur TEXT NOT NULL);
`;

// Date locale au format AAAA-MM-JJ (le suivi se fait par jour du joueur, pas en UTC)
export function jourLocal(date = new Date()) {
  return date.toLocaleDateString('sv-SE');
}
