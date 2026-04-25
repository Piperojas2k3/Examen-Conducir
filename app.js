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

// --- MOTOR DE EXAMEN ---
async function startExam(clase) {
    claseActual = clase;
    document.getElementById('loading-msg').classList.remove('hidden');
    
    if (clase === 'B') { CONFIG.total = 35; CONFIG.aprobar = 33; CONFIG.tiempo = 45 * 60; CONFIG.maxScore = 38; }
    else if (clase === 'C') { CONFIG.total = 20; CONFIG.aprobar = 15; CONFIG.tiempo = 35 * 60; CONFIG.maxScore = 20; }
    else if (clase === 'D') { CONFIG.total = 12; CONFIG.aprobar = 10; CONFIG.tiempo = 15 * 60; CONFIG.maxScore = 12; }

    try {
        const response = await fetch('preguntas.json');
        const data = await response.json();
        let bancoClase = data.filter(q => q.clase === clase || q.clase === "Todas");

        if (clase === 'B') {
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
    } catch (e) { alert("Error cargando preguntas."); }
}

function showQuestion() {
    const q = questions[currentIdx];
    const prevAnswer = userAnswers[currentIdx];
    const imgCont = document.getElementById('image-container');
    const imgEl = document.getElementById('question-image');

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

// --- RESULTADOS ---
function calcularYMostrarResultados() {
    clearInterval(timerInterval);
    let score = 0, maxPossible = 0, criticasUsadas = 0, errores = {};
    
    questions.forEach((q, i) => {
        let pts = (claseActual === 'B' && q.esCritica && criticasUsadas < 3) ? 2 : 1;
        if (pts === 2) criticasUsadas++;
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
    fb.innerHTML = Object.keys(errores).length ? '' : '<div class="alert-info">¡Perfecto!</div>';
    Object.keys(errores).forEach(c => {
        fb.innerHTML += `<div class="alert-info mb-2"><strong>${c}:</strong> ${RECOMENDACIONES[c] || "Repasar manual."}</div>`;
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
    h.unshift({ fecha: new Date().toLocaleString('es-CL'), puntaje: s, maximo: m, estado: p, 
                preguntas: JSON.parse(JSON.stringify(questions)), respuestas: [...userAnswers] });
    localStorage.setItem('testpractic_history', JSON.stringify(h));
}

function loadHistory() {
    const cont = document.getElementById('history-container');
    let h = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    cont.innerHTML = h.length ? '' : '<p class="text-center p-4">Sin registros.</p>';
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
    cont.innerHTML = `<button class="btn-leer mb-4" onclick="switchScreen('history-screen')">⬅️ Volver</button><h3>Revisión</h3><hr>`;
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
    cont.innerHTML = `<button class="btn-leer mb-4" onclick="switchScreen('result-screen')">⬅️ Volver</button><h3>Revisión Detallada</h3><hr>`;
    questions.forEach((q, i) => {
        let cor = userAnswers[i] === q.respuestaCorrecta;
        let img = q.imagen ? `<img src="${q.imagen}" style="max-width:250px; display:block; margin:10px 0; border-radius:8px;">` : '';
        cont.innerHTML += `<div class="review-item" style="border-left: 6px solid ${cor ? 'var(--success)' : 'var(--danger)'}">
            <p><b>${i+1}. ${q.pregunta}</b></p>${img}
            <ul class="list-unstyled">${q.opciones.map((o, j) => `<li class="p-2 mb-1 rounded ${j===q.respuestaCorrecta?'correct-answer':(j===userAnswers[i]?'wrong-answer':'')}" style="border:1px solid #eee">${o}</li>`).join('')}</ul>
            <div class="explanation-box"><small><b>Explicación:</b> ${q.explicacion}</small></div></div>`;
    });
}

// --- NUEVA LÓGICA DE TEMARIOS DESDE CARPETA ---
async function cambiarTemario(clase) {
    const cont = document.getElementById('resumen-teorico-container');
    cont.classList.remove('hidden');
    cont.innerHTML = `<div class="text-center p-5">⏳ Cargando Temario Oficial Clase ${clase}...</div>`;

    try {
        const response = await fetch(`Temarios/clase_${clase}.json`);
        if (!response.ok) throw new Error("No se encontró el archivo JSON");
        const data = await response.json();

        let capitulosHTML = data.capitulos.map(cap => `
            <div class="card mb-4 text-start" style="border-left: 6px solid var(--nav-blue); padding: 25px;">
                <h4 class="fw-bold" style="color: var(--primary-blue);">${cap.titulo}</h4>
                <p style="font-size: 1.1rem;">${cap.contenido}</p>
                ${cap.puntos_clave ? `
                    <div class="alert-info p-3 rounded mt-3">
                        <h6 class="fw-bold">Puntos clave:</h6>
                        <ul>${cap.puntos_clave.map(p => `<li>${p}</li>`).join('')}</ul>
                    </div>` : ''}
                ${cap.imagen ? `<img src="${cap.imagen}" class="img-fluid rounded mt-3 shadow-sm">` : ''}
            </div>
        `).join('');

        cont.innerHTML = `
            <div class="animate-in">
                <h2 class="fw-bold">${data.titulo}</h2><hr class="mb-4">
                ${capitulosHTML}
                <button class="btn-hero" style="width: auto;" onclick="window.scrollTo({top:0, behavior:'smooth'})">Subir ▲</button>
            </div>
        `;
    } catch (e) {
        cont.innerHTML = `<div class="alert-danger p-4">❌ Error: Verifica que los archivos JSON estén en la carpeta /Temarios.</div>`;
    }
    cont.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
