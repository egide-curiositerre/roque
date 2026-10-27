// Classement Glicko-2 (Glickman, 2012), comme pour les problèmes de Lichess :
// chaque problème est un « adversaire » dont le classement et l'incertitude sont connus.
const ECHELLE = 173.7178;
const TAU = 0.75;
const EPSILON = 0.000001;
export const RD_MIN = 45;
export const RD_MAX = 350;

const g = (phi) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const E = (mu, muj, phij) => 1 / (1 + Math.exp(-g(phij) * (mu - muj)));

/**
 * Met à jour le joueur après un seul résultat.
 * @param {{elo:number, rd:number, vol:number}} joueur
 * @param {{elo:number, rd:number}} adversaire
 * @param {number} score 1 (réussi) ou 0 (raté)
 */
export function mettreAJour(joueur, adversaire, score) {
  const mu = (joueur.elo - 1500) / ECHELLE;
  const phi = joueur.rd / ECHELLE;
  const muj = (adversaire.elo - 1500) / ECHELLE;
  const phij = adversaire.rd / ECHELLE;

  const gj = g(phij);
  const ej = E(mu, muj, phij);
  const v = 1 / (gj * gj * ej * (1 - ej));
  const delta = v * gj * (score - ej);

  // Nouvelle volatilité (algorithme de Illinois)
  const a = Math.log(joueur.vol * joueur.vol);
  const f = (x) => {
    const ex = Math.exp(x);
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * (phi * phi + v + ex) ** 2) - (x - a) / (TAU * TAU);
  };
  let A = a;
  let B;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }
  const vol = Math.exp(A / 2);

  const phiEtoile = Math.sqrt(phi * phi + vol * vol);
  const nouveauPhi = 1 / Math.sqrt(1 / (phiEtoile * phiEtoile) + 1 / v);
  const nouveauMu = mu + nouveauPhi * nouveauPhi * gj * (score - ej);

  return {
    elo: nouveauMu * ECHELLE + 1500,
    rd: Math.min(RD_MAX, Math.max(RD_MIN, nouveauPhi * ECHELLE)),
    vol,
  };
}

// Probabilité de réussir un problème de classement donné (pour choisir des problèmes à ~60-70 %)
export function chanceReussite(joueur, probleme) {
  return E((joueur.elo - 1500) / ECHELLE, (probleme.elo - 1500) / ECHELLE, probleme.rd / ECHELLE);
}

// Sans activité, l'incertitude remonte doucement (un niveau non entraîné devient moins sûr)
export function vieillir(joueur, joursInactifs) {
  if (joursInactifs <= 0) return joueur;
  const phi = joueur.rd / ECHELLE;
  const nouveau = Math.sqrt(phi * phi + joursInactifs * joueur.vol * joueur.vol) * ECHELLE;
  return { ...joueur, rd: Math.min(RD_MAX, nouveau) };
}

// Performance en parties : moyenne des niveaux adverses ajustée par le score (formule « TPR » linéaire)
export function performance(parties) {
  if (!parties.length) return null;
  const moyenne = parties.reduce((s, p) => s + p.niveau_moteur, 0) / parties.length;
  const score = parties.reduce((s, p) => s + p.resultat, 0) / parties.length;
  return Math.round(moyenne + 800 * (score - 0.5));
}
