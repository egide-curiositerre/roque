// Sons synthétisés en direct (aucun fichier audio) : coup, prise, échec, réussite, erreur
let contexte = null;
let actif = true;
try { actif = localStorage.getItem('roque-son') !== 'non'; } catch { /* stockage indisponible : son actif */ }

export function sonActif() { return actif; }
export function basculerSon() {
  actif = !actif;
  try { localStorage.setItem('roque-son', actif ? 'oui' : 'non'); } catch { /* sans importance */ }
  return actif;
}

function ctx() {
  if (!contexte) contexte = new (window.AudioContext || window.webkitAudioContext)();
  if (contexte.state === 'suspended') contexte.resume();
  return contexte;
}

// Petit claquement boisé : bruit filtré très court
function claquement(volume, frequence, duree) {
  const c = ctx();
  const tampon = c.createBuffer(1, Math.floor(c.sampleRate * duree), c.sampleRate);
  const d = tampon.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
  const src = c.createBufferSource();
  src.buffer = tampon;
  const filtre = c.createBiquadFilter();
  filtre.type = 'bandpass';
  filtre.frequency.value = frequence;
  filtre.Q.value = 1.2;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(filtre).connect(gain).connect(c.destination);
  src.start();
}

function note(freq, debut, duree, volume = .12, type = 'sine') {
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + debut;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + .015);
  g.gain.exponentialRampToValueAtTime(.0001, t + duree);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + duree + .05);
}

export const son = {
  coup() { if (actif) claquement(.9, 1800, .06); },
  prise() { if (actif) { claquement(1, 1200, .09); claquement(.6, 2600, .05); } },
  echec() { if (actif) { claquement(.9, 1800, .06); note(880, 0, .18, .06, 'triangle'); } },
  succes() { if (actif) [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * .07, .35, .09)); },
  erreur() { if (actif) { note(196, 0, .28, .1, 'triangle'); note(185, .05, .3, .08, 'triangle'); } },
};

// Confettis autour d'un élément (réussite d'un problème, victoire)
export function confettis(element) {
  if (document.documentElement.classList.contains('sans-animations')) return;   // Paramètres > Thème > Animations
  const couleurs = ['#f6d488', '#e4b04f', '#5fcb98', '#7eacf6', '#f0736f', '#f4efe4'];
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 220;
    c.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    c.style.setProperty('--y', `${Math.sin(angle) * distance - 60}px`);
    c.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    c.style.background = couleurs[i % couleurs.length];
    c.style.animationDelay = `${Math.random() * .08}s`;
    element.appendChild(c);
    setTimeout(() => c.remove(), 1300);
  }
}
