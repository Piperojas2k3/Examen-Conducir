async function startExam(clase) {
    try {
        const res = await fetch('preguntas.json');
        
        if (!res.ok) {
            throw new Error("No se pudo cargar el archivo preguntas.json. Asegúrate de que esté en la misma carpeta.");
        }

        const data = await res.json();
        
        // Filtramos por la clase seleccionada
        questions = data.filter(q => q.clase === clase).sort(() => 0.5 - Math.random()).slice(0, 35);
        
        if (questions.length === 0) {
            alert("No hay preguntas disponibles para la Clase " + clase + " en el archivo JSON.");
            return;
        }

        // Si todo está bien, cambiamos de pantalla
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        showQuestion();
        startTimer();

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message + "\n\nTip: Si estás abriendo el archivo desde tu PC, intenta subirlo a GitHub para que el navegador permita cargar las preguntas.");
    }
}
