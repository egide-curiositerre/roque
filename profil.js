// Profil actif dans le navigateur (cookie lu aussi par le serveur) et clés de stockage propres à chaque joueur
export function profilActif() {
  return /(?:^|;\s*)roque-profil=([\w-]+)/.exec(document.cookie)?.[1] || 'principal';
}

/** Change de joueur : le cookie est envoyé avec chaque requête, la page repart sur la base de ce joueur. */
export function choisirProfil(id) {
  document.cookie = `roque-profil=${id}; path=/; max-age=315360000; SameSite=Lax`;
  try { sessionStorage.setItem('roque-qui-joue', '1'); } catch { /* sans importance */ }
}

/** Le joueur a-t-il déjà été choisi pendant cette visite ? */
export function joueurChoisi() {
  try { return sessionStorage.getItem('roque-qui-joue') === '1'; } catch { return true; }
}

/** Clé de stockage du navigateur propre au joueur (le profil principal garde les clés d'origine). */
export function cleLocale(nom) {
  const p = profilActif();
  return p === 'principal' ? nom : `${nom}:${p}`;
}
