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
      "• El historial de pesos y reps\n\n" +
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

function formatearFecha(fechaISO) {
  const hoy = new Date();
  const fecha = new Date(fechaISO);
  const diffMs = hoy - fecha;
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias === 0) return "hoy";
  if (diffDias === 1) return "ayer";
  if (diffDias < 7) return `hace ${diffDias} días`;
  if (diffDias < 30) {
    const semanas = Math.floor(diffDias / 7);
    return semanas === 1 ? "hace 1 semana" : `hace ${semanas} semanas`;
  }
  const meses = Math.floor(diffDias / 30);
  return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`;
}

function guardarEnHistorial(nombre, peso, reps) {
  if (peso <= 0 || reps <= 0) return;
  const clave = claveEjercicio(nombre);
  const historial = JSON.parse(localStorage.getItem(clave) || "[]");
  const fechaHoy = new Date().toISOString().slice(0, 10);
  // Si ya hay un registro de hoy, lo reemplazamos
  const idxHoy = historial.findIndex(r => r.fecha === fechaHoy);
  const nuevoRegistro = { fecha: fechaHoy, peso: peso, reps: reps };
  if (idxHoy >= 0) {
    historial[idxHoy] = nuevoRegistro;
  } else {
    historial.push(nuevoRegistro);
  }
  // Mantener solo los últimos 20 registros
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

    let html = `<b>${ej.ejercicio}</b><br>
      <span class="meta">${ej.series} series · ${ej.reps} reps${ej.descanso > 0 ? " · " + ej.descanso + "s" : ""}</span>`;

    if (ej.notas) html += `<br><span class="nota">💡 ${ej.notas}</span>`;

    // Mostrar último entrenamiento (del historial)
    const ultimo = obtenerUltimoEntrenamiento(ej.ejercicio);
    if (ultimo) {
      html += `<br><span class="ultimo">
        📊 Último: ${ultimo.peso} kg · ${ultimo.reps.join(" · ")}
        <span class="fecha">(${formatearFecha(ultimo.fecha)})</span>
      </span>`;
    }

    html += `<br><br>`;

    // Generar fila por cada serie con inputs de peso y reps
    for (let s = 0; s < ej.series; s++) {
      const key = `e${i}_s${s}`;
      const datosSerie = guardado[key] || {};
      const checked = datosSerie.hecha ? "checked" : "";
      const pesoVal = datosSerie.peso || "";
      const repsVal = datosSerie.reps || "";

      html += `<div class="serie-fila">
        <label class="serie-check">
          <input type="checkbox" data-key="${key}" ${checked}>
        </label>
        <span class="serie-num">Serie ${s + 1}</span>
        <input type="number" class="input-peso" data-key="${key}" 
               placeholder="kg" value="${pesoVal}" inputmode="decimal">
        <input type="number" class="input-reps" data-key="${key}" 
               placeholder="reps" value="${repsVal}" inputmode="numeric">
      </div>`;
    }

    if (ej.descanso > 0) {
      html += `<div class="fila-descanso">
        <button class="btn-descanso" data-seg="${ej.descanso}">⏱ DESCANSAR ${ej.descanso}s</button>
        <button class="btn-reset-descanso" data-seg="${ej.descanso}">🔄</button>
      </div>`;
    }

    card.innerHTML = html;
    detalle.appendChild(card);
  });

  // --- LISTENERS DE INPUTS Y CHECKBOXES ---

  // Checkboxes: guardan estado y peso/reps en el historial
  detalle.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener("change", () => {
      const key = chk.dataset.key;
      const card = chk.closest(".card.ejercicio");
      const nombreEj = card.dataset.ejercicio;

      // Leer peso y reps de esa fila
      const fila = chk.closest(".serie-fila");
      const peso = parseFloat(fila.querySelector(".input-peso").value) || 0;
      const reps = parseInt(fila.querySelector(".input-reps").value) || 0;

      // Guardar en el día actual
      guardado[key] = { hecha: chk.checked, peso: peso, reps: reps };
      localStorage.setItem(clave, JSON.stringify(guardado));

      // Si se marcó como hecha, guardar en el historial del ejercicio
      if (chk.checked && peso > 0 && reps > 0) {
        // Recopilar todas las series marcadas de este ejercicio
        const seriesHechas = [];
        card.querySelectorAll(".serie-fila").forEach(f => {
          const c = f.querySelector('input[type="checkbox"]');
          if (c.checked) {
            const p = parseFloat(f.querySelector(".input-peso").value) || 0;
            const r = parseInt(f.querySelector(".input-reps").value) || 0;
            if (p > 0 && r > 0) seriesHechas.push({ peso: p, reps: r });
          }
        });
        // Guardar el registro con el peso de la primera serie
        if (seriesHechas.length > 0) {
          guardarEnHistorial(
            nombreEj,
            seriesHechas[0].peso,
            seriesHechas.map(s => s.reps)
          );
        }
        if (navigator.vibrate) navigator.vibrate(30);
      }
    });
  });

  // Inputs de peso y reps: guardar progreso al cambiar
  detalle.querySelectorAll(".input-peso, .input-reps").forEach(inp => {
    inp.addEventListener("change", () => {
      const key = inp.dataset.key;
      const card = inp.closest(".card.ejercicio");
      const fila = inp.closest(".serie-fila");
      const chk = fila.querySelector('input[type="checkbox"]');
      const peso = parseFloat(fila.querySelector(".input-peso").value) || 0;
      const reps = parseInt(fila.querySelector(".input-reps").value) || 0;

      guardado[key] = { hecha: chk.checked, peso: peso, reps: reps };
      localStorage.setItem(clave, JSON.stringify(guardado));

      // Si la casilla ya está marcada, actualizar historial
      if (chk.checked && peso > 0 && reps > 0) {
        const seriesHechas = [];
        card.querySelectorAll(".serie-fila").forEach(f => {
          const c = f.querySelector('input[type="checkbox"]');
          if (c.checked) {
            const p = parseFloat(f.querySelector(".input-peso").value) || 0;
            const r = parseInt(f.querySelector(".input-reps").value) || 0;
            if (p > 0 && r > 0) seriesHechas.push({ peso: p, reps: r });
          }
        });
        if (seriesHechas.length > 0) {
          guardarEnHistorial(
            card.dataset.ejercicio,
            seriesHechas[0].peso,
            seriesHechas.map(s => s.reps)
          );
        }
      }
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

function resetDescanso(btn, segundos) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerActivo = null;
  }
  btn.textContent = `⏱ DESCANSAR ${segundos}s`;
  if (navigator.vibrate) navigator.vibrate(20);
}