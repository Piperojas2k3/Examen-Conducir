// ==========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
let CONFIG = { total: 35, aprobar: 33, tiempo: 45 * 60, maxScore: 38 };

let questions = [];
let userAnswers = []; 
let currentIdx = 0;
let timeLeft = 0;
let timerInterval;

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
    
    // Si volvemos a temarios, ocultamos el cuadro de texto hasta que elijan uno
    if (screenId === 'temarios-screen') {
        const container = document.getElementById('resumen-teorico-container');
        if (container) container.classList.add('hidden');
    }
}
// --- INICIO DEL EXAMEN ---
async function startExam(clase) {
    const loadingMsg = document.getElementById('loading-msg');
    loadingMsg.classList.remove('hidden');
    
    // Ajuste de reglas según Clase
    if (clase === 'D') {
        CONFIG.total = 12; CONFIG.aprobar = 10; CONFIG.tiempo = 15 * 60; CONFIG.maxScore = 12;
    } else {
        CONFIG.total = 35; CONFIG.aprobar = 33; CONFIG.tiempo = 45 * 60; CONFIG.maxScore = 38; 
    }

    try {
        const response = await fetch('preguntas.json');
        if (!response.ok) throw new Error("Error cargando base de datos.");
        
        const data = await response.json();
        
        // Filtra, aleatoriza y selecciona la cantidad de preguntas
        questions = data.filter(q => q.clase === clase || q.clase === "Todas")
                        .sort(() => 0.5 - Math.random())
                        .slice(0, CONFIG.total);
        
        if (questions.length === 0) {
            alert(`No hay suficientes preguntas de Clase ${clase} en el archivo.`);
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
        alert("Error: Revisa que el archivo 'preguntas.json' esté en la misma carpeta.");
    }
}

// --- MOSTRAR PREGUNTA ACTUAL ---
function showQuestion() {
    const q = questions[currentIdx];
    const prevAnswer = userAnswers[currentIdx]; 
    
    document.getElementById('category-label').innerText = q.categoria;
    document.getElementById('question-counter').innerText = `Pregunta ${currentIdx + 1} de ${questions.length}`;
    document.getElementById('question-text').innerText = q.pregunta;
    
    const container = document.getElementById('options-container');
    container.innerHTML = ''; 
    
    q.opciones.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = `${String.fromCharCode(65 + index)}) ${opt}`; 
        if (prevAnswer === index) btn.classList.add('selected');
        btn.onclick = () => selectOption(index, btn);
        container.appendChild(btn);
    });

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (currentIdx === 0) prevBtn.classList.add('hidden');
    else prevBtn.classList.remove('hidden');

    if (currentIdx === questions.length - 1) {
        nextBtn.innerText = "Finalizar Examen 🏁";
        nextBtn.classList.add('btn-danger'); // Usa el color rojo de style.css
    } else {
        nextBtn.innerText = "Siguiente ➡️";
        nextBtn.classList.remove('btn-danger');
    }

    nextBtn.disabled = (prevAnswer === null);
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
// --- RESULTADOS Y REVISIÓN ---
function calcularYMostrarResultados() {
    clearInterval(timerInterval);
    let scoreFinal = 0;
    let maxPuntajePosible = 0;
    let erroresAnalisis = {};
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = ''; 

    questions.forEach((q, idx) => {
        const respuestaUsuario = userAnswers[idx];
        const isCorrect = respuestaUsuario === q.respuestaCorrecta;
        const puntos = q.esCritica ? 2 : 1;
        maxPuntajePosible += puntos;

        if (isCorrect) scoreFinal += puntos;
        else erroresAnalisis[q.categoria] = (erroresAnalisis[q.categoria] || 0) + 1;

        let reviewHTML = `
            <div class="review-item">
                <p>${idx + 1}. ${q.pregunta} ${q.esCritica ? '⭐ (Doble)' : ''}</p>
                <ul>
        `;

        q.opciones.forEach((opt, optIdx) => {
            let cssClass = '';
            if (optIdx === q.respuestaCorrecta) cssClass = 'correct-answer';
            else if (optIdx === respuestaUsuario && !isCorrect) cssClass = 'wrong-answer';
            reviewHTML += `<li class="${cssClass}">${String.fromCharCode(65 + optIdx)}) ${opt}</li>`;
        });

        reviewHTML += `
                </ul>
                <div class="explanation-box">
                    <strong>Fundamento:</strong> ${q.explicacion}
                </div>
            </div>
        `;
        reviewContainer.innerHTML += reviewHTML;
    });
    
    const isApproved = scoreFinal >= CONFIG.aprobar;
    saveToHistory(scoreFinal, isApproved, erroresAnalisis, maxPuntajePosible);
    
    switchScreen('result-screen');
    const statusEl = document.getElementById('result-status');
    document.getElementById('user-score').innerText = scoreFinal;
    document.getElementById('max-score-display').innerText = maxPuntajePosible;
    document.getElementById('pass-fail-msg').innerText = `Se requieren ${CONFIG.aprobar} puntos para aprobar.`;
    
    statusEl.innerText = isApproved ? "¡APROBADO! ✅" : "REPROBADO ❌";
    statusEl.style.color = isApproved ? "var(--success)" : "var(--danger)";
    
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = '';
    
    if (Object.keys(erroresAnalisis).length === 0) {
        feedbackList.innerHTML = "<li>¡Examen Perfecto! Revisa el fundamento de tus aciertos abajo.</li>";
    } else {
        Object.keys(erroresAnalisis).forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${cat}:</strong> ${RECOMENDACIONES[cat] || "Repasar manual."}`;
            feedbackList.appendChild(li);
        });
    }
}

// =========================================================
// GESTIÓN DE HISTORIAL PRO (TARJETAS + FEEDBACK DETALLADO)
// =========================================================

// --- 1. GUARDAR EL EXAMEN COMPLETO (Incluye preguntas y tus respuestas) ---
function saveToHistory(score, isApproved, errores, maxScore) {
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    
    const newRecord = { 
        fecha: new Date().toLocaleString('es-CL'), 
        puntaje: score, 
        maximo: maxScore, 
        estado: isApproved, 
        areasMejora: Object.keys(errores),
        // Guardamos las preguntas y tus respuestas para revisarlas después
        preguntasGuardadas: JSON.parse(JSON.stringify(questions)), 
        respuestasGuardadas: [...userAnswers] 
    };
    
    history.unshift(newRecord); 
    localStorage.setItem('testpractic_history', JSON.stringify(history));
}

// --- 2. MOSTRAR HISTORIAL COMO TARJETAS ---
function loadHistory() {
    const container = document.getElementById('history-container');
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    container.innerHTML = '';
    
    if (history.length === 0) { 
        container.innerHTML = `<div class="card-estudio text-center p-4"><p class="text-muted mb-0">Aún no hay registros de exámenes.</p></div>`; 
        return; 
    }
    
    history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'card-estudio mb-3 d-flex justify-content-between align-items-center text-start';
        div.style.cursor = "pointer";
        div.onclick = () => verDetalleHistorico(index); 

        const badgeClass = item.estado ? 'badge-pass' : 'badge-fail';
        const badgeText = item.estado ? 'APROBADO' : 'REPROBADO';
        
        div.innerHTML = `
            <div style="flex: 1;">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="status-badge ${badgeClass}">${badgeText}</span>
                    <small style="color: #64748b">${item.fecha}</small>
                </div>
                <h5 class="mb-1" style="color: var(--primary-blue); font-weight: 800;">Ensayo #${history.length - index}</h5>
                <p class="mb-0" style="font-size: 0.95rem;">Resultado: <strong>${item.puntaje}/${item.maximo} puntos</strong></p>
            </div>
            <div class="text-end">
                <button class="btn-leer" style="padding: 8px 15px; font-size: 0.8rem;">Revisar Prueba 🔍</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// --- 3. VER EL DETALLE DE UNA PRUEBA DEL PASADO ---
function verDetalleHistorico(index) {
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    const examen = history[index];

    if (!examen.preguntasGuardadas) {
        alert("Este registro es antiguo y no tiene el detalle guardado.");
        return;
    }

    switchScreen('history-detail-screen');
    const container = document.getElementById('history-review-container');
    
    container.innerHTML = `
        <div class="mb-4 d-flex justify-content-between align-items-center">
            <div>
                <h3 class="mb-0">Revisión de Ensayo</h3>
                <p class="text-muted mb-0">Realizado el ${examen.fecha}</p>
            </div>
            <button class="btn-leer" onclick="switchScreen('history-screen')" style="background: var(--nav-blue)">⬅️ Volver</button>
        </div>
        <div class="alert-info mb-4">
            Puntaje final: <strong>${examen.puntaje} de ${examen.maximo} puntos</strong>.
        </div>
        <hr>
    `;

    examen.preguntasGuardadas.forEach((q, idx) => {
        const resUsuario = examen.respuestasGuardadas[idx];
        const esCorrecta = resUsuario === q.respuestaCorrecta;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'review-item';
        itemDiv.style.borderLeft = `6px solid ${esCorrecta ? 'var(--success)' : 'var(--danger)'}`;

        let opcionesHTML = q.opciones.map((opt, i) => {
            let claseExtra = '';
            let icono = '';
            if (i === q.respuestaCorrecta) {
                claseExtra = 'correct-answer';
                if (i === resUsuario) icono = ' ✅';
            } else if (i === resUsuario && !esCorrecta) {
                claseExtra = 'wrong-answer';
                icono = ' 👤 (Tu error)';
            }
            return `<li class="p-2 mb-1 rounded ${claseExtra}" style="border: 1px solid #eee; font-size: 0.95rem;">
                ${String.fromCharCode(65 + i)}) ${opt}${icono}
            </li>`;
        }).join('');

        itemDiv.innerHTML = `
            <p class="fw-bold mb-2">${idx + 1}. ${q.pregunta}</p>
            <ul class="list-unstyled mb-3">${opcionesHTML}</ul>
            <div class="explanation-box">
                <small><strong>Explicación:</strong> ${q.explicacion}</small>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

// ==========================================
// LÓGICA DE TEMARIOS PROFESIONALES
// ==========================================

const contenidoTemarios = {
    B: {
        titulo: "🚗 Manual Pro: Clase B (Automóviles)",
        cuerpo: `
            <div class="alert-info"><strong>Dato Crítico:</strong> El 90% de los siniestros son evitables y ocurren por error humano.</div>
            <h6 class="fw-bold">1. Física del Vehículo:</h6>
            <ul>
                <li><b>Distancia de Detención:</b> Reacción + Frenado. Al duplicar la velocidad, la distancia de frenado aumenta 4 veces ($v^2$).</li>
                <li><b>Efecto Túnel:</b> A 130 km/h el campo visual se reduce a 30°.</li>
            </ul>
            <h6 class="fw-bold">2. Normativa y Leyes:</h6>
            <ul>
                <li><b>Ley Emilia:</b> Cárcel efectiva mínima de 1 año por ebriedad con resultado de muerte o lesiones graves.</li>
                <li><b>Ley No Chat:</b> Prohibido manipular el celular incluso en semáforos o tacos.</li>
            </ul>
        `
    },
    C: {
        titulo: "🏍️ Manual Pro: Clase C (Motocicletas)",
        cuerpo: `
            <div class="alert-danger"><strong>Frenada Crítica:</strong> El 70% del frenado debe ser delantero y el 30% trasero.</div>
            <h6 class="fw-bold">1. Dinámica de Conducción:</h6>
            <ul>
                <li><b>Contramanillar:</b> Sobre 35 km/h, empujar el manillar hacia el lado que quieres doblar.</li>
                <li><b>Fijación del objetivo:</b> La moto siempre irá hacia donde mires. Mira la salida de la curva.</li>
            </ul>
            <h6 class="fw-bold">2. Seguridad Pasiva:</h6>
            <p>El casco debe arrastrar la piel de las mejillas al ponérselo. Si te queda suelto, no absorberá el impacto correctamente.</p>
        `
    },
    D: {
        titulo: "🚜 Manual Pro: Clase D (Maquinaria Pesada)",
        cuerpo: `
            <div class="alert-warning"><strong>Estabilidad:</strong> La carga siempre debe viajar a 15-25 cm del suelo para mantener el centro de gravedad bajo.</div>
            <h6 class="fw-bold">1. Estructuras de Protección:</h6>
            <ul>
                <li><b>ROPS:</b> Protección contra vuelcos.</li>
                <li><b>FOPS:</b> Protección contra caída de objetos.</li>
            </ul>
            <h6 class="fw-bold">2. Operación Segura:</h6>
            <p>En pendientes, con carga se sube de frente y se baja en reversa. Sin carga, se baja de frente para asegurar la tracción.</p>
        `
    }
};

function cambiarTemario(clase) {
    const contenedor = document.getElementById('resumen-teorico-container');
    if (contenedor) {
        contenedor.classList.remove('hidden');
        contenedor.innerHTML = `
            <div class="animate-in">
                <h4>${contenidoTemarios[clase].titulo}</h4>
                <hr>
                <div class="temario-texto">${contenidoTemarios[clase].cuerpo}</div>
                <button class="btn-leer mt-3" style="background:var(--nav-blue)" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">Volver arriba ▲</button>
            </div>
        `;
        contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
function mostrarRevisionInmediata() {
    // Reutilizamos la pantalla de detalle que creamos para el historial
    switchScreen('history-detail-screen');
    const container = document.getElementById('history-review-container');
    
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Revisión del Examen</h3>
            <button class="btn-leer" onclick="switchScreen('result-screen')">⬅️ Volver al Puntaje</button>
        </div>
        <hr>
    `;

    // Usamos las preguntas que acabas de responder
    questions.forEach((q, idx) => {
        const resUsuario = userAnswers[idx];
        const esCorrecta = resUsuario === q.respuestaCorrecta;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'review-item';
        itemDiv.style.borderLeft = `6px solid ${esCorrecta ? 'var(--success)' : 'var(--danger)'}`;

        let opcionesHTML = q.opciones.map((opt, i) => {
            let claseExtra = '';
            if (i === q.respuestaCorrecta) claseExtra = 'correct-answer';
            else if (i === resUsuario && !esCorrecta) claseExtra = 'wrong-answer';
            
            return `<li class="p-2 mb-1 rounded ${claseExtra}" style="border: 1px solid #eee;">
                ${String.fromCharCode(65 + i)}) ${opt} ${i === resUsuario ? '👤' : ''}
            </li>`;
        }).join('');

        itemDiv.innerHTML = `
            <p class="fw-bold">${idx + 1}. ${q.pregunta}</p>
            <ul class="list-unstyled">${opcionesHTML}</ul>
            <div class="explanation-box"><small><strong>Explicación:</strong> ${q.explicacion}</small></div>
        `;
        container.appendChild(itemDiv);
    });
}
