// Glossário das Infâncias · Paula Peclat EdTech
// Segurança: o conteúdo entra na página SOMENTE via textContent/createElement
// (nunca innerHTML), e links só são aceitos se forem https.
"use strict";

(function () {
  const $ = (id) => document.getElementById(id);
  const estado = { termos: [], tipo: "todos", busca: "", ver: "tudo", previa: false };

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = String(texto);
    return n;
  }

  function linkSeguro(url, texto) {
    let u;
    try { u = new URL(url); } catch (_) { return el("span", null, texto); }
    if (u.protocol !== "https:") return el("span", null, texto);
    const a = el("a", null, texto);
    a.href = u.href;
    a.rel = "noopener noreferrer nofollow";
    a.target = "_blank";
    return a;
  }

  const semAcento = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const idSeguro = (s) => "t-" + semAcento(s).replace(/[^a-z0-9]+/g, "-");
  const lista = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
  const fmtPico = (p) => String(Math.round(p * 10) / 10).replace(".", ",") + "x na semana";

  function cartao(t) {
    const pend = t.status === "pendente";
    const art = el("article", "cartao" + (pend ? " pendente" : ""));
    art.id = idSeguro(t.termo);
    art.dataset.tipo = t.tipo || "";

    const topo = el("div", "cartao__topo");
    if (pend) topo.append(el("span", "carimbo", "aguardando revisão"));
    topo.append(el("h3", null, t.termo));
    const tags = el("div", "tags");
    tags.append(el("span", "chip", t.tipo || "sem tipo"));
    if (t.pico && t.pico >= 2) tags.append(el("span", "pico", fmtPico(t.pico)));
    topo.append(tags);
    if (lista(t.variacoes).length) topo.append(el("p", "variacoes", "Também: " + lista(t.variacoes).join(" · ")));
    art.append(topo);

    const corpo = el("div", "cartao__corpo");
    corpo.append(t.significado ? el("p", "significado", t.significado)
                               : el("p", "significado vazio", "Significado ainda não escrito."));
    if (t.como_conversar) {
      const box = el("div", "conversa");
      box.append(el("p", "conversa__rotulo", "Como conversar"), el("p", null, t.como_conversar));
      corpo.append(box);
    }

    const meta = el("dl", "meta");
    const par = (rotulo, valor) => {
      const v = Array.isArray(valor) ? valor.filter(Boolean).join(", ") : valor;
      if (v) meta.append(el("dt", null, rotulo), el("dd", null, v));
    };
    par("Origem", t.origem);
    par("Onde circula", t.plataformas);
    par("Idade", t.faixa_etaria);
    par("Desde", t.surgiu_em);
    const fontes = lista(t.fontes);
    if (meta.childNodes.length || fontes.length) {
      const det = el("details");
      det.append(el("summary", null, "Origem e fontes"), meta);
      if (fontes.length) {
        const f = el("div", "fontes");
        fontes.forEach((fo) => f.append(linkSeguro(fo.url, fo.titulo || "fonte")));
        det.append(f);
      }
      corpo.append(det);
    }

    if (pend) {
      const c = el("div", "curadoria");
      const info = ["Detectado em " + (t.detectado_em || "?"),
                    (t.ocorrencias_7d || 0) + " ocorrências em 7 dias",
                    "moderação IA: " + (t.moderacao || "?")];
      c.append(el("p", null, info.join(" · ")));
      if (t.nota_curadoria) c.append(el("p", null, "Nota: " + t.nota_curadoria));
      lista(t.exemplos_de_contexto).forEach((x) => c.append(el("p", null, "“" + x + "”")));
      const refs = lista(t.referencias_sugeridas);
      if (refs.length) {
        c.append(el("p", null, "Artigos que citam o termo:"));
        refs.forEach((r) => {
          const p = el("p");
          p.append(linkSeguro(r.url, (r.titulo || "artigo") + (r.ano ? " (" + r.ano + ")" : "")));
          c.append(p);
        });
      }
      corpo.append(c);
    }
    art.append(corpo);
    return art;
  }

  function visiveis() {
    return estado.termos.filter((t) => estado.ver === "tudo" || t.status === estado.ver);
  }

  function renderizar() {
    const q = semAcento(estado.busca.trim());
    const alvo = $("lista");
    alvo.replaceChildren();
    const filtrados = visiveis().filter((t) => {
      if (estado.tipo !== "todos" && t.tipo !== estado.tipo) return false;
      if (!q) return true;
      return semAcento([t.termo, lista(t.variacoes).join(" "), t.significado].join(" ")).includes(q);
    });
    filtrados.forEach((t) => alvo.append(cartao(t)));
    $("status").textContent = filtrados.length
      ? filtrados.length + (filtrados.length === 1 ? " termo" : " termos")
      : "Nenhum termo encontrado. Se a criançada começar a usar, ele aparece aqui.";
  }

  function emAlta() {
    const box = $("alta");
    box.replaceChildren();
    visiveis().filter((t) => t.pico).sort((a, b) => b.pico * (b.ocorrencias_7d || 1) - a.pico * (a.ocorrencias_7d || 1))
      .slice(0, 8).forEach((t) => {
        const b = el("button", "bloco");
        b.type = "button";
        b.dataset.tipo = t.tipo || "";
        b.append(el("b", null, t.termo), el("small", null, t.tipo || "novo"));
        b.addEventListener("click", () => {
          estado.tipo = "todos"; estado.busca = ""; $("busca").value = "";
          montarFiltros(); renderizar();
          const c = $(idSeguro(t.termo));
          if (c) {
            c.scrollIntoView({ behavior: "smooth", block: "start" });
            c.classList.add("foco");
            setTimeout(() => c.classList.remove("foco"), 1800);
          }
        });
        box.append(b);
      });
    $("alta").closest("section").hidden = !box.childNodes.length;
  }

  function montarFiltros() {
    const tipos = ["todos"].concat([...new Set(visiveis().map((t) => t.tipo).filter(Boolean))].sort());
    const box = $("filtros");
    box.replaceChildren();
    tipos.forEach((tp) => {
      const b = el("button", "filtro", tp === "todos" ? "Todos" : tp);
      b.type = "button";
      if (tp !== "todos") b.dataset.tipo = tp;
      b.setAttribute("aria-pressed", String(tp === estado.tipo));
      b.addEventListener("click", () => {
        estado.tipo = tp;
        box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        renderizar();
      });
      box.append(b);
    });
  }

  function montarPrevia(dados) {
    if (!dados.previa) return;
    const pub = estado.termos.filter((t) => t.status === "publicado").length;
    const pen = estado.termos.length - pub;
    $("previa-resumo").textContent = pub + " publicado" + (pub === 1 ? "" : "s") + " · " + pen + " aguardando sua revisão. Esta página é privada.";
    $("previa").hidden = false;
    document.querySelectorAll("#previa [data-ver]").forEach((b) => {
      b.addEventListener("click", () => {
        estado.ver = b.dataset.ver;
        document.querySelectorAll("#previa [data-ver]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        estado.tipo = "todos";
        montarFiltros(); emAlta(); renderizar();
      });
    });
  }

  async function iniciar() {
    try {
      const r = await fetch("data/glossario.json", { cache: "no-cache", credentials: "omit" });
      if (!r.ok) throw new Error(r.status);
      const dados = await r.json();
      estado.termos = lista(dados.termos).map((t) => Object.assign({ status: "publicado" }, t))
        .sort((a, b) => semAcento(a.termo).localeCompare(semAcento(b.termo)));
      if (dados.atualizado_em) {
        $("atualizado").textContent = "Atualizado em " + new Date(dados.atualizado_em).toLocaleDateString("pt-BR");
      }
      montarPrevia(dados);
      montarFiltros();
      emAlta();
      renderizar();
    } catch (_) {
      $("status").textContent = "Não foi possível carregar o glossário agora. Tente de novo em instantes.";
    }
  }

  $("busca").addEventListener("input", (e) => { estado.busca = e.target.value.slice(0, 60); renderizar(); });
  iniciar();
})();
