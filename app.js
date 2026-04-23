// Configuración global
const TOTAL_PREGUNTAS = 35;
const PUNTAJE_APROBAR = 33;
const TIEMPO_SEGUNDOS = 45 * 60; 

let questions = [];
let userAnswers = []; 
let currentIdx = 0;
let timeLeft = TIEMPO_SEGUNDOS;
let timerInterval;

// Navegación entre pantallas
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    // Si salimos del quiz a otra pantalla, limpiamos el intervalo
    if (screenId !== 'quiz-screen') {
        clearInterval(timerInterval);
    }
}

const RECOMENDACIONES = {
    "Seguridad Vial": "Repasar normativas de alcohol, SRI y Visión Cero.",
    "Normas de Circulación": "Refuerza preferencias de paso y límites de velocidad.",
    "Mecánica Básica": "Revisa los testigos del tablero y líquidos.",
    "Física de la Conducción": "Practica cálculos de Distancia de Reacción.",
    "Situaciones de Emergencia": "Repasa protocolos de accidentes.",
    "Seguridad Pasiva": "Estudia el uso del cinturón y apoyacabezas."
};

async function startExam(clase) {
    document.getElementById('loading-msg').classList.remove('hidden');
    
    try {
        const response = await fetch('preguntas.json');
        if (!response.ok) throw new Error("Error cargando base de datos.");
        
        const data = await response.json();
        questions = data.filter(q => q.clase === clase || q.clase === "Todas")
                        .sort(() => 0.5 - Math.random())
                        .slice(0, TOTAL_PREGUNTAS);
        
        if (questions.length === 0) {
            alert(`Faltan preguntas de Clase ${clase} en JSON.`);
            document.getElementById('loading-msg').classList.add('hidden');
            return;
        }

        userAnswers = new Array(questions.length).fill(null);
        currentIdx = 0;
        timeLeft = TIEMPO_SEGUNDOS;

        document.getElementById('loading-msg').classList.add('hidden');
        switchScreen('quiz-screen');
        
        showQuestion();
        startTimer();

    } catch (error) {
        console.error(error);
        alert("Actualiza tus archivos en GitHub.");
    }
}

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
        nextBtn.innerText = "Finalizar 🏁";
        nextBtn.style.backgroundColor = "var(--danger)";
    } else {
        nextBtn.innerText = "Siguiente ➡️";
        nextBtn.style.backgroundColor = "var(--success)";
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

document.getElementById('prev-btn').onclick = () => {
    if (currentIdx > 0) { currentIdx--; showQuestion(); }
};

document.getElementById('next-btn').onclick = () => {
    if (currentIdx < questions.length - 1) {
        currentIdx++; showQuestion();
    } else {
        calcularYMostrarResultados(); 
    }
};

function calcularYMostrarResultados() {
    clearInterval(timerInterval);
    
    let scoreFinal = 0;
    let erroresAnalisis = {};

    questions.forEach((q, idx) => {
        if (userAnswers[idx] === q.respuestaCorrecta) {
            scoreFinal += q.esCritica ? 2 : 1;
        } else {
            erroresAnalisis[q.categoria] = (erroresAnalisis[q.categoria] || 0) + 1;
        }
    });
    
    const isApproved = scoreFinal >= PUNTAJE_APROBAR;
    
    // Guardar en Historial (LocalStorage)
    saveToHistory(scoreFinal, isApproved, erroresAnalisis);
    
    // Mostrar pantalla
    switchScreen('result-screen');
    const statusEl = document.getElementById('result-status');
    document.getElementById('user-score').innerText = scoreFinal;
    statusEl.innerText = isApproved ? "¡APROBADO! ✅" : "REPROBADO ❌";
    statusEl.style.color = isApproved ? "var(--success)" : "var(--danger)";
    
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = '';
    
    if (Object.keys(erroresAnalisis).length === 0) {
        feedbackList.innerHTML = "<li>¡Excelente! Examen perfecto.</li>";
    } else {
        Object.keys(erroresAnalisis).forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${cat}:</strong> ${RECOMENDACIONES[cat] || "Repasar capítulo."}`;
            feedbackList.appendChild(li);
        });
    }
}

// --- SISTEMA DE CUENTA LOCAL (LocalStorage) ---

function saveToHistory(score, isApproved, errores) {
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    
    const newRecord = {
        fecha: new Date().toLocaleString('es-CL'),
        puntaje: score,
        estado: isApproved,
        areasMejora: Object.keys(errores)
    };
    
    history.unshift(newRecord); // Agrega al principio
    localStorage.setItem('testpractic_history', JSON.stringify(history));
}

function loadHistory() {
    const container = document.getElementById('history-container');
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    
    container.innerHTML = '';
    
    if (history.length === 0) {
        container.innerHTML = "<p>Aún no has realizado ningún examen. ¡Empieza ahora!</p>";
        return;
    }
    
    history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const badge = item.estado ? '<span class="status-badge badge-pass">Aprobado</span>' : '<span class="status-badge badge-fail">Reprobado</span>';
        
        let areas = item.areasMejora.length > 0 ? item.areasMejora.join(", ") : "Ninguna (Perfecto)";
        
        div.innerHTML = `
            <h4>Examen ${history.length - index} - ${item.fecha}</h4>
            <p><strong>Resultado:</strong> ${item.puntaje}/38 puntos ${badge}</p>
            <p style="font-size: 0.9rem; color: #64748b; margin-top: 5px;"><strong>A mejorar:</strong> ${areas}</p>
        `;
        container.appendChild(div);
    });
}

// Reloj y Progreso
function startTimer() {
    const timerEl = document.getElementById('timer');
    timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerEl.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        if (timeLeft <= 0) calcularYMostrarResultados();
        timeLeft--;
    }, 1000);
}

function updateProgress() {
    document.getElementById('progress-bar').style.width = ((currentIdx + 1) / questions.length * 100) + "%";
}
