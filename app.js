let questions = [];
let currentIdx = 0;
let userScore = 0;
let errorsByCat = {};
let timeLeft = 45 * 60;
let selectedOption = null;

// Categorías basadas en la Guía Maestra 
const RECOMENDACIONES = {
    "Seguridad Vial": "Refuerza los principios de Visión Cero y supervivencia a 30 km/h.",
    "Mecánica": "Repasa los testigos del tablero y sistemas de lubricación.",
    "Física": "Practica los cálculos de distancia de reacción y frenado.",
    "Seguridad Pasiva": "Revisa el uso del cinturón y ajuste del apoyacabezas."
};

async function startExam(clase) {
    const res = await fetch('preguntas.json');
    const data = await res.json();
    questions = data.filter(q => q.clase === clase).sort(() => 0.5 - Math.random()).slice(0, 35);
    
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    showQuestion();
    startTimer();
}

function showQuestion() {
    const q = questions[currentIdx];
    document.getElementById('category-label').innerText = q.categoria;
    document.getElementById('question-counter').innerText = `Pregunta ${currentIdx + 1} de 35`;
    document.getElementById('question-text').innerText = q.pregunta;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    q.opciones.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => selectOption(i, btn);
        container.appendChild(btn);
    });
}

function selectOption(idx, btn) {
    selectedOption = idx;
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('next-btn').disabled = false;
}

document.getElementById('next-btn').onclick = () => {
    const q = questions[currentIdx];
    const points = q.esCritica ? 2 : 1; // Lógica de puntaje doble 

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

function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    
    const pass = userScore >= 33; // Mínimo de aprobación [cite: 194, 195]
    document.getElementById('user-score').innerText = userScore;
    document.getElementById('result-status').innerText = pass ? "¡APROBADO!" : "REPROBADO";
    document.getElementById('result-status').style.color = pass ? "green" : "red";
    
    const list = document.getElementById('feedback-list');
    Object.keys(errorsByCat).forEach(cat => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${cat}:</strong> ${RECOMENDACIONES[cat] || "Repasar este capítulo."}`;
        list.appendChild(li);
    });
}

function startTimer() {
    const timerEl = document.getElementById('timer');
    const interval = setInterval(() => {
        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        timerEl.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        if (timeLeft <= 0) { clearInterval(interval); showResults(); }
        timeLeft--;
    }, 1000);
}

function updateProgress() {
    const percent = (currentIdx / 35) * 100;
    document.getElementById('progress-bar').style.width = percent + "%";
}