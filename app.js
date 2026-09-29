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
      if (k.startsWith("andrex_")) localStorage.removeItem(k);
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
// Convierte un nombre de ejercicio en una clave segura para localStorage
// Ej: "Press de banca con barra" → "press_de_banca_con_barra"
function claveEjercicio(nombre) {
  return "andrex_hist_" + nombre
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "_")                      // reemplaza espacios y símbolos
    .replace(/^_+|_+$/g, "");                         // quita _ al inicio/final
}

// Obtiene el último entrenamiento guardado para un ejercicio
// Devuelve un objeto {fecha, peso, reps} o null si no existe
function obtenerUltimoEntrenamiento(nombre) {
  const clave = claveEjercicio(nombre);
  const historial = JSON.parse(localStorage.getItem(clave) || "[]");
  if (historial.length === 0) return null;
  // El último registro es el más reciente
  return historial[historial.length - 1];
}

// Formatea una fecha ISO "2026-09-29" → "hace X días"
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

    // Mostrar último entrenamiento (si existe en el historial)
    const ultimo = obtenerUltimoEntrenamiento(ej.ejercicio);
    if (ultimo) {
      html += `<br><span class="ultimo">
        📊 Último: ${ultimo.peso} kg · ${ultimo.reps.join(" · ")}
        <span class="fecha">(${formatearFecha(ultimo.fecha)})</span>
      </span>`;
    }

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