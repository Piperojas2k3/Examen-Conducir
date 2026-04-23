// Configuración global del examen
const TOTAL_PREGUNTAS = 35;
const PUNTAJE_APROBAR = 33;
const TIEMPO_SEGUNDOS = 45 * 60; // 45 minutos

let questions = [];
let currentIdx = 0;
let userScore = 0;
let errorsByCat = {};
let timeLeft = TIEMPO_SEGUNDOS;
let selectedOption = null;
let timerInterval;

// Feedback personalizado basado en la Guía Maestra CONASET
const RECOMENDACIONES = {
    "Seguridad Vial": "Debes repasar las normativas de alcohol, sistemas de retención infantil (SRI) y los principios de Visión Cero.",
    "Normas de Circulación": "Refuerza el estudio sobre preferencias de paso, rotondas y límites de velocidad urbanos.",
    "Mecánica Básica": "Revisa la función de los testigos del tablero (luces rojas/amarillas), niveles de líquidos y neumáticos.",
    "Física de la Conducción": "Practica el cálculo de la Distancia de Reacción (multiplicar por 3) y el efecto de la velocidad en la energía cinética.",
    "Situaciones de Emergencia": "Repasa los protocolos en caso de accidentes (proteger y avisar) y el uso correcto del extintor/triángulos.",
    "Seguridad Pasiva": "Estudia el uso conjunto del cinturón y el airbag, y la posición correcta del apoyacabezas.",
    "Maquinaria": "Revisa los reglamentos específicos para tránsito de vehículos pesados y retroexcavadoras en vía pública.",
    "Conducción Motocicletas": "Refuerza los conceptos de trazado de curvas, frenada combinada y uso de equipamiento reflectante."
};

async function startExam(clase) {
    document.getElementById('loading-msg').classList.remove('hidden');
    
    try {
        // Carga dinámica del JSON
        const response = await fetch('preguntas.json');
        if (!response.ok) throw new Error("Error al cargar la base de datos.");
        
        const data = await response.json();
        
        // Filtrar por clase y seleccionar 35 preguntas aleatorias
        questions = data.filter(q => q.clase === clase || q.clase === "Todas")
                        .sort(() => 0.5 - Math.random())
                        .slice(0, TOTAL_PREGUNTAS);
        
        if (questions.length === 0) {
            alert(`No hay preguntas suficientes para la Clase ${clase} en la base de datos.`);
            document.getElementById('loading-msg').classList.add('hidden');
            return;
        }

        // Configurar UI para el examen
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        document.getElementById('timer-box').classList.remove('hidden');
        document.getElementById('progress-container').classList.remove('hidden');
        
        showQuestion();
        startTimer();

    } catch (error) {
        console.error(error);
        alert("No se pudo cargar preguntas.json. Asegúrate de ejecutar esto en un servidor local o GitHub Pages, no como archivo file://");
        document.getElementById('loading-msg').classList.add('hidden');
    }
}

function showQuestion() {
    const q = questions[currentIdx];
    
    // Actualizar cabeceras
    document.getElementById('category-label').innerText = q.categoria;
    document.getElementById('question-counter').innerText = `Pregunta ${currentIdx + 1} de ${questions.length}`;
    document.getElementById('question-text').innerText = q.pregunta;
    
    // Generar opciones dinámicas
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    q.opciones.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = `${String.fromCharCode(65 + index)}) ${opt}`; // A) B) C)
        btn.onclick = () => selectOption(index, btn);
        container.appendChild(btn);
    });
}

function selectOption(index, btn) {
    selectedOption = index;
    // Remover clase selected de todos los botones
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    // Agregar clase selected al clickeado
    btn.classList.add('selected');
    // Habilitar botón siguiente
    document.getElementById('next-btn').disabled = false;
}

document.getElementById('next-btn').onclick = () => {
    const q = questions[currentIdx];
    
    // Lógica de puntaje: Las preguntas críticas valen el doble
    const points = q.esCritica ? 2 : 1;

    if (selectedOption === q.respuestaCorrecta) {
        userScore += points;
    } else {
        // Registrar el error para el plan de mejora
        errorsByCat[q.categoria] = (errorsByCat[q.categoria] || 0) + 1;
    }

    currentIdx++;
    updateProgress();
    
    if (currentIdx < questions.length) {
        selectedOption = null;
        document.getElementById('next-btn').disabled = true;
        showQuestion();
    } else {
        showResults();
    }
};

function showResults() {
    clearInterval(timerInterval);
    
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('timer-box').classList.add('hidden');
    document.getElementById('progress-container').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    
    const isApproved = userScore >= PUNTAJE_APROBAR;
    const statusEl = document.getElementById('result-status');
    
    document.getElementById('user-score').innerText = userScore;
    statusEl.innerText = isApproved ? "¡EXAMEN APROBADO! ✅" : "EXAMEN REPROBADO ❌";
    statusEl.style.color = isApproved ? "var(--success)" : "var(--danger)";
    
    // Generar Plan de Mejora
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = '';
    
    if (Object.keys(errorsByCat).length === 0) {
        feedbackList.innerHTML = "<li>¡Excelente trabajo! No tuviste errores registrados en las categorías evaluadas.</li>";
    } else {
        Object.keys(errorsByCat).forEach(cat => {
            const li = document.createElement('li');
            const consejo = RECOMENDACIONES[cat] || "Te sugerimos repasar a fondo este capítulo del manual.";
            li.innerHTML = `<strong>${cat} (${errorsByCat[cat]} errores):</strong> ${consejo}`;
            feedbackList.appendChild(li);
        });
    }
}

function startTimer() {
    const timerEl = document.getElementById('timer');
    timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        timerEl.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        if (timeLeft <= 300) timerEl.style.color = "#fca5a5"; // Rojo a los 5 min
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showResults();
        }
        timeLeft--;
    }, 1000);
}

function updateProgress() {
    const percent = (currentIdx / questions.length) * 100;
    document.getElementById('progress-bar').style.width = percent + "%";
}
