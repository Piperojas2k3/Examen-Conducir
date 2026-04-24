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

// --- NAVEGACIÓN ENTRE PANTALLAS ---
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId !== 'quiz-screen') clearInterval(timerInterval);
    
    if (screenId === 'temarios-screen') {
        const container = document.getElementById('resumen-teorico-container');
        if (container) container.classList.add('hidden');
    }
}

// --- INICIO DEL EXAMEN ---
async function startExam(clase) {
    claseActual = clase;
    const loadingMsg = document.getElementById('loading-msg');
    loadingMsg.classList.remove('hidden');
    
    if (clase === 'B') {
        CONFIG.total = 35; CONFIG.aprobar = 33; CONFIG.tiempo = 45 * 60; CONFIG.maxScore = 38; 
    } else if (clase === 'C') {
        CONFIG.total = 20; CONFIG.aprobar = 15; CONFIG.tiempo = 35 * 60; CONFIG.maxScore = 20; 
    } else if (clase === 'D') {
        CONFIG.total = 12; CONFIG.aprobar = 10; CONFIG.tiempo = 15 * 60; CONFIG.maxScore = 12; 
    }

    try {
        const response = await fetch('preguntas.json');
        if (!response.ok) throw new Error("Error cargando base de datos.");
        const data = await response.json();
        
        questions = data.filter(q => q.clase === clase || q.clase === "Todas")
                        .sort(() => 0.5 - Math.random())
                        .slice(0, CONFIG.total);
        
        if (questions.length === 0) {
            alert(`No hay suficientes preguntas de Clase ${clase}.`);
            loadingMsg.classList.add('hidden');
            return;
        }

        userAnswers = new Array(questions.length).fill(null);
        currentIdx = 0;
        timeLeft = CONFIG.tiempo;
        loadingMsg.classList.add('hidden');
        switchScreen('quiz-screen');
        showQuestion();
        startTimer();
    } catch (error) {
        console.error(error);
        alert("Error al cargar las preguntas.");
    }
}

// --- MOSTRAR PREGUNTA (CON SOPORTE DE IMAGEN) ---
function showQuestion() {
    const q = questions[currentIdx];
    const prevAnswer = userAnswers[currentIdx];
    
    // Lógica de Imagen dinámica
    const imgContainer = document.getElementById('image-container');
    const imgElement = document.getElementById('question-image');

    if (q.imagen && q.imagen !== "") {
        imgElement.src = q.imagen;
        imgContainer.classList.remove('hidden');
    } else {
        imgContainer.classList.add('hidden');
    }
    
    document.getElementById('category-label').innerText = q.categoria;
    document.getElementById('question-counter').innerText = `Pregunta ${currentIdx + 1} de ${questions.length}`;
    document.getElementById('question-text').innerText = q.pregunta;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    q.opciones.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (prevAnswer === index) btn.classList.add('selected');
        btn.innerText = `${String.fromCharCode(65 + index)}) ${opt}`;
        btn.onclick = () => selectOption(index, btn);
        container.appendChild(btn);
    });

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    prevBtn.classList.toggle('hidden', currentIdx === 0);
    nextBtn.innerText = currentIdx === questions.length - 1 ? "Finalizar Examen 🏁" : "Siguiente ➡️";
    nextBtn.disabled = prevAnswer === null;
    updateProgress();
}

function selectOption(index, btn) {
    userAnswers[currentIdx] = index;
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('next-btn').disabled = false;
}

document.getElementById('prev-btn').onclick = () => { if (currentIdx > 0) { currentIdx--; showQuestion(); } };
document.getElementById('next-btn').onclick = () => {
    if (currentIdx < questions.length - 1) { currentIdx++; showQuestion(); } 
    else calcularYMostrarResultados(); 
};

function startTimer() {
    const timerEl = document.getElementById('timer');
    timerInterval = setInterval(() => {
        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        timerEl.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        if (timeLeft <= 300) timerEl.style.color = "var(--danger)"; 
        if (timeLeft <= 0) calcularYMostrarResultados();
        timeLeft--;
    }, 1000);
}

function updateProgress() { document.getElementById('progress-bar').style.width = ((currentIdx + 1) / questions.length * 100) + "%"; }

// --- RESULTADOS ---
function calcularYMostrarResultados() {
    clearInterval(timerInterval);
    let scoreFinal = 0;
    let maxPuntajePosible = 0;
    let erroresAnalisis = {};
    
    questions.forEach((q, idx) => {
        const respuestaUsuario = userAnswers[idx];
        const isCorrect = respuestaUsuario === q.respuestaCorrecta;
        let puntosEstaPregunta = 1;
        if (claseActual === 'B' && q.esCritica) puntosEstaPregunta = 2;
        maxPuntajePosible += puntosEstaPregunta;
        if (isCorrect) scoreFinal += puntosEstaPregunta;
        else erroresAnalisis[q.categoria] = (erroresAnalisis[q.categoria] || 0) + 1;
    });
    
    const isApproved = scoreFinal >= CONFIG.aprobar;
    saveToHistory(scoreFinal, isApproved, erroresAnalisis, maxPuntajePosible);
    switchScreen('result-screen');
    const statusEl = document.getElementById('result-status');
    statusEl.innerText = isApproved ? "¡APROBADO! ✅" : "REPROBADO ❌";
    statusEl.className = isApproved ? "text-success fw-bold display-4" : "text-danger fw-bold display-4";
    document.getElementById('user-score').innerText = scoreFinal;
    document.getElementById('max-score-display').innerText = maxPuntajePosible;
    document.getElementById('pass-fail-msg').innerText = `Mínimo para aprobar: ${CONFIG.aprobar} puntos.`;
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = '';
    if (Object.keys(erroresAnalisis).length === 0) {
        feedbackList.innerHTML = `<div class="alert-info" style="border-left-color: var(--success)">🌟 ¡Excelente! Perfecto.</div>`;
    } else {
        Object.keys(erroresAnalisis).forEach(cat => {
            const div = document.createElement('div');
            div.className = "alert-info mb-2"; 
            div.innerHTML = `<strong>${cat}:</strong> ${RECOMENDACIONES[cat] || "Repasar manual."}`;
            feedbackList.appendChild(div);
        });
    }
}

// --- HISTORIAL ---
function saveToHistory(score, isApproved, errores, maxScore) {
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    const newRecord = { 
        fecha: new Date().toLocaleString('es-CL'), 
        puntaje: score, 
        maximo: maxScore, 
        estado: isApproved, 
        areasMejora: Object.keys(errores),
        preguntasGuardadas: JSON.parse(JSON.stringify(questions)), 
        respuestasGuardadas: [...userAnswers] 
    };
    history.unshift(newRecord); 
    localStorage.setItem('testpractic_history', JSON.stringify(history));
}

function loadHistory() {
    const container = document.getElementById('history-container');
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    container.innerHTML = '';
    if (history.length === 0) { container.innerHTML = `<p class="text-center p-4">No hay registros.</p>`; return; }
    
    history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'card-estudio mb-3 d-flex justify-content-between align-items-center text-start';
        div.style.cursor = "pointer";
        div.onclick = () => verDetalleHistorico(index); 
        const badgeClass = item.estado ? 'badge-pass' : 'badge-fail';
        div.innerHTML = `
            <div style="flex: 1;">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="status-badge ${badgeClass}">${item.estado ? 'APROBADO' : 'REPROBADO'}</span>
                    <small style="color: #64748b">${item.fecha}</small>
                </div>
                <h5 class="mb-1" style="color: var(--primary-blue); font-weight: 800;">Ensayo #${history.length - index}</h5>
                <p class="mb-0">Resultado: <strong>${item.puntaje}/${item.maximo} puntos</strong></p>
            </div>
            <button class="btn-leer" style="padding: 8px 15px; font-size: 0.8rem;">Ver Prueba 🔍</button>`;
        container.appendChild(div);
    });
}

function verDetalleHistorico(index) {
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    const examen = history[index];
    if (!examen.preguntasGuardadas) { alert("Registro antiguo sin detalle."); return; }
    switchScreen('history-detail-screen');
    const container = document.getElementById('history-review-container');
    container.innerHTML = `<button class="btn-leer mb-4" onclick="switchScreen('history-screen')">⬅️ Volver</button>
                           <h3>Revisión: ${examen.fecha}</h3><hr>`;
    examen.preguntasGuardadas.forEach((q, idx) => {
        const resUser = examen.respuestasGuardadas[idx];
        const esCor = resUser === q.respuestaCorrecta;
        const div = document.createElement('div');
        div.className = 'review-item';
        div.style.borderLeft = `6px solid ${esCor ? 'var(--success)' : 'var(--danger)'}`;
        
        // Soporte de imagen en historial
        let imgHTML = q.imagen ? `<img src="${q.imagen}" style="max-width: 100%; height: auto; display: block; margin: 10px 0; border-radius: 8px; border: 1px solid #eee;">` : '';

        div.innerHTML = `<p class="fw-bold">${idx + 1}. ${q.pregunta}</p>
            ${imgHTML}
            <ul class="list-unstyled">${q.opciones.map((o,i) => `<li class="p-2 mb-1 rounded ${i===q.respuestaCorrecta?'correct-answer':(i===resUser?'wrong-answer':'')}" style="border:1px solid #eee">${String.fromCharCode(65+i)}) ${o} ${i===resUser?'👤':''}</li>`).join('')}</ul>
            <div class="explanation-box"><small><strong>Explicación:</strong> ${q.explicacion}</small></div>`;
        container.appendChild(div);
    });
}

// --- TEMARIOS ---
const contenidoTemarios = {
    B: { titulo: "🚗 Manual Pro: Clase B", cuerpo: `<div class="alert-info"><strong>Física:</strong> Distancia detención = Reacción + Frenado.</div>` },
    C: { titulo: "🏍️ Manual Pro: Clase C", cuerpo: `<div class="alert-danger"><strong>Frenada:</strong> 70% delantero, 30% trasero.</div>` },
    D: { titulo: "🚜 Manual Pro: Clase D", cuerpo: `<div class="alert-warning"><strong>Carga:</strong> Viaja a 15-25cm del suelo.</div>` }
};

function cambiarTemario(clase) {
    const contenedor = document.getElementById('resumen-teorico-container');
    if (contenedor) {
        contenedor.classList.remove('hidden');
        contenedor.innerHTML = `<div class="animate-in">
                <h4>${contenidoTemarios[clase].titulo}</h4><hr>
                <div class="temario-texto">${contenidoTemarios[clase].cuerpo}</div>
                <button class="btn-leer mt-3" style="background:var(--nav-blue)" onclick="window.scrollTo({top:0,behavior:'smooth'})">Subir ▲</button></div>`;
        contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function mostrarRevisionInmediata() {
    switchScreen('history-detail-screen');
    const container = document.getElementById('history-review-container');
    container.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Revisión del Examen</h3><button class="btn-leer" onclick="switchScreen('result-screen')">⬅️ Volver</button></div><hr>`;
    questions.forEach((q, idx) => {
        const res = userAnswers[idx];
        const cor = res === q.respuestaCorrecta;
        const div = document.createElement('div');
        div.className = 'review-item';
        div.style.borderLeft = `6px solid ${cor ? 'var(--success)' : 'var(--danger)'}`;
        
        let imgHTML = q.imagen ? `<img src="${q.imagen}" style="max-width: 100%; height: auto; display: block; margin: 10px 0; border-radius: 8px; border: 1px solid #eee;">` : '';

        div.innerHTML = `<p class="fw-bold">${idx + 1}. ${q.pregunta}</p>
            ${imgHTML}
            <ul class="list-unstyled">${q.opciones.map((o,i) => `<li class="p-2 mb-1 rounded ${i===q.respuestaCorrecta?'correct-answer':(i===res?'wrong-answer':'')}" style="border:1px solid #eee">${String.fromCharCode(65+i)}) ${o} ${i===res?'👤':''}</li>`).join('')}</ul>
            <div class="explanation-box"><small><strong>Explicación:</strong> ${q.explicacion}</small></div>`;
        container.appendChild(div);
    });
}
