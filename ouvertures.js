// Petit répertoire d'ouvertures : la coach reconnaît l'ouverture jouée et donne son idée principale.
// Les coups sont en notation anglaise (celle de chess.js), séparés par des espaces.
const OUVERTURES = [
  { coups: 'e4', nom: "l'ouverture du pion roi", idee: 'Le pion prend le centre et libère ta dame et ton fou.' },
  { coups: 'd4', nom: "l'ouverture du pion dame", idee: 'Le pion prend le centre, et il est déjà protégé par ta dame.' },
  { coups: 'c4', nom: "l'ouverture anglaise", idee: 'On contrôle le centre de loin, avec le pion c.' },
  { coups: 'Nf3', nom: "l'ouverture Réti", idee: 'Le cavalier surveille le centre avant d\'y pousser les pions.' },
  { coups: 'e4 e5', nom: 'une partie ouverte', idee: 'Le centre est partagé : sors vite tes pièces.' },
  { coups: 'e4 e5 Nf3 Nc6 Bc4', nom: 'la partie italienne', idee: 'Le fou vise f7, le point faible près du roi noir.' },
  { coups: 'e4 e5 Nf3 Nc6 Bc4 Bc5', nom: 'le giuoco piano', idee: 'Les deux fous visent le roi adverse : pense à roquer vite.' },
  { coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6', nom: 'la défense des deux cavaliers', idee: 'Les Noirs attaquent le pion e4 au lieu de se défendre.' },
  { coups: 'e4 e5 Nf3 Nc6 Bb5', nom: 'la partie espagnole', idee: 'Le fou met la pression sur le cavalier qui défend e5.' },
  { coups: 'e4 e5 Nf3 Nc6 d4', nom: 'la partie écossaise', idee: 'Les Blancs ouvrent tout de suite le centre.' },
  { coups: 'e4 e5 Nf3 Nc6 Nc3 Nf6', nom: 'la partie des quatre cavaliers', idee: 'Développement symétrique et solide : chacun sort ses cavaliers.' },
  { coups: 'e4 e5 Nf3 Nf6', nom: 'la défense russe', idee: 'Les Noirs contre-attaquent le pion e4 au lieu de défendre e5.' },
  { coups: 'e4 e5 Nf3 d6', nom: 'la défense Philidor', idee: 'Une défense solide mais un peu passive du pion e5.' },
  { coups: 'e4 e5 f4', nom: 'le gambit du roi', idee: 'Les Blancs sacrifient un pion pour ouvrir la colonne f : très agressif !' },
  { coups: 'e4 e5 Nc3', nom: 'la partie viennoise', idee: 'Le cavalier soutient une poussée future f4.' },
  { coups: 'e4 e5 Bc4', nom: "l'ouverture du fou", idee: 'Le fou vise tout de suite f7.' },
  { coups: 'e4 e5 Qh5', nom: "l'attaque de la dame", idee: 'Attention au coup du berger : la dame et le fou visent f7 !' },
  { coups: 'e4 c5', nom: 'la défense sicilienne', idee: 'Les Noirs combattent le centre de côté : la partie sera déséquilibrée.' },
  { coups: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', nom: 'la sicilienne Najdorf', idee: 'Le petit coup a6 empêche les pièces blanches de venir en b5.' },
  { coups: 'e4 e6', nom: 'la défense française', idee: 'Les Noirs préparent d5 pour attaquer le centre blanc.' },
  { coups: 'e4 c6', nom: 'la défense Caro-Kann', idee: 'Comme la française, mais le fou c8 pourra sortir.' },
  { coups: 'e4 d5', nom: 'la défense scandinave', idee: 'Les Noirs attaquent e4 tout de suite.' },
  { coups: 'e4 Nf6', nom: 'la défense Alekhine', idee: 'Le cavalier provoque les pions blancs pour mieux les attaquer ensuite.' },
  { coups: 'e4 d6', nom: 'la défense Pirc', idee: 'Les Noirs laissent le centre aux Blancs pour le contre-attaquer plus tard.' },
  { coups: 'e4 g6', nom: 'la défense moderne', idee: 'Le fou ira en g7 surveiller la grande diagonale.' },
  { coups: 'd4 d5', nom: 'une partie fermée', idee: 'Le jeu est plus lent : construis ta position calmement.' },
  { coups: 'd4 d5 c4', nom: 'le gambit dame', idee: 'Le pion c4 attaque d5 : ce n\'est pas un vrai sacrifice, il se récupère facilement.' },
  { coups: 'd4 d5 c4 e6', nom: 'le gambit dame refusé', idee: 'Les Noirs gardent leur pion central bien solide.' },
  { coups: 'd4 d5 c4 dxc4', nom: 'le gambit dame accepté', idee: 'Les Noirs prennent le pion, mais ils le rendront souvent plus tard.' },
  { coups: 'd4 d5 c4 c6', nom: 'la défense slave', idee: 'Une défense très solide du pion d5.' },
  { coups: 'd4 d5 Bf4', nom: 'le système de Londres', idee: 'Un plan simple : fou en f4, pions en e3 et c3, roque rapide.' },
  { coups: 'd4 Nf6 Bf4', nom: 'le système de Londres', idee: 'Un plan simple : fou en f4, pions en e3 et c3, roque rapide.' },
  { coups: 'd4 Nf6', nom: 'une défense indienne', idee: 'Le cavalier contrôle e4 avant de choisir une structure.' },
  { coups: 'd4 Nf6 c4 g6', nom: 'la défense est-indienne', idee: 'Les Noirs laissent le centre puis l\'attaquent avec e5 ou c5.' },
  { coups: 'd4 Nf6 c4 e6 Nc3 Bb4', nom: 'la défense nimzo-indienne', idee: 'Le fou cloue le cavalier c3 pour contrôler e4.' },
  { coups: 'd4 f5', nom: 'la défense hollandaise', idee: 'Les Noirs contrôlent e4 avec un pion : jeu combatif.' },
];

/** Ouverture la plus précise correspondant aux premiers coups joués (liste de coups en notation anglaise). */
export function trouverOuverture(coupsSan) {
  let meilleure = null;
  for (const o of OUVERTURES) {
    const sequence = o.coups.split(' ');
    if (sequence.length > coupsSan.length) continue;
    if (sequence.every((c, i) => coupsSan[i] === c) && (!meilleure || sequence.length > meilleure.longueur)) {
      meilleure = { ...o, longueur: sequence.length };
    }
  }
  return meilleure;
}
