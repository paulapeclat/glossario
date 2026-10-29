// Painel do Glossário das Infâncias.
// Gráficos em SVG puro, sem bibliotecas externas. Todo texto entra via textContent.
"use strict";

(function () {
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);
  // cores de série em ordem fixa (1ª fonte, 2ª, 3ª, 4ª), validadas para daltonismo no fundo escuro
  const CORES = ["#1E9FCF", "#E04B8C", "#B88000", "#9A62F5", "#3E9E5A"];
  const estado = { dados: null, sem: 8 };
  const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
  const pct = (n) => (Math.round(n * 1000) / 10).toLocaleString("pt-BR") + "%";

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = String(texto);
    return n;
  }
  function sv(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  const soma = (a) => a.reduce((x, y) => x + y, 0);
  const corDe = (f, i) => CORES[i % CORES.length];

  // ---------------------------------------------------------------- tooltip
  const tip = $("tooltip");
  function mostrarTip(ev, titulo, linhas) {
    tip.replaceChildren();
    tip.append(el("p", "tip-t", titulo));
    linhas.forEach((l) => {
      const r = el("p", "tip-l");
      const k = el("i", "tip-k"); k.style.background = l.cor;
      r.append(k, el("b", null, l.valor), el("span", null, l.rotulo));
      tip.append(r);
    });
    tip.hidden = false;
    const caixa = ev.target.getBoundingClientRect();
    const x = ev.clientX != null && ev.clientX > 0 ? ev.clientX : caixa.left + caixa.width / 2;
    const y = ev.clientY != null && ev.clientY > 0 ? ev.clientY : caixa.top;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 12, Math.max(12, x - w / 2)) + "px";
    tip.style.top = Math.max(12, y - h - 14) + "px";
  }
  const esconderTip = () => { tip.hidden = true; };

  // ---------------------------------------------------------------- recorte por período
  function recorte() {
    const d = estado.dados, n = estado.sem;
    const ini = Math.max(0, d.semanas.length - n);
    const cortar = (a) => a.slice(ini);
    const textos = {};
    d.fontes.forEach((f) => { textos[f.id] = cortar(d.textos[f.id] || []); });
    const termos = d.termos.map((t) => {
      const serie = {};
      d.fontes.forEach((f) => { serie[f.id] = cortar(t.serie[f.id] || []); });
      const total = d.semanas.slice(ini).map((_, i) => soma(d.fontes.map((f) => serie[f.id][i] || 0)));
      return Object.assign({}, t, { serie, total, soma: soma(total) });
    });
    return { semanas: d.semanas.slice(ini), textos, termos };
  }
  const rotSemana = (iso) => {
    const [a, m, dd] = iso.split("-");
    return dd + "/" + m;
  };

  // ---------------------------------------------------------------- legendas
  function legenda(alvo) {
    const box = $(alvo);
    box.replaceChildren();
    estado.dados.fontes.forEach((f, i) => {
      const item = el("span", "leg-i");
      const k = el("i", "leg-k"); k.style.background = corDe(f, i);
      item.append(k, el("span", null, f.nome + " · " + f.tipo));
      box.append(item);
    });
  }

  // ---------------------------------------------------------------- KPIs
  function kpis(r) {
    const d = estado.dados;
    const textos = soma(d.fontes.map((f) => soma(r.textos[f.id])));
    const ativos = r.termos.filter((t) => t.soma > 0).length;
    const f = d.funil;
    const itens = [
      ["Textos analisados", fmt(textos), "títulos e resumos públicos"],
      ["Termos acompanhados", fmt(ativos), "com ocorrências no período"],
      ["Barrados pelo filtro", fmt(f.barrados), f.picos ? pct(f.barrados / f.picos) + " dos picos detectados" : "ainda sem picos"],
      ["Verbetes publicados", fmt(f.publicados), fmt(f.fila) + " aguardando revisão"],
    ];
    const box = $("kpis");
    box.replaceChildren();
    itens.forEach(([rot, val, sub]) => {
      const k = el("div", "kpi");
      k.append(el("p", "kpi-r", rot), el("p", "kpi-v", val), el("p", "kpi-s", sub));
      box.append(k);
    });
  }

  // ---------------------------------------------------------------- volume (barras empilhadas)
  function volume(r) {
    const box = $("g-volume");
    box.replaceChildren();
    const W = Math.max(300, box.clientWidth), H = 260;
    const m = { t: 18, r: 8, b: 30, l: 44 };
    const fontes = estado.dados.fontes;
    const tot = r.semanas.map((_, i) => soma(fontes.map((f) => r.textos[f.id][i] || 0)));
    const max = Math.max(1, ...tot);
    // passo "redondo" para ~4 linhas de grade (1, 2, 2,5 ou 5 × 10^n)
    const bruto = max / 4, mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    const passo = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((v) => v >= bruto);
    const linhasG = Math.ceil(max / passo);
    const topo = passo * linhasG;
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / topo);
    const bw = (W - m.l - m.r) / r.semanas.length;
    const larg = Math.min(44, bw * 0.62);
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img",
      "aria-label": "Textos analisados por semana e por fonte" });
    // grade
    for (let i = 0; i <= linhasG; i++) {
      const v = passo * i, yy = y(v);
      svg.append(sv("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: "grade" }));
      const t = sv("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end", class: "eixo" });
      t.textContent = fmt(v);
      svg.append(t);
    }
    r.semanas.forEach((s, i) => {
      const cx = m.l + bw * i + bw / 2;
      let base = 0;
      const g = sv("g", { class: "coluna", tabindex: "0" });
      fontes.forEach((f, fi) => {
        const v = r.textos[f.id][i] || 0;
        if (!v) return;
        const y0 = y(base), y1 = y(base + v);
        const topoSeg = fi === fontes.length - 1 || fontes.slice(fi + 1).every((ff) => !(r.textos[ff.id][i]));
        const h = Math.max(0, y0 - y1 - 2);
        g.append(sv("rect", { x: cx - larg / 2, y: y1 + (topoSeg ? 0 : 0), width: larg, height: h,
          rx: topoSeg ? 4 : 0, fill: corDe(f, fi) }));
        base += v;
      });
      // área de toque maior que a barra
      g.append(sv("rect", { x: m.l + bw * i, y: m.t, width: bw, height: H - m.t - m.b, fill: "transparent" }));
      const linhas = fontes.map((f, fi) => ({ cor: corDe(f, fi), rotulo: f.nome, valor: fmt(r.textos[f.id][i] || 0) }));
      const titulo = "Semana de " + rotSemana(s) + " · " + fmt(tot[i]) + " textos";
      g.addEventListener("pointermove", (ev) => mostrarTip(ev, titulo, linhas));
      g.addEventListener("pointerleave", esconderTip);
      g.addEventListener("focus", (ev) => mostrarTip(ev, titulo, linhas));
      g.addEventListener("blur", esconderTip);
      svg.append(g);
      // rótulos de semana contados a partir da última, para nunca colidirem
      const salto = Math.max(1, Math.ceil(r.semanas.length * 46 / (W - m.l - m.r)));
      if ((r.semanas.length - 1 - i) % salto === 0) {
        const t = sv("text", { x: cx, y: H - 10, "text-anchor": "middle", class: "eixo" });
        t.textContent = rotSemana(s);
        svg.append(t);
      }
    });
    // rótulo direto só no último total
    const ult = tot.length - 1;
    const tl = sv("text", { x: m.l + bw * ult + bw / 2, y: y(tot[ult]) - 6, "text-anchor": "middle", class: "rotulo-v" });
    tl.textContent = fmt(tot[ult]);
    svg.append(tl);
    box.append(svg);

    // tabela acessível
    const tab = el("table", "tabela");
    const cab = el("tr");
    cab.append(el("th", null, "Semana"));
    fontes.forEach((f) => cab.append(el("th", null, f.nome)));
    cab.append(el("th", null, "Total"));
    const thead = el("thead"); thead.append(cab);
    const tbody = el("tbody");
    r.semanas.forEach((s, i) => {
      const tr = el("tr");
      tr.append(el("td", null, rotSemana(s)));
      fontes.forEach((f) => tr.append(el("td", null, fmt(r.textos[f.id][i] || 0))));
      tr.append(el("td", null, fmt(tot[i])));
      tbody.append(tr);
    });
    tab.append(thead, tbody);
    $("t-volume").replaceChildren(tab);
  }

  // ---------------------------------------------------------------- proporção vídeo x texto
  function proporcao(r) {
    const fontes = estado.dados.fontes;
    const somas = fontes.map((f) => soma(r.termos.map((t) => soma(t.serie[f.id] || []))));
    const bruto = soma(somas);
    const total = bruto || 1;
    const box = $("g-proporcao");
    box.replaceChildren();
    const barra = el("div", "prop-barra");
    fontes.forEach((f, i) => {
      const s = el("span", "prop-seg");
      s.style.flexGrow = String(somas[i] || 0.0001);
      s.style.background = corDe(f, i);
      s.tabIndex = 0;
      const linhas = [{ cor: corDe(f, i), rotulo: "ocorrências", valor: fmt(somas[i]) }];
      s.addEventListener("pointermove", (ev) => mostrarTip(ev, f.nome + " · " + pct(somas[i] / total), linhas));
      s.addEventListener("pointerleave", esconderTip);
      s.addEventListener("focus", (ev) => mostrarTip(ev, f.nome + " · " + pct(somas[i] / total), linhas));
      s.addEventListener("blur", esconderTip);
      barra.append(s);
    });
    const rots = el("div", "prop-rots");
    fontes.forEach((f, i) => {
      const r1 = el("div", "prop-rot");
      const k = el("i", "leg-k"); k.style.background = corDe(f, i);
      const nome = el("p", "prop-nome"); nome.append(k, document.createTextNode(f.nome));
      r1.append(el("p", "prop-pct", pct(somas[i] / total)), nome, el("p", "prop-n", fmt(somas[i]) + " ocorrências"));
      rots.append(r1);
    });
    box.append(barra, rots);
    const lider = somas.indexOf(Math.max(...somas));
    $("n-proporcao").textContent = bruto > 0
      ? "No período, " + pct(somas[lider] / total) + " das ocorrências vieram de " + fontes[lider].nome + " (" + fontes[lider].tipo + ")."
      : "Ainda não há ocorrências no período.";
  }

  // ---------------------------------------------------------------- funil e barrados
  function barrasH(alvo, itens, cor, base) {
    const box = $(alvo);
    box.replaceChildren();
    const max = Math.max(1, base || Math.max(...itens.map((i) => i[1])));
    itens.forEach(([rot, v]) => {
      const linha = el("div", "bh");
      const trilho = el("div", "bh-trilho");
      const b = el("i", "bh-b");
      b.style.width = Math.max(1.5, (v / max) * 100) + "%";
      b.style.background = cor;
      trilho.append(b);
      linha.append(el("span", "bh-r", rot), trilho, el("b", "bh-v", fmt(v)));
      box.append(linha);
    });
    if (!itens.length) box.append(el("p", "pc-nota", "Nada barrado ainda."));
  }
  function funil() {
    const f = estado.dados.funil;
    barrasH("g-funil", [
      ["Picos detectados", f.picos],
      ["Barrados pelo filtro", f.barrados],
      ["Na fila de revisão", f.fila],
      ["Publicados", f.publicados],
    ], "#9A62F5", f.picos);
    barrasH("g-barrados", Object.entries(estado.dados.barrados_por_categoria || {}), "#B88000");
  }

  // ---------------------------------------------------------------- ranking
  function sparkline(valores) {
    const W = 120, H = 34, p = 4;
    const max = Math.max(1, ...valores);
    const x = (i) => p + (W - 2 * p) * (valores.length === 1 ? 0.5 : i / (valores.length - 1));
    const y = (v) => H - p - (H - 2 * p) * (v / max);
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "spark", "aria-hidden": "true" });
    const pts = valores.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1));
    svg.append(sv("polygon", { points: `${x(0)},${H - p} ${pts.join(" ")} ${x(valores.length - 1)},${H - p}`, class: "spark-a" }));
    svg.append(sv("polyline", { points: pts.join(" "), class: "spark-l" }));
    const u = valores.length - 1;
    svg.append(sv("circle", { cx: x(u), cy: y(valores[u]), r: 3.2, class: "spark-p" }));
    return svg;
  }
  function ranking(r) {
    const fontes = estado.dados.fontes;
    const box = $("ranking");
    box.replaceChildren();
    const lista = r.termos.filter((t) => t.soma > 0).sort((a, b) => b.soma - a.soma);
    const max = Math.max(1, ...lista.map((t) => t.soma));
    if (!lista.length) { box.append(el("p", "pc-nota", "Nenhum termo com ocorrências no período.")); return; }
    lista.forEach((t, i) => {
      const linha = el("div", "rk");
      linha.dataset.tipo = t.tipo || "";
      linha.append(el("span", "rk-pos", String(i + 1)));
      const nome = el("div", "rk-nome");
      nome.append(el("b", null, t.termo));
      const tags = el("span", "rk-tags");
      tags.append(el("span", "chip", t.tipo || "novo"));
      if (t.status === "pendente") tags.append(el("span", "rk-rev", "em revisão"));
      nome.append(tags);
      linha.append(nome);
      linha.append(sparkline(t.total));
      // divisão por fonte
      const div = el("div", "rk-div");
      const barra = el("div", "rk-barra");
      barra.style.width = Math.max(8, (t.soma / max) * 100) + "%";
      const linhasTip = [];
      fontes.forEach((f, fi) => {
        const v = soma(t.serie[f.id] || []);
        const seg = el("i");
        seg.style.flexGrow = String(v || 0.0001);
        seg.style.background = corDe(f, fi);
        barra.append(seg);
        linhasTip.push({ cor: corDe(f, fi), rotulo: f.nome, valor: fmt(v) + " (" + pct(v / (t.soma || 1)) + ")" });
      });
      barra.tabIndex = 0;
      barra.addEventListener("pointermove", (ev) => mostrarTip(ev, t.termo + " · " + fmt(t.soma), linhasTip));
      barra.addEventListener("pointerleave", esconderTip);
      barra.addEventListener("focus", (ev) => mostrarTip(ev, t.termo + " · " + fmt(t.soma), linhasTip));
      barra.addEventListener("blur", esconderTip);
      div.append(barra);
      linha.append(div);
      linha.append(el("b", "rk-total", fmt(t.soma)));
      const n = t.total.length;
      const atual = t.total[n - 1] || 0, ant = t.total[n - 2] || 0;
      const varia = ant ? (atual - ant) / ant : (atual ? 1 : 0);
      const v = el("span", "rk-var " + (varia > 0.02 ? "sobe" : varia < -0.02 ? "desce" : "estavel"),
        (varia > 0.02 ? "▲ " : varia < -0.02 ? "▼ " : "■ ") + pct(Math.abs(varia)));
      v.title = "Variação da última semana em relação à anterior";
      linha.append(v);
      box.append(linha);
    });
  }

  // ---------------------------------------------------------------- ciclo
  function renderizar() {
    const r = recorte();
    kpis(r); volume(r); proporcao(r); funil(); ranking(r);
  }

  async function iniciar() {
    try {
      const resp = await fetch("data/metricas.json", { cache: "no-cache", credentials: "omit" });
      if (!resp.ok) throw new Error(resp.status);
      estado.dados = await resp.json();
      estado.sem = Math.min(estado.sem, estado.dados.semanas.length);
      $("aviso-exemplo").hidden = !estado.dados.exemplo;
      const aq = estado.dados.aquecimento;
      if (!estado.dados.exemplo && aq && aq.dias < aq.meta) {
        $("aquec-txt").textContent = aq.dias + " de " + aq.meta + " dias de histórico. Até completar, o sistema só acumula contagens e não sugere termos novos.";
        $("aviso-aquecimento").hidden = false;
      }
      $("gerado").textContent = "Atualizado em " + new Date(estado.dados.gerado_em).toLocaleString("pt-BR");
      legenda("leg-volume"); legenda("leg-ranking");
      renderizar();
      let t;
      window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(renderizar, 150); });
    } catch (_) {
      $("kpis").replaceChildren(el("p", "pc-nota", "Não foi possível carregar as métricas agora."));
    }
  }

  document.querySelectorAll("#periodo [data-sem]").forEach((b) => {
    b.addEventListener("click", () => {
      estado.sem = Number(b.dataset.sem);
      document.querySelectorAll("#periodo [data-sem]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      if (estado.dados) renderizar();
    });
  });
  iniciar();
})();
