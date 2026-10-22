/* Fiches clients LG Piscines : MÊME outil sur le PC, la tablette de la camionnette et le téléphone.
   Les fiches sont rangées en ligne (Supabase, une ligne « client-<id> » par client, visible seulement par le compte de Lucas) :
   une modification faite sur un appareil apparaît sur les autres à leur prochain chargement.
   La page hôte fournit le « transport » : lister(), enregistrer(fiche), appeler(fiche), et facultativement extras(fiche) et appareil.
   Fichier source : Documents/lg-camionnette/outils/fiches-clients.js (copié tel quel sur le PC et le téléphone). */
window.FichesClients = (() => {
  "use strict";
  let T = null, fiches = [], courante = null, recherche = "", mode = "liste", pret = false;
  const $f = s => document.getElementById(s);
  const echapF = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norme = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const VIDES = new Set(["hivernage", "entretien", "piscine", "remise", "route", "controle", "technique", "volet", "bache", "nouveau", "client", "rendez",
    "depannage", "placement", "devis", "visite", "analyse", "nettoyage", "pompe", "filtre", "fuite", "liner", "couverture", "chez", "avec", "pour", "madame", "monsieur", "famille"]);
  const mots = s => (norme(s).match(/[a-z]{4,}/g) || []).filter(w => !VIDES.has(w));
  const initialesF = n => (n || "?").replace(/^(mr|mme|m\.)\s+/i, "").split(/[\s\-–]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "?";
  const ident = nom => (norme(nom).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 22) || "client") + "-" + Date.now().toString(36);
  const telLien = t => "tel:" + String(t || "").replace(/[^\d+]/g, "");

  function injecter() {
    if (pret) return; pret = true;
    const st = document.createElement("style");
    st.textContent = `
.fc-voile{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.5);display:none;align-items:stretch;justify-content:center;font-family:inherit}
.fc-voile.vu{display:flex}
.fc-panneau{width:min(860px,100%);display:flex;flex-direction:column;background:#14161b;color:#f2f3f5;box-shadow:0 0 60px rgba(0,0,0,.5)}
@media (min-width:900px){.fc-panneau{margin:24px;border-radius:24px;overflow:hidden}}
.fc-tete{display:flex;align-items:center;gap:10px;padding:14px 16px calc(14px);padding-top:calc(env(safe-area-inset-top) + 14px);border-bottom:1px solid rgba(255,255,255,.08)}
.fc-tete h2{margin:0;font-size:22px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fc-rond{flex:none;width:46px;height:46px;border:0;border-radius:14px;background:rgba(255,255,255,.09);color:inherit;font-size:20px;cursor:pointer;display:grid;place-items:center}
.fc-btn{border:0;border-radius:14px;min-height:48px;padding:0 18px;font-size:16px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.1);color:inherit;display:inline-flex;align-items:center;gap:8px;justify-content:center;text-decoration:none}
.fc-btn.fort{background:#34c759;color:#fff}.fc-btn.bleu{background:#0a84ff;color:#fff}.fc-btn.rouge{background:rgba(255,69,58,.18);color:#ff8a80}
.fc-recherche{margin:12px 16px 4px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(255,255,255,.06);color:inherit;padding:13px 14px;font:inherit;font-size:17px;outline:none}
.fc-filtres{display:flex;gap:6px;padding:6px 16px;overflow-x:auto}
.fc-filtres button{flex:none;border:0;border-radius:999px;padding:7px 12px;font-size:13.5px;font-weight:600;background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);cursor:pointer}
.fc-filtres button.actif{background:#fff;color:#111}
.fc-corps{flex:1;min-height:0;overflow-y:auto;padding:4px 16px calc(env(safe-area-inset-bottom) + 20px);-webkit-overflow-scrolling:touch}
.fc-rang{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.07);cursor:pointer}
.fc-av{flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;background:rgba(255,255,255,.12)}
.fc-t{flex:1;min-width:0;display:flex;flex-direction:column}
.fc-t b{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fc-t small{font-size:14px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fc-manque{font-size:11.5px;font-weight:800;color:#ffb35c;margin-left:6px}
.fc-champ{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.fc-champ span{flex:none;width:96px;color:rgba(255,255,255,.55);font-size:14px;padding-top:2px}
.fc-champ div{flex:1;min-width:0;font-size:17px;white-space:pre-wrap;word-break:break-word}
.fc-champ a{color:#5ab0ff;text-decoration:none}
.fc-actions{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
.fc-form label{display:block;font-size:13.5px;color:rgba(255,255,255,.6);margin:12px 0 4px}
.fc-form input,.fc-form textarea{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.06);color:inherit;padding:12px;font:inherit;font-size:16px;outline:none}
.fc-form textarea{min-height:110px;resize:vertical}
.fc-meta{font-size:12.5px;color:rgba(255,255,255,.45);margin-top:14px}
.fc-vide{padding:40px 0;text-align:center;color:rgba(255,255,255,.55)}
.fc-extras{margin-top:10px}`;
    document.head.appendChild(st);
    const d = document.createElement("div");
    d.className = "fc-voile"; d.id = "fc-voile";
    d.innerHTML = `<div class="fc-panneau"><div class="fc-tete" id="fc-tete"></div><div id="fc-haut"></div><div class="fc-corps" id="fc-corps"></div></div>`;
    document.body.appendChild(d);
    d.addEventListener("click", e => { if (e.target === d) fermer(); });
    d.addEventListener("click", clic);
    d.addEventListener("input", e => { if (e.target.id === "fc-recherche") { recherche = e.target.value; dessinerListe(); } });
  }

  let filtre = "tous";
  const manques = f => ["adresse", "telephone"].filter(k => !String(f[k] || "").trim());
  function visibles() {
    const q = norme(recherche).trim();
    return fiches.filter(f => !f.supprime)
      .filter(f => filtre === "tous" || (filtre === "incomplets" ? manques(f).length : filtre === "telephone" ? f.telephone : true))
      .filter(f => !q || norme([f.nom, f.adresse, f.localite, f.telephone, f.email, f.notes].join(" ")).includes(q))
      .sort((a, b) => norme(a.nom).localeCompare(norme(b.nom)));
  }
  function dessiner() { mode === "liste" ? dessinerTeteListe() : null; if (mode === "liste") dessinerListe(); else if (mode === "fiche") dessinerFiche(); else dessinerForm(); }
  function dessinerTeteListe() {
    $f("fc-tete").innerHTML = `<h2>Clients · ${fiches.filter(f => !f.supprime).length}</h2><button class="fc-btn fort" data-fc="nouveau">+ Nouveau</button><button class="fc-rond" data-fc="fermer" aria-label="Fermer">✕</button>`;
    $f("fc-haut").innerHTML = `<input class="fc-recherche" id="fc-recherche" placeholder="Chercher un nom, une rue, une commune, un numéro…" value="${echapF(recherche)}" autocomplete="off">
      <div class="fc-filtres">${[["tous", "Tous"], ["telephone", "Avec téléphone"], ["incomplets", "À compléter"]].map(([k, n]) => `<button class="${filtre === k ? "actif" : ""}" data-filtre="${k}">${n}</button>`).join("")}</div>`;
  }
  function dessinerListe() {
    const l = visibles();
    $f("fc-corps").innerHTML = l.length ? l.map(f => `<div class="fc-rang" data-id="${echapF(f.id)}"><span class="fc-av">${echapF(initialesF(f.nom))}</span>
        <span class="fc-t"><b>${echapF(f.nom)}${manques(f).length ? `<span class="fc-manque">${manques(f).includes("adresse") ? "sans adresse" : "sans téléphone"}</span>` : ""}</b>
        <small>${echapF([f.localite || "", f.telephone || ""].filter(Boolean).join(" · ") || f.adresse || "")}</small></span>
        ${f.telephone ? `<button class="fc-rond" data-appel="${echapF(f.id)}" aria-label="Appeler">📞</button>` : ""}</div>`).join("")
      : `<div class="fc-vide">${fiches.length ? "Aucun client trouvé" : "Chargement…"}</div>`;
  }
  function dessinerFiche() {
    const f = courante;
    $f("fc-tete").innerHTML = `<button class="fc-rond" data-fc="retour" aria-label="Retour">‹</button><h2>${echapF(f.nom)}</h2><button class="fc-rond" data-fc="fermer" aria-label="Fermer">✕</button>`;
    $f("fc-haut").innerHTML = "";
    const champ = (n, v) => `<div class="fc-champ"><span>${n}</span><div>${v || '<i style="opacity:.45">—</i>'}</div></div>`;
    $f("fc-corps").innerHTML = `<div class="fc-actions">
        ${f.telephone ? `<button class="fc-btn fort" data-appel="${echapF(f.id)}">📞 Appeler</button>` : ""}
        <button class="fc-btn" data-fc="modifier">✎ Modifier</button></div>`
      + champ("Adresse", echapF([f.adresse, f.localite && !norme(f.adresse).includes(norme(f.localite)) ? f.localite : ""].filter(Boolean).join(" — ")))
      + champ("Téléphone", f.telephone ? `<a href="${telLien(f.telephone)}">${echapF(f.telephone)}</a>` : "")
      + champ("E-mail", f.email ? `<a href="mailto:${echapF(f.email)}">${echapF(f.email)}</a>` : "")
      + champ("Notes", echapF(f.notes || ""))
      + `<div class="fc-extras" id="fc-extras">${T.extras ? T.extras(f) || "" : ""}</div>`
      + `<div class="fc-meta">${f.modifie ? "Modifiée le " + new Date(f.modifie).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" }) + (f.par ? " sur " + echapF(f.par) : "") : ""}${f.sources?.length ? " · sources : " + echapF(f.sources.join(", ")) : ""}</div>`;
  }
  function dessinerForm() {
    const f = courante, nouv = !f.cree_ici && !fiches.some(x => x.id === f.id);
    $f("fc-tete").innerHTML = `<button class="fc-rond" data-fc="${nouv ? "retour-liste" : "annuler"}" aria-label="Annuler">‹</button><h2>${nouv ? "Nouveau client" : "Modifier"}</h2><button class="fc-btn fort" data-fc="enregistrer">Enregistrer</button>`;
    $f("fc-haut").innerHTML = "";
    const c = (k, n, type = "text") => `<label for="fc-${k}">${n}</label><input id="fc-${k}" type="${type}" value="${echapF(f[k] || "")}" autocomplete="off">`;
    $f("fc-corps").innerHTML = `<div class="fc-form">${c("nom", "Nom")}${c("adresse", "Rue et numéro")}${c("localite", "Code postal et commune")}${c("telephone", "Téléphone", "tel")}${c("email", "E-mail", "email")}
      <label for="fc-notes">Notes (piscine, accès, habitudes…)</label><textarea id="fc-notes">${echapF(f.notes || "")}</textarea></div>
      ${nouv ? "" : `<div class="fc-actions"><button class="fc-btn rouge" data-fc="supprimer">Supprimer la fiche</button></div>`}`;
    setTimeout(() => $f("fc-nom")?.focus(), 100);
  }

  async function clic(e) {
    const ap = e.target.closest("[data-appel]");
    if (ap) { e.stopPropagation(); const f = fiches.find(x => x.id === ap.dataset.appel); if (f) T.appeler(f); return; }
    const fl = e.target.closest("[data-filtre]"); if (fl) { filtre = fl.dataset.filtre; dessinerTeteListe(); dessinerListe(); return; }
    const r = e.target.closest(".fc-rang[data-id]"); if (r) { courante = fiches.find(x => x.id === r.dataset.id); mode = "fiche"; dessiner(); return; }
    const b = e.target.closest("[data-fc]"); if (!b) return;
    const a = b.dataset.fc;
    if (a === "fermer") return fermer();
    if (a === "retour" || a === "retour-liste") { mode = "liste"; courante = null; return dessiner(); }
    if (a === "annuler") { mode = "fiche"; return dessiner(); }
    if (a === "nouveau") { courante = { id: ident(recherche || "client"), nom: recherche || "" }; mode = "form"; return dessiner(); }
    if (a === "modifier") { mode = "form"; return dessiner(); }
    if (a === "enregistrer") {
      const v = k => $f("fc-" + k).value.trim(), nom = v("nom");
      if (!nom) { $f("fc-nom").focus(); return; }
      const f = { ...courante, nom, adresse: v("adresse"), localite: v("localite"), telephone: v("telephone"), email: v("email"), notes: v("notes"),
        modifie: new Date().toISOString(), par: T.appareil || "" };
      b.disabled = true; b.textContent = "…";
      try { await T.enregistrer(f); const i = fiches.findIndex(x => x.id === f.id); if (i >= 0) fiches[i] = f; else fiches.push(f); courante = f; mode = "fiche"; dessiner(); }
      catch (err) { alerte("Enregistrement impossible : " + (err.message || err)); b.disabled = false; b.textContent = "Enregistrer"; }
      return;
    }
    if (a === "supprimer") {
      const f = { ...courante, supprime: true, modifie: new Date().toISOString(), par: T.appareil || "" };
      try { await T.enregistrer(f); const i = fiches.findIndex(x => x.id === f.id); if (i >= 0) fiches[i] = f; mode = "liste"; courante = null; dessiner(); }
      catch (err) { alerte("Suppression impossible : " + (err.message || err)); }
    }
  }
  function alerte(t) { if (window.toast) window.toast(t); else console.warn(t); }

  async function charger() { try { fiches = await T.lister(); } catch (e) { alerte("Fiches indisponibles : " + (e.message || e)); } }
  // retrouve la fiche qui correspond à un nom de rendez-vous (« Laurent Smal » ↔ « SMAL Laurent »)
  function trouver(nom) {
    const m = new Set(mots(nom)); if (!m.size) return null;
    let mieux = null, score = 0;
    for (const f of fiches) { if (f.supprime) continue; const s = mots(f.nom).filter(w => m.has(w)).length; if (s > score) { score = s; mieux = f; } }
    return mieux;
  }
  async function ouvrir(opts = {}) {
    injecter(); $f("fc-voile").classList.add("vu");
    if (!fiches.length || opts.recharger !== false) await charger();
    if (opts.nom) {
      const f = trouver(opts.nom);
      if (f) { courante = f; mode = opts.modifier ? "form" : "fiche"; }
      else { courante = { id: ident(opts.nom), nom: opts.nom, adresse: opts.adresse || "" }; mode = "form"; }
    } else { mode = "liste"; courante = null; }
    dessiner();
  }
  function fermer() { $f("fc-voile")?.classList.remove("vu"); }
  return {
    init(t) { T = t; },
    ouvrir, fermer, trouver,
    async charger() { await charger(); return fiches; },
    fiches: () => fiches,
  };
})();
