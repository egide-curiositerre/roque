// Parcours d'apprentissage de A à Z.
// Étapes : texte | position (fen + flèches/cases) | sequence (coups joués pas à pas, ou en animation ;
//   notes[i] = explication du coup i : { texte, fleches (idées, vertes), menaces (attaques, rouges), cases }) |
// exercice (le joueur trouve les coups ; solution = coups UCI alternés joueur/réponse ; mat = tout coup qui mate est accepté) |
// reperage (échiquier vide, le joueur touche les cases demandées, dans l'ordre ; orientation 'black' pour le côté Noirs).
// Option de toutes les étapes : sansCoordonnees (lettres et chiffres masqués), orientation.
// Tous les exercices sont vérifiés par les tests (coups légaux, mats réels).

// Ouvertures du répertoire (coups UCI) : utilisées par les animations des leçons ET par les exercices de reproduction
const COUPS_ITALIENNE = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'd7d6', 'e1g1'];
const COUPS_ESPAGNOLE = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f8e7'];
const COUPS_GDR = ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1g5', 'f8e7'];

const COUPS_LONDRES = ['d2d4', 'd7d5', 'c1f4', 'g8f6', 'e2e3', 'e7e6', 'g1f3', 'c7c5', 'c2c3', 'b8c6', 'b1d2', 'f8d6', 'f4g3', 'e8g8', 'f1d3'];
const COUPS_CARO = ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'c8f5', 'e4g3', 'f5g6', 'g1f3', 'b8d7', 'f1d3', 'g6d3', 'd1d3', 'e7e6'];

const COUPS_SICILIENNE = ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6'];
const COUPS_FRANCAISE = ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3', 'g8f6', 'e4e5', 'f6d7', 'f2f4', 'c7c5', 'g1f3', 'b8c6'];
const COUPS_ECOSSAISE = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4', 'e5d4', 'f3d4', 'g8f6', 'd4c6', 'b7c6', 'e4e5', 'd8e7', 'd1e2', 'f6d5', 'c2c4'];
const COUPS_EST_INDIENNE = ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7', 'e2e4', 'd7d6', 'g1f3', 'e8g8', 'f1e2', 'e7e5'];

export const MODULES = [
  { id: 'cases', titre: "Apprendre l'échiquier", description: 'Le nom de chaque case : a6, f3, h7, c5… les yeux fermés' },
  { id: 'bases', titre: 'Les bases', description: 'Les pièces, leurs déplacements et les règles' },
  { id: 'mats', titre: 'Les mats essentiels', description: 'Savoir conclure une partie' },
  { id: 'tactique', titre: 'La tactique', description: 'Les coups qui gagnent du matériel' },
  { id: 'ouvertures', titre: 'Les ouvertures', description: 'Bien commencer une partie' },
  { id: 'finales', titre: 'Les finales', description: 'Transformer un avantage en victoire' },
  { id: 'methode', titre: 'La méthode', description: 'Réfléchir comme un joueur fort' },
];

export const LECONS = [
  // ───────────── Module 0 : apprendre l'échiquier ─────────────
  {
    id: 'colonnes-rangees', module: 'cases', titre: 'Colonnes et rangées',
    resume: 'Les lettres de a à h, les chiffres de 1 à 8.',
    etapes: [
      { type: 'texte', texte: "Chaque case de l'échiquier a un **nom**, comme une adresse.\n\n- Les **colonnes** sont les lignes **verticales**. On les nomme avec une **lettre**, de **a** à **h**, de gauche à droite (vu du côté des Blancs).\n- Les **rangées** sont les lignes **horizontales**. On les nomme avec un **chiffre**, de **1** à **8**, en partant du côté des Blancs." },
      { type: 'position', fen: 'start', texte: "Voici la **colonne a**, tout à gauche, et la **colonne e**, celle des rois. Regarde les lettres en bas de l'échiquier.", fleches: [['a1', 'a8'], ['e1', 'e8']] },
      { type: 'position', fen: 'start', texte: "Voici la **rangée 1**, où commencent les pièces blanches, et la **rangée 4**, au milieu. Regarde les chiffres à gauche de l'échiquier.", fleches: [['a1', 'h1'], ['a4', 'h4']] },
      { type: 'reperage', cases: ['a1', 'h1', 'a8', 'h8'], texte: "À toi : touche les **quatre coins** de l'échiquier, dans l'ordre demandé.", explication: 'Bravo ! **a1** et **h1** sont du côté des Blancs, **a8** et **h8** du côté des Noirs.' },
    ],
  },
  {
    id: 'nom-des-cases', module: 'cases', titre: 'Le nom des cases',
    resume: 'Lire et trouver n\'importe quelle case : e4, a6, f3…',
    etapes: [
      { type: 'texte', texte: "Le nom d'une case, c'est **sa colonne puis sa rangée** : la **lettre d'abord**, le **chiffre ensuite**.\n\n**e4**, c'est la case où se croisent la **colonne e** et la **rangée 4**." },
      { type: 'position', fen: 'start', texte: "Pour trouver **f3** : suis la **colonne f** vers le haut jusqu'à la **rangée 3**. Les deux flèches se rejoignent sur f3.", fleches: [['f1', 'f3'], ['a3', 'f3']], cases: ['f3'] },
      { type: 'position', fen: 'start', texte: "D'autres exemples : **a6**, **h7**, **c5** et **e4**.", cases: ['a6', 'h7', 'c5', 'e4'] },
      { type: 'reperage', cases: ['e4', 'a6', 'f3', 'h7', 'c5'], texte: 'À toi : touche chaque case demandée. Les lettres et les chiffres sont là pour t\'aider.', explication: 'Parfait ! Lettre d\'abord, chiffre ensuite : tu sais lire une case.' },
      { type: 'reperage', cases: ['d4', 'b2', 'g5', 'd7', 'e1', 'c8'], sansCoordonnees: true, texte: 'Plus difficile : **les lettres et les chiffres sont cachés**. Retrouve les cases de tête.', explication: 'Bravo ! Pour t\'entraîner chaque jour, va dans **Entraînement → Nommer la case** et **Trouver la case**.' },
    ],
  },
  {
    id: 'cote-noirs', module: 'cases', titre: "L'échiquier vu des Noirs",
    resume: 'Quand tu as les Noirs, tout est retourné.',
    etapes: [
      { type: 'texte', texte: "Quand tu joues avec les **Noirs**, l'échiquier est **retourné** : la colonne **h** est à gauche et la rangée **8** est en bas, près de toi.\n\nLes cases **gardent leur nom** : **e4** reste e4. C'est seulement ton point de vue qui change." },
      { type: 'position', fen: 'start', orientation: 'black', texte: "Vu des Noirs : ton roi est en **e8**, ta dame en **d8**. La case **a1** est maintenant en **haut à droite**.", cases: ['e8', 'd8', 'a1'] },
      { type: 'reperage', orientation: 'black', cases: ['e4', 'a1', 'h8', 'c6', 'f2', 'd5'], texte: "À toi, côté Noirs : touche chaque case demandée.", explication: 'Bravo ! Tu sais te repérer des deux côtés de l\'échiquier.' },
    ],
  },
  {
    id: 'reperes', module: 'cases', titre: 'Les repères à connaître',
    resume: 'Couleurs, centre et grandes diagonales.',
    etapes: [
      { type: 'texte', texte: "Quelques repères pour ne jamais te perdre :\n\n- **a1 est une case foncée**, **h1 une case claire** : toujours une case claire en bas à droite.\n- Le **centre**, ce sont les cases **d4, e4, d5 et e5**.\n- Les rois commencent sur la **colonne e** (e1, e8), les dames sur la **colonne d** (d1, d8).\n- Les deux **grandes diagonales** vont de **a1 à h8** et de **h1 à a8**." },
      { type: 'position', fen: 'start', texte: 'Le **centre** (en jaune) et les deux **grandes diagonales**.', cases: ['d4', 'e4', 'd5', 'e5'], fleches: [['a1', 'h8'], ['h1', 'a8']] },
      { type: 'reperage', cases: ['d5', 'e4', 'h8', 'a8', 'g2', 'b7', 'f6'], sansCoordonnees: true, texte: 'Sans les lettres ni les chiffres : touche chaque case demandée.', explication: 'Excellent ! Tu as maintenant une carte de l\'échiquier dans la tête.' },
    ],
  },

  // ───────────── Module 1 : les bases ─────────────
  {
    id: 'echiquier', module: 'bases', titre: "L'échiquier et les pièces",
    resume: 'Le terrain de jeu, la position de départ et le but du jeu.',
    etapes: [
      { type: 'texte', texte: "L'échiquier compte **64 cases**, claires et foncées. Les **colonnes** sont nommées de **a** à **h**, les **rangées** de **1** à **8**. Chaque case a donc un nom unique, comme **e4**.\n\nOn place toujours l'échiquier avec une **case claire en bas à droite**." },
      { type: 'position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', texte: "La position de départ. Chaque camp a **8 pions**, **2 tours**, **2 cavaliers**, **2 fous**, **1 dame** et **1 roi**.\n\nLa dame se place sur **sa couleur** : dame blanche sur case claire (d1), dame noire sur case foncée (d8). Les **Blancs commencent** toujours.", cases: ['d1', 'd8', 'e1', 'e8'] },
      { type: 'texte', texte: "**Le but du jeu** : mettre le roi adverse **échec et mat**, c'est-à-dire l'attaquer sans qu'il puisse s'échapper. On ne prend jamais le roi : la partie s'arrête avant." },
    ],
  },
  {
    id: 'pion', module: 'bases', titre: 'Le pion',
    resume: 'Avancer, prendre en diagonale, et le premier double pas.',
    etapes: [
      { type: 'position', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', texte: "Le pion **avance tout droit d'une case**. Depuis sa case de départ, il peut avancer de **deux cases** d'un coup.\n\nIl ne recule **jamais**.", fleches: [['e2', 'e3'], ['e2', 'e4']] },
      { type: 'position', fen: '4k3/8/8/3p1n2/4P3/8/8/4K3 w - - 0 1', texte: "Particularité : le pion **prend en diagonale**, d'une case vers l'avant. Ici, le pion e4 peut prendre en d5 ou en f5. Il ne peut pas prendre une pièce placée juste devant lui.", fleches: [['e4', 'd5'], ['e4', 'f5']] },
      { type: 'exercice', fen: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', texte: 'À toi : prends le pion noir avec ton pion.', solution: ['e4d5'], explication: 'Bravo ! Le pion prend toujours en diagonale.' },
    ],
  },
  {
    id: 'tour-fou-dame', module: 'bases', titre: 'La tour, le fou et la dame',
    resume: 'Les pièces qui se déplacent en ligne.',
    etapes: [
      { type: 'position', fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1', texte: "La **tour** se déplace en ligne droite, **horizontalement ou verticalement**, d'autant de cases qu'elle veut, tant que rien ne la bloque.", fleches: [['d4', 'd8'], ['d4', 'd1'], ['d4', 'a4'], ['d4', 'h4']] },
      { type: 'exercice', fen: '4k3/8/8/8/1r6/8/8/1R2K3 w - - 0 1', texte: 'Prends la tour noire avec ta tour.', solution: ['b1b4'], explication: 'La tour avance sur la colonne b jusqu\'à la pièce adverse.' },
      { type: 'position', fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1', texte: "Le **fou** se déplace **en diagonale**. Il reste donc toute la partie sur des cases de **la même couleur**.", fleches: [['d4', 'h8'], ['d4', 'a7'], ['d4', 'a1'], ['d4', 'g1']] },
      { type: 'exercice', fen: '4k3/8/8/8/8/2n5/8/B3K3 w - - 0 1', texte: 'Prends le cavalier noir avec ton fou.', solution: ['a1c3'], explication: 'Parfait : le fou a suivi la grande diagonale.' },
      { type: 'texte', texte: "La **dame** combine la tour et le fou : elle va en ligne droite **et** en diagonale. C'est la pièce la plus puissante." },
      { type: 'exercice', fen: '4k3/8/8/8/8/8/1q6/Q3K3 w - - 0 1', texte: 'La dame noire est à portée de ta dame. Prends-la !', solution: ['a1b2'], explication: 'Échanger les dames n\'est pas toujours bon, mais gagner la dame adverse gratuitement, si !' },
    ],
  },
  {
    id: 'cavalier', module: 'bases', titre: 'Le cavalier',
    resume: 'La seule pièce qui saute par-dessus les autres.',
    etapes: [
      { type: 'position', fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1', texte: "Le **cavalier** se déplace en **L** : deux cases dans une direction puis une case sur le côté. Il **saute** par-dessus les pièces. Il change de couleur de case à chaque coup.", fleches: [['d4', 'c6'], ['d4', 'e6'], ['d4', 'f5'], ['d4', 'f3'], ['d4', 'e2'], ['d4', 'c2'], ['d4', 'b3'], ['d4', 'b5']] },
      { type: 'exercice', fen: '4k3/8/8/3r4/8/4N3/8/4K3 w - - 0 1', texte: 'Prends la tour noire avec ton cavalier.', solution: ['e3d5'], explication: 'Le cavalier a sauté en L jusqu\'à la tour.' },
    ],
  },
  {
    id: 'roi-echec-mat', module: 'bases', titre: 'Le roi, l\'échec et le mat',
    resume: 'Protéger son roi et mettre l\'autre en danger.',
    etapes: [
      { type: 'position', fen: '4k3/8/8/8/3K4/8/8/8 w - - 0 1', texte: "Le **roi** se déplace d'**une case** dans toutes les directions. Il ne peut jamais aller sur une case attaquée par l'adversaire.", fleches: [['d4', 'd5'], ['d4', 'e5'], ['d4', 'e4'], ['d4', 'e3'], ['d4', 'd3'], ['d4', 'c3'], ['d4', 'c4'], ['d4', 'c5']] },
      { type: 'texte', texte: "Quand un roi est attaqué, il est **en échec**. Il faut alors obligatoirement :\n\n1. **déplacer** le roi,\n2. **prendre** la pièce qui attaque,\n3. ou **s'interposer** entre les deux.\n\nSi aucune de ces solutions n'existe, c'est **échec et mat** : la partie est perdue." },
      { type: 'exercice', fen: '7k/8/6K1/8/8/8/8/Q7 w - - 0 1', texte: 'Fais échec et mat en un coup avec ta dame.', solution: ['a1a8'], mat: true, explication: 'Mat ! La dame contrôle toute la 8e rangée et ton roi couvre les cases g7 et h7.' },
    ],
  },
  {
    id: 'coups-speciaux', module: 'bases', titre: 'Les coups spéciaux',
    resume: 'Le roque, la prise en passant et la promotion.',
    etapes: [
      { type: 'texte', texte: "**Le roque** met le roi à l'abri et active la tour en un seul coup : le roi se déplace de **deux cases** vers la tour, et la tour passe de l'autre côté du roi.\n\nConditions : ni le roi ni la tour n'ont bougé, aucune pièce entre eux, le roi n'est pas en échec et ne traverse pas de case attaquée." },
      { type: 'exercice', fen: 'r3k2r/pppq1ppp/2n1bn2/2bpp3/2BPP3/2N1BN2/PPPQ1PPP/R3K2R w KQkq - 0 1', texte: 'Roque côté roi (petit roque) : déplace ton roi de deux cases vers la droite.', solution: ['e1g1'], explication: 'Le roi est en sécurité en g1 et la tour arrive en f1.' },
      { type: 'texte', texte: "**La prise en passant** : quand un pion avance de deux cases et arrive **à côté** d'un pion adverse, ce dernier peut le prendre **comme s'il n'avait avancé que d'une case**. C'est possible **uniquement au coup suivant**." },
      { type: 'exercice', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', texte: 'Le pion noir vient de jouer d7-d5. Prends-le en passant !', solution: ['e5d6'], explication: 'Ton pion va en d6 et le pion d5 disparaît.' },
      { type: 'texte', texte: "**La promotion** : un pion qui atteint la dernière rangée se transforme en **dame**, tour, fou ou cavalier. On choisit presque toujours la dame." },
      { type: 'exercice', fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1', texte: 'Avance ton pion et fais une nouvelle dame.', solution: ['b7b8q'], explication: 'Une deuxième dame ! Elle donne même échec.' },
    ],
  },
  {
    id: 'nulles', module: 'bases', titre: 'Les parties nulles',
    resume: 'Le pat et les autres façons de faire match nul.',
    etapes: [
      { type: 'position', fen: 'k7/8/1Q6/8/8/8/8/2K5 b - - 0 1', texte: "**Le pat** : c'est aux Noirs de jouer, leur roi **n'est pas en échec**, mais il n'a **aucun coup légal**. La partie est **nulle** !\n\nC'est le piège classique quand on a beaucoup d'avance : toujours laisser une case libre au roi adverse… jusqu'au mat.", cases: ['a8'] },
      { type: 'texte', texte: "Autres parties nulles :\n\n- **Répétition** : la même position revient 3 fois.\n- **Règle des 50 coups** : 50 coups de chaque camp sans prise ni coup de pion.\n- **Matériel insuffisant** : par exemple roi contre roi, ou roi et fou contre roi.\n- **Accord** entre les joueurs." },
    ],
  },
  {
    id: 'valeur-pieces', module: 'bases', titre: 'La valeur des pièces',
    resume: 'Savoir ce qu\'on gagne et ce qu\'on perd dans un échange.',
    etapes: [
      { type: 'texte', texte: "Pour décider d'un échange, on compte en **points** :\n\n- Pion : **1**\n- Cavalier : **3**\n- Fou : **3**\n- Tour : **5**\n- Dame : **9**\n- Roi : inestimable\n\nÉchanger un fou contre une tour, c'est **gagner la qualité** (+2)." },
      { type: 'exercice', fen: '4k3/8/2q1r3/3P4/8/8/8/6K1 w - - 0 1', texte: 'Ton pion peut prendre deux pièces. Laquelle rapporte le plus ?', solution: ['d5c6'], explication: 'La dame vaut 9 points, la tour 5 : on prend la dame.' },
    ],
  },

  // ───────────── Module 2 : les mats essentiels ─────────────
  {
    id: 'mat-couloir', module: 'mats', titre: 'Le mat du couloir',
    resume: 'Le roi enfermé derrière ses propres pions.',
    etapes: [
      { type: 'position', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', texte: "Le roi noir a roqué et ses pions f7, g7, h7 n'ont pas bougé : il n'a **aucune case de fuite**. Une tour ou une dame sur la 8e rangée suffit à mater.", cases: ['g8', 'f7', 'g7', 'h7'] },
      { type: 'exercice', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', texte: 'Mate en un coup.', solution: ['d1d8'], mat: true, explication: 'Mat du couloir ! Pense à faire « respirer » ton roi (h3 ou g3) pour ne pas subir ce mat.' },
      { type: 'exercice', fen: '6k1/5ppp/8/8/8/8/r4PPP/6K1 b - - 0 1', texte: 'Cette fois, tu as les Noirs. Mate les Blancs en un coup.', solution: ['a2a1'], mat: true, explication: 'Même idée de l\'autre côté de l\'échiquier.' },
    ],
    pratique: { theme: 'backRankMate', texte: 'Entraîne-toi sur de vrais mats du couloir' },
  },
  {
    id: 'mat-dame', module: 'mats', titre: 'Mater avec la dame',
    resume: 'Roi et dame contre roi : la technique à connaître.',
    etapes: [
      { type: 'texte', texte: "Avec roi et dame contre roi seul, la victoire est assurée si l'on suit la méthode :\n\n1. Avec la dame, **réduis la zone** du roi adverse en restant à **un saut de cavalier** de lui.\n2. Repousse-le jusqu'au **bord**.\n3. Amène **ton roi** pour soutenir la dame.\n4. Mate, en évitant le **pat** !" },
      { type: 'position', fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', texte: 'Le roi noir est coincé dans le coin et ton roi est proche : il ne reste plus qu\'à mater.', cases: ['a8'] },
      { type: 'exercice', fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', texte: 'Mate en un coup.', solution: ['c1c8'], mat: true, explication: 'Mat ! Attention : Dame c7 aurait été une catastrophe : le roi noir n\'aurait plus eu aucun coup, sans être en échec… pat !' },
    ],
    pratique: { theme: 'mateIn1', texte: 'Des dizaines de mats en un coup' },
  },
  {
    id: 'mat-tour', module: 'mats', titre: 'Mater avec la tour',
    resume: 'Roi et tour contre roi : le mat au bord.',
    etapes: [
      { type: 'texte', texte: "Avec une tour, on **coupe** le roi adverse en le repoussant rangée après rangée. On utilise **l'opposition** : quand les deux rois se font face, l'échec de la tour gagne une rangée." },
      { type: 'exercice', fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', texte: 'Les rois sont face à face : mate en un coup.', solution: ['a1a8'], mat: true, explication: 'Mat ! Ton roi couvre d7, e7 et f7, la tour toute la 8e rangée.' },
    ],
    pratique: { theme: 'mateIn2', texte: 'Entraîne-toi aux mats en deux coups' },
  },
  {
    id: 'mats-celebres', module: 'mats', titre: 'Les mats célèbres',
    resume: 'Le coup du berger et le mat étouffé.',
    etapes: [
      { type: 'sequence', fen: 'start', coups: ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'], texte: "**Le coup du berger** : la dame et le fou visent ensemble le point faible **f7**, défendu seulement par le roi.",
        notes: [
          { texte: 'Pion e4 : il prend le centre et ouvre la route du fou et de la dame.', fleches: [['f1', 'c4'], ['d1', 'h5']] },
          { texte: 'Les Noirs répondent au centre avec e5.' },
          { texte: 'Le fou se place en c4 et vise déjà f7.', menaces: [['c4', 'f7']], cases: ['f7'] },
          { texte: 'Les Noirs développent leur cavalier, sans voir le danger.' },
          { texte: 'La dame sort en h5 : elle vise f7 avec le fou. Deux attaquants, un seul défenseur : le roi.', menaces: [['h5', 'f7'], ['c4', 'f7']], cases: ['f7'] },
          { texte: 'Erreur ! Le cavalier attaque la dame mais ne défend pas f7.', menaces: [['f6', 'h5']], cases: ['f7'] },
          { texte: 'Dame prend f7 : échec et mat ! Le fou protège la dame, le roi ne peut pas la prendre.', fleches: [['c4', 'f7']], cases: ['e8'] },
        ] },
      { type: 'exercice', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', texte: 'Les Noirs ont oublié de défendre f7. Mate !', solution: ['h5f7'], mat: true, explication: 'Pour se défendre : jouer **g6** ou **Dame e7** plutôt que Cavalier f6.' },
      { type: 'position', fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', texte: "**Le mat étouffé** : le roi est entouré de ses propres pièces, et seul le cavalier peut l'atteindre." },
      { type: 'exercice', fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', texte: 'Trouve le mat étouffé.', solution: ['h6f7'], mat: true, explication: 'Le cavalier attaque h8 et rien ne peut le prendre ni s\'interposer.' },
    ],
    pratique: { theme: 'smotheredMate', texte: 'Entraîne-toi au mat étouffé' },
  },

  // ───────────── Module 3 : la tactique ─────────────
  {
    id: 'methode-tactique', module: 'tactique', titre: 'Chercher la tactique : échecs, prises, menaces',
    resume: 'La routine qui fait trouver les bons coups.',
    etapes: [
      { type: 'texte', texte: "Avant chaque coup, regarde dans cet ordre :\n\n1. **Les échecs** : tous ceux que tu peux donner.\n2. **Les prises** : toutes les captures possibles.\n3. **Les menaces** : les coups qui attaquent quelque chose.\n\nPuis fais la même chose **pour l'adversaire**. Cette routine évite la plupart des gaffes." },
      { type: 'exercice', fen: '4k3/8/8/8/6n1/8/4B3/4K3 w - - 0 1', texte: 'Une pièce noire n\'est pas défendue. Prends-la.', solution: ['e2g4'], explication: 'Une pièce « en prise » se ramasse gratuitement : c\'est la tactique la plus fréquente à tous les niveaux.' },
    ],
    pratique: { theme: 'hangingPiece', texte: 'Repère les pièces en prise' },
  },
  {
    id: 'fourchette', module: 'tactique', titre: 'La fourchette',
    resume: 'Attaquer deux pièces à la fois.',
    etapes: [
      { type: 'texte', texte: "Une **fourchette** est une attaque simultanée sur **deux pièces**. L'adversaire ne peut en sauver qu'une. Le cavalier est le roi de la fourchette, mais toutes les pièces (même le pion) peuvent en faire." },
      { type: 'exercice', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', texte: 'Trouve la fourchette du cavalier sur le roi et la tour.', solution: ['b5c7'], explication: 'Échec au roi et attaque sur la tour : au coup suivant, tu prends la tour en a8.' },
    ],
    pratique: { theme: 'fork', texte: 'Entraîne-toi sur de vraies fourchettes' },
  },
  {
    id: 'clouage', module: 'tactique', titre: 'Le clouage',
    resume: 'Immobiliser une pièce devant une plus importante.',
    etapes: [
      { type: 'texte', texte: "Une pièce est **clouée** quand elle ne peut pas bouger sans exposer une pièce plus importante derrière elle. Si c'est le **roi** derrière, la pièce ne peut **pas bouger du tout** (clouage absolu)." },
      { type: 'exercice', fen: '4k3/4n3/8/3b4/8/8/8/3QR1K1 w - - 0 1', texte: 'Le fou d5 n\'est défendu que par le cavalier e7… qui est cloué par ta tour. Profites-en.', solution: ['d1d5'], explication: 'Le cavalier ne peut pas reprendre : il exposerait son roi à la tour e1.' },
    ],
    pratique: { theme: 'pin', texte: 'Entraîne-toi aux clouages' },
  },
  {
    id: 'enfilade', module: 'tactique', titre: "L'enfilade",
    resume: 'Le clouage à l\'envers.',
    etapes: [
      { type: 'texte', texte: "**L'enfilade** attaque une pièce importante qui, en s'écartant, laisse prendre la pièce **derrière** elle. Souvent, on donne échec au roi pour gagner la pièce située derrière." },
      { type: 'exercice', fen: '5B2/8/8/4k3/8/8/7K/r7 w - - 0 1', texte: 'Donne un échec qui gagne la tour noire.', solution: ['f8g7'], explication: 'Le roi doit quitter la diagonale, et ton fou prend la tour a1.' },
    ],
    pratique: { theme: 'skewer', texte: 'Entraîne-toi aux enfilades' },
  },
  {
    id: 'decouverte', module: 'tactique', titre: 'Attaque à la découverte et échec double',
    resume: 'Démasquer une pièce en en déplaçant une autre.',
    etapes: [
      { type: 'texte', texte: "Quand une pièce s'écarte et **démasque** l'attaque d'une autre pièce, on parle d'**attaque à la découverte**. Si la pièce démasquée donne **échec**, la pièce qui bouge peut prendre ce qu'elle veut : l'adversaire doit d'abord parer l'échec." },
      { type: 'exercice', fen: '4k3/7q/8/8/4B3/8/8/4R1K1 w - - 0 1', texte: 'Ton fou cache ta tour. Trouve l\'échec à la découverte qui gagne la dame.', solution: ['e4h7'], explication: 'Le fou prend la dame et la tour e1 donne échec en même temps !' },
    ],
    pratique: { theme: 'discoveredAttack', texte: 'Entraîne-toi aux attaques à la découverte' },
  },
  {
    id: 'deviation-attraction', module: 'tactique', titre: 'Déviation et attraction',
    resume: 'Détourner un défenseur ou attirer une pièce sur une mauvaise case.',
    etapes: [
      { type: 'texte', texte: "**La déviation** force une pièce adverse à quitter son poste de défense, souvent par un sacrifice.\n\n**L'attraction** attire une pièce (souvent le roi) sur une case où elle subira une autre tactique, par exemple une fourchette ou un mat.\n\nCes idées se reconnaissent surtout à force d'en voir : passe directement aux exercices." },
    ],
    pratique: { theme: 'deflection', texte: 'Entraîne-toi aux déviations' },
  },
  {
    id: 'sacrifice', module: 'tactique', titre: 'Le sacrifice',
    resume: 'Donner du matériel pour gagner plus.',
    etapes: [
      { type: 'texte', texte: "Un **sacrifice** offre du matériel pour obtenir davantage : un mat, une pièce plus forte ou une attaque décisive. Calcule toujours **jusqu'au bout** : un sacrifice raté, c'est juste du matériel perdu.\n\nIndice classique : quand le roi adverse est mal protégé, cherche les sacrifices en **h7/h2** ou **f7/f2**." },
    ],
    pratique: { theme: 'sacrifice', texte: 'Entraîne-toi aux sacrifices' },
  },

  // ───────────── Module 4 : les ouvertures ─────────────
  {
    id: 'principes-ouverture', module: 'ouvertures', titre: "Les principes de l'ouverture",
    resume: 'Centre, développement, roque.',
    etapes: [
      { type: 'texte', texte: "Les **trois règles d'or** de l'ouverture :\n\n1. **Occuper le centre** (cases d4, e4, d5, e5) avec les pions.\n2. **Développer** les cavaliers et les fous vers le centre, **avant** la dame.\n3. **Roquer** tôt pour mettre le roi à l'abri.\n\nÀ éviter : jouer plusieurs fois la même pièce, sortir la dame trop tôt, avancer les pions devant son roi." },
      { type: 'position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', texte: 'Les quatre cases centrales : le cœur de la bataille.', cases: ['d4', 'e4', 'd5', 'e5'] },
    ],
  },
  {
    id: 'italienne', module: 'ouvertures', titre: 'Une ouverture avec les Blancs : l\'Italienne',
    resume: 'Simple, naturelle et efficace à tous les niveaux.',
    etapes: [
      { type: 'sequence', fen: 'start', coups: COUPS_ITALIENNE, texte: "**La partie italienne** : pion central, cavalier qui attaque e5, fou visant f7, puis **c3 et d3** pour préparer **d4**, et le roque.",
        notes: [
          { texte: 'Pion e4 : le pion central. Il contrôle d5 et f5, et ouvre la route du fou et de la dame.', fleches: [['e4', 'd5'], ['e4', 'f5']], cases: ['e4'] },
          { texte: 'Les Noirs font pareil avec e5.', fleches: [['e5', 'd4'], ['e5', 'f4']] },
          { texte: 'Le cavalier sort vers le centre et attaque le pion e5.', menaces: [['f3', 'e5']] },
          { texte: 'Les Noirs défendent e5 avec leur cavalier.', fleches: [['c6', 'e5']] },
          { texte: 'Le fou va en c4 et vise f7, le point faible des Noirs : seul le roi le défend.', menaces: [['c4', 'f7']], cases: ['f7'] },
          { texte: 'Les Noirs copient : leur fou vise f2.', menaces: [['c5', 'f2']], cases: ['f2'] },
          { texte: 'Pion c3 : il prépare la poussée d4. Le pion d4 sera soutenu par c3.', fleches: [['c3', 'd4']], cases: ['d4'] },
          { texte: 'Les Noirs développent leur cavalier et attaquent le pion e4.', menaces: [['f6', 'e4']] },
          { texte: 'Pion d3 : il protège e4. Le centre est solide ; d4 viendra au bon moment.', fleches: [['d3', 'e4'], ['d3', 'd4']], cases: ['d4'] },
          { texte: 'Les Noirs renforcent e5 et ouvrent la route de leur fou c8.', fleches: [['d6', 'e5']] },
          { texte: 'Le roque : le roi est à l\'abri en g1 et la tour arrive en f1, prête à jouer.', fleches: [['f1', 'e1']], cases: ['g1', 'f1'] },
        ] },
      { type: 'texte', texte: "Le plan typique ensuite : **Tour e1**, **Cavalier d2–f1–g3**, puis l'attaque sur l'aile roi ou la poussée **d4** au bon moment." },
      { type: 'reproduction', nom: 'la partie italienne', cote: 'white', coups: COUPS_ITALIENNE, texte: "**À toi de jouer !** Tu as les **Blancs** : reproduis **la partie italienne** de mémoire, dans l'ordre. Les Noirs répondent à ta place. Aucun coup n'est montré ; en cas de trou, le bouton **Indice** te montre le coup (il compte comme une aide)." },
    ],
  },
  {
    id: 'reponses-noirs', module: 'ouvertures', titre: 'Répondre avec les Noirs',
    resume: 'Contre 1.e4 et contre 1.d4.',
    etapes: [
      { type: 'sequence', fen: 'start', coups: COUPS_ESPAGNOLE, texte: "Contre **1.e4**, la réponse **1…e5** est la plus classique : on prend sa part du centre et on développe naturellement.",
        notes: [
          { texte: 'Les Blancs prennent le centre avec e4.', cases: ['e4'] },
          { texte: 'Toi, avec les Noirs : e5. Tu prends ta part du centre.', fleches: [['e5', 'd4'], ['e5', 'f4']] },
          { texte: 'Le cavalier blanc attaque e5.', menaces: [['f3', 'e5']] },
          { texte: 'Tu défends e5 en développant ton cavalier.', fleches: [['c6', 'e5']] },
          { texte: 'La partie espagnole : le fou attaque le cavalier qui défend e5.', menaces: [['b5', 'c6']] },
          { texte: 'a6 : tu demandes au fou ce qu\'il veut faire.', menaces: [['a6', 'b5']] },
          { texte: 'Le fou recule en a4 et garde la pression sur c6.', menaces: [['a4', 'c6']] },
          { texte: 'Ton cavalier se développe et attaque e4.', menaces: [['f6', 'e4']] },
          { texte: 'Les Blancs roquent.', cases: ['g1'] },
          { texte: 'Fou e7 : tu prépares ton roque. Position solide, facile à jouer.', fleches: [['e8', 'g8']] },
        ] },
      { type: 'sequence', fen: 'start', coups: COUPS_GDR, texte: "Contre **1.d4**, **1…d5** puis **e6** (gambit dame refusé) donne une position solide et facile à jouer.",
        notes: [
          { texte: 'Les Blancs jouent d4 : le pion central est protégé par la dame.', fleches: [['d1', 'd4']] },
          { texte: 'd5 : tu bloques le pion blanc et prends ta part du centre.', cases: ['d5'] },
          { texte: 'Le gambit dame : c4 attaque ton pion d5.', menaces: [['c4', 'd5']] },
          { texte: 'e6 soutient d5 : le gambit est refusé.', fleches: [['e6', 'd5']] },
          { texte: 'Le cavalier blanc attaque d5 une deuxième fois.', menaces: [['c3', 'd5'], ['c4', 'd5']] },
          { texte: 'Ton cavalier défend d5 à son tour.', fleches: [['f6', 'd5'], ['e6', 'd5']] },
          { texte: 'Le fou cloue ton cavalier f6 devant ta dame.', menaces: [['g5', 'f6']], cases: ['d8'] },
          { texte: 'Fou e7 : le clouage ne gêne plus, et tu prépares le roque.', fleches: [['e7', 'f6']] },
        ] },
      { type: 'reproduction', nom: 'la partie espagnole, avec les Noirs (1.e4 e5)', cote: 'black', coups: COUPS_ESPAGNOLE, texte: "**À toi de jouer !** Tu as les **Noirs** : réponds à **1.e4** avec **la partie espagnole**, de mémoire, dans l'ordre. Les Blancs jouent à ta place." },
      { type: 'reproduction', nom: 'le gambit dame refusé, avec les Noirs (1.d4 d5)', cote: 'black', coups: COUPS_GDR, texte: "**À toi de jouer !** Tu as les **Noirs** : réponds à **1.d4** avec **le gambit dame refusé**, de mémoire, dans l'ordre." },
    ],
  },
  {
    id: 'londres', module: 'ouvertures', titre: 'Une ouverture avec les Blancs : le système de Londres',
    resume: 'Un plan simple contre 1.d4 : mêmes coups, presque quoi que fasse l\'adversaire.',
    etapes: [
      { type: 'sequence', fen: 'start', coups: COUPS_LONDRES, texte: "**Le système de Londres** : on sort le **fou dame avant de fermer sa chaîne de pions** (e3), puis on garde toujours la même structure : **pions d4, e3, c3**, cavaliers f3 et d2, fou en d3, roque.",
        notes: [
          { texte: 'Pion d4 : il prend le centre et il est protégé par la dame.', fleches: [['d1', 'd4']], cases: ['d4'] },
          { texte: 'Les Noirs bloquent avec d5.', cases: ['d5'] },
          { texte: 'Le fou f4 : le coup signature de Londres. Il sort **avant** e3, sinon il serait enfermé derrière ses pions.', fleches: [['f4', 'b8']], cases: ['f4'] },
          { texte: 'Les Noirs développent leur cavalier et contrôlent e4.', fleches: [['f6', 'e4']] },
          { texte: 'Pion e3 : il soutient d4 et libère le fou f1.', fleches: [['e3', 'd4']] },
          { texte: 'e6 : les Noirs ouvrent la route de leur fou f8.', fleches: [['f8', 'a3']] },
          { texte: 'Le cavalier f3 se développe et protège d4.', fleches: [['f3', 'd4']] },
          { texte: 'c5 : les Noirs attaquent le pion d4.', menaces: [['c5', 'd4']] },
          { texte: 'Pion c3 : il protège d4 solidement. Le trio d4–e3–c3 est la structure de Londres.', fleches: [['c3', 'd4']], cases: ['c3', 'd4', 'e3'] },
          { texte: 'Cc6 : encore une pièce qui vise d4.', menaces: [['c6', 'd4']] },
          { texte: 'Le cavalier b1 sort en d2 (et pas en c3, où il gênerait le pion c3).', fleches: [['d2', 'f3']], cases: ['d2'] },
          { texte: 'Fd6 : le fou noir attaque ton fou f4.', menaces: [['d6', 'f4']] },
          { texte: 'Fou g3 : il se met à l\'abri et garde la grande diagonale vers h2. Si les Noirs l\'échangent, tu reprends avec le pion h.', fleches: [['g3', 'd6']] },
          { texte: 'Les Noirs roquent.', cases: ['g8'] },
          { texte: 'Fou d3 : il vise le roi noir. Prochain coup : **roquer**, puis jouer Te1 ou Dc2.', menaces: [['d3', 'h7']], cases: ['h7'] },
        ] },
      { type: 'texte', texte: "**Pourquoi Londres est bon pour apprendre** : le plan reste le même, tu réfléchis moins aux coups d'ouverture et plus à ton milieu de partie. Le point faible : sois attentif au pion **b2**, laissé seul par ta dame." },
      { type: 'reproduction', nom: 'le système de Londres', cote: 'white', coups: COUPS_LONDRES, texte: "**À toi de jouer !** Tu as les **Blancs** : reproduis **le système de Londres** de mémoire, dans l'ordre. Le bouton **Indice** te montre le coup (c'est compté comme une aide)." },
    ],
  },
  {
    id: 'caro-kann', module: 'ouvertures', titre: 'Répondre à 1.e4 avec la Caro-Kann',
    resume: 'Une défense solide : le fou noir sort avant de fermer ses pions.',
    etapes: [
      { type: 'sequence', fen: 'start', coups: COUPS_CARO, texte: "**La défense Caro-Kann** : après **1.e4 c6**, les Noirs préparent **d5**. Contrairement à la française, le **fou c8 sort** avant que les pions ne le bloquent.",
        notes: [
          { texte: 'Les Blancs jouent e4.', cases: ['e4'] },
          { texte: 'c6 : tu prépares d5, et le pion c6 protège ce futur pion.', fleches: [['c6', 'd5']], cases: ['c6'] },
          { texte: 'Les Blancs prennent tout le centre avec d4.', cases: ['d4', 'e4'] },
          { texte: 'd5 : tu attaques le pion e4.', menaces: [['d5', 'e4']] },
          { texte: 'Le cavalier c3 défend e4.', fleches: [['c3', 'e4']] },
          { texte: 'Tu prends le pion e4 : le centre blanc se simplifie.', menaces: [['d5', 'e4']] },
          { texte: 'Les Blancs reprennent avec le cavalier.', cases: ['e4'] },
          { texte: 'Fou f5 : **le coup clé de la Caro-Kann**. Ton fou sort devant tes pions et vise le cavalier e4.', menaces: [['f5', 'e4']], cases: ['f5'] },
          { texte: 'Le cavalier recule en g3 et attaque ton fou.', menaces: [['g3', 'f5']] },
          { texte: 'Fou g6 : il reste actif et protégé. Il n\'est pas enfermé !', fleches: [['g6', 'b1']] },
          { texte: 'Le cavalier f3 se développe.', cases: ['f3'] },
          { texte: 'Cd7 : tu développes ton cavalier sans le mettre en prise, et il prépare Cgf6.', fleches: [['d7', 'f6']] },
          { texte: 'Les Blancs veulent échanger ton beau fou avec Fd3.', menaces: [['d3', 'g6']] },
          { texte: 'Tu échanges : un fou de moins, mais ta structure reste saine.', menaces: [['g6', 'd3']] },
          { texte: 'Les Blancs reprennent avec la dame.', cases: ['d3'] },
          { texte: 'e6 : ta structure est solide. Prochains coups : Cgf6 et le roque.', fleches: [['g8', 'f6']] },
        ] },
      { type: 'texte', texte: "**Pourquoi la Caro-Kann** : pas de piège, pas de faiblesse dans le camp. Le prix à payer : un jeu un peu plus passif, et il faut attendre les erreurs de l'adversaire. Idéale pour un joueur qui veut des parties calmes et claires." },
      { type: 'reproduction', nom: 'la défense Caro-Kann, avec les Noirs (1.e4 c6)', cote: 'black', coups: COUPS_CARO, texte: "**À toi de jouer !** Tu as les **Noirs** : réponds à **1.e4** avec **la Caro-Kann**, de mémoire, dans l'ordre. Les Blancs jouent à ta place." },
    ],
  },
  {
    id: 'sicilienne', module: 'ouvertures', titre: "Répondre à 1.e4 avec la Sicilienne (Najdorf)",
    resume: "La défense la plus combative : tu échanges ton pion c contre un pion central.",
    etapes: [
      { type: 'sequence', fen: 'start', coups: COUPS_SICILIENNE, texte: "**La défense sicilienne** : après **1.e4 c5**, les Noirs ne copient pas les Blancs. Ils échangent leur pion c contre le pion d blanc : les Blancs ont un pion central de moins, les Noirs une colonne c ouverte. La variante **Najdorf** (…a6) est l'une des plus jouées au monde.",
        notes: [
          { texte: "Les Blancs jouent e4.", cases: ['e4'] },
          { texte: "c5 : ton pion attaque la case d4 par le côté, sans bloquer ton pion e.", fleches: [['c5', 'd4']], cases: ['c5'] },
          { texte: "Le cavalier f3 prépare la poussée d4.", fleches: [['f3', 'd4']] },
          { texte: "d6 : tu contrôles e5 et tu ouvres la route de ton fou c8.", fleches: [['d6', 'e5']] },
          { texte: "Les Blancs poussent d4 pour ouvrir le centre.", cases: ['d4'] },
          { texte: "Tu prends le pion d4 : ton pion de l'aile est échangé contre un pion central. C'est toute l'idée de la Sicilienne.", menaces: [['c5', 'd4']] },
          { texte: "Les Blancs reprennent avec le cavalier, maintenant très actif au centre.", cases: ['d4'] },
          { texte: "Cf6 : tu attaques le pion e4.", menaces: [['f6', 'e4']] },
          { texte: "Le cavalier c3 défend e4.", fleches: [['c3', 'e4']] },
          { texte: "a6 : **le coup de la Najdorf**. Il empêche les pièces blanches de venir en b5 et prépare b5 ou e5.", fleches: [['a6', 'b5']], cases: ['a6'] },
        ] },
      { type: 'texte', texte: "**Pourquoi la Sicilienne** : elle donne des parties déséquilibrées où les Noirs jouent pour gagner (contre-attaque sur l'aile dame, colonne c ouverte). Le prix à payer : il y a beaucoup de théorie, et les Blancs attaquent souvent le roi. Retiens d'abord ces premiers coups, le reste viendra avec la pratique." },
      { type: 'reproduction', nom: "la sicilienne Najdorf, avec les Noirs (1.e4 c5)", cote: 'black', coups: COUPS_SICILIENNE, texte: "**À toi de jouer !** Tu as les **Noirs** : réponds à **1.e4** avec **la sicilienne Najdorf**, de mémoire, dans l'ordre. Les Blancs jouent à ta place." },
    ],
  },
  {
    id: 'francaise', module: 'ouvertures', titre: "Répondre à 1.e4 avec la défense française",
    resume: "Solide : tu attaques la base de la chaîne de pions blanche.",
    etapes: [
      { type: 'sequence', fen: 'start', coups: COUPS_FRANCAISE, texte: "**La défense française** : après **1.e4 e6**, les Noirs préparent **d5** pour attaquer le centre. Quand les Blancs avancent e5, la partie devient **fermée** : les Noirs attaquent la **base de la chaîne de pions** blanche (d4) avec c5.",
        notes: [
          { texte: "Les Blancs jouent e4.", cases: ['e4'] },
          { texte: "e6 : tu prépares d5, et le pion e6 protégera ce futur pion.", fleches: [['e6', 'd5']], cases: ['e6'] },
          { texte: "Les Blancs prennent le centre avec d4.", cases: ['d4', 'e4'] },
          { texte: "d5 : tu attaques le pion e4.", menaces: [['d5', 'e4']] },
          { texte: "Le cavalier c3 défend e4.", fleches: [['c3', 'e4']] },
          { texte: "Cf6 : tu attaques e4 une deuxième fois.", menaces: [['f6', 'e4']] },
          { texte: "Les Blancs avancent e5 : le pion chasse ton cavalier et ferme le centre.", menaces: [['e5', 'f6']] },
          { texte: "Le cavalier recule en d7. Il reviendra attaquer le pion e5.", fleches: [['d7', 'e5']] },
          { texte: "Les Blancs soutiennent e5 avec le pion f4.", fleches: [['f4', 'e5']] },
          { texte: "c5 : **l'idée clé de la française**. Tu attaques d4, la base de la chaîne de pions blanche. Si d4 tombe, e5 devient faible.", menaces: [['c5', 'd4']], cases: ['d4'] },
          { texte: "Le cavalier f3 protège d4.", fleches: [['f3', 'd4']] },
          { texte: "Cc6 : une deuxième pièce attaque d4. Plan suivant : Db6, Fe7 et le roque.", menaces: [['c6', 'd4']] },
        ] },
      { type: 'texte', texte: "**Pourquoi la française** : une structure claire et un plan facile à retenir (attaquer d4 avec c5, puis f6 contre e5). Son point faible : le fou c8, enfermé derrière e6, sort tard : pense à l'activer (par exemple en d7 ou via b6 et a6)." },
      { type: 'reproduction', nom: "la défense française, avec les Noirs (1.e4 e6)", cote: 'black', coups: COUPS_FRANCAISE, texte: "**À toi de jouer !** Tu as les **Noirs** : réponds à **1.e4** avec **la défense française**, de mémoire, dans l'ordre. Les Blancs jouent à ta place." },
    ],
  },
  {
    id: 'ecossaise', module: 'ouvertures', titre: "Une ouverture avec les Blancs : la partie écossaise",
    resume: "Tu ouvres le centre tout de suite : jeu direct et actif.",
    etapes: [
      { type: 'sequence', fen: 'start', coups: COUPS_ECOSSAISE, texte: "**La partie écossaise** : après **1.e4 e5 2.Cf3 Cc6**, les Blancs jouent **3.d4** sans attendre. Le centre s'ouvre immédiatement, les pièces blanches sont actives, et les Noirs ont des pions abîmés dans cette variante.",
        notes: [
          { texte: "Pion e4 : le pion central.", cases: ['e4'] },
          { texte: "Les Noirs font pareil avec e5.", fleches: [['e5', 'd4'], ['e5', 'f4']] },
          { texte: "Le cavalier sort et attaque e5.", menaces: [['f3', 'e5']] },
          { texte: "Les Noirs défendent e5 avec leur cavalier.", fleches: [['c6', 'e5']] },
          { texte: "**d4** : le coup de l'écossaise. Tu attaques e5 avec un pion et ouvres le centre.", menaces: [['d4', 'e5']], cases: ['d4'] },
          { texte: "Les Noirs prennent le pion d4.", menaces: [['e5', 'd4']] },
          { texte: "Tu reprends avec le cavalier, très bien placé au centre.", cases: ['d4'] },
          { texte: "Cf6 : les Noirs attaquent e4.", menaces: [['f6', 'e4']] },
          { texte: "Cxc6 : tu échanges ton cavalier contre le leur pour abîmer la structure de pions noire.", menaces: [['d4', 'c6']] },
          { texte: "Les Noirs reprennent avec le pion b : ils ont maintenant des pions doublés en c.", cases: ['c6', 'c7'] },
          { texte: "e5 : le pion attaque le cavalier f6 et gagne du temps.", menaces: [['e5', 'f6']] },
          { texte: "La dame noire attaque e5 et protège le cavalier f6.", menaces: [['e7', 'e5']] },
          { texte: "De2 défend le pion e5.", fleches: [['e2', 'e5']] },
          { texte: "Le cavalier va en d5, au centre.", cases: ['d5'] },
          { texte: "c4 : le pion chasse le cavalier d5. Les Blancs ont une position très active.", menaces: [['c4', 'd5']] },
        ] },
      { type: 'texte', texte: "**Pourquoi l'écossaise** : elle évite les longues manœuvres de l'espagnole. Tu ouvres vite le jeu, tu développes naturellement, et tes pièces ont beaucoup d'espace. Pense toujours à **roquer** rapidement après avoir ouvert le centre." },
      { type: 'reproduction', nom: "la partie écossaise, avec les Blancs", cote: 'white', coups: COUPS_ECOSSAISE, texte: "**À toi de jouer !** Tu as les **Blancs** : reproduis **la partie écossaise** de mémoire, dans l'ordre. Le bouton **Indice** te montre le coup (c'est compté comme une aide)." },
    ],
  },
  {
    id: 'est-indienne', module: 'ouvertures', titre: "Répondre à 1.d4 avec la défense est-indienne",
    resume: "Tu laisses le centre aux Blancs pour l'attaquer ensuite.",
    etapes: [
      { type: 'sequence', fen: 'start', coups: COUPS_EST_INDIENNE, texte: "**La défense est-indienne** : contre **1.d4**, les Noirs laissent les Blancs bâtir un grand centre (pions c4, d4, e4), développent leur fou en **g7** et roquent. Puis ils attaquent ce centre avec **e5** ou **c5** : c'est une stratégie « hypermoderne ».",
        notes: [
          { texte: "Les Blancs jouent d4.", cases: ['d4'] },
          { texte: "Cf6 : tu contrôles e4 et tu gardes toutes les options ouvertes.", fleches: [['f6', 'e4']] },
          { texte: "Les Blancs ajoutent c4 : ils veulent beaucoup d'espace.", cases: ['c4'] },
          { texte: "g6 : tu prépares de placer ton fou en g7.", fleches: [['f8', 'g7']], cases: ['g6'] },
          { texte: "Le cavalier c3 se développe.", fleches: [['c3', 'e4']] },
          { texte: "Fg7 : le fou surveille la grande diagonale, jusqu'à la case a1.", fleches: [['g7', 'a1']] },
          { texte: "Les Blancs ont trois pions au centre : c4, d4 et e4. Tu les laisses faire : ils deviendront une cible.", cases: ['c4', 'd4', 'e4'] },
          { texte: "d6 : tu contrôles e5 et tu prépares le roque.", fleches: [['d6', 'e5']] },
          { texte: "Le cavalier f3 se développe.", cases: ['f3'] },
          { texte: "Tu roques : roi à l'abri en g8, tour en f8.", fleches: [['h8', 'f8']], cases: ['g8'] },
          { texte: "Le fou e2 prépare le roque blanc.", cases: ['e2'] },
          { texte: "e5 : tu attaques le centre blanc au bon moment. Si les Blancs prennent en d4, tu pourras reprendre avec le cavalier.", menaces: [['e5', 'd4']] },
        ] },
      { type: 'texte', texte: "**Pourquoi l'est-indienne** : le plan est simple (fou en g7, roque, puis e5 ou c5). Le fou g7 devient très puissant quand le centre s'ouvre. Attention : elle demande de la patience, car tes adversaires auront plus d'espace au début." },
      { type: 'reproduction', nom: "la défense est-indienne, avec les Noirs (1.d4 Cf6)", cote: 'black', coups: COUPS_EST_INDIENNE, texte: "**À toi de jouer !** Tu as les **Noirs** : réponds à **1.d4** avec **la défense est-indienne**, de mémoire, dans l'ordre. Les Blancs jouent à ta place." },
    ],
  },
  {
    id: 'pieges-ouverture', module: 'ouvertures', titre: "Pièges d'ouverture à connaître",
    resume: 'Pour ne pas perdre en dix coups.',
    etapes: [
      { type: 'sequence', fen: 'start', coups: ['f2f3', 'e7e5', 'g2g4', 'd8h4'], texte: "**Le mat du fou** : le mat le plus rapide possible, en 2 coups. Les pions f et g ont ouvert la diagonale du roi. Leçon : ne jamais affaiblir son roi sans raison.",
        notes: [
          { texte: 'f3 : mauvais coup. Il ne prend pas le centre et ouvre la diagonale de son roi.', cases: ['e1', 'f2', 'g3', 'h4'] },
          { texte: 'e5 : les Noirs ouvrent la route de leur dame vers h4.', fleches: [['d8', 'h4']] },
          { texte: 'g4 : deuxième erreur ! La diagonale du roi blanc est grande ouverte.', fleches: [['d8', 'h4']], cases: ['e1'] },
          { texte: 'Dame h4 : échec et mat ! Rien ne peut s\'interposer ni prendre la dame.', menaces: [['h4', 'e1']], cases: ['e1'] },
        ] },
      { type: 'sequence', fen: 'start', coups: ['e2e4', 'e7e5', 'g1f3', 'd7d6', 'f1c4', 'c8g4', 'b1c3', 'g7g6', 'f3e5', 'g4d1', 'c4f7', 'e8e7', 'c3d5'], texte: "**Le mat de Légal** : les Blancs sacrifient la dame ; si les Noirs la prennent, les pièces mineures matent. Leçon : un clouage peut être un piège.",
        notes: [
          { texte: 'Pion e4, au centre.' },
          { texte: 'Les Noirs répondent e5.' },
          { texte: 'Le cavalier attaque e5.', menaces: [['f3', 'e5']] },
          { texte: 'd6 : les Noirs protègent e5 avec un pion.', fleches: [['d6', 'e5']] },
          { texte: 'Le fou vise f7.', menaces: [['c4', 'f7']], cases: ['f7'] },
          { texte: 'Le fou noir cloue le cavalier f3 devant la dame blanche.', menaces: [['g4', 'f3']], cases: ['d1'] },
          { texte: 'Les Blancs développent leur autre cavalier.', fleches: [['c3', 'd5']] },
          { texte: 'g6 : coup lent. Les Noirs ne voient pas le piège.' },
          { texte: 'Le piège ! Le cavalier « cloué » prend e5 quand même : la dame blanche est offerte.', menaces: [['e5', 'f7'], ['g4', 'd1']], cases: ['d1'] },
          { texte: 'Les Noirs prennent la dame… c\'est l\'erreur fatale.', menaces: [['c4', 'f7']] },
          { texte: 'Fou prend f7 : échec ! Le roi n\'a qu\'une case.', menaces: [['f7', 'e8']], cases: ['e7'] },
          { texte: 'Le roi va en e7, sa seule case.' },
          { texte: 'Cavalier d5 : échec et mat ! Trois pièces mineures battent la dame.', menaces: [['d5', 'e7']], cases: ['e7'] },
        ] },
    ],
  },

  // ───────────── Module 5 : les finales ─────────────
  {
    id: 'regle-carre', module: 'finales', titre: 'La règle du carré',
    resume: 'Savoir en un coup d\'œil si un pion peut être rattrapé.',
    etapes: [
      { type: 'texte', texte: "Trace un **carré** depuis le pion jusqu'à sa case de promotion. Si le roi adverse peut **entrer dans ce carré** à son tour de jouer, il rattrape le pion. Sinon, le pion va à dame tout seul." },
      { type: 'exercice', fen: '8/8/8/P7/8/8/5k2/7K w - - 0 1', texte: 'Le roi noir est hors du carré du pion. Fonce !', solution: ['a5a6'], explication: 'Le carré du pion est maintenant a6-c8 : le roi noir est bien trop loin.' },
    ],
    pratique: { theme: 'pawnEndgame', texte: 'Entraîne-toi aux finales de pions' },
  },
  {
    id: 'opposition', module: 'finales', titre: "L'opposition",
    resume: 'La clé des finales de rois et pions.',
    etapes: [
      { type: 'texte', texte: "Deux rois sont en **opposition** quand ils se font face avec **une case entre eux**. Celui qui **n'a pas le trait** (l'autre doit jouer) a l'opposition : l'adversaire doit céder le passage.\n\nEn finale roi et pion contre roi, le camp fort cherche à placer son roi **devant** son pion, avec l'opposition." },
      { type: 'position', fen: '4k3/8/4K3/4P3/8/8/8/8 b - - 0 1', texte: "Les Blancs ont l'opposition (c'est aux Noirs de jouer). Le roi noir doit s'écarter et le roi blanc avancera : **gagné** pour les Blancs. Même trait aux Blancs, c'est gagné car le roi est déjà sur la 6e rangée devant le pion." },
    ],
  },
  {
    id: 'finales-tours', module: 'finales', titre: 'Les finales de tours',
    resume: 'Les plus fréquentes : Lucena et Philidor.',
    etapes: [
      { type: 'position', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', texte: "**La position de Lucena** (pour gagner) : le roi blanc est caché devant son pion. La méthode : couper le roi noir, puis **construire un pont** avec la tour sur la 4e rangée pour se protéger des échecs." },
      { type: 'texte', texte: "**La position de Philidor** (pour annuler) : le défenseur garde sa tour sur la **3e rangée** (6e pour les Noirs) tant que le pion n'avance pas, puis va donner des échecs **par derrière** dès que le pion avance.\n\nRègle d'or : **les tours se placent derrière les pions passés**." },
    ],
    pratique: { theme: 'rookEndgame', texte: 'Entraîne-toi aux finales de tours' },
  },
  {
    id: 'zugzwang', module: 'finales', titre: 'Le zugzwang',
    resume: 'Quand devoir jouer est un désavantage.',
    etapes: [
      { type: 'texte', texte: "**Zugzwang** (mot allemand) : une position où le camp qui doit jouer **aggrave sa situation**, quel que soit son coup. On le rencontre surtout en finale, où chaque coup de roi compte." },
    ],
    pratique: { theme: 'zugzwang', texte: 'Entraîne-toi au zugzwang' },
  },

  // ───────────── Module 6 : la méthode ─────────────
  {
    id: 'plan-strategie', module: 'methode', titre: 'Faire un plan',
    resume: 'Que jouer quand il n\'y a pas de tactique ?',
    etapes: [
      { type: 'texte', texte: "Quand aucune tactique n'apparaît, améliore ta **pire pièce**. Quelques repères :\n\n- Les **tours** vont sur les **colonnes ouvertes** (sans pions).\n- Les **cavaliers** aiment les **avant-postes** : une case protégée par un pion qu'aucun pion adverse ne peut chasser.\n- Les **fous** veulent des **diagonales ouvertes**.\n- Attaque du côté où tu as **plus d'espace**.\n- Repère les **faiblesses** adverses : pions isolés, doublés, arriérés." },
    ],
  },
  {
    id: 'progresser', module: 'methode', titre: 'Comment progresser vraiment',
    resume: 'La méthode utilisée par les joueurs qui progressent vite.',
    etapes: [
      { type: 'texte', texte: "1. **Des problèmes tous les jours** : 20 minutes valent mieux que 3 heures le dimanche. La tactique décide de la plupart des parties jusqu'à 1800.\n2. **Jouer des parties assez lentes** (15 minutes ou plus) pour avoir le temps d'appliquer « échecs, prises, menaces ».\n3. **Analyser chaque défaite** : trouve le moment où tout a basculé. L'analyse automatique de Roque te montre tes gaffes.\n4. **Revoir ses erreurs** : les problèmes ratés reviennent en révision jusqu'à ce qu'ils soient acquis.\n5. **Apprendre les finales de base** : elles servent toute la vie.\n\nSuis ton **plan du jour** : il applique exactement cette méthode." },
    ],
  },
];

// Répertoire d'ouvertures : toutes les étapes « reproduction », rattachées à leur leçon.
// Une ouverture n'est proposée en révision que si sa leçon est terminée.
export const REPERTOIRE = LECONS.flatMap((l) => l.etapes.filter((e) => e.type === 'reproduction')
  .map((e, n) => ({ id: `${l.id}-${n}`, lecon: l.id, nom: e.nom, cote: e.cote, coups: e.coups })));
