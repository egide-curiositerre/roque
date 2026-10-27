// Démarrage de la version téléphone : chargé AVANT app.js.
// Toutes les requêtes /api/… de l'appli sont servies par le serveur local (dans le téléphone),
// et le service worker garde tous les fichiers pour jouer sans connexion.
import { ouvrir, repondre, sauverMaintenant } from './serveur-local.js';

const BASE = new URL('../', import.meta.url).pathname;   // ex. /roque/
const pret = ouvrir(BASE);
pret.catch((e) => window.dispatchEvent(new ErrorEvent('error', { message: `Base du téléphone : ${e.message}` })));

const fetchReseau = window.fetch.bind(window);
const estApi = (url) => new URL(url, location.href).pathname.startsWith('/api/');

window.fetch = async (entree, options = {}) => {
  const url = typeof entree === 'string' ? entree : entree.url;
  if (!estApi(url)) return fetchReseau(entree, options);
  await pret;
  const u = new URL(url, location.href);
  const corps = typeof options.body === 'string' && options.body ? JSON.parse(options.body) : undefined;
  const { statut, donnees } = repondre((options.method || 'GET').toUpperCase(), u.pathname.slice(4), Object.fromEntries(u.searchParams), corps);
  return new Response(JSON.stringify(donnees), { status: statut, headers: { 'Content-Type': 'application/json' } });
};

// sendBeacon (journal des erreurs, voix du Mac) : rien à envoyer sur le réseau
const beacon = navigator.sendBeacon?.bind(navigator);
navigator.sendBeacon = (url, donnees) => (estApi(url) ? true : beacon?.(url, donnees));

// La progression est enregistrée quand l'appli passe en arrière-plan (iOS peut la fermer à tout moment)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sauverMaintenant(); });
addEventListener('pagehide', () => sauverMaintenant());

if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => {});
// Demande à iOS de ne pas effacer les données de Roque pour faire de la place
navigator.storage?.persist?.().catch(() => {});

export { pret };
