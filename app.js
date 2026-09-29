const box = document.getElementById("days");
const detalle = document.getElementById("detalle");
const subtitulo = document.getElementById("subtitulo");
const titulo = document.querySelector("h1");

let rutina = {};

// Registrar service worker (PWA offline)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

// Cargar rutina.json
fetch('rutina.json')
  .then(r => r.json())
  .then(data => {
    rutina = data;
    pintarDias();
  })
  .catch(err => {
    box.innerHTML = "<p>Error cargando rutina.json</p>";
    console.error(err);
  });

// -------- PANTALLA PRINCIPAL --------
function pintarDias() {
  box.innerHTML = "";
  detalle.classList.add("oculto");
  box.classList.remove("oculto");
  subtitulo.classList.remove("oculto");
  titulo.textContent = "💪 ANDREX FIT";

  Object.entries(rutina).forEach(([dia, info]) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<b>${dia}</b><br>${info.nombre}<br><br>`;
    const btn = document.createElement("button");
    btn.textContent = "INICIAR";
    btn.onclick = () => abrirDia(dia);
    div.appendChild(btn);
    box.appendChild(div);
  });
}

// -------- PANTALLA DE ENTRENAMIENTO --------
function abrirDia(dia) {
  const info = rutina[dia];
  box.classList.add("oculto");
  subtitulo.classList.add("oculto");
  titulo.textContent = dia + " · " + info.nombre;
  detalle.classList.remove("oculto");
  detalle.innerHTML = "";

  const back = document.createElement("button");
  back.textContent = "← VOLVER";
  back.className = "back";
  back.onclick = pintarDias;
  detalle.appendChild(back);

  const clave = "andrex_" + dia + "_" + new Date().toISOString().slice(0, 10);
  const guardado = JSON.parse(localStorage.getItem(clave) || "{}");

  info.ejercicios.forEach((ej, i) => {
    const card = document.createElement("div");
    card.className = "card ejercicio";

    let html = `<b>${ej.ejercicio}</b><br>
      <span class="meta">${ej.series} series · ${ej.reps} reps · ${ej.descanso}s</span><br><br>`;

    for (let s = 0; s < ej.series; s++) {
      const key = `e${i}_s${s}`;
      const marcado = guardado[key] ? "checked" : "";
      html += `<label class="serie">
        <input type="checkbox" data-key="${key}" ${marcado}>
        Serie ${s + 1}
      </label>`;
    }

    html += `<button class="btn-descanso" data-seg="${ej.descanso}">⏱ DESCANSAR ${ej.descanso}s</button>`;

    card.innerHTML = html;
    detalle.appendChild(card);
  });

  detalle.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener("change", () => {
      guardado[chk.dataset.key] = chk.checked;
      localStorage.setItem(clave, JSON.stringify(guardado));
      if (chk.checked && navigator.vibrate) navigator.vibrate(30);
    });
  });

  detalle.querySelectorAll(".btn-descanso").forEach(btn => {
    btn.addEventListener("click", () => iniciarDescanso(btn, parseInt(btn.dataset.seg)));
  });
}

// -------- TEMPORIZADOR DE DESCANSO --------
let timerInterval = null;
function iniciarDescanso(btn, segundos) {
  if (timerInterval) clearInterval(timerInterval);

  detalle.querySelectorAll(".btn-descanso").forEach(b => {
    if (b !== btn) b.textContent = `⏱ DESCANSAR ${b.dataset.seg}s`;
  });

  let restante = segundos;
  btn.textContent = `⏱ ${restante}s — toca para parar`;

  timerInterval = setInterval(() => {
    restante--;
    if (restante <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      btn.textContent = `✅ ¡LISTO! DESCANSAR ${segundos}s`;
      if (navigator.vibrate) navigator.vibrate([300, 200, 300, 200, 300]);
      return;
    }
    btn.textContent = `⏱ ${restante}s — toca para parar`;
  }, 1000);

  btn.onclick = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      btn.textContent = `⏱ DESCANSAR ${segundos}s`;
      btn.onclick = () => iniciarDescanso(btn, segundos);
    }
  };
}