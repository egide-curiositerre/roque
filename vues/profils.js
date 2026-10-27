// « Qui joue ? » : choisir son profil, en créer un, le renommer ou le supprimer
import { api, echapper, toast } from '../outils.js';
import { ICONES } from '../icones.js';
import { choisirProfil } from '../profil.js';
import { parler } from '../voix.js';

const supprimerProfil = (id) => fetch(`/api/profils/${id}`, { method: 'DELETE' }).then(async (r) => {
  const corps = await r.json();
  if (!r.ok) throw new Error(corps.erreur || 'Suppression impossible');
  return corps;
});

export async function vueProfils(main) {
  const { profils, actif, avatars, couleurs } = await api('/profils');
  let edition = null;   // profil en cours de modification (null = création)

  function afficher() {
    main.innerHTML = `
      <div class="qui-joue">
        <div class="surtitre" style="text-align:center">Roque</div>
        <h1 style="text-align:center">Qui joue ?</h1>
        <p class="doux" style="text-align:center;margin-bottom:28px">Chaque joueur a sa propre progression : classement, problèmes, parties et leçons.</p>
        <div class="grille-profils">
          ${profils.map((p) => `
            <div class="carte-profil ${p.id === actif ? 'actif' : ''}">
              <button class="choisir" data-choisir="${p.id}">
                <span class="avatar-profil grand" style="background:${p.couleur}">${p.avatar}</span>
                <strong>${echapper(p.nom)}</strong>
                <span class="doux petit-texte">${p.configure ? `${p.elo} · ${echapper(p.niveau)}` : 'Nouveau joueur'}${p.serie > 1 ? ` · 🔥 ${p.serie}` : ''}</span>
                ${p.id === actif ? '<span class="badge vert">En train de jouer</span>' : ''}
              </button>
              <div class="actions-profil">
                <button data-modifier="${p.id}" title="Modifier">Modifier</button>
                ${profils.length > 1 && p.id !== actif ? `<button data-supprimer="${p.id}" title="Supprimer">Supprimer</button>` : ''}
              </div>
            </div>`).join('')}
          <button class="carte-profil ajouter" id="ajouter">
            <span class="avatar-profil grand plus">+</span>
            <strong>Ajouter un joueur</strong>
            <span class="doux petit-texte">Pour un ami, un enfant…</span>
          </button>
        </div>
        <div class="carte formulaire-profil" id="formulaire" hidden></div>
      </div>`;
  }

  function formulaire(p) {
    edition = p;
    const f = main.querySelector('#formulaire');
    f.hidden = false;
    let avatar = p?.avatar || avatars[(profils.length) % avatars.length];
    let couleur = p?.couleur || couleurs[profils.length % couleurs.length];
    f.innerHTML = `
      <h2>${p ? `Modifier ${echapper(p.nom)}` : 'Nouveau joueur'}</h2>
      <label class="doux petit-texte" for="nom-profil">Prénom ou pseudo</label>
      <input id="nom-profil" class="champ" maxlength="24" value="${echapper(p?.nom || '')}" placeholder="Par exemple : Yanis" autocomplete="off">
      <div class="doux petit-texte" style="margin-top:14px">Avatar</div>
      <div class="choix-avatar">${avatars.map((a) => `<button data-avatar="${a}" class="${a === avatar ? 'actif' : ''}">${a}</button>`).join('')}</div>
      <div class="doux petit-texte" style="margin-top:14px">Couleur</div>
      <div class="choix-couleur">${couleurs.map((c) => `<button data-couleur="${c}" class="${c === couleur ? 'actif' : ''}" style="background:${c}"></button>`).join('')}</div>
      <div class="boutons" style="margin-top:18px">
        <button class="bouton" id="valider">${p ? 'Enregistrer' : 'Créer et jouer'}</button>
        <button class="bouton secondaire" id="fermer">Annuler</button>
      </div>`;
    f.querySelector('.choix-avatar').onclick = (e) => {
      const b = e.target.closest('[data-avatar]');
      if (!b) return;
      avatar = b.dataset.avatar;
      f.querySelectorAll('[data-avatar]').forEach((x) => x.classList.toggle('actif', x === b));
    };
    f.querySelector('.choix-couleur').onclick = (e) => {
      const b = e.target.closest('[data-couleur]');
      if (!b) return;
      couleur = b.dataset.couleur;
      f.querySelectorAll('[data-couleur]').forEach((x) => x.classList.toggle('actif', x === b));
    };
    f.querySelector('#fermer').onclick = () => { f.hidden = true; };
    const valider = async () => {
      const nom = f.querySelector('#nom-profil').value;
      try {
        if (edition) {
          await api(`/profils/${edition.id}`, { nom, avatar, couleur });
          toast('Profil enregistré ✓');
          vueProfils(main);
        } else {
          const nouveau = await api('/profils', { nom, avatar, couleur });
          choisirProfil(nouveau.id);
          location.hash = '#/';
          location.reload();
        }
      } catch (e) {
        toast(e.message);
      }
    };
    f.querySelector('#valider').onclick = valider;
    f.querySelector('#nom-profil').onkeydown = (e) => { if (e.key === 'Enter') valider(); };
    f.querySelector('#nom-profil').focus();
    f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  afficher();
  main.querySelector('.qui-joue').addEventListener('click', async (e) => {
    const choisir = e.target.closest('[data-choisir]');
    if (choisir) {
      const p = profils.find((x) => x.id === choisir.dataset.choisir);
      choisirProfil(p.id);
      if (p.id === actif) {
        if (location.hash === '#/' || !location.hash) dispatchEvent(new HashChangeEvent('hashchange'));
        else location.hash = '#/';
        return;
      }
      location.hash = '#/';
      location.reload();
      return;
    }
    if (e.target.closest('#ajouter')) { formulaire(null); return; }
    const modifier = e.target.closest('[data-modifier]');
    if (modifier) { formulaire(profils.find((x) => x.id === modifier.dataset.modifier)); return; }
    const supprimer = e.target.closest('[data-supprimer]');
    if (supprimer) {
      const p = profils.find((x) => x.id === supprimer.dataset.supprimer);
      if (supprimer.dataset.confirme !== '1') {
        supprimer.dataset.confirme = '1';
        supprimer.textContent = 'Confirmer ?';
        supprimer.classList.add('danger');
        return;
      }
      try {
        await supprimerProfil(p.id);
        toast(`Profil ${p.nom} supprimé`);
        vueProfils(main);
      } catch (err) {
        toast(err.message);
      }
    }
  });

  if (profils.length > 1) parler('Qui joue ?');
}
