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

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId !== 'quiz-screen') clearInterval(timerInterval);
}

async function startExam(clase) {
    document.getElementById('loading-msg').classList.remove('hidden');
    
    // Configuración Automática según Clase
    if (clase === 'D') {
        CONFIG.total = 12;
        CONFIG.aprobar = 10;
        CONFIG.tiempo = 15 * 60;
        CONFIG.maxScore = 12; // Clase D no suele tener doble puntaje oficial, pero el sistema lo soporta
    } else {
        CONFIG.total = 35;
        CONFIG.aprobar = 33;
        CONFIG.tiempo = 45 * 60;
        CONFIG.maxScore = 38; 
    }

    try {
        const response = await fetch('preguntas.json');
        if (!response.ok) throw new Error("Error cargando base de datos.");
        
        const data = await response.json();
        
        // Filtra por clase, aleatoriza, y extrae la cantidad exacta (35 o 12)
        questions = data.filter(q => q.clase === clase || q.clase === "Todas")
                        .sort(() => 0.5 - Math.random())
                        .slice(0, CONFIG.total);
        
        if (questions.length === 0) {
            alert(`Faltan preguntas de Clase ${clase} en JSON.`);
            return;
        }

        userAnswers = new Array(questions.length).fill(null);
        currentIdx = 0;
        timeLeft = CONFIG.tiempo;

        document.getElementById('loading-msg').classList.add('hidden');
        switchScreen('quiz-screen');
        showQuestion();
        startTimer();

    } catch (error) {
        console.error(error);
        alert("Asegúrate de que preguntas.json esté actualizado en GitHub.");
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
        nextBtn.innerText = "Finalizar Examen 🏁";
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

document.getElementById('prev-btn').onclick = () => { if (currentIdx > 0) { currentIdx--; showQuestion(); } };
document.getElementById('next-btn').onclick = () => {
    if (currentIdx < questions.length - 1) { currentIdx++; showQuestion(); } 
    else calcularYMostrarResultados(); 
};

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

        // Cálculos
        if (isCorrect) scoreFinal += puntos;
        else erroresAnalisis[q.categoria] = (erroresAnalisis[q.categoria] || 0) + 1;

        // Render visual interactivo
        let reviewHTML = `
            <div class="review-item">
                <p>${idx + 1}. ${q.pregunta} ${q.esCritica ? '⭐ (Doble)' : ''}</p>
                <ul>
        `;

        q.opciones.forEach((opt, optIdx) => {
            let cssClass = '';
            if (optIdx === q.respuestaCorrecta) {
                cssClass = 'correct-answer'; // Verde para la correcta siempre
            } else if (optIdx === respuestaUsuario && !isCorrect) {
                cssClass = 'wrong-answer'; // Rojo para el error del usuario
            }
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
    
    // El mínimo de aprobación oficial (33 para B/C, o 10 para D)
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

function saveToHistory(score, isApproved, errores, maxScore) {
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    const newRecord = { fecha: new Date().toLocaleString('es-CL'), puntaje: score, maximo: maxScore, estado: isApproved, areasMejora: Object.keys(errores) };
    history.unshift(newRecord); 
    localStorage.setItem('testpractic_history', JSON.stringify(history));
}

function loadHistory() {
    const container = document.getElementById('history-container');
    let history = JSON.parse(localStorage.getItem('testpractic_history')) || [];
    container.innerHTML = '';
    if (history.length === 0) { container.innerHTML = "<p>Aún no hay registros.</p>"; return; }
    
    history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const badge = item.estado ? '<span class="status-badge badge-pass">Aprobado</span>' : '<span class="status-badge badge-fail">Reprobado</span>';
        let areas = item.areasMejora.length > 0 ? item.areasMejora.join(", ") : "Perfecto";
        div.innerHTML = `
            <h4>Ensayo ${history.length - index} - ${item.fecha}</h4>
            <p><strong>Resultado:</strong> ${item.puntaje}/${item.maximo} puntos ${badge}</p>
            <p style="font-size: 0.9rem; color: #64748b;"><strong>A mejorar:</strong> ${areas}</p>
        `;
        container.appendChild(div);
    });
}

function startTimer() {
    const timerEl = document.getElementById('timer');
    timerInterval = setInterval(() => {
        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        timerEl.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        if (timeLeft <= 300) timerEl.style.color = "#fca5a5"; 
        if (timeLeft <= 0) calcularYMostrarResultados();
        timeLeft--;
    }, 1000);
}

function updateProgress() { document.getElementById('progress-bar').style.width = ((currentIdx + 1) / questions.length * 100) + "%"; }

function mostrarTeoria(clase) {
    const contenedor = document.getElementById('teoria-content');
    const titulo = document.getElementById('teoria-titulo');
    const texto = document.getElementById('teoria-texto');
    
    contenedor.classList.remove('hidden');
    
    if(clase === 'B') {
        titulo.innerText = "🚗 Resumen Teórico: Clase B";
        texto.innerHTML = "<strong>Física y Velocidad:</strong> La energía cinética aumenta al cuadrado de la velocidad (doble velocidad = cuadruplica impacto). Distancia de reacción se calcula multiplicando por 3 el primer dígito de la velocidad.<br><br><strong>Normas Claves:</strong> Ley Tolerancia Cero pena desde 0.3g/l. Ley Emilia sanciona desde 0.8g/l (Ebriedad) con cárcel efectiva. Distancia a ciclistas: 1.5 metros obligatorios. Luz alta nocturna debe bajarse a 200m de otro vehículo.";
    } else if(clase === 'C') {
        titulo.innerText = "🏍️ Resumen Teórico: Clase C";
        texto.innerHTML = "<strong>Física 2 Ruedas:</strong> Frenada de emergencia exige 70% freno delantero y 30% trasero por transferencia de peso. En curvas veloces se usa 'Contramanillar' (empujar manillar al lado del viraje).<br><br><strong>Convivencia:</strong> Interfiltrado solo permitido con vehículos detenidos (roja o taco) para llegar a la 'Motobox'. Casco integral debe arrastrar la piel de las mejillas, si desliza no sirve.";
    } else if(clase === 'D') {
        titulo.innerText = "🚜 Resumen Teórico: Clase D";
        texto.innerHTML = "<strong>Estabilidad Maquinaria:</strong> En grúa horquilla la carga viaja a 15-25cm del suelo y mástil hacia atrás. En pendientes: subir de frente y bajar en reversa para no volcar carga.<br><br><strong>Señalética:</strong> Octágono (Pare) permite reconocimiento ciego en mal clima. Semáforo amarillo es prevención (tiempo matemático para frenar antes de la intersección), no permiso de acelerar.";
    }
}
