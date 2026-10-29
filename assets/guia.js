// Personagem guia: anda de um lado para o outro, para, martela e fala.
"use strict";
(function () {
  const guia = document.getElementById("guia");
  const quem = document.getElementById("andarilho");
  const balao = document.getElementById("balao");
  if (!guia || !quem) return;
  const falas = ["ouviu um termo novo?", "6-7!", "bora entender?", "pergunta pra criança!", "farmou aura?"];
  let f = 0;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const pista = guia.querySelector(".pista");
  let x = 0, dir = 1, estado = "andando", pausa = 0, ultimo = 0;
  const VEL = 46; // px por segundo

  function limites() {
    return Math.max(0, pista.clientWidth - quem.offsetWidth);
  }

  function passo(t) {
    const dt = ultimo ? Math.min(0.05, (t - ultimo) / 1000) : 0;
    ultimo = t;
    const max = limites();
    if (estado === "andando") {
      x += dir * VEL * dt;
      if ((dir > 0 && x >= max) || (dir < 0 && x <= 0)) {
        x = Math.min(max, Math.max(0, x));
        estado = "martelando";
        pausa = 1.6;
        f = (f + 1) % falas.length;
        balao.textContent = falas[f];
        quem.classList.remove("andando");
        quem.classList.add("martelando");
      }
    } else {
      pausa -= dt;
      if (pausa <= 0) {
        dir = -dir;
        estado = "andando";
        quem.classList.remove("martelando");
        quem.classList.add("andando");
        quem.classList.toggle("esquerda", dir < 0);
      }
    }
    quem.style.transform = "translateX(" + x.toFixed(1) + "px)";
    requestAnimationFrame(passo);
  }
  quem.classList.add("andando");
  requestAnimationFrame(passo);
})();
