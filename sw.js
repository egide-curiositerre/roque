// Service worker : tous les fichiers de Roque sont gardés dans le téléphone, l'appli marche sans connexion.
// VERSION et FICHIERS sont remplis par scripts/construire-telephone.js à chaque nouvelle version.
const VERSION = '20261027100826';
const FICHIERS = [
 "/roque/app.js",
 "/roque/apparence.js",
 "/roque/coach.js",
 "/roque/echiquier.js",
 "/roque/icone.svg",
 "/roque/icones.js",
 "/roque/index.html",
 "/roque/manifest.webmanifest",
 "/roque/moteur.js",
 "/roque/niveau.js",
 "/roque/outils.js",
 "/roque/ouvertures.js",
 "/roque/parametres.js",
 "/roque/plateau.css",
 "/roque/prises.js",
 "/roque/profil.js",
 "/roque/sons.js",
 "/roque/style.css",
 "/roque/voix.js",
 "/roque/donnees/problemes.db",
 "/roque/serveur/entrainement.js",
 "/roque/serveur/glicko.js",
 "/roque/serveur/lecons.js",
 "/roque/serveur/schema.js",
 "/roque/serveur/themes.js",
 "/roque/telephone/base-navigateur.js",
 "/roque/telephone/demarrage.js",
 "/roque/telephone/icone-180.png",
 "/roque/telephone/icone-192.png",
 "/roque/telephone/icone-512.png",
 "/roque/telephone/serveur-local.js",
 "/roque/vues/accueil.js",
 "/roque/vues/cases.js",
 "/roque/vues/entrainement.js",
 "/roque/vues/jouer.js",
 "/roque/vues/lecons.js",
 "/roque/vues/parametres.js",
 "/roque/vues/problemes.js",
 "/roque/vues/profils.js",
 "/roque/vues/progres.js",
 "/roque/vues/revue-partie.js",
 "/roque/vues/rush.js",
 "/roque/lib/chess.js/chess.js",
 "/roque/lib/chess.js/chess.js.map",
 "/roque/lib/chessground/anim.d.ts",
 "/roque/lib/chessground/anim.js",
 "/roque/lib/chessground/anim.js.map",
 "/roque/lib/chessground/api.d.ts",
 "/roque/lib/chessground/api.js",
 "/roque/lib/chessground/api.js.map",
 "/roque/lib/chessground/autoPieces.d.ts",
 "/roque/lib/chessground/autoPieces.js",
 "/roque/lib/chessground/autoPieces.js.map",
 "/roque/lib/chessground/board.d.ts",
 "/roque/lib/chessground/board.js",
 "/roque/lib/chessground/board.js.map",
 "/roque/lib/chessground/chessground.d.ts",
 "/roque/lib/chessground/chessground.js",
 "/roque/lib/chessground/chessground.js.map",
 "/roque/lib/chessground/chessground.min.js",
 "/roque/lib/chessground/config.d.ts",
 "/roque/lib/chessground/config.js",
 "/roque/lib/chessground/config.js.map",
 "/roque/lib/chessground/drag.d.ts",
 "/roque/lib/chessground/drag.js",
 "/roque/lib/chessground/drag.js.map",
 "/roque/lib/chessground/draw.d.ts",
 "/roque/lib/chessground/draw.js",
 "/roque/lib/chessground/draw.js.map",
 "/roque/lib/chessground/drop.d.ts",
 "/roque/lib/chessground/drop.js",
 "/roque/lib/chessground/drop.js.map",
 "/roque/lib/chessground/events.d.ts",
 "/roque/lib/chessground/events.js",
 "/roque/lib/chessground/events.js.map",
 "/roque/lib/chessground/explosion.d.ts",
 "/roque/lib/chessground/explosion.js",
 "/roque/lib/chessground/explosion.js.map",
 "/roque/lib/chessground/fen.d.ts",
 "/roque/lib/chessground/fen.js",
 "/roque/lib/chessground/fen.js.map",
 "/roque/lib/chessground/premove.d.ts",
 "/roque/lib/chessground/premove.js",
 "/roque/lib/chessground/premove.js.map",
 "/roque/lib/chessground/render.d.ts",
 "/roque/lib/chessground/render.js",
 "/roque/lib/chessground/render.js.map",
 "/roque/lib/chessground/state.d.ts",
 "/roque/lib/chessground/state.js",
 "/roque/lib/chessground/state.js.map",
 "/roque/lib/chessground/svg.d.ts",
 "/roque/lib/chessground/svg.js",
 "/roque/lib/chessground/svg.js.map",
 "/roque/lib/chessground/sync.d.ts",
 "/roque/lib/chessground/sync.js",
 "/roque/lib/chessground/sync.js.map",
 "/roque/lib/chessground/types.d.ts",
 "/roque/lib/chessground/types.js",
 "/roque/lib/chessground/types.js.map",
 "/roque/lib/chessground/util.d.ts",
 "/roque/lib/chessground/util.js",
 "/roque/lib/chessground/util.js.map",
 "/roque/lib/chessground/wrap.d.ts",
 "/roque/lib/chessground/wrap.js",
 "/roque/lib/chessground/wrap.js.map",
 "/roque/lib/chessground-assets/chessground.base.css",
 "/roque/lib/chessground-assets/chessground.brown.css",
 "/roque/lib/chessground-assets/chessground.cburnett.css",
 "/roque/lib/sql.js/sql-wasm.js",
 "/roque/lib/sql.js/sql-wasm.wasm",
 "/roque/lib/stockfish/stockfish-19-lite-single.js",
 "/roque/lib/stockfish/stockfish-19-lite-single.wasm",
 "/roque/"
];
const CACHE = `roque-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((k) => k.startsWith('roque-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// D'abord le téléphone, le réseau seulement si le fichier manque ; une ouverture de page renvoie l'appli
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const trouve = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match(new URL('index.html', self.registration.scope).href) : null);
    if (trouve) return trouve;
    try {
      return await fetch(req);
    } catch {
      return new Response('Hors connexion', { status: 503 });
    }
  })());
});
