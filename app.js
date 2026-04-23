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

// Feedback personalizado
const RECOMENDACIONES = {
    "Seguridad Vial": "Debes repasar las normativas de alcohol, sistemas de retención infantil (SRI) y los principios de Visión Cero.",
    "Normas de Circulación": "Refuerza el estudio sobre preferencias de paso, rotondas y límites de velocidad urbanos.",
    "Mecánica Básica": "Revisa la función de los testigos del tablero, niveles de líquidos y neumáticos.",
    "Física de la Conducción": "Practica el cálculo de la Distancia de Reacción y el efecto de la velocidad.",
    "Situaciones de Emergencia": "Repasa los protocolos en caso de accidentes y el uso del extintor/triángulos.",
    "Seguridad Pasiva": "Estudia el uso del cinturón, airbag y la posición del apoyacabezas.",
    "Maquinaria": "Revisa los reglamentos específicos para tránsito de vehículos pesados en vía pública.",
    "Conducción Motocicletas": "Refuerza los conceptos de trazado de curvas y uso de equipamiento."
};

// 1. Función que inicia el examen
async function startExam(clase) {
    document.getElementById('loading-msg').classList.remove('hidden');
    
    try {
        const response = await fetch('preguntas.json');
        if (!response.ok) throw new Error("Error de red al intentar cargar preguntas.json.");
        
        const data = await response.json();
        
        questions = data.filter(q => q.clase === clase || q.clase === "Todas")
                        .sort(() => 0.5 - Math.random())
                        .slice(0, TOTAL_PREGUNTAS);
        
        if (questions.length === 0) {
            alert(`No hay preguntas suficientes para la Clase ${clase} en el archivo JSON.`);
            document.getElementById('loading-msg').classList.add('hidden');
            return;
        }

        // Mostrar/Ocultar pantallas
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('loading-msg').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        document.getElementById('timer-box').classList.remove('hidden');
        document.getElementById('progress-container').classList.remove('hidden');
        
        // ¡Aquí es donde llamamos a la función que te daba error!
        showQuestion();
        startTimer();

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message + "\n\nTip: Verifica que tu archivo se llame exactamente 'preguntas.json' y esté en la misma carpeta.");
        document.getElementById('loading-msg').classList.add('hidden');
    }
}

// 2. Función que muestra la pregunta en pantalla (la que faltaba)
function showQuestion() {
    const q = questions[currentIdx];
    
    document.getElementById('category-label').innerText = q.categoria;
    document.getElementById('question-counter').innerText = `Pregunta ${currentIdx + 1} de ${questions.length}`;
    document.getElementById('question-text').innerText = q.pregunta;
    
    const container = document.getElementById('options-container');
    container.innerHTML = ''; // Limpiar opciones anteriores
    
    q.opciones.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = `${String.fromCharCode(65 + index)}) ${opt}`; // Genera A), B), C)
        btn.onclick = () => selectOption(index, btn);
        container.appendChild(btn);
    });
}

// 3. Función para seleccionar una opción
function selectOption(index, btn) {
    selectedOption = index;
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('next-btn').disabled = false;
}

// 4. Lógica del botón "Siguiente / Confirmar"
document.getElementById('next-btn').onclick = () => {
    const q = questions[currentIdx];
    const points = q.esCritica ? 2 : 1; // Puntaje doble si es crítica

    if (selectedOption === q.respuestaCorrecta) {
        userScore += points;
    } else {
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

// 5. Función para mostrar los resultados finales
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
    
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = '';
    
    if (Object.keys(errorsByCat).length === 0) {
        feedbackList.innerHTML = "<li>¡Excelente trabajo! No tuviste errores.</li>";
    } else {
        Object.keys(errorsByCat).forEach(cat => {
            const li = document.createElement('li');
            const consejo = RECOMENDACIONES[cat] || "Te sugerimos repasar a fondo este capítulo.";
            li.innerHTML = `<strong>${cat} (${errorsByCat[cat]} errores):</strong> ${consejo}`;
            feedbackList.appendChild(li);
        });
    }
}

// 6. Función del reloj temporizador
function startTimer() {
    const timerEl = document.getElementById('timer');
    timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        timerEl.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        if (timeLeft <= 300) timerEl.style.color = "#fca5a5"; // Rojo cuando quedan 5 min
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showResults();
        }
        timeLeft--;
    }, 1000);
}

// 7. Función de la barra de progreso
function updateProgress() {
    const percent = (currentIdx / questions.length) * 100;
    document.getElementById('progress-bar').style.width = percent + "%";
}
