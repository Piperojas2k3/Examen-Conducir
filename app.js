// ==========================================
// TESTPRACTIC — app.js v2.2
// Mejoras: Modo examen silencioso (sin feedback inmediato)
// ==========================================

// --- CONFIGURACIÓN ---
let CONFIG = { total: 35, aprobar: 33, tiempo: 45 * 60, maxScore: 38 };
let questions = [];
let userAnswers = [];
let currentIdx = 0;
let timeLeft = 0;
let timerInterval;
let claseActual = '';
let examenFinalizado = false;

const RECOMENDACIONES = {
    "Física de la Conducción": "Repasa el cálculo de Distancia de Reacción (x3) y Frenado. La energía cinética aumenta al cuadrado de la velocidad.",
    "Seguridad Pasiva": "Refuerza conocimientos sobre cinturones, SRI (Sillas de niños) y el ajuste hermético del casco integral.",
    "Mecánica Básica": "Estudia fluidos, uso del freno de motor en pendientes, testigos de tablero e inflado de neumáticos.",
    "Normas de Circulación": "Revisa prioridades en cruces no regulados, prohibición de adelantar en cimas y ley Tolerancia Cero/Emilia.",
    "Convivencia Vial": "Recuerda el metro y medio (1.5m) de distancia al adelantar ciclos y las Zonas de Espera Adelantada.",
    "Dinámica Activa": "Para Clase C, repasa Contramanillar y distribución de frenado (70/30). Para Clase D, estabilidad y pendientes.",
    "Seguridad Vial": "Revisa efectos del alcohol, fatiga y distractores en la conducción.",
    "Semiótica Vial": "Repasa los significados de formas, colores y tipos de señales.",
    "Situaciones de Emergencia": "Recuerda el protocolo PAS: Proteger, Avisar, Socorrer.",
    "Óptica y Luces": "Revisa distancias de cambio de luces y cuándo usar neblineros.",
    "Administración Legal": "Repasa requisitos de licencias, vigencia y sanciones."
};

// ==========================================
// UTILIDADES
// ==========================================

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId !== 'quiz-screen') clearInterval(timerInterval);
    if (screenId === 'temarios-screen') {
        document.getElementById('resumen-teorico-container')?.classList.add('hidden');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// MOTOR DE EXAMEN
// ==========================================
async function startExam(clase) {
    claseActual = clase;
    examenFinalizado = false;
    document.getElementById('loading-msg').classList.remove('hidden');

    if (clase === 'B') { CONFIG.total = 35; CONFIG.aprobar = 33; CONFIG.tiempo = 45 * 60; CONFIG.maxScore = 38; }
    else if (clase === 'C') { CONFIG.total = 20; CONFIG.aprobar = 15; CONFIG.tiempo = 35 * 60; CONFIG.maxScore = 20; }
    else if (clase === 'D') { CONFIG.total = 12; CONFIG.aprobar = 10; CONFIG.tiempo = 15 * 60; CONFIG.maxScore = 12; }

    try {
        const response = await fetch('preguntas.json');
        if (!response.ok) throw new Error('No se pudo cargar preguntas.json');
        const data = await response.json();

        let bancoClase = data.filter(q => q.clase === clase || q.clase === 'Todas');

        if (clase === 'B') {
            let criticas = shuffleArray(bancoClase.filter(q => q.esCritica)).slice(0, 3);
            let normales = shuffleArray(bancoClase.filter(q => !q.esCritica)).slice(0, 32);
            questions = shuffleArray([...criticas, ...normales]);
        } else {
            questions = shuffleArray(bancoClase).slice(0, CONFIG.total);
        }

        userAnswers = new Array(questions.length).fill(null);
        currentIdx = 0;
        timeLeft = CONFIG.tiempo;

        document.getElementById('loading-msg').classList.add('hidden');
        switchScreen('quiz-screen');
        showQuestion();
        startTimer();
    } catch (e) {
        document.getElementById('loading-msg').classList.add('hidden');
        alert('❌ Error cargando preguntas.');
        console.error(e);
    }
}

// ==========================================
// MOSTRAR PREGUNTA (Sin feedback de color)
// ==========================================
function showQuestion() {
    const q = questions[currentIdx];
    const prevAnswer = userAnswers[currentIdx];
    const imgCont = document.getElementById('image-container');
    const imgEl = document.getElementById('question-image');

    if (q.imagen && q.imagen.trim() !== '') {
        imgEl.src = q.imagen;
        imgEl.onclick = () => abrirModalImagen(q.imagen, q.pregunta);
        imgCont.classList.remove('hidden');
    } else {
        imgCont.classList.add('hidden');
    }

    document.getElementById('category-label').textContent = q.categoria;
    document.getElementById('question-counter').textContent = `Pregunta ${currentIdx + 1} de ${questions.length}`;
    document.getElementById('question-text').textContent = q.pregunta;

    const container = document.getElementById('options-container');
    container.innerHTML = '';
    q.opciones.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        
        // Marcamos la opción elegida previamente (solo azul/seleccionado, NO verde/rojo)
        if (prevAnswer === i) {
            btn.classList.add('selected');
        }

        btn.textContent = `${String.fromCharCode(65 + i)}) ${opt}`;
        btn.onclick = () => seleccionarRespuesta(i);
        container.appendChild(btn);
    });

    const nextBtn = document.getElementById('next-btn');
    document.getElementById('prev-btn').classList.toggle('hidden', currentIdx === 0);
    nextBtn.textContent = currentIdx === questions.length - 1 ? 'Finalizar Examen 🏁' : 'Siguiente ➡️';
    nextBtn.disabled = userAnswers[currentIdx] === null;

    document.getElementById('progress-bar').style.width = ((currentIdx + 1) / questions.length * 100) + '%';
}

function seleccionarRespuesta(idx) {
    if (examenFinalizado) return;
    
    userAnswers[currentIdx] = idx;
    const btns = document.querySelectorAll('.option-btn');

    btns.forEach((btn, i) => {
        btn.classList.remove('selected');
        if (i === idx) btn.classList.add('selected');
    });

    document.getElementById('next-btn').disabled = false;
}

document.getElementById('next-btn').onclick = () => {
    if (userAnswers[currentIdx] === null) return;
    if (currentIdx < questions.length - 1) {
        currentIdx++;
        showQuestion();
    } else {
        calcularYMostrarResultados();
    }
};

document.getElementById('prev-btn').onclick = () => {
    if (currentIdx > 0) { currentIdx--; showQuestion(); }
};

// ==========================================
// MODAL DE IMAGEN
// ==========================================
function abrirModalImagen(src, titulo) {
    let modal = document.getElementById('img-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'img-modal';
        modal.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.85);z-index:9999;
            display:flex;align-items:center;justify-content:center;
            flex-direction:column;gap:16px;cursor:zoom-out;padding:20px;box-sizing:border-box;
        `;
        modal.innerHTML = `
            <img id="modal-img" style="max-width:90vw;max-height:80vh;border-radius:12px;object-fit:contain;">
            <p id="modal-titulo" style="color:#fff;text-align:center;font-size:0.95rem;max-width:600px;line-height:1.5;"></p>
            <button onclick="cerrarModalImagen()" style="background:#fff;color:#1e3a8a;border:none;padding:10px 30px;border-radius:50px;font-weight:bold;cursor:pointer;">✕ Cerrar</button>
        `;
        modal.onclick = (e) => { if (e.target === modal) cerrarModalImagen(); };
        document.body.appendChild(modal);
    }
    document.getElementById('modal-img').src = src;
    document.getElementById('modal-titulo').textContent = titulo;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarModalImagen() {
    const modal = document.getElementById('img-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

// ==========================================
// RESULTADOS Y ANIMACIÓN
// ==========================================
function calcularYMostrarResultados() {
    clearInterval(timerInterval);
    examenFinalizado = true;

    let score = 0;
    let maxPossible = 0;
    let criticasContadas = 0;
    let errores = {};

    questions.forEach((q, i) => {
        const esCriticaContable = claseActual === 'B' && q.esCritica && criticasContadas < 3;
        const pts = esCriticaContable ? 2 : 1;
        if (esCriticaContable) criticasContadas++;
        maxPossible += pts;
        if (userAnswers[i] === q.respuestaCorrecta) {
            score += pts;
        } else {
            errores[q.categoria] = (errores[q.categoria] || 0) + 1;
        }
    });

    if (claseActual === 'B') maxPossible = 38;

    const passed = score >= CONFIG.aprobar;
    saveToHistory(score, passed, errores, maxPossible);
    switchScreen('result-screen');

    const status = document.getElementById('result-status');
    status.textContent = passed ? '¡APROBADO! ✅' : 'REPROBADO ❌';
    status.className = passed ? "text-success fw-bold display-4" : "text-danger fw-bold display-4";

    animarPuntaje(document.getElementById('user-score'), score);
    document.getElementById('max-score-display').textContent = maxPossible;
    document.getElementById('pass-fail-msg').textContent = `Mínimo para aprobar: ${CONFIG.aprobar} puntos.`;

    const fb = document.getElementById('feedback-list');
    fb.innerHTML = '';
    if (Object.keys(errores).length === 0) {
        fb.innerHTML = '<div class="alert-info">¡Perfecto! No cometiste ningún error. 🏆</div>';
    } else {
        Object.entries(errores).sort((a, b) => b[1] - a[1]).forEach(([cat, cant]) => {
            fb.innerHTML += `<div class="alert-info mb-2"><strong>${cat} (${cant} fallo${cant > 1 ? 's' : ''}):</strong> ${RECOMENDACIONES[cat] || 'Repasa este tema.'}</div>`;
        });
    }
}

function animarPuntaje(el, destino) {
    let actual = 0;
    const intervalo = setInterval(() => {
        if (actual >= destino) {
            el.textContent = destino;
            clearInterval(intervalo);
        } else {
            actual++;
            el.textContent = actual;
        }
    }, 30);
}

// ==========================================
// TEMPORIZADOR
// ==========================================
function startTimer() {
    const el = document.getElementById('timer');
    const timerBox = document.getElementById('timer-box');
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        el.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;

        if (timeLeft <= 300) {
            timerBox.style.color = '#dc2626';
            timerBox.style.fontWeight = 'bold';
        }

        if (timeLeft-- <= 0) {
            clearInterval(timerInterval);
            calcularYMostrarResultados();
        }
    }, 1000);
}

// ==========================================
// HISTORIAL Y REVISIÓN (Aquí sí se muestra el feedback)
// ==========================================
function saveToHistory(score, passed, errores, maxPossible) {
    let h = JSON.parse(localStorage.getItem('testpractic_history') || '[]');
    h.unshift({
        fecha: new Date().toLocaleString('es-CL'),
        clase: claseActual,
        puntaje: score,
        maximo: maxPossible,
        estado: passed,
        errores,
        preguntas: questions.map(q => ({...q})),
        respuestas: [...userAnswers]
    });
    if (h.length > 50) h = h.slice(0, 50);
    localStorage.setItem('testpractic_history', JSON.stringify(h));
}

function loadHistory() {
    const cont = document.getElementById('history-container');
    const h = JSON.parse(localStorage.getItem('testpractic_history') || '[]');
    if (h.length === 0) {
        cont.innerHTML = '<p class="text-center p-4">No hay ensayos registrados.</p>';
        return;
    }
    cont.innerHTML = '';
    h.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'card-estudio mb-3 text-start';
        div.onclick = () => mostrarRevision(item.preguntas, item.respuestas, 'history-screen');
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <span class="status-badge ${item.estado ? 'badge-pass' : 'badge-fail'}">${item.estado ? 'APROBADO' : 'REPROBADO'}</span>
                    <h5 class="mb-0 mt-2">Ensayo #${h.length - i} — Clase ${item.clase}</h5>
                    <small>${item.fecha}</small>
                    <p class="mb-0">Puntaje: <strong>${item.puntaje}/${item.maximo}</strong></p>
                </div>
                <button class="btn-leer">Ver Detalle 🔍</button>
            </div>`;
        cont.appendChild(div);
    });
}

function mostrarRevision(preguntas, respuestas, pantallaVolver) {
    switchScreen('history-detail-screen');
    const cont = document.getElementById('history-review-container');
    const labelVolver = pantallaVolver === 'result-screen' ? '⬅️ Volver a Resultados' : '⬅️ Volver al Historial';

    cont.innerHTML = `
        <button class="btn-leer mb-4" onclick="switchScreen('${pantallaVolver}')${pantallaVolver === 'history-screen' ? '; loadHistory()' : ''}">${labelVolver}</button>
        <h3 class="mb-3">Revisión Detallada</h3><hr>`;

    preguntas.forEach((q, i) => {
        const correcta = respuestas[i] === q.respuestaCorrecta;
        const opcionesHTML = q.opciones.map((o, j) => {
            let cls = '';
            if (j === q.respuestaCorrecta) cls = 'correct-answer';
            else if (j === respuestas[i]) cls = 'wrong-answer';
            return `<li class="p-2 mb-1 rounded ${cls}" style="border:1px solid #eee;list-style:none;">${String.fromCharCode(65+j)}) ${o}</li>`;
        }).join('');

        cont.innerHTML += `
            <div class="review-item" style="border-left:6px solid ${correcta ? 'var(--success)' : 'var(--danger)'}; margin-bottom:1.5rem;">
                <p class="fw-bold">${i + 1}. ${q.pregunta}</p>
                <ul style="padding:0;">${opcionesHTML}</ul>
                <div class="explanation-box"><small><strong>Explicación:</strong> ${q.explicacion}</small></div>
            </div>`;
    });
}

function mostrarRevisionInmediata() {
    mostrarRevision(questions, userAnswers, 'result-screen');
}

// --- TEMARIOS ---
async function cambiarTemario(clase) {
    const cont = document.getElementById('resumen-teorico-container');
    cont.classList.remove('hidden');
    const claseID = clase.toUpperCase();
    cont.innerHTML = `<div class="text-center p-5">⏳ Cargando Temario Clase ${claseID}...</div>`;

    try {
        const response = await fetch(`Temarios/clase_${claseID}.json`);
        const data = await response.json();
        const capitulosHTML = data.capitulos.map(cap => `
            <div class="card mb-4 text-start" style="border-left:6px solid var(--nav-blue);padding:25px;box-shadow:var(--shadow);">
                <h4 style="color:var(--primary-blue);font-weight:700;">${cap.titulo}</h4>
                <p>${cap.contenido}</p>
                ${cap.puntos_clave ? `<div class="alert-info p-3 rounded mt-3"><ul>${cap.puntos_clave.map(p => `<li>${p}</li>`).join('')}</ul></div>` : ''}
                ${cap.imagen ? `<img src="${cap.imagen}" style="max-width:100%;border-radius:8px;margin-top:12px;">` : ''}
            </div>`).join('');
        cont.innerHTML = `<h2 style="color:var(--primary-blue);font-weight:700;">${data.titulo}</h2><hr>${capitulosHTML}
            <button class="btn-hero" style="width:auto;padding:10px 40px;" onclick="window.scrollTo({top:0,behavior:'smooth'})">▲ Volver Arriba</button>`;
    } catch (e) {
        cont.innerHTML = `<div class="alert-danger p-4">❌ No se pudo cargar el temario.</div>`;
    }
    cont.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
