/* Mon agent immobilier — compréhension d'une phrase de recherche (français, arabe, dialecte, fautes de frappe).
   comprendre(texte, lieux) -> {t, types, sortes, c, cMin, pMin, pMax, sMin, sMax, at, sansAt, et, zones, mots}
   Tout se passe dans le navigateur : rien n'est envoyé. */
(function (racine) {
  "use strict";

  function norm(s) {
    s = String(s || "").toLowerCase().replace(/²/g, "2").replace(/œ/g, "oe");
    s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    s = s.replace(/[ً-ٰٟـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
    s = s.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x660); });
    s = s.replace(/(?<![+\w])(\d{1,3})\s+(\d{3})(?!\d)/g, "$1$2");     // 1 200 -> 1200 (jamais « S+2 300 »)
    s = s.replace(/(\d),(\d)/g, "$1.$2");
    s = s.replace(/[^a-z0-9؀-ۿ+.<>\s]/g, " ").replace(/\.(?!\d)/g, " ");
    return s.replace(/\s+/g, " ").trim();
  }
  function ecraser(w) { return w.replace(/(.)\1+/g, "$1"); }         // mannouba -> manouba, ennasr -> enasr
  function sansArticle(w) { return w.replace(/^(la|le|les|el|l|al|cite|cité)\s+/, "").replace(/^ال(?=..)/, ""); }

  // ---- vocabulaire (formes normalisées, sans doubles lettres)
  var LOUER = ["louer", "location", "loue", "loyer", "a louer", "kra", "kraa", "kiraa", "lel kra", "lil kra", "كراء", "للكراء", "ايجار", "للايجار", "par mois", "mensuel", "annuel", "vacances", "saison", "nuit"];
  var VENDRE = ["vendre", "vente", "achat", "acheter", "acquerir", "a vendre", "bi3", "lel bi3", "lil bi3", "nbi3", "chri", "nechri", "nichri", "بيع", "للبيع", "شراء", "نشري", "نبيع"];
  var TYPES = [
    ["appartement", ["appartement", "apartement", "appart", "appt", "apt", "app", "studio", "penthouse", "chka", "chekka", "شقه", "ستوديو"]],
    ["maison", ["maison", "villa", "vila", "fila", "filla", "dar", "houch", "منزل", "دار", "فيلا", "حوش"]],
    ["terrain", ["terrain", "lot", "lotissement", "parcelle", "ardh", "ard", "ar4", "ارض", "قطعه ارض", "قطعه"]],
    ["agricole", ["agricole", "ferme", "olivier", "oliviers", "verger", "ضيعه", "فلاحيه", "سانيه", "هنشير"]],
    ["terrainind", ["terrain industriel", "terrain commercial", "ارض صناعيه"]],
    ["bureau", ["bureau", "bureaux", "plateau", "plateau bureau", "مكتب", "مكاتب"]],
    ["commerce", ["local commercial", "local", "boutique", "magasin", "commerce", "fonds de commerce", "showroom", "7anout", "hanout", "محل", "محل تجاري", "دكان", "حانوت"]],
    ["industriel", ["usine", "depot", "entrepot", "hangar", "atelier", "مصنع", "مخزن", "مستودع", "هنقار"]],
    ["autre", ["immeuble", "hotel", "عماره", "نزل"]]
  ];
  var SORTES = [["studio", ["studio", "ستوديو"]], ["duplex", ["duplex", "دوبلكس"]], ["penthouse", ["penthouse", "بنتهاوس"]],
    ["etage_villa", ["etage de villa", "etage villa", "طابق فيلا"]], ["villa", ["villa", "vila", "fila", "filla", "فيلا"]], ["maison_trad", ["houch", "dar arbi", "maison arabe", "حوش", "دار عربي"]]];
  // atouts : même ordre que les bits du robot (mer, piscine, jardin, garage, ascenseur, terrasse, meublé, neuf)
  var ATOUTS = [
    ["mer", ["mer", "vue mer", "vue sur mer", "bord de mer", "plage", "pieds dans l eau", "front de mer", "b7ar", "bhar", "lb7ar", "lbhar", "بحر", "البحر", "شاطي", "على البحر"]],
    ["piscine", ["piscine", "مسبح", "بيسين"]],
    ["jardin", ["jardin", "حديقه", "جنينه", "جردة"]],
    ["garage", ["garage", "parking", "box", "stationnement", "باركينغ", "قاراج", "كراج", "مستودع سيارة"]],
    ["ascenseur", ["ascenseur", "مصعد", "اسانسور"]],
    ["terrasse", ["terrasse", "تراس", "سطح"]],
    ["meuble", ["meuble", "meublee", "meubles", "مفروش", "مفروشه", "مفروشة"]],
    ["neuf", ["neuf", "neuve", "nouvelle construction", "jamais habite", "jamais habitee", "jdid", "jdida", "جديد", "جديده"]]
  ];
  var MOTS_VIDES = ["avec", "sans", "pour", "dans", "chez", "une", "un", "des", "de", "du", "le", "la", "les", "et", "ou", "a", "au", "aux", "en", "je", "cherche", "recherche",
    "veux", "voudrais", "besoin", "bien", "region", "quartier", "zone", "ville", "pres", "proche", "cote", "centre", "pas", "cher", "prix", "budget", "tres", "bon", "bonne",
    "beau", "belle", "grand", "grande", "petit", "petite", "etat", "standing", "haut", "dt", "dinars", "tnd", "mois", "m2", "metres", "chambre", "chambres", "piece", "pieces",
    "el", "al", "fi", "f", "bi", "fil", "nheb", "n7eb", "nhab", "9rib", "qrib", "m3a", "lel", "lil", "b", "في", "من", "مع", "على", "الى", "او", "و", "نحب", "نلوج", "نحوس", "عندي", "قريب", "حي", "منطقه", "قرب", "بلاصه", "غرفه", "غرف", "دينار", "متر", "s", "f", "max", "min"];

  function contient(t, phrase) { return (" " + t + " ").indexOf(" " + phrase + " ") >= 0; }
  function retirer(t, phrase) { return (" " + t + " ").split(" " + phrase + " ").join(" ").replace(/\s+/g, " ").trim(); }
  function lev1(a, b) {                                     // distance d'édition <= 1 ?
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, diff = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++diff > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    return diff + (la - i) + (lb - j) <= 1;
  }

  // ---- dictionnaire des lieux (fait une fois par jeu de données)
  function dictionnaire(D) {
    if (D._dico) return D._dico;
    var dico = {}, simples = [], multiples = [];
    function ajouter(nom, entree) {
      var n = norm(nom);
      if (!n) return;
      var formes = [n, sansArticle(n)], m = /^(la|le|el|l)\s+(.+)$/.exec(n);
      if (m) formes.push(m[1] + m[2], "l" + m[2], "el" + m[2]);
      if (/^djerba\s+/.test(n)) formes.push(n.replace(/^djerba\s+/, ""));
      formes.forEach(function (v) {
        v = v.split(" ").map(ecraser).join(" ");
        if (v.length < 3 || MOTS_VIDES.indexOf(v) >= 0) return;
        (dico[v] = dico[v] || []).push(entree);
        if (v.indexOf(" ") < 0 && v.length >= 5) simples.push(v);
        else if (v.indexOf(" ") > 0) multiples.push(v);
      });
    }
    (D.g || []).forEach(function (g, k) {
      var e = {k: "g", g: k};
      ajouter(g[1], e); ajouter(g[2], e); ajouter(g[0].replace(/-/g, " "), e);
    });
    var delegs = {};
    (D.l || []).forEach(function (l, k) {
      var e = {k: "l", g: l[0], l: k};
      ajouter(l[2], e); ajouter(l[3], e); ajouter(l[1].replace(/-/g, " "), e);
      if (l[4]) delegs[l[0] + "|" + l[4]] = {k: "d", g: l[0], d: l[4]};
    });
    Object.keys(delegs).forEach(function (c) { ajouter(delegs[c].d, delegs[c]); });
    // façons courantes d'écrire un lieu (02/11/2026, mesure interne) : jerba, sfakes, « le lac »
    var AUTRES = {"jerba": ["medenine", "djerba"], "sfakes": ["sfax"], "sfaks": ["sfax"], "safakes": ["sfax"], "nabel": ["nabeul"], "lac": ["tunis", "les-berges-du-lac"]};
    Object.keys(AUTRES).forEach(function (w) {
      var c = AUTRES[w], g = (D.g || []).findIndex(function (x) { return x[0] === c[0]; });
      if (g < 0) return;
      var l = c[1] ? (D.l || []).findIndex(function (x) { return x[0] === g && x[1] === c[1]; }) : -1;
      ajouter(w, c[1] && l >= 0 ? {k: "l", g: g, l: l} : {k: "g", g: g});
    });
    (D.al || []).forEach(function (x) {
      ajouter(x[1], typeof x[2] === "number" ? {k: "l", g: x[0], l: x[2]} : (delegs[x[0] + "|" + x[2]] || {k: "d", g: x[0], d: x[2]}));
    });
    var nq = {};
    (D.a || []).forEach(function (a) { if (a[4] >= 0) nq[a[4]] = (nq[a[4]] || 0) + 1; });
    D._poids = function (e) {
      if (e.k === "l") return nq[e.l] || 0;
      if (e.k === "g") return 1e9;
      return (D.l || []).reduce(function (t, q, k) { return t + (q[0] === e.g && q[4] === e.d ? nq[k] || 0 : 0); }, 0);
    };
    D._dico = {mots: dico, simples: simples.filter(function (v, i, a) { return a.indexOf(v) === i; }), multiples: multiples.filter(function (v, i, a) { return a.indexOf(v) === i; })};
    return D._dico;
  }

  function nombre(s) { return parseFloat(String(s).replace(/\s/g, "")); }
  function unite(u) {
    u = (u || "").trim();
    if (/^(mille|milles|md|mdt|k|alf|الف|الاف|اف)$/.test(u)) return 1000;
    if (/^(million|millions|m|mio|مليون|ملاين|ملايين|مليارات)$/.test(u)) return 1e6;
    return 1;
  }

  function comprendre(texte, D) {
    var r = {t: null, types: [], sortes: [], c: null, cMin: null, pMin: null, pMax: null, sMin: null, sMax: null,
             at: [], sansAt: [], et: null, zones: [], mots: [], vide: true};
    var t = norm(texte);
    if (!t) return r;
    r.vide = false;
    var NUM = "(\\d+(?:\\.\\d+)?)", U = "\\s*(mille|milles|md|mdt|k|alf|الف|الاف|million|millions|mio|مليون|ملايين|dt|dinars?|tnd|د|دينار)?";
    var m;
    // surface (avant le prix : « 120 m2 » n'est pas un prix)
    var SURF = "\\s*(?:m2|m 2|metres? carres?|metres?|mc|متر مربع|متر|م2|م)(?!\\w)";
    if ((m = new RegExp("(?:plus de|au moins|minimum|min|>|اكثر من)\\s*" + NUM + SURF).exec(t))) { r.sMin = nombre(m[1]); t = t.replace(m[0], " "); }
    else if ((m = new RegExp("(?:moins de|maximum|max|<|اقل من)\\s*" + NUM + SURF).exec(t))) { r.sMax = nombre(m[1]); t = t.replace(m[0], " "); }
    else if ((m = new RegExp("entre\\s*" + NUM + "\\s*(?:et|a|-)\\s*" + NUM + SURF).exec(t))) { r.sMin = nombre(m[1]); r.sMax = nombre(m[2]); t = t.replace(m[0], " "); }
    else if ((m = new RegExp(NUM + SURF).exec(t))) { var sv = nombre(m[1]); r.sMin = Math.round(sv * 0.8); r.sMax = Math.round(sv * 1.25); t = t.replace(m[0], " "); }
    // pièces : S+1, s1, s 2, F3, 3 chambres, studio
    if ((m = /(?:^|\s)s\s*\+?\s*(\d{1,2})(\s*(?:et plus|ou plus|\+|minimum|au moins))?(?=\s|$)/.exec(t))) { if (m[2]) r.cMin = +m[1]; else r.c = +m[1]; t = t.replace(m[0], " "); }
    else if ((m = /(?:^|\s)f\s*(\d)(?=\s|$)/.exec(t))) { r.c = Math.max(0, +m[1] - 1); t = t.replace(m[0], " "); }
    else if ((m = /(?:au moins|minimum|plus de)?\s*(\d{1,2})\s*(?:chambres?|pieces?|غرف|بيوت)(?=\s|$)/.exec(t))) { if (/au moins|minimum|plus de/.test(m[0])) r.cMin = +m[1]; else r.c = +m[1]; t = t.replace(m[0], " "); }
    else if (/(?:^|\s)(?:une chambre|غرفه واحده|بيت واحد)(?=\s|$)/.test(t)) r.c = 1;
    else if (/(?:^|\s)(?:غرفتين|زوز بيوت|deux chambres)(?=\s|$)/.test(t)) r.c = 2;
    // prix
    function poser(v, u, quoi) {
      v *= unite(u);
      if (quoi === "max") r.pMax = v; else if (quoi === "min") r.pMin = v;
    }
    if ((m = new RegExp("entre\\s*" + NUM + U + "\\s*(?:et|a|-|و)\\s*" + NUM + U).exec(t))) { var u2 = m[4] || m[2]; poser(nombre(m[1]), m[2] || u2, "min"); poser(nombre(m[3]), u2, "max"); t = t.replace(m[0], " "); }
    else {
      if ((m = new RegExp("(?:moins de|max(?:imum)?|jusqu a|pas plus de|budget(?: de| max)?|ma tfoutech|matfoutech|ma yfoutech|<|اقل من|ميزانيه|حد اقصي|ما يفوتش)\\s*" + NUM + U).exec(t))) { poser(nombre(m[1]), m[2], "max"); t = t.replace(m[0], " "); }
      if ((m = new RegExp("(?:plus de|min(?:imum)?|au moins|a partir de|>|اكثر من|من)\\s*" + NUM + U).exec(t))) { poser(nombre(m[1]), m[2], "min"); t = t.replace(m[0], " "); }
      if (r.pMax === null && r.pMin === null && (m = new RegExp(NUM + "\\s*(mille|milles|md|mdt|k|alf|الف|الاف|million|millions|mio|مليون|ملايين|dt|dinars?|tnd|دينار)(?=\\s|$)").exec(t))) {
        poser(nombre(m[1]), m[2], "max"); r.pMax = Math.round(r.pMax * 1.1); t = t.replace(m[0], " ");
      }
    }
    // transaction
    LOUER.forEach(function (w) { if (contient(t, w)) { r.t = "l"; t = retirer(t, w); } });
    VENDRE.forEach(function (w) { if (contient(t, w)) { r.t = r.t === "l" ? null : "v"; t = retirer(t, w); } });
    // sortes, types (la phrase la plus longue d'abord)
    SORTES.forEach(function (s) {
      s[1].forEach(function (w) {
        w = norm(w);
        if (!contient(t, w)) return;
        if (r.sortes.indexOf(s[0]) < 0) r.sortes.push(s[0]);
        if (s[0] === "etage_villa") t = retirer(t, w);       // « étage de villa » : ni maison ni appartement imposé (les deux existent)
      });
    });
    if (r.sortes.indexOf("etage_villa") >= 0) r.sortes = r.sortes.filter(function (s) { return s !== "villa"; });
    var tous = [];
    TYPES.forEach(function (ty) { ty[1].forEach(function (w) { tous.push([norm(w), ty[0]]); }); });
    tous.sort(function (a, b) { return b[0].length - a[0].length; });
    tous.forEach(function (x) { if (contient(t, x[0])) { if (r.types.indexOf(x[1]) < 0) r.types.push(x[1]); t = retirer(t, x[0]); } });
    if (r.types.indexOf("terrainind") >= 0) r.types = r.types.filter(function (y) { return y !== "terrain" && y !== "industriel"; });
    if (r.types.indexOf("agricole") >= 0) r.types = r.types.filter(function (y) { return y !== "terrain"; });
    // prix sans unité claire : « moins de 300 » pour un achat (ou un terrain) = 300 000 DT ; prix connu sans « louer / vendre » :
    // moins de 20 000 DT = un loyer, au-delà = un achat
    ["pMax", "pMin"].forEach(function (k) {
      var v = r[k];
      if (v !== null && r.t !== "l" && v < 5000 && (r.t === "v" || r.types.some(function (y) { return /terrain|agricole/.test(y); }))) r[k] = v * 1000;
    });
    if (!r.t && (r.pMax || r.pMin)) r.t = (r.pMax || r.pMin) < 20000 ? "l" : "v";
    // atouts (« non meublé », « sans piscine » = l'annonce ne doit pas l'avoir)
    ATOUTS.forEach(function (a, k) {
      a[1].slice().sort(function (x, y) { return y.length - x.length; }).forEach(function (w) {
        w = norm(w);
        var formes = /[؀-ۿ]/.test(w) ? [w, "ب" + w, "و" + w, "وب" + w, "بال" + w, "ل" + w] : [w];
        var neg = new RegExp("(?:^|\\s)(?:non|sans|pas de|غير|بلا|بدون)\\s+" + w.replace(/\s+/g, "\\s+") + "(?=\\s|$)");
        if (neg.test(t)) { if (r.sansAt.indexOf(k) < 0) r.sansAt.push(k); t = t.replace(neg, " "); }
        else formes.forEach(function (f) { if (contient(t, f)) { if (r.at.indexOf(k) < 0) r.at.push(k); t = retirer(t, f); } });
      });
    });
    if (contient(t, "vide")) { if (r.sansAt.indexOf(6) < 0) r.sansAt.push(6); t = retirer(t, "vide"); }
    // étage
    if ((m = /(?:rdc|rez de chaussee|rez de chausse|ارضي|الطابق الارضي)(?=\s|$)/.exec(t))) { r.et = 0; t = t.replace(m[0], " "); }
    else if ((m = /(\d{1,2})\s*(?:er|ere|e|eme|em)?\s*etage/.exec(t))) { r.et = +m[1]; t = t.replace(m[0], " "); }
    // lieux : morceaux de 4 mots à 1 mot, puis une faute de frappe permise sur un mot long
    var dico = dictionnaire(D), mots = t.split(" ").filter(Boolean).map(ecraser), pris = mots.map(function () { return false; }), trouves = [];
    for (var n = 4; n >= 1; n--) {
      for (var i = 0; i + n <= mots.length; i++) {
        if (pris.slice(i, i + n).some(Boolean)) continue;
        var ph = mots.slice(i, i + n).join(" ");
        if (n === 1 && (MOTS_VIDES.indexOf(ph) >= 0 || /^\d/.test(ph))) continue;
        var e = dico.mots[ph];
        if (!e && n === 1 && ph.length >= 5) {
          var proche = dico.simples.filter(function (v) { return Math.abs(v.length - ph.length) <= 1 && (v[0] === ph[0] || v.slice(1) === ph || ph.slice(1) === v) && lev1(v, ph); });
          if (proche.length === 1) e = dico.mots[proche[0]];
        }
        if (!e && n >= 2) {
          // « hammem sousse » -> Hammam Sousse : chaque mot à une faute près au plus (les mots courts exacts)
          var ws = ph.split(" ");
          var proches = dico.multiples.filter(function (v) {
            var vs = v.split(" ");
            return vs.length === n && vs.every(function (x, k) { return x === ws[k] || (x.length >= 4 && x[0] === ws[k][0] && lev1(x, ws[k])); });
          });
          if (proches.length === 1) e = dico.mots[proches[0]];
        }
        if (e) { trouves.push(e); e.ph = ph; for (var j = i; j < i + n; j++) pris[j] = true; }
      }
    }
    var gs = [], fins = [];
    trouves.forEach(function (lst) {
      // un nom qui est AUSSI un gouvernorat (Sousse, Ariana, Bizerte…) : le gouvernorat entier
      var g = lst.filter(function (e) { return e.k === "g"; });
      if (g.length) { if (gs.indexOf(g[0].g) < 0) gs.push(g[0].g); return; }
      fins.push(lst);
    });
    fins.forEach(function (lst) {
      var dedans = gs.length ? lst.filter(function (e) { return gs.indexOf(e.g) >= 0; }) : lst;
      if (!dedans.length && lst.ph) gs.forEach(function (g) {
        var complet = dico.mots[lst.ph + " " + ecraser(norm(D.g[g][1])).replace(/^(la|le|el)\s+/, "")];
        if (complet) dedans = dedans.concat(complet.filter(function (e) { return e.g === g; }));
      });
      if (!dedans.length) return;
      var parG = {};
      dedans.forEach(function (e) { parG[e.g] = (parG[e.g] || 0) + D._poids(e); });
      var gBon = +Object.keys(parG).sort(function (a, b) { return parG[b] - parG[a]; })[0];
      dedans.filter(function (e) { return e.g === gBon; }).forEach(function (e) { r.zones.push(e); });
    });
    var vus = {}, dels = r.zones.filter(function (z) { return z.k === "d"; });
    r.zones = r.zones.filter(function (z) {
      var cle = z.k + "|" + z.g + "|" + (z.l !== undefined ? z.l : z.d);
      if (vus[cle]) return false;
      vus[cle] = 1;
      return !(z.k === "l" && dels.some(function (d) { var q = D.l[z.l]; return q && d.g === z.g && q[4] === d.d; }));
    });
    var gFins = r.zones.map(function (z) { return z.g; });
    gs.forEach(function (g) { if (gFins.indexOf(g) < 0) r.zones.push({k: "g", g: g}); });
    r.mots = mots.filter(function (w, k) { return !pris[k] && MOTS_VIDES.indexOf(w) < 0 && w.length > 1; });
    return r;
  }

  var api = {comprendre: comprendre, norm: norm, ATOUTS: ATOUTS.map(function (a) { return a[0]; })};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  racine.MAI_COMPRENDRE = api;
})(typeof window !== "undefined" ? window : globalThis);
