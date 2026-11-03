/* Mon agent immobilier — recherche et affichage (accueil « D », cartes « F6 », « Vue compacte » F5 ; choix d'Ahmed du 02/11/2026).
   Données : window.MAI (donnees/index.js) ; compréhension : assets/comprendre.js. Rien n'est envoyé : tout se passe dans le navigateur.
   Une ligne d'annonce : [id, vente(1)/location(0), type, gouvernorat, quartier, prix, surface, pièces, atouts (bits), sorte, étage, âge (jours), photo,
   période du loyer (0 au mois, 1 nuit, 2 jour, 3 autre période courte)] */
(function () {
  "use strict";
  var D = window.MAI, C = window.MAI_COMPRENDRE;
  var $ = function (id) { return document.getElementById(id); };
  var LANG = "fr";
  try { LANG = localStorage.getItem("mai-langue") === "ar" ? "ar" : "fr"; } catch (e) { /* stockage refusé */ }
  if (/[?&]lang=ar/.test(location.search)) LANG = "ar";
  function T(fr, ar) { return LANG === "ar" ? ar : fr; }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function nb(v) { return Math.round(v).toLocaleString("fr-FR").replace(/ | /g, " "); }

  var TYPES = ["appartement", "maison", "terrain", "bureau", "commerce", "industriel", "terrainind", "agricole", "autre"];
  var NOM_TYPE = {appartement: ["Appartement", "شقة"], maison: ["Maison", "منزل"], terrain: ["Terrain", "أرض"], bureau: ["Bureau", "مكتب"],
    commerce: ["Local commercial", "محل تجاري"], industriel: ["Dépôt / usine", "مستودع / مصنع"], terrainind: ["Terrain industriel", "أرض صناعية"],
    agricole: ["Terrain agricole", "أرض فلاحية"], autre: ["Immeuble / autre", "عقار آخر"]};
  var SORTES = ["studio", "duplex", "penthouse", "villa", "etage_villa", "maison_trad"];
  var NOM_SORTE = {studio: ["Studio", "ستوديو"], duplex: ["Duplex", "دوبلكس"], penthouse: ["Penthouse", "بنتهاوس"], villa: ["Villa", "فيلا"],
    etage_villa: ["Étage de villa", "طابق فيلا"], maison_trad: ["Maison traditionnelle", "دار عربي"]};
  var NOM_ATOUT = [["vue mer", "إطلالة على البحر"], ["piscine", "مسبح"], ["jardin", "حديقة"], ["garage", "مستودع سيارة"], ["ascenseur", "مصعد"],
    ["terrasse", "تراس"], ["meublé", "مفروش"], ["neuf", "جديد"]];
  var STRICTES = {studio: 1, duplex: 1, penthouse: 1, etage_villa: 1};
  var NOM_PER = {};
  function nomsPer() { NOM_PER = {n: T("à la nuit", "بالليلة"), j: T("à la journée", "باليوم"), m: T("au mois", "بالشهر"), c: T("courte durée", "مدة قصيرة")}; }
  nomsPer();
  var UNITE = function (a) { return a[1] === 1 ? "" : [T(" / mois", " / الشهر"), T(" / nuit", " / الليلة"), T(" / jour", " / اليوم"), ""][a[13] || 0]; };
  var PAR_PAGE = 24;
  function nomType(y) { return LANG === "ar" ? NOM_TYPE[y][1] : NOM_TYPE[y][0]; }
  function nomSorte(s) { return LANG === "ar" ? NOM_SORTE[s][1] : NOM_SORTE[s][0]; }
  function nomAtout(k) { return LANG === "ar" ? NOM_ATOUT[k][1] : NOM_ATOUT[k][0]; }
  function nomG(g) { var x = D.g[g]; return x ? (LANG === "ar" ? x[2] || x[1] : x[1]) : ""; }
  function nomQ(l) { var x = D.l[l]; return x ? (LANG === "ar" ? x[3] || x[2] : x[2]) : ""; }
  function nomZone(z) { return z.k === "g" ? nomG(z.g) : z.k === "l" ? nomQ(z.l) : z.d; }

  // ---------------------------------------------------------------- recherche
  function dansZone(a, z) {
    if (z.k === "g") return a[3] === z.g;
    if (z.k === "l") return a[4] === z.l;
    var q = D.l[a[4]];
    return a[3] === z.g && !!q && q[4] === z.d;
  }
  function elargir(zones, jusqua) {
    var out = [];
    zones.forEach(function (z) {
      var n = z;
      if (z.k === "l" && D.l[z.l]) n = jusqua === "d" && D.l[z.l][4] ? {k: "d", g: z.g, d: D.l[z.l][4]} : {k: "g", g: z.g};
      else if (z.k === "d" && jusqua === "g") n = {k: "g", g: z.g};
      if (!out.some(function (o) { return o.k === n.k && o.g === n.g && o.d === n.d && o.l === n.l; })) out.push(n);
    });
    return out;
  }
  // chaque critère de la phrase, testé sur une annonce (sert au filtre ET à la ligne « Correspond à votre phrase » de la carte)
  function criteres(q, as) {
    as = as || {};
    var out = [], marge = as.prix ? 0.15 : 0, margeS = as.prix ? 0.25 : 0;
    var zones = as.zone === 1 ? elargir(q.zones, "d") : as.zone === 2 ? elargir(q.zones, "g") : q.zones;
    if (q.t) out.push({nom: q.t === "v" ? T("à vendre", "للبيع") : T("à louer", "للكراء"), ok: function (a) { return a[1] === (q.t === "v" ? 1 : 0); }});
    // période (02/11/2026, Ahmed) : sans période écrite, une location est AU MOIS (les locations à la nuit / au jour sont proposées à part)
    if (q.per) out.push({nom: NOM_PER[q.per], ok: function (a) { return a[1] === 0 && (q.per === "m" ? a[13] === 0 : q.per === "c" ? a[13] > 0 : a[13] === (q.per === "n" ? 1 : 2)); }});
    else out.push({nom: "", cache: 1, ok: function (a) { return a[1] === 1 || !a[13]; }});
    if (q.types.length) {
      var ti = q.types.map(function (y) { return TYPES.indexOf(y); });
      out.push({nom: q.types.map(nomType).join(T(" ou ", " أو ")).toLowerCase(), ok: function (a) { return ti.indexOf(a[2]) >= 0; }});
    }
    var st = q.sortes.filter(function (s) { return STRICTES[s]; });
    if (st.length) {
      var si = st.map(function (s) { return SORTES.indexOf(s); });
      out.push({nom: st.map(nomSorte).join(T(" ou ", " أو ")).toLowerCase(), ok: function (a) { return si.indexOf(a[9]) >= 0 || (si.indexOf(0) >= 0 && a[7] === 0); }});
    }
    if (q.c !== null) out.push({nom: "S+" + q.c, ok: function (a) { return a[7] !== null && Math.abs(a[7] - q.c) <= (as.pieces ? 1 : 0); }, vrai: function (a) { return a[7] === q.c; }});
    if (q.cMin !== null) out.push({nom: "S+" + q.cMin + "+", ok: function (a) { return a[7] !== null && a[7] >= q.cMin; }});
    if (q.pMin !== null || q.pMax !== null) out.push({nom: q.pMax !== null ? "≤ " + nb(q.pMax) + T(" DT", " د") : "≥ " + nb(q.pMin) + T(" DT", " د"),
      ok: function (a) { return a[5] !== null && (q.pMax === null || a[5] <= q.pMax * (1 + marge)) && (q.pMin === null || a[5] >= q.pMin * (1 - marge)); },
      vrai: function (a) { return a[5] !== null && (q.pMax === null || a[5] <= q.pMax) && (q.pMin === null || a[5] >= q.pMin); }});
    if (q.sMin !== null || q.sMax !== null) out.push({nom: (q.sMin !== null && q.sMax !== null ? q.sMin + "–" + q.sMax : q.sMax !== null ? "≤ " + q.sMax : "≥ " + q.sMin) + " m²",
      ok: function (a) { return a[6] !== null && (q.sMax === null || a[6] <= q.sMax * (1 + margeS)) && (q.sMin === null || a[6] >= q.sMin * (1 - margeS)); },
      vrai: function (a) { return a[6] !== null && (q.sMax === null || a[6] <= q.sMax) && (q.sMin === null || a[6] >= q.sMin); }});
    q.at.forEach(function (k) { out.push({nom: nomAtout(k), souple: 1, ok: function (a) { return !!(a[8] & (1 << k)); }}); });
    q.sansAt.forEach(function (k) { out.push({nom: T("sans ", "بدون ") + nomAtout(k), souple: 1, ok: function (a) { return !(a[8] & (1 << k)); }}); });
    if (q.et !== null) out.push({nom: q.et === 0 ? T("rez-de-chaussée", "طابق أرضي") : T("étage " + q.et, "الطابق " + q.et), souple: 1, ok: function (a) { return a[10] === q.et; }});
    if (q.zones.length) out.push({nom: q.zones.map(nomZone).join(T(" ou ", " أو ")), ok: function (a) { return zones.some(function (z) { return dansZone(a, z); }); },
      vrai: function (a) { return q.zones.some(function (z) { return dansZone(a, z); }); }});
    return out;
  }
  function filtrer(q, as) {
    var cs = criteres(q, as).filter(function (c) { return !(as && as.atouts && c.souple); }), out = [];
    for (var i = 0; i < D.a.length; i++) {
      var a = D.a[i], bon = true;
      for (var k = 0; k < cs.length && bon; k++) bon = cs[k].ok(a);
      if (bon) out.push(a);
    }
    return out;
  }
  // aucune annonce exacte : on assouplit pas à pas, comme le ferait un agent (et on le dit)
  function chercher(q) {
    var r = filtrer(q);
    if (r.length || q.vide) return {liste: r, assoupli: null};
    var essais = [];
    if (q.at.length || q.sansAt.length || q.et !== null) essais.push([{atouts: 1}, T("sans tous les atouts demandés", "بدون كل المميزات المطلوبة")]);
    if (q.pMax !== null || q.pMin !== null || q.sMin !== null || q.sMax !== null) essais.push([{atouts: 1, prix: 1}, T("avec un peu plus de marge sur le prix et la surface", "مع هامش أكبر في السعر والمساحة")]);
    if (q.zones.some(function (z) { return z.k !== "g"; })) {
      essais.push([{atouts: 1, prix: 1, zone: 1}, T("dans les quartiers voisins", "في الأحياء المجاورة")]);
      essais.push([{atouts: 1, prix: 1, zone: 2}, T("dans tout le gouvernorat", "في كامل الولاية")]);
    }
    if (q.c !== null) essais.push([{atouts: 1, prix: 1, zone: 2, pieces: 1}, T("avec une pièce de plus ou de moins", "بغرفة أكثر أو أقل")]);
    for (var k = 0; k < essais.length; k++) {
      r = filtrer(q, essais[k][0]);
      if (r.length) return {liste: r, assoupli: essais[k][1]};
    }
    return {liste: [], assoupli: null};
  }
  function trier(liste, q, ordre) {
    var boost = q.sortes.filter(function (s) { return !STRICTES[s]; }).map(function (s) { return SORTES.indexOf(s); });
    function score(a) { return a[12] * 4 + Math.max(0, 30 - a[11]) / 6 + (boost.indexOf(a[9]) >= 0 ? 3 : 0) + (a[5] !== null ? 1 : 0); }
    var l = liste.slice();
    if (ordre === "prix") l.sort(function (a, b) { return (a[5] === null) - (b[5] === null) || a[5] - b[5]; });
    else if (ordre === "prix-") l.sort(function (a, b) { return (a[5] === null) - (b[5] === null) || b[5] - a[5]; });
    else if (ordre === "recent") l.sort(function (a, b) { return a[11] - b[11]; });
    else l.sort(function (a, b) { return score(b) - score(a) || a[11] - b[11]; });
    return l;
  }

  // ---------------------------------------------------------------- détails (lien d'origine, photo) : 256 paquets
  var paquets = {};
  function paquet(i) { var h = 0; for (var k = 0; k < i.length; k++) h = (h * 31 + i.charCodeAt(k)) % 1000003; return h % 256; }
  function details(i) {
    var k = paquet(i);
    if (!paquets[k]) paquets[k] = fetch("donnees/d/" + k + ".json?v=" + (D.v || "")).then(function (r) { return r.json(); }).catch(function () { return {}; });
    return paquets[k].then(function (p) { return p[i] || null; });
  }

  // ---------------------------------------------------------------- cartes « F6 »
  function prix(a) {
    if (a[5] === null) return E(a[13] === 3 ? T("Prix selon la période", "السعر حسب المدة") : T("Prix sur demande", "السعر عند الطلب"));
    var v = a[5], s = v >= 1e6 ? (v / 1e6).toLocaleString("fr-FR", {maximumFractionDigits: 2}) + T(" M DT", " م د") : nb(v) + T(" DT", " د");
    return E(s) + (UNITE(a) ? "<small>" + E(UNITE(a)) + "</small>" : "");
  }
  function age(j) {
    if (j === 0) return T("aujourd’hui", "اليوم");
    if (j === 1) return T("hier", "أمس");
    if (j < 999) return T("il y a " + j + " jours", "منذ " + j + " يوم");
    return "";
  }
  function genre(a) {
    var nom = a[9] >= 0 ? nomSorte(SORTES[a[9]]) : nomType(TYPES[a[2]]);
    return nom;
  }
  // icônes dessinées à la main, une par type de bien (traits, couleur du site)
  var MAISON = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 22L24 9l16 13v18H8z"/><path d="M20 40v-9h8v9"/></svg>';
  var IMMEUBLE = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="12" y="7" width="24" height="34" rx="2"/><path d="M18 14h4M26 14h4M18 21h4M26 21h4M18 28h4M26 28h4M21 41v-6h6v6"/></svg>';
  var TERRAIN = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 34l12-8 10 5 14-9"/><path d="M6 40h36"/><path d="M30 10v10M30 10l7 3-7 3"/></svg>';
  var LOCAL = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 18h32v22H8z"/><path d="M6 18l4-9h28l4 9"/><path d="M14 40V27h8v13M28 27h7v6h-7z"/></svg>';
  var ICONE_TYPE = {appartement: IMMEUBLE, maison: MAISON, terrain: TERRAIN, bureau: IMMEUBLE, commerce: LOCAL, industriel: LOCAL, terrainind: TERRAIN, agricole: TERRAIN, autre: IMMEUBLE};
  function carte(a, cs) {
    var ligne = [];
    if (a[7] !== null && (a[2] === 0 || a[2] === 1)) ligne.push("<strong>S+" + a[7] + "</strong>");
    if (a[6] !== null) ligne.push("<strong>" + E(a[6]) + " m²</strong>");
    ligne.push(E(genre(a)));
    var lieu = a[4] >= 0 ? nomQ(a[4]) : nomG(a[3]);
    if (lieu) ligne.push(E(lieu));
    // ce qui correspond à la phrase du visiteur (barré : critère assoupli pour proposer quand même)
    var corr = cs.filter(function (c) { return !c.cache; }).map(function (c) { var bon = c.vrai ? c.vrai(a) : c.ok(a); return '<span class="' + (bon ? "oui" : "non") + '">' + (bon ? "✓ " : "") + E(c.nom) + "</span>"; });
    var demandes = cs.map(function (c) { return c.nom; }), plus = [];
    for (var k = 0; k < 8; k++) if ((a[8] & (1 << k)) && demandes.indexOf(nomAtout(k)) < 0) plus.push(nomAtout(k));
    if (a[10] !== null && a[10] !== undefined && !cs.some(function (c) { return /étage|rez|الطابق|طابق/.test(c.nom); })) plus.push(a[10] === 0 ? T("rez-de-chaussée", "طابق أرضي") : T("étage " + a[10], "الطابق " + a[10]));
    return '<article class="carte" data-id="' + E(a[0]) + '"><a class="carte-lien" href="#" rel="noopener noreferrer">' +
      '<div class="carte-photo' + (a[12] ? "" : " sans") + '">' + (a[12] ? "" : '<span class="sans-photo">' + ICONE_TYPE[TYPES[a[2]]] + "<em>" + E(T("Pas de photo", "بدون صورة")) + "</em></span>") + '<span class="carte-badge">' + E(a[1] ? T("À vendre", "للبيع") : T("À louer", "للكراء")) + "</span></div>" +
      '<div class="carte-corps"><p class="carte-prix">' + prix(a) + "</p>" +
      '<p class="carte-ligne">' + ligne.join(" · ") + "</p>" +
      (corr.length ? '<p class="correspond"><b>' + E(T("Correspond à votre phrase :", "يطابق جملتك:")) + "</b>" + corr.join("") + "</p>" : "") +
      (plus.length ? '<p class="carte-plus">' + E(T("En plus : ", "إضافة: ") + plus.join(" · ")) + "</p>" : "") +
      '<p class="carte-pied"><span>' + E(age(a[11])) + '</span><span class="carte-voir">' + E(T("Voir l’annonce ↗", "شاهد الإعلان ↗")) + "</span></p>" +
      "</div></a></article>";
  }
  function remplir(art) {
    details(art.getAttribute("data-id")).then(function (d) {
      if (!d) { art.classList.add("indisponible"); return; }
      art.querySelector(".carte-lien").href = d.u;
      if (!d.ph) return;
      var ph = art.querySelector(".carte-photo"), img = new Image();
      img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.referrerPolicy = "no-referrer";
      img.onload = function () { ph.classList.add("chargee"); };
      img.onerror = function () { ph.classList.add("sans"); img.remove(); };
      img.src = d.ph;
      ph.insertBefore(img, ph.firstChild);
    });
  }
  var vue = null;
  if ("IntersectionObserver" in window) vue = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { vue.unobserve(e.target); remplir(e.target); } });
  }, {rootMargin: "400px"});

  // ---------------------------------------------------------------- ce que l'agent a compris (pastilles qu'on peut retirer)
  function pastilles(q) {
    var p = [];
    if (q.t) p.push(["t", q.t === "v" ? T("Achat", "شراء") : T("Location", "كراء")]);
    if (q.per) p.push(["per", NOM_PER[q.per]]);
    q.types.forEach(function (y) { p.push(["types:" + y, nomType(y)]); });
    q.sortes.forEach(function (s) { p.push(["sortes:" + s, nomSorte(s)]); });
    if (q.c !== null) p.push(["c", "S+" + q.c]);
    if (q.cMin !== null) p.push(["cMin", "S+" + q.cMin + T(" ou plus", " أو أكثر")]);
    var dt = function (v) { return v >= 1e6 ? (v / 1e6).toLocaleString("fr-FR") + T(" M DT", " م د") : nb(v) + T(" DT", " د"); };
    if (q.pMin !== null && q.pMax !== null) p.push(["prix", dt(q.pMin) + " – " + dt(q.pMax)]);
    else if (q.pMax !== null) p.push(["prix", "≤ " + dt(q.pMax)]);
    else if (q.pMin !== null) p.push(["prix", "≥ " + dt(q.pMin)]);
    if (q.sMin !== null || q.sMax !== null) p.push(["surface", (q.sMin !== null ? q.sMin : "…") + " – " + (q.sMax !== null ? q.sMax : "…") + " m²"]);
    q.at.forEach(function (k) { p.push(["at:" + k, nomAtout(k)]); });
    q.sansAt.forEach(function (k) { p.push(["sansAt:" + k, T("sans ", "بدون ") + nomAtout(k)]); });
    if (q.et !== null) p.push(["et", q.et === 0 ? T("rez-de-chaussée", "طابق أرضي") : T("étage " + q.et, "الطابق " + q.et)]);
    q.zones.forEach(function (z, k) { var n = nomZone(z); if (n) p.push(["zone:" + k, n]); });
    return p;
  }
  function retirerCritere(q, cle) {
    var c = cle.split(":"), k = c[0], v = c[1];
    if (k === "t") { q.t = null; q.per = null; } else if (k === "per") q.per = null; else if (k === "c") q.c = null; else if (k === "cMin") q.cMin = null; else if (k === "et") q.et = null;
    else if (k === "prix") { q.pMin = q.pMax = null; } else if (k === "surface") { q.sMin = q.sMax = null; }
    else if (k === "types" || k === "sortes") q[k] = q[k].filter(function (x) { return x !== v; });
    else if (k === "at" || k === "sansAt") q[k] = q[k].filter(function (x) { return String(x) !== v; });
    else if (k === "zone") q.zones = q.zones.filter(function (_, i) { return String(i) !== v; });
  }

  // ---------------------------------------------------------------- recherche lancée
  var etat = {texte: "", q: null, res: null, liste: [], groupes: [], montres: 0, ordre: "pertinence", retires: [], onglet: "", quartier: "", cs: []};
  function lancer(texte, garderRetires) {
    etat.texte = texte;
    if (!garderRetires) { etat.retires = []; etat.onglet = ""; }
    etat.quartier = "";
    var q = C.comprendre(texte, D);
    etat.retires.forEach(function (c) { retirerCritere(q, c); });
    q.vide = !q.t && !q.types.length && !q.sortes.length && q.c === null && q.cMin === null && q.pMin === null && q.pMax === null &&
      q.sMin === null && q.sMax === null && !q.at.length && !q.sansAt.length && q.et === null && !q.zones.length;
    etat.q = q;
    var cherche = !!texte.trim();
    document.body.classList.toggle("a-cherche", cherche);
    $("effacer").hidden = !cherche;
    etat.res = q.vide ? {liste: [], assoupli: null} : chercher(q);
    etat.cs = criteres(q);
    afficher();
    var url = location.pathname + (cherche ? "?q=" + encodeURIComponent(texte.trim()) + (LANG === "ar" ? "&lang=ar" : "") : (LANG === "ar" ? "?lang=ar" : ""));
    try { history.replaceState(null, "", url); } catch (e) { /* fichier local */ }
  }
  // ---------------------------------------------------------------- résumé de l'agent (E3)
  function fmt(v) { return v >= 1e6 ? (v / 1e6).toLocaleString("fr-FR", {maximumFractionDigits: 2}) + T(" M DT", " م د") : nb(v) + T(" DT", " د"); }
  function prixListe(l) { return l.map(function (a) { return a[5]; }).filter(function (v) { return v !== null; }).sort(function (x, y) { return x - y; }); }
  function milieu(p) { if (!p.length) return null; var m = p.length >> 1; return p.length % 2 ? p[m] : (p[m - 1] + p[m]) / 2; }
  function nomGroupe(cle) { return cle.charAt(0) === "q" ? nomQ(+cle.slice(1)) : T("Autres quartiers · ", "أحياء أخرى · ") + nomG(+cle.slice(1)); }
  function groupes(liste) {
    var parQ = {}, ordre = [];
    liste.forEach(function (a) { var k = a[4] >= 0 ? "q" + a[4] : "g" + a[3]; if (!parQ[k]) { parQ[k] = []; ordre.push(k); } parQ[k].push(a); });
    return ordre.sort(function (x, y) { return parQ[y].length - parQ[x].length; }).map(function (k) { return {cle: k, liste: parQ[k]}; });
  }
  var PLURIEL = {appartement: "appartements", maison: "maisons", terrain: "terrains", bureau: "bureaux", commerce: "locaux commerciaux",
    industriel: "dépôts et usines", terrainind: "terrains industriels", agricole: "terrains agricoles", autre: "immeubles et autres biens",
    studio: "studios", duplex: "duplex", penthouse: "penthouses", villa: "villas", etage_villa: "étages de villa", maison_trad: "maisons traditionnelles"};
  function texteCritere(q, n) {
    var p = [], pl = function (k, nom) { return LANG === "fr" && n > 1 ? PLURIEL[k] : nom(k).toLowerCase(); };
    if (q.c !== null) p.push("S+" + q.c);
    // seulement une sorte STRICTE (studio, duplex…) : « villa » ne fait que classer les maisons en premier -> « 787 maisons », pas « villas »
    else if (q.sortes.some(function (k) { return STRICTES[k]; })) p.push(q.sortes.filter(function (k) { return STRICTES[k]; }).map(function (k) { return pl(k, nomSorte); }).join(T(" ou ", " أو ")));
    else if (q.types.length) p.push(q.types.map(function (k) { return pl(k, nomType); }).join(T(" ou ", " أو ")));
    else p.push(n > 1 ? T("annonces", "إعلانات") : T("annonce", "إعلان"));
    if (q.zones.length) p.push(T("à ", "في ") + q.zones.map(nomZone).join(T(" ou ", " أو ")));
    return p.join(" ");
  }
  function afficher() {
    var q = etat.q, res = etat.res, z = $("resume");
    if (!etat.texte.trim()) { z.innerHTML = ""; $("outils").hidden = true; $("resultats").innerHTML = ""; $("plus").hidden = true; return; }
    var ps = pastilles(q);
    var compris = ps.length ? '<div class="compris"><span class="compris-titre">' + E(T("J’ai compris :", "فهمت:")) + "</span>" + ps.map(function (p) {
      return '<button type="button" class="pastille" data-cle="' + E(p[0]) + '" title="' + E(T("Retirer ce critère", "إزالة هذا الشرط")) + '">' + E(p[1]) + '<span aria-hidden="true">×</span></button>';
    }).join("") + "</div>" : "";
    var l = res.liste, nL = l.filter(function (a) { return a[1] === 0; }), nV = l.filter(function (a) { return a[1] === 1; });
    var gs = groupes(l), phrase;
    if (q.vide) phrase = T("Je n’ai pas reconnu de critère.", "لم أفهم أي شرط.") + " " + T("Essayez par exemple « S+2 à La Marsa avec parking ».", "جرّب مثلًا « S+2 في المرسى مع باركينغ ».");
    else if (!l.length) phrase = T("Aucune annonce ne correspond pour l’instant.", "لا يوجد إعلان مطابق حاليًا.") + " " + T("Retirez un critère, ou revenez demain : les annonces sont mises à jour chaque jour.", "أزل شرطًا أو عُد غدًا: الإعلانات تُحدَّث يوميًا.");
    else phrase = l.length + " " + texteCritere(q, l.length) + (gs.length > 1 ? T(", dans ", "، في ") + gs.length + T(" quartiers.", " أحياء.") : ".");
    var uLoc = q.per === "n" ? T(" / nuit", " / الليلة") : q.per === "j" ? T(" / jour", " / اليوم") : q.per === "c" ? "" : T(" / mois", " / الشهر");
    // locations à la nuit / au jour : jamais mêlées aux loyers au mois ; l'agent dit qu'il y en a et propose de les voir
    var court = "";
    if (!q.per && q.t !== "v" && !q.vide) {
      var qc = {}; for (var c in q) qc[c] = q[c];
      qc.per = "c"; qc.t = "l";
      var nc = filtrer(qc).length;
      if (nc) court = '<button type="button" class="tuile tuile-court" data-ajout="' + E(T(" à la nuit", " بالليلة")) + '"><span class="tuile-titre">' + E(T("Vacances · ", "عطلة · ") + nc) + "</span>" +
        '<span class="tuile-aide">' + E(T("location à la nuit ou au jour : voir", "كراء بالليلة أو باليوم: شاهد")) + "</span></button>";
    }
    var tuile = function (t, liste, titre, unite) {
      if (!liste.length) return "";
      var p = prixListe(liste), m = milieu(p);
      return '<button type="button" class="tuile" data-t="' + t + '" aria-pressed="' + (etat.onglet === t) + '"><span class="tuile-titre">' + E(titre) + " · " + liste.length + "</span>" +
        (m !== null ? '<span class="tuile-prix">' + E(fmt(m) + unite) + '</span><span class="tuile-aide">' + E(T("prix du milieu, ", "السعر الأوسط، ") + (p.length > 1 ? T("de ", "من ") + fmt(p[0]) + T(" à ", " إلى ") + fmt(p[p.length - 1]) : fmt(p[0]))) + "</span>" : "") + "</button>";
    };
    z.innerHTML = '<div class="resume-agent"><span class="resume-sur">' + E(T("Votre agent a trouvé", "وكيلك وجد")) + '</span><p class="resume-phrase">' + E(phrase) + "</p>" +
      (res.assoupli ? '<p class="assoupli">' + E(T("Aucune annonce exacte : voici les plus proches, ", "لا يوجد تطابق تام: هذه الأقرب، ") + res.assoupli) + ".</p>" : "") + compris + "</div>" +
      (!q.t && nL.length && nV.length ? tuile("l", nL, T("À louer", "للكراء"), uLoc) + tuile("v", nV, T("À vendre", "للبيع"), "") :
        (l.length ? tuile(nL.length ? "l" : "v", nL.length ? nL : nV, nL.length ? T("À louer", "للكراء") : T("À vendre", "للبيع"), nL.length ? uLoc : "") : "")) + court;
    $("outils").hidden = l.length < 2;
    var liste = etat.onglet ? l.filter(function (a) { return a[1] === (etat.onglet === "v" ? 1 : 0); }) : l;
    etat.liste = trier(liste, q, etat.ordre);
    etat.groupes = groupes(etat.liste);
    etat.montres = 0;
    $("resultats").innerHTML = "";
    afficherSuite();
  }
  var PAR_RANGEE = 12, RANGEES = 6;
  // un quartier ouvert en entier (« Voir les 23 annonces ») : une grille ; sinon une rangée de cartes par quartier
  function afficherSuite() {
    var r = $("resultats"), b = $("plus");
    if (etat.quartier) {
      var g = etat.groupes.filter(function (x) { return x.cle === etat.quartier; })[0] || {liste: []};
      if (!etat.montres) r.innerHTML = '<button type="button" class="retour" data-retour="1">' + E(T("← Tous les quartiers", "→ كل الأحياء")) + '</button><h2 class="quartier-titre">' + E(nomGroupe(etat.quartier)) + " <span>· " + g.liste.length + "</span></h2>" + '<div class="grille"></div>';
      var part = g.liste.slice(etat.montres, etat.montres + PAR_PAGE);
      r.querySelector(".grille").insertAdjacentHTML("beforeend", part.map(function (a) { return carte(a, etat.cs); }).join(""));
      etat.montres += part.length;
      b.hidden = etat.montres >= g.liste.length;
      b.textContent = T("Voir plus d’annonces", "المزيد من الإعلانات");
    } else {
      var seul = etat.groupes.length === 1;
      var gs = etat.groupes.slice(etat.montres, etat.montres + RANGEES);
      r.insertAdjacentHTML("beforeend", gs.map(function (g) {
        var loc = g.liste.filter(function (a) { return a[1] === 0; }), ven = g.liste.length - loc.length, ml = milieu(prixListe(loc));
        var resume = (loc.length ? loc.length + T(" à louer", " للكراء") + (ml !== null ? T(", loyer du milieu ", "، الكراء الأوسط ") + fmt(ml) : "") : "") + (loc.length && ven ? " · " : "") + (ven ? ven + T(" à vendre", " للبيع") : "");
        var cartes = (seul ? g.liste.slice(0, PAR_PAGE) : g.liste.slice(0, PAR_RANGEE)).map(function (a) { return carte(a, etat.cs); }).join("");
        var reste = g.liste.length - (seul ? PAR_PAGE : PAR_RANGEE);
        return '<section class="quartier"><div class="quartier-tete"><h2 class="quartier-titre">' + E(nomGroupe(g.cle)) + " <span>· " + g.liste.length + " " + E(g.liste.length > 1 ? T("annonces", "إعلانًا") : T("annonce", "إعلان")) + "</span></h2>" +
          '<span class="quartier-resume">' + E(resume) + "</span></div>" +
          '<div class="' + (seul ? "grille" : "rangee") + '">' + cartes + "</div>" +
          (reste > 0 ? '<button type="button" class="voir-quartier" data-q="' + g.cle + '">' + E(T("Voir les ", "شاهد الـ") + g.liste.length + T(" annonces de ", " إعلانًا في ") + nomGroupe(g.cle)) + "</button>" : "") + "</section>";
      }).join(""));
      etat.montres += gs.length;
      b.hidden = etat.montres >= etat.groupes.length;
      b.textContent = T("Voir d’autres quartiers", "أحياء أخرى");
    }
    [].forEach.call(r.querySelectorAll(".carte:not([data-vu])"), function (art, k) {
      art.setAttribute("data-vu", "1");
      art.style.animationDelay = Math.min(k, 12) * 35 + "ms";
      if (vue) vue.observe(art); else remplir(art);
    });
  }

  // retour depuis une annonce (02/11/2026, Ahmed : « revenir à la liste pour sélectionner une autre carte ») : même recherche, même quartier,
  // même tri, même endroit de la page
  function memoriser() {
    try {
      sessionStorage.setItem("mai-retour", JSON.stringify({texte: etat.texte, onglet: etat.onglet, quartier: etat.quartier, retires: etat.retires,
        ordre: etat.ordre, montres: etat.montres, y: window.scrollY || 0}));
    } catch (e) { /* stockage refusé : la recherche revient quand même (adresse ?q=) */ }
  }
  function restaurer() {
    var m;
    try { m = JSON.parse(sessionStorage.getItem("mai-retour") || "null"); } catch (e) { m = null; }
    if (!m || m.texte !== etat.texte) return;
    etat.retires = m.retires || []; etat.onglet = m.onglet || ""; etat.ordre = m.ordre || "pertinence";
    $("tri-choix").value = etat.ordre;
    lancer(etat.texte, true);
    if (m.quartier) { etat.quartier = m.quartier; etat.montres = 0; $("resultats").innerHTML = ""; afficherSuite(); }
    for (var k = 0; k < 40 && etat.montres < m.montres && !$("plus").hidden; k++) afficherSuite();
    setTimeout(function () { window.scrollTo(0, m.y || 0); }, 30);
  }

  // ---------------------------------------------------------------- textes de la page (FR / AR)
  var EXEMPLES = [
    ["S+1 à La Manouba", "S+1 في منوبة"],
    ["Villa avec piscine à Hammamet", "فيلا بمسبح في الحمامات"],
    ["S+2 meublé à louer à Ennasr avec parking", "S+2 مفروش للكراء في النصر مع باركينغ"],
    ["Terrain de 500 m² à Sousse", "أرض 500 م2 في سوسة"],
    ["Local commercial à louer à Sfax", "محل تجاري للكراء في صفاقس"]
  ];
  function textes() {
    document.documentElement.lang = LANG;
    document.documentElement.dir = LANG === "ar" ? "rtl" : "ltr";
    [].forEach.call(document.querySelectorAll("[data-fr]"), function (el) { el.textContent = LANG === "ar" ? el.getAttribute("data-ar") : el.getAttribute("data-fr"); });
    $("langue").textContent = LANG === "ar" ? "FR" : "ع";
    $("langue").setAttribute("aria-label", LANG === "ar" ? "Français" : "العربية");
    $("nb-annonces").textContent = D && D.n ? nb(D.n) : "—";
  }
  // phrase d'exemple qui s'écrit toute seule dans la barre vide
  var tape = null;
  function machine() {
    var k = 0, i = 0, sens = 1, q = $("q");
    clearInterval(tape);
    tape = setInterval(function () {
      if (q.value || document.activeElement === q) { q.setAttribute("placeholder", T("Décrivez le bien que vous cherchez…", "صف العقار الذي تبحث عنه…")); return; }
      var s = LANG === "ar" ? EXEMPLES[k][1] : EXEMPLES[k][0];
      i += sens;
      if (i > s.length + 18) sens = -2;
      if (i <= 0) { sens = 1; i = 0; k = (k + 1) % EXEMPLES.length; }
      q.setAttribute("placeholder", s.slice(0, Math.max(0, Math.min(i, s.length))) + (i % 2 ? "▍" : ""));
    }, 70);
  }

  // ---------------------------------------------------------------- démarrage
  function demarrer() {
    if (!D || !D.a || !C) { $("resume").innerHTML = '<p class="vide">' + E(T("Chargement impossible. Rechargez la page.", "تعذر التحميل. أعد تحميل الصفحة.")) + "</p>"; return; }
    var compacte = false;
    try { compacte = localStorage.getItem("mai-compacte") === "1"; } catch (e) { /* stockage refusé */ }
    function majVue() { document.body.classList.toggle("compacte", compacte); $("vue-compacte").setAttribute("aria-pressed", String(compacte)); }
    textes(); majVue();
    var f = $("barre"), q = $("q"), minuterie = null;
    f.addEventListener("submit", function (e) { e.preventDefault(); q.blur(); lancer(q.value); window.scrollTo({top: 0, behavior: "smooth"}); });
    q.addEventListener("input", function () { $("effacer").hidden = !q.value; });
    $("resume").addEventListener("click", function (e) {
      var b = e.target.closest(".pastille");
      if (b) { etat.retires.push(b.getAttribute("data-cle")); lancer(etat.texte, true); return; }
      var aj = e.target.closest("[data-ajout]");
      if (aj) { q.value = etat.texte.trim() + aj.getAttribute("data-ajout"); lancer(q.value); return; }
      var t = e.target.closest(".tuile");
      if (t) { etat.onglet = etat.onglet === t.getAttribute("data-t") ? "" : t.getAttribute("data-t"); etat.quartier = ""; afficher(); }
    });
    $("resultats").addEventListener("click", function (e) {
      if (e.target.closest(".carte-lien")) memoriser();
      var v = e.target.closest(".voir-quartier"), r = e.target.closest(".retour");
      if (v) { etat.quartier = v.getAttribute("data-q"); etat.montres = 0; $("resultats").innerHTML = ""; afficherSuite(); window.scrollTo({top: $("outils").offsetTop - 80, behavior: "smooth"}); }
      if (r) { etat.quartier = ""; afficher(); }
    });
    $("plus").addEventListener("click", afficherSuite);
    $("tri-choix").addEventListener("change", function () { etat.ordre = this.value; afficher(); });
    $("vue-compacte").addEventListener("click", function () { compacte = !compacte; try { localStorage.setItem("mai-compacte", compacte ? "1" : "0"); } catch (e) { /* stockage refusé */ } majVue(); });
    $("effacer").addEventListener("click", function () { q.value = ""; lancer(""); q.focus(); });
    $("langue").addEventListener("click", function () {
      LANG = LANG === "ar" ? "fr" : "ar";
      try { localStorage.setItem("mai-langue", LANG); } catch (e) { /* stockage refusé */ }
      nomsPer(); textes(); lancer(q.value, true);
    });
    // micro (dictée vocale) RETIRÉ le 03/11/2026 à la demande d'Ahmed : il ne fonctionnait pas bien
    var m = /[?&]q=([^&]*)/.exec(location.search);
    if (m) { try { q.value = decodeURIComponent(m[1].replace(/\+/g, " ")); } catch (e) { q.value = ""; } lancer(q.value); restaurer(); }
    machine();
    document.body.classList.add("pret");
  }
  window.MAI_AGENT = {lancer: lancer, chercher: chercher, filtrer: filtrer, criteres: criteres, etat: etat, paquet: paquet};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
