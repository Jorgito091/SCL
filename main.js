// Elementos del DOM
const canvas = document.getElementById("fallCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const heightInput = document.getElementById("heightInput");
const gravityInput = document.getElementById("gravityInput");
const ballColorInput = document.getElementById("ballColor");
const ballSizeInput = document.getElementById("ballSize");
const showGridCheckbox = document.getElementById("showGrid");
const airResistanceSelect = document.getElementById("airResistance");
const summaryContainer = document.getElementById("summaryContainer");
const progressBar = document.getElementById("progress");
const progressText = document.getElementById("progressText");
const timeCounter = document.getElementById("timeCounter");
const toggleAdvanced = document.getElementById("toggleAdvanced");
const advancedControls = document.getElementById("advancedControls");
const downloadButton = document.getElementById("downloadButton");
const compareButton = document.getElementById("compareButton");
const instructionsModal = document.getElementById("instructionsModal");
const closeInstructions = document.getElementById("closeInstructions");
const currentVelocityDisplay = document.getElementById("currentVelocity");
const currentTimeDisplay = document.getElementById("currentTime");

// Variables de simulación
let g = 9.81;
let pixelsPerMeter = 50;
let animationFrame;
let elapsedTime = 0;
let startTime = 0;
let isSimulating = false;
let airResistance = 0;

// Datos de la simulación
let velocityData = [];
let timeData = [];
let positionData = [];
let simulationHistory = [];

// Configuración de la pelota
let ball = {
    x: canvas.width / 2,
    y: 0,
    radius: 20,
    velocityY: 0,
    ground: canvas.height - 10,
    initialHeight: 0,
    mass: 1,
    color: "#4361ee"
};

// Gráfico de datos
let dataChart = new Chart(document.getElementById("dataChart"), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Velocidad (m/s)',
            data: [],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Velocidad (m/s)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Tiempo (s)'
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Velocidad: ${context.parsed.y.toFixed(2)} m/s`;
                    }
                }
            }
        }
    }
});

// Mostrar instrucciones al cargar la página
window.addEventListener('load', () => {
    setTimeout(() => {
        instructionsModal.classList.add('active');
    }, 500);
});

// Event listeners
startButton.addEventListener("click", startSimulation);
resetButton.addEventListener("click", resetSimulation);
toggleAdvanced.addEventListener("click", toggleAdvancedControls);
downloadButton.addEventListener("click", downloadData);
compareButton.addEventListener("click", compareSimulations);
closeInstructions.addEventListener("click", closeInstructionsModal);
ballColorInput.addEventListener("input", updateBallColor);
ballSizeInput.addEventListener("input", updateBallSize);
showGridCheckbox.addEventListener("change", updateGridVisibility);
airResistanceSelect.addEventListener("change", updateAirResistance);

// Presets de planetas
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        gravityInput.value = this.dataset.gravity;
        heightInput.value = this.dataset.height;
    });
});

// Funciones
function startSimulation() {
    if (isSimulating) return;
    
    updatePPM();
    ball.initialHeight = parseFloat(heightInput.value);
    g = parseFloat(gravityInput.value);
    airResistance = parseFloat(airResistanceSelect.value);
    
    resetBall();
    isSimulating = true;
    startButton.disabled = true;
    startTime = 0;
    
    // Reiniciar datos
    velocityData = [];
    timeData = [];
    positionData = [];
    
    requestAnimationFrame(animate);
}

function resetSimulation() {
    cancelAnimationFrame(animationFrame);
    isSimulating = false;
    startButton.disabled = false;
    resetBall();
    updateUI();
}

function toggleAdvancedControls() {
    if (advancedControls.style.display === 'block') {
        advancedControls.style.display = 'none';
        toggleAdvanced.querySelector('span').textContent = 'Mostrar controles avanzados';
        toggleAdvanced.querySelector('i').className = 'fas fa-chevron-down';
    } else {
        advancedControls.style.display = 'block';
        toggleAdvanced.querySelector('span').textContent = 'Ocultar controles avanzados';
        toggleAdvanced.querySelector('i').className = 'fas fa-chevron-up';
    }
}

function closeInstructionsModal() {
    instructionsModal.classList.remove('active');
}

function updateBallColor() {
    ball.color = ballColorInput.value;
    draw();
}

function updateBallSize() {
    ball.radius = parseInt(ballSizeInput.value);
    document.getElementById('ballSizeValue').textContent = ballSizeInput.value;
    draw();
}

function updateGridVisibility() {
    draw();
}

function updateAirResistance() {
    airResistance = parseFloat(airResistanceSelect.value);
}

function adjustCanvasSize() {
    const newHeight = ball.initialHeight * pixelsPerMeter + 100;
    canvas.height = Math.max(newHeight, 500);
    ball.ground = canvas.height - 10;
}

function resetBall() {
    adjustCanvasSize();
    ball.y = ball.radius;
    ball.velocityY = 0;
    elapsedTime = 0;
    progressBar.style.width = "0%";
    progressText.textContent = "0%";
    timeCounter.textContent = "0.00s";
    
    // Actualizar UI
    updateUI();
    
    // Dibujar estado inicial
    draw();
}

function update(deltaTime) {
    // Calcular fuerzas
    const gravityForce = ball.mass * g * pixelsPerMeter;
    const dragForce = airResistance * ball.velocityY * ball.velocityY;
    
    // Aplicar fuerzas
    ball.velocityY += (gravityForce - dragForce) * deltaTime / ball.mass;
    ball.y += ball.velocityY * deltaTime;

    // Verificar colisión con el suelo
    if (ball.y + ball.radius >= ball.ground) {
        ball.y = ball.ground - ball.radius;
        isSimulating = false;
        startButton.disabled = false;
        showSummary();
        saveSimulationData();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar cuadrícula si está activada
    if (showGridCheckbox.checked) {
        drawGrid();
    }
    
    // Dibujar suelo
    ctx.fillStyle = '#4a4e69';
    ctx.fillRect(0, ball.ground, canvas.width, canvas.height - ball.ground);
    
    // Dibujar pelota
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
    
    // Dibujar sombra
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.ground, ball.radius * 0.8, ball.radius * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();
    ctx.closePath();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    
    // Líneas verticales
    for (let x = 0; x <= canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Líneas horizontales
    for (let y = 0; y <= canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const deltaTime = (timestamp - startTime) / 1000 - elapsedTime;
    elapsedTime = (timestamp - startTime) / 1000;
    
    update(deltaTime);
    draw();
    updateUI();
    
    if (ball.y + ball.radius < ball.ground) {
        animationFrame = requestAnimationFrame(animate);
    }
}

function updateUI() {
    // Actualizar barra de progreso
    const totalDistance = ball.initialHeight * pixelsPerMeter;
    const currentDistance = ball.y;
    const progress = Math.min((currentDistance / totalDistance) * 100, 100);
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${progress.toFixed(1)}%`;
    
    // Actualizar contador de tiempo
    timeCounter.textContent = `${elapsedTime.toFixed(2)}s`;
    
    // Actualizar velocidad y tiempo en el área de simulación
    const currentVelocity = ball.velocityY / pixelsPerMeter;
    currentVelocityDisplay.textContent = `${Math.abs(currentVelocity).toFixed(2)} m/s`;
    currentTimeDisplay.textContent = `${elapsedTime.toFixed(2)} s`;
    
    // Guardar datos para el gráfico
    if (isSimulating) {
        timeData.push(elapsedTime.toFixed(2));
        velocityData.push(Math.abs(currentVelocity).toFixed(2));
        positionData.push(ball.y.toFixed(2));
        
        // Actualizar gráfico cada 10 frames para mejor rendimiento
        if (timeData.length % 10 === 0) {
            updateChart();
        }
    }
}

function updateChart() {
    dataChart.data.labels = timeData;
    dataChart.data.datasets[0].data = velocityData;
    dataChart.update();
}

function updatePPM() {
    let heightValue = parseFloat(heightInput.value);
    if (!isNaN(heightValue) && heightValue > 0) {
        const maxCanvasHeight = 600;
        pixelsPerMeter = Math.min(maxCanvasHeight / heightValue, 100);
        resetBall();
    } else {
        alert("Por favor, ingrese una altura válida.");
    }
}

function showSummary() {
    const theoreticalTime = Math.sqrt((2 * ball.initialHeight) / g);
    const theoreticalVelocity = g * theoreticalTime;
    const simulatedVelocity = ball.velocityY / pixelsPerMeter;
    
    // Actualizar datos en el panel
    document.getElementById('gravityValue').textContent = `${g.toFixed(2)} m/s²`;
    document.getElementById('heightValue').textContent = `${ball.initialHeight.toFixed(2)} m`;
    document.getElementById('timeValue').textContent = `${elapsedTime.toFixed(2)} s`;
    document.getElementById('velocityValue').textContent = `${Math.abs(simulatedVelocity).toFixed(2)} m/s`;
    
    // Actualizar gráfico final
    updateChart();
}

function saveSimulationData() {
    simulationHistory.push({
        time: elapsedTime.toFixed(2),
        velocity: (ball.velocityY / pixelsPerMeter).toFixed(2),
        height: ball.initialHeight,
        gravity: g,
        airResistance: airResistance,
        color: ball.color,
        timeData: [...timeData],
        velocityData: [...velocityData]
    });
}

function downloadData() {
    const data = {
        metadata: {
            gravity: g,
            initialHeight: ball.initialHeight,
            airResistance: airResistance,
            simulationTime: elapsedTime,
            finalVelocity: ball.velocityY / pixelsPerMeter
        },
        timeData: timeData,
        velocityData: velocityData,
        positionData: positionData
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `caida_libre_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

function compareSimulations() {
    if (simulationHistory.length < 2) {
        alert("Necesitas al menos 2 simulaciones para comparar");
        return;
    }
    
    // Configurar el gráfico para comparación
    dataChart.data.datasets = [];
    
    simulationHistory.forEach((sim, index) => {
        dataChart.data.datasets.push({
            label: `Simulación ${index + 1} (g=${sim.gravity})`,
            data: sim.velocityData,
            borderColor: sim.color || getRandomColor(),
            backgroundColor: 'transparent',
            tension: 0.1
        });
    });
    
    dataChart.update();
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Inicialización
resetBall();