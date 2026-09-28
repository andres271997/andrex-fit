const rutina={
"LUNES":"Empuje Fuerza",
"MARTES":"Tirón Fuerza",
"MIÉRCOLES":"Pierna Fuerza",
"JUEVES":"Empuje Volumen",
"VIERNES":"Tirón Volumen",
"SÁBADO":"Pierna Volumen"
};

const box=document.getElementById("days");

Object.entries(rutina).forEach(([dia,valor])=>{
let div=document.createElement("div");
div.className="card";
div.innerHTML=`<b>${dia}</b><br>${valor}<br><br>`;
let btn=document.createElement("button");
btn.textContent="INICIAR";
btn.onclick=()=>alert("Cargando "+valor+"\nPantalla de entrenamiento en desarrollo");
div.appendChild(btn);
box.appendChild(div);
});
