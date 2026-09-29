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

// -------- BOTÓN COMENZAR SEMANA NUEVA --------
const btnReiniciar = document.getElementById("btnReiniciarApp");
if (btnReiniciar) {
  btnReiniciar.addEventListener("click", () => {
    const seguro = confirm(
      "🔴 COMENZAR SEMANA NUEVA\n\n" +
      "Esto borrará el progreso de las series marcadas.\n\n" +
      "✅ Se conservarán:\n" +
      "• Los ejercicios configurados\n" +
      "• Tu perfil\n" +
      "• El historial de pesos\n\n" +
      "¿Quieres comenzar la semana nueva?"
    );
    if (!seguro) return;
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("andrex_") && !k.startsWith("andrex_hist_")) {
        localStorage.removeItem(k);
      }
    });
    alert("✅ ¡Semana nueva lista! Vuelve a empezar la rutina.");
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

// -------- UTILIDADES: HISTORIAL --------
function claveEjercicio(nombre) {
  return "andrex_hist_" + nombre
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function obtenerUltimoEntrenamiento(nombre) {
  const clave = claveEjercicio(nombre);
  const historial = JSON.parse(localStorage.getItem(clave) || "[]");
  if (historial.length === 0) return null;
  return historial[historial.length - 1];
}

function guardarEnHistorial(nombre, peso) {
  if (peso <= 0) return;
  const clave = claveEjercicio(nombre);
  const historial = JSON.parse(localStorage.getItem(clave) || "[]");
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const idxHoy = historial.findIndex(r => r.fecha === fechaHoy);
  const nuevoRegistro = { fecha: fechaHoy, peso: peso };
  if (idxHoy >= 0) {
    historial[idxHoy] = nuevoRegistro;
  } else {
    historial.push(nuevoRegistro);
  }
  if (historial.length > 20) historial.shift();
  localStorage.setItem(clave, JSON.stringify(historial));
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
    card.dataset.ejercicio = ej.ejercicio;

    // Último peso guardado
    const ultimo = obtenerUltimoEntrenamiento(ej.ejercicio);
    const datosEj = guardado[`ej${i}`] || {};
    const pesoVal = datosEj.peso ?? (ultimo ? ultimo.peso : "");

    let html = `<b>${ej.ejercicio}</b><br>
      <span class="meta">${ej.series} series · ${ej.reps} reps${ej.descanso > 0 ? " · " + ej.descanso + "s" : ""}</span>`;

    if (ej.notas) html += `<br><span class="nota">💡 ${ej.notas}</span>`;

    if (ultimo) {
      html += `<br><span class="ultimo">📊 Último: ${ultimo.peso} kg</span>`;
    }

    // Input de peso (solo uno, grande)
    html += `<div class="input-principal">
      <input type="number" class="input-peso" data-ej="${i}" 
             placeholder="kg" value="${pesoVal}" inputmode="decimal">
    </div>`;

    // Casillas por serie
    html += `<div class="series-checkbox">`;
    for (let s = 0; s < ej.series; s++) {
      const key = `e${i}_s${s}`;
      const datosSerie = guardado[key] || {};
      const checked = datosSerie.hecha ? "checked" : "";
      html += `<label class="serie-check-label">
        <input type="checkbox" class="serie-check" data-key="${key}" ${checked}>
        <span>Serie ${s + 1}</span>
      </label>`;
    }
    html += `</div>`;

    // Botón descanso
    if (ej.descanso > 0) {
      html += `<div class="fila-descanso">
        <button class="btn-descanso" data-seg="${ej.descanso}">⏱ DESCANSAR ${ej.descanso}s</button>
      </div>`;
    }

    card.innerHTML = html;
    detalle.appendChild(card);
  });

  // --- LISTENERS ---

  function guardarProgresoDia() {
    detalle.querySelectorAll(".card.ejercicio").forEach(card => {
      const ejIdx = card.querySelector(".input-peso").dataset.ej;
      const peso = parseFloat(card.querySelector(".input-peso").value) || 0;
      guardado[`ej${ejIdx}`] = { peso: peso };

      card.querySelectorAll(".serie-check").forEach(chk => {
        guardado[chk.dataset.key] = { hecha: chk.checked };
      });
    });
    localStorage.setItem(clave, JSON.stringify(guardado));
  }

  function guardarEstadoEjercicio(card) {
    const nombreEj = card.dataset.ejercicio;
    const peso = parseFloat(card.querySelector(".input-peso").value) || 0;
    if (peso > 0) {
      guardarEnHistorial(nombreEj, peso);
    }
  }

  // Input de peso
  detalle.querySelectorAll(".input-peso").forEach(inp => {
    inp.addEventListener("change", () => {
      guardarProgresoDia();
      const card = inp.closest(".card.ejercicio");
      guardarEstadoEjercicio(card);
    });
  });

  // Checkboxes
  detalle.querySelectorAll(".serie-check").forEach(chk => {
    chk.addEventListener("change", () => {
      guardarProgresoDia();
      if (chk.checked) {
        if (navigator.vibrate) navigator.vibrate(30);
      }
      guardarEstadoEjercicio(chk.closest(".card.ejercicio"));
    });
  });

  // Botones de descanso
  detalle.querySelectorAll(".btn-descanso").forEach(btn => {
    btn.addEventListener("click", () => toggleDescanso(btn, parseInt(btn.dataset.seg)));
  });
}

// -------- TEMPORIZADOR DE DESCANSO --------
let timerInterval = null;
let timerActivo = null;

function toggleDescanso(btn, segundos) {
  if (timerActivo === btn && timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerActivo = null;
    btn.textContent = `⏱ DESCANSAR ${segundos}s`;
    return;
  }

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    if (timerActivo) {
      timerActivo.textContent = `⏱ DESCANSAR ${timerActivo.dataset.seg}s`;
    }
  }

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
      return;
    }
    btn.textContent = `⏱ ${restante}s — toca para parar`;
  }, 1000);
}