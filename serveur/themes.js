// Noms français des thèmes Lichess et liste des thèmes travaillés dans le plan d'entraînement
export const NOMS_THEMES = {
  mateIn1: 'Mat en 1', mateIn2: 'Mat en 2', mateIn3: 'Mat en 3', mateIn4: 'Mat en 4', mateIn5: 'Mat en 5 et +',
  mate: 'Mat', fork: 'Fourchette', pin: 'Clouage', skewer: 'Enfilade', discoveredAttack: 'Attaque à la découverte',
  discoveredCheck: 'Échec à la découverte', doubleCheck: 'Échec double', hangingPiece: 'Pièce en prise',
  trappedPiece: 'Pièce piégée', sacrifice: 'Sacrifice', deflection: 'Déviation', attraction: 'Attraction',
  clearance: 'Dégagement', interference: 'Interception', intermezzo: 'Coup intermédiaire', xRayAttack: 'Attaque rayons X',
  capturingDefender: 'Élimination du défenseur', quietMove: 'Coup tranquille', defensiveMove: 'Coup défensif',
  zugzwang: 'Zugzwang', backRankMate: 'Mat du couloir', smotheredMate: 'Mat étouffé', arabianMate: 'Mat arabe',
  anastasiaMate: "Mat d'Anastasia", bodenMate: 'Mat de Boden', doubleBishopMate: 'Mat des deux fous',
  dovetailMate: 'Mat en queue d\'aronde', hookMate: 'Mat du crochet', operaMate: "Mat de l'Opéra",
  pillsburysMate: 'Mat de Pillsbury', epauletteMate: 'Mat des épaulettes', killBoxMate: 'Mat de la boîte',
  cornerMate: 'Mat du coin', morphysMate: 'Mat de Morphy', triangleMate: 'Mat du triangle',
  swallowstailMate: "Mat de l'hirondelle", vukovicMate: 'Mat de Vukovic', balestraMate: 'Mat de Balestra',
  blindSwineMate: 'Mat des cochons aveugles',
  advancedPawn: 'Pion avancé', promotion: 'Promotion', underPromotion: 'Sous-promotion', enPassant: 'Prise en passant',
  castling: 'Roque', kingsideAttack: 'Attaque côté roi', queensideAttack: 'Attaque côté dame',
  exposedKing: 'Roi exposé', attackingF2F7: 'Attaque sur f2/f7',
  pawnEndgame: 'Finale de pions', rookEndgame: 'Finale de tours', bishopEndgame: 'Finale de fous',
  knightEndgame: 'Finale de cavaliers', queenEndgame: 'Finale de dames', queenRookEndgame: 'Finale dame et tour',
  opening: 'Ouverture', middlegame: 'Milieu de partie', endgame: 'Finale',
  oneMove: 'Un coup', short: 'Court', long: 'Long', veryLong: 'Très long',
  crushing: 'Gain décisif', advantage: 'Avantage', equality: 'Égalisation',
  master: 'Partie de maître', masterVsMaster: 'Maître contre maître', superGM: 'Super grand maître',
  collinearMove: 'Coup colinéaire',
};

// Thèmes « compétences » : ceux qui décrivent une idée à apprendre (pas la durée ni la phase de jeu)
export const THEMES_TRAVAIL = [
  'mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'hangingPiece',
  'trappedPiece', 'sacrifice', 'deflection', 'attraction', 'clearance', 'intermezzo', 'capturingDefender',
  'quietMove', 'defensiveMove', 'backRankMate', 'smotheredMate', 'advancedPawn', 'promotion', 'zugzwang',
  'exposedKing', 'kingsideAttack', 'pawnEndgame', 'rookEndgame', 'interference', 'xRayAttack', 'attackingF2F7',
];

export function nomTheme(t) {
  return NOMS_THEMES[t] || t;
}
