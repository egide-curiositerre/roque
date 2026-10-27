// Outils communs : appels au serveur, messages, mise en forme

export async function api(chemin, corps) {
  const r = await fetch(`/api${chemin}`, corps === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
  });
  const donnees = await r.json();
  if (!r.ok) throw new Error(donnees.erreur || 'Erreur du serveur');
  return donnees;
}

let minuteurToast;
export function toast(texte) {
  const t = document.getElementById('toast');
  t.textContent = texte;
  t.classList.add('visible');
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove('visible'), 2600);
}

export function echapper(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Mise en forme minimale des textes de leçon : **gras**, listes « - » et « 1. », paragraphes
export function md(texte) {
  return echapper(texte).split(/\n{2,}/).map((bloc) => {
    const lignes = bloc.split('\n');
    const gras = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (lignes.every((l) => /^- /.test(l))) return `<ul>${lignes.map((l) => `<li>${gras(l.slice(2))}</li>`).join('')}</ul>`;
    if (lignes.every((l) => /^\d+\. /.test(l))) return `<ol>${lignes.map((l) => `<li>${gras(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
    return `<p>${gras(lignes.join('<br>'))}</p>`;
  }).join('');
}

export function signe(n) {
  return n > 0 ? `+${n}` : String(n);
}

export function dureeTexte(ms) {
  const min = Math.round(ms / 60000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

export function dateCourte(jour) {
  return new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Notation française des coups : C (cavalier), F (fou), T (tour), D (dame), R (roi)
const LETTRES_FR = { N: 'C', B: 'F', R: 'T', Q: 'D', K: 'R' };
export function sanFr(san) {
  return String(san ?? '').replace(/[NBRQK]/g, (l) => LETTRES_FR[l]);
}
