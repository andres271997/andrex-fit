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

// -------- BOTÓN REINICIAR APP --------
const btnReiniciar = document.getElementById("btnReiniciarApp");
if (btnReiniciar) {
  btnReiniciar.addEventListener("click", () => {
    const seguro = confirm("¿Seguro que quieres borrar TODO el progreso guardado? Esta acción no se puede deshacer.");
    if (!seguro) return;
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("andrex_")) localStorage.removeItem(k);
    });
    alert("✅ Progreso borrado. ¡Listo para empezar de nuevo!");
    pintarDias();
  });
}

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
      <span class="meta">${ej.series} series · ${ej.reps} reps${ej.descanso > 0 ? " · " + ej.descanso + "s" : ""}</span>`;
    if (ej.notas) html += `<br><span class="nota">💡 ${ej.notas}</span>`;
    html += `<br><br>`;

    for (let s = 0; s < ej.series; s++) {
      const key = `e${i}_s${s}`;
      const marcado = guardado[key] ? "checked" : "";
      const labelSerie = ej.series === 1 ? "Hecho" : `Serie ${s + 1}`;
      html += `<label class="serie">
        <input type="checkbox" data-key="${key}" ${marcado}>
        ${labelSerie}
      </label>`;
    }

    // Solo mostrar botón cronómetro si hay descanso > 0
    if (ej.descanso > 0) {
      html += `<div class="fila-descanso">
        <button class="btn-descanso" data-seg="${ej.descanso}">⏱ DESCANSAR ${ej.descanso}s</button>
        <button class="btn-reset-descanso" data-seg="${ej.descanso}">🔄</button>
      </div>`;
    }

    card.innerHTML = html;
    detalle.appendChild(card);
  });

  // Guardar progreso
  detalle.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener("change", () => {
      guardado[chk.dataset.key] = chk.checked;
      localStorage.setItem(clave, JSON.stringify(guardado));
      if (chk.checked && navigator.vibrate) navigator.vibrate(30);
    });
  });

  // Botones de descanso
  detalle.querySelectorAll(".btn-descanso").forEach(btn => {
    btn.addEventListener("click", () => toggleDescanso(btn, parseInt(btn.dataset.seg)));
  });

  // Botones de reset del cronómetro
  detalle.querySelectorAll(".btn-reset-descanso").forEach(btn => {
    btn.addEventListener("click", () => {
      const btnDescanso = btn.parentElement.querySelector(".btn-descanso");
      resetDescanso(btnDescanso, parseInt(btn.dataset.seg));
    });
  });
}

// -------- TEMPORIZADOR DE DESCANSO (CORREGIDO) --------
let timerInterval = null;
let timerActivo = null; // referencia al botón que está contando

function toggleDescanso(btn, segundos) {
  // Si este botón ya está contando, lo pausamos
  if (timerActivo === btn && timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerActivo = null;
    btn.textContent = `⏱ DESCANSAR ${segundos}s`;
    return;
  }

  // Si hay otro cronómetro corriendo, lo reseteamos
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    if (timerActivo) {
      timerActivo.textContent = `⏱ DESCANSAR ${timerActivo.dataset.seg}s`;
    }
  }

  // Iniciar el nuevo
  timerActivo = btn;
  let restante = segundos;
  btn.textContent = `⏱ ${restante}s — toca para parar`;

  timerInterval = setInterval(() => {
    restante--;
    if (restante <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerActivo = null;
      btn.textContent = `✅ ¡LISTO! DESCANSAR ${segundos}s`;
      if (navigator.vibrate) navigator.vibrate([300, 200, 300, 200, 300]);
      // El botón sigue funcionando: al tocarlo reinicia
      return;
    }
    btn.textContent = `⏱ ${restante}s — toca para parar`;
  }, 1000);
}

function resetDescanso(btn, segundos) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerActivo = null;
  }
  btn.textContent = `⏱ DESCANSAR ${segundos}s`;
  if (navigator.vibrate) navigator.vibrate(20);
}