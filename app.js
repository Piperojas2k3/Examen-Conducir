// ==========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
let CONFIG = { total: 35, aprobar: 33, tiempo: 45 * 60, maxScore: 38 };
let questions = [];
let userAnswers = []; 
let currentIdx = 0;
let timeLeft = 0;
let timerInterval;
let claseActual = ''; 

const RECOMENDACIONES = {
    "Física de la Conducción": "Repasa el cálculo de Distancia de Reacción (x3) y Frenado. La energía cinética aumenta al cuadrado de la velocidad.",
    "Seguridad Pasiva": "Refuerza conocimientos sobre cinturones, SRI (Sillas de niños) y el ajuste hermético del casco integral.",
    "Mecánica Básica": "Estudia fluidos, uso del freno de motor en pendientes, testigos de tablero e inflado de neumáticos.",
    "Normas de Circulación": "Revisa prioridades en cruces no regulados, prohibición de adelantar en cimas y ley Tolerancia Cero/Emilia.",
    "Convivencia Vial": "Recuerda el metro y medio (1.5m) de distancia al adelantar ciclos y las Zonas de Espera Adelantada.",
    "Dinámica Activa": "Para Clase C, repasa Contramanillar y distribución de frenado (70/30). Para Clase D, estabilidad y pendientes."
};

// --- NAVEGACIÓN ---
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId !== 'quiz-screen') clearInterval(timerInterval);
    if (screenId === 'temarios-screen') document.getElementById('resumen-teorico-container')?.classList.add('hidden');
}

// --- MOTOR DE EXAMEN (Lógica de puntos corregida) ---
async function startExam(clase) {
    claseActual = clase;
    document.getElementById('loading-msg').classList.remove('hidden');
    
    // Configuración oficial por Clase
    if (clase === 'B') { CONFIG.total = 35; CONFIG.aprobar = 33; CONFIG.tiempo = 45 * 60; CONFIG.maxScore = 38; }
    else if (clase === 'C') { CONFIG.total = 20; CONFIG.aprobar = 15; CONFIG.tiempo = 35 * 60; CONFIG.maxScore = 20; }
    else if (clase === 'D') { CONFIG.total = 12; CONFIG.aprobar = 10; CONFIG.tiempo = 15 * 60; CONFIG.maxScore = 12; }

    try {
        const response = await fetch('preguntas.json');
        const data = await response.json();
        let bancoClase = data.filter(q => q.clase === clase || q.clase === "Todas");

        if (clase === 'B') {
            // Regla Clase B: Siempre 3 críticas y 32 normales para sumar 38 pts
            let criticas = bancoClase.filter(q => q.esCritica).sort(() => 0.5 - Math.random());
            let normales = bancoClase.filter(q => !q.esCritica).sort(() => 0.5 - Math.random());
            questions = [...criticas.slice(0, 3), ...normales.slice(0, 32)].sort(() => 0.5 - Math.random());
        } else {
            questions = bancoClase.sort(() => 0.5 - Math.random()).slice(0, CONFIG.total);
        }

        if (questions.length < CONFIG.total) {
            alert("No hay suficientes preguntas en el archivo JSON.");
            document.getElementById('loading-msg').classList.add('hidden');
            return;
        }

        userAnswers = new Array(questions.length).fill(null);
        currentIdx = 0; timeLeft = CONFIG.tiempo;
        document.getElementById('loading-msg').classList.add('hidden');
        switchScreen('quiz-screen');
        showQuestion();
        startTimer();
    } catch (e) { alert("Error cargando preguntas. Revisa el archivo JSON."); }
}

function showQuestion() {
    const q = questions[currentIdx];
    const prevAnswer = userAnswers[currentIdx];
    const imgCont = document.getElementById('image-container');
    const imgEl = document.getElementById('question-image');

    // Soporte para imágenes
    if (q.imagen) { imgEl.src = q.imagen; imgCont.classList.remove('hidden'); } 
    else { imgCont.classList.add('hidden'); }
    
    document.getElementById('category-label').innerText = q.categoria;
    document.getElementById('question-counter').innerText = `Pregunta ${currentIdx + 1} de ${questions.length}`;
    document.getElementById('question-text').innerText = q.pregunta;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    q.opciones.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = `option-btn ${prevAnswer === i ? 'selected' : ''}`;
        btn.innerText = `${String.fromCharCode(65 + i)}) ${opt}`;
        btn.onclick = () => { userAnswers[currentIdx] = i; showQuestion(); };
        container.appendChild(btn);
    });

    document.getElementById('prev-btn').classList.toggle('hidden', currentIdx === 0);
    const nextBtn = document.getElementById('next-btn');
    nextBtn.innerText = currentIdx === questions.length - 1 ? "Finalizar 🏁" : "Siguiente ➡️";
    nextBtn.disabled = userAnswers[currentIdx] === null;
    document.getElementById('progress-bar').style.width = ((currentIdx + 1) / questions.length * 100) + "%";
}

document.getElementById('next-btn').onclick = () => {
    if (currentIdx < questions.length - 1) { currentIdx++; showQuestion(); } 
    else calcularYMostrarResultados();
};
document.getElementById('prev-btn').onclick = () => { if (currentIdx > 0) { currentIdx--; showQuestion(); } };

// --- RESULTADOS (Cálculo exacto) ---
function calcularYMostrarResultados() {
    clearInterval(timerInterval);
    let score = 0;
    let maxPossible = 0;
    let criticasUsadas = 0; 
    let errores = {};
    
    questions.forEach((q, i) => {
        let pts = 1;
        // Solo las primeras 3 críticas valen doble en Clase B
        if (claseActual === 'B' && q.esCritica && criticasUsadas < 3) {
            pts = 2;
            criticasUsadas++;
        }
        maxPossible += pts;
        if (userAnswers[i] === q.respuestaCorrecta) score += pts;
        else errores[q.categoria] = (errores[q.categoria] || 0) + 1;
    });
    
    if (claseActual === 'B') maxPossible = 38;

    const passed = score >= CONFIG.aprobar;
    saveToHistory(score, passed, errores, maxPossible);
    switchScreen('result-screen');
    
    const status = document.getElementById('result-status');
    status.innerText = passed ? "¡APROBADO! ✅" : "REPROBADO ❌";
    status.className = passed ? "text-success fw-bold display-4" : "text-danger fw-bold display-4";
    
    document.getElementById('user-score').innerText = score;
    document.getElementById('max-score-display').innerText = maxPossible;
    document.getElementById('pass-fail-msg').innerText = `Mínimo para aprobar: ${CONFIG.aprobar} puntos.`;
    
    const fb = document.getElementById('feedback-list');
    fb.innerHTML = Object.keys(errores).length ? '' : '<div class="alert-info">¡Excelente trabajo! No tuviste errores.</div>';
    Object.keys(errores).forEach(c => {
        fb.innerHTML += `<div class="alert-info mb-2"><strong>${c}:</strong> ${RECOMENDACIONES[c] || "Repasar manual oficial."}</div>`;
    });
}

function startTimer() {
    const el = document.getElementById('timer');
    timerInterval = setInterval(() => {
        let m = Math.floor(timeLeft / 60), s = timeLeft % 60;
        el.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (timeLeft-- <= 0) calcularYMostrarResultados();
    }, 1000);
}

// --- HISTORIAL Y REVISIÓN ---
function saveToHistory(s, p, e, m) {
    let h = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    h.unshift({ 
        fecha: new Date().toLocaleString('es-CL'), puntaje: s, maximo: m, estado: p, 
        preguntas: JSON.parse(JSON.stringify(questions)), respuestas: [...userAnswers] 
    });
    localStorage.setItem('testpractic_history', JSON.stringify(h));
}

function loadHistory() {
    const cont = document.getElementById('history-container');
    let h = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    cont.innerHTML = h.length ? '' : '<p class="text-center p-4">Aún no tienes exámenes guardados.</p>';
    h.forEach((item, i) => {
        let div = document.createElement('div');
        div.className = 'card-estudio mb-3 d-flex justify-content-between align-items-center text-start';
        div.onclick = () => verDetalleHistorico(i);
        div.innerHTML = `<div><span class="status-badge ${item.estado ? 'badge-pass' : 'badge-fail'}">${item.estado ? 'APROBADO' : 'REPROBADO'}</span>
                         <h5 class="mb-0 mt-2">Ensayo #${h.length - i}</h5><small>${item.fecha}</small>
                         <p class="mb-0">Puntaje: <strong>${item.puntaje}/${item.maximo}</strong></p></div><button class="btn-leer">Ver Detalle 🔍</button>`;
        cont.appendChild(div);
    });
}

function verDetalleHistorico(idx) {
    let h = JSON.parse(localStorage.getItem('testpractic_history'))[idx];
    switchScreen('history-detail-screen');
    const cont = document.getElementById('history-review-container');
    cont.innerHTML = `<button class="btn-leer mb-4" onclick="switchScreen('history-screen')">⬅️ Volver al Historial</button><h3>Revisión de Ensayo</h3><hr>`;
    h.preguntas.forEach((q, i) => {
        let cor = h.respuestas[i] === q.respuestaCorrecta;
        let img = q.imagen ? `<img src="${q.imagen}" style="max-width:250px; display:block; margin:10px 0; border-radius:8px;">` : '';
        cont.innerHTML += `<div class="review-item" style="border-left: 6px solid ${cor ? 'var(--success)' : 'var(--danger)'}">
            <p><b>${i+1}. ${q.pregunta}</b></p>${img}
            <ul class="list-unstyled">${q.opciones.map((o, j) => `<li class="p-2 mb-1 rounded ${j===q.respuestaCorrecta?'correct-answer':(j===h.respuestas[i]?'wrong-answer':'')}" style="border:1px solid #eee">${o}</li>`).join('')}</ul>
            <div class="explanation-box"><small><b>Explicación:</b> ${q.explicacion}</small></div></div>`;
    });
}

function mostrarRevisionInmediata() {
    switchScreen('history-detail-screen');
    const cont = document.getElementById('history-review-container');
    cont.innerHTML = `<button class="btn-leer mb-4" onclick="switchScreen('result-screen')">⬅️ Volver al Puntaje</button><h3>Revisión Detallada</h3><hr>`;
    questions.forEach((q, i) => {
        let cor = userAnswers[i] === q.respuestaCorrecta;
        let img = q.imagen ? `<img src="${q.imagen}" style="max-width:250px; display:block; margin:10px 0; border-radius:8px;">` : '';
        cont.innerHTML += `<div class="review-item" style="border-left: 6px solid ${cor ? 'var(--success)' : 'var(--danger)'}">
            <p><b>${i+1}. ${q.pregunta}</b></p>${img}
            <ul class="list-unstyled">${q.opciones.map((o, j) => `<li class="p-2 mb-1 rounded ${j===q.respuestaCorrecta?'correct-answer':(j===userAnswers[i]?'wrong-answer':'')}" style="border:1px solid #eee">${o}</li>`).join('')}</ul>
            <div class="explanation-box"><small><b>Explicación:</b> ${q.explicacion}</small></div></div>`;
    });
}

const contenidoTemarios = {
    B: { titulo: "🚗 Clase B: Automóviles", cuerpo: `<div class="alert-info"><b>Física:</b> Detención = Reacción + Frenado.</div>` },
    C: { titulo: "🏍️ Clase C: Motocicletas", cuerpo: `<div class="alert-danger"><b>Técnica:</b> 70% freno delantero, 30% trasero.</div>` },
    D: { titulo: "🚜 Clase D: Maquinaria", cuerpo: `<div class="alert-warning"><b>Seguridad:</b> Carga baja a 15cm del suelo.</div>` }
};

function cambiarTemario(clase) {
    const cont = document.getElementById('resumen-teorico-container');
    cont.classList.remove('hidden');
    cont.innerHTML = `<div class="animate-in"><h4>${contenidoTemarios[clase].titulo}</h4><hr>
                      <div class="temario-texto">${contenidoTemarios[clase].cuerpo}</div>
                      <button class="btn-leer mt-3" style="background:var(--nav-blue)" onclick="window.scrollTo({top:0,behavior:'smooth'})">Subir ▲</button></div>`;
    cont.scrollIntoView({ behavior: 'smooth' });
}
