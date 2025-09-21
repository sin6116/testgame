// Variables globales
const cursor = document.getElementById('custom-cursor');
const gameContainer = document.getElementById('game-container');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const timerElement = document.getElementById('timer');
const scoreElement = document.getElementById('score');
const finalTimeSpan = document.querySelector('#final-time span');
const startOverlay = document.getElementById('startOverlay');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let saws = [];
let gameRunning = false;
let gameStarted = false;
let animationId;
let startTime = 0;
let timerInterval;
let isPointerLocked = false;

// Classe pour les scies
class Saw {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'saw';
        
        // Position aléatoire (éviter les chevauchements initiaux)
        do {
            this.x = Math.random() * (window.innerWidth - 50);
            this.y = Math.random() * (window.innerHeight - 50);
        } while (this.isOverlapping());
        
        // Vitesse aléatoire
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        
        // Assurer une vitesse minimale
        if (Math.abs(this.speedX) < 2) this.speedX = this.speedX > 0 ? 2 : -2;
        if (Math.abs(this.speedY) < 2) this.speedY = this.speedY > 0 ? 2 : -2;
        
        this.size = 50;
        this.radius = this.size / 2;
        
        this.updatePosition();
        gameContainer.appendChild(this.element);
    }
    
    isOverlapping() {
        for (let saw of saws) {
            const distance = Math.sqrt((this.x - saw.x) ** 2 + (this.y - saw.y) ** 2);
            if (distance < this.size) {
                return true;
            }
        }
        return false;
    }
    
    updatePosition() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }
    
    move() {
        // Calculer la nouvelle position
        let newX = this.x + this.speedX;
        let newY = this.y + this.speedY;
        
        // Rebondir sur les bords (ajusté pour le cadre)
        const margin = 20; // marge pour le cadre
        if (newX <= margin || newX >= window.innerWidth - this.size - margin) {
            this.speedX = -this.speedX;
            newX = Math.max(margin, Math.min(newX, window.innerWidth - this.size - margin));
        }
        
        if (newY <= margin || newY >= window.innerHeight - this.size - margin) {
            this.speedY = -this.speedY;
            newY = Math.max(margin, Math.min(newY, window.innerHeight - this.size - margin));
        }
        
        // Vérifier les collisions avec les autres scies
        this.checkSawCollisions(newX, newY);
        
        // Mettre à jour la position
        this.x = newX;
        this.y = newY;
        this.updatePosition();
    }
    
    checkSawCollisions(newX, newY) {
        for (let otherSaw of saws) {
            if (otherSaw === this) continue;
            
            const centerX1 = newX + this.radius;
            const centerY1 = newY + this.radius;
            const centerX2 = otherSaw.x + otherSaw.radius;
            const centerY2 = otherSaw.y + otherSaw.radius;
            
            const distance = Math.sqrt((centerX1 - centerX2) ** 2 + (centerY1 - centerY2) ** 2);
            const minDistance = this.radius + otherSaw.radius;
            
            if (distance < minDistance) {
                const angle = Math.atan2(centerY2 - centerY1, centerX2 - centerX1);
                
                const overlap = minDistance - distance;
                const separationX = Math.cos(angle) * overlap * 0.5;
                const separationY = Math.sin(angle) * overlap * 0.5;
                
                this.x -= separationX;
                this.y -= separationY;
                otherSaw.x += separationX;
                otherSaw.y += separationY;
                
                const relativeSpeedX = this.speedX - otherSaw.speedX;
                const relativeSpeedY = this.speedY - otherSaw.speedY;
                
                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                
                const relativeSpeed = relativeSpeedX * normalX + relativeSpeedY * normalY;
                
                if (relativeSpeed > 0) continue;
                
                this.speedX -= relativeSpeed * normalX;
                this.speedY -= relativeSpeed * normalY;
                otherSaw.speedX += relativeSpeed * normalX;
                otherSaw.speedY += relativeSpeed * normalY;
                
                this.speedX *= 0.95;
                this.speedY *= 0.95;
                otherSaw.speedX *= 0.95;
                otherSaw.speedY *= 0.95;
                
                if (Math.abs(this.speedX) < 1) this.speedX = this.speedX > 0 ? 1 : -1;
                if (Math.abs(this.speedY) < 1) this.speedY = this.speedY > 0 ? 1 : -1;
                if (Math.abs(otherSaw.speedX) < 1) otherSaw.speedX = otherSaw.speedX > 0 ? 1 : -1;
                if (Math.abs(otherSaw.speedY) < 1) otherSaw.speedY = otherSaw.speedY > 0 ? 1 : -1;
            }
        }
    }
    
    checkPlayerCollision(mouseX, mouseY) {
        const centerX = this.x + this.radius;
        const centerY = this.y + this.radius;
        const distance = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2);
        return distance < (this.radius + 12);
    }
    
    destroy() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Fonction pour verrouiller le pointeur
function lockPointer() {
    const requestLock = document.body.requestPointerLock ||
                       document.body.mozRequestPointerLock ||
                       document.body.webkitRequestPointerLock;
    
    if (requestLock) {
        requestLock.call(document.body);
    }
}

// Fonction pour libérer le pointeur
function exitPointerLock() {
    const exitLock = document.exitPointerLock ||
                     document.mozExitPointerLock ||
                     document.webkitExitPointerLock;
    
    if (exitLock) {
        exitLock.call(document);
    }
}

// Fonction pour gérer les changements de verrouillage
function handlePointerLockChange() {
    const locked = document.pointerLockElement === document.body ||
                   document.mozPointerLockElement === document.body ||
                   document.webkitPointerLockElement === document.body;
    
    isPointerLocked = locked;
    
    if (locked && !gameStarted) {
        startGame();
    }
}

// Fonction pour formater le temps
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Fonction pour démarrer le timer
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        if (gameRunning) {
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            const timeStr = formatTime(elapsedTime);
            timerElement.textContent = timeStr;
            scoreElement.textContent = timeStr;
        }
    }, 1000);
}

// Fonction pour arrêter le timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Fonction pour obtenir le temps actuel
function getCurrentTime() {
    return Math.floor((Date.now() - startTime) / 1000);
}

// Fonction pour déplacer le curseur
function moveCursor(e) {
    if (isPointerLocked) {
        mouseX += e.movementX || 0;
        mouseY += e.movementY || 0;
        
        const margin = 25;
        mouseX = Math.max(margin, Math.min(mouseX, window.innerWidth - margin));
        mouseY = Math.max(margin, Math.min(mouseY, window.innerHeight - margin));
    } else {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }
    
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
}

// Fonction pour créer les scies
function createSaws() {
    const numberOfSaws = 5;
    
    for (let i = 0; i < numberOfSaws; i++) {
        saws.push(new Saw());
    }
}

// Fonction principale de jeu
function gameLoop() {
    if (!gameRunning) return;
    
    saws.forEach(saw => {
        saw.move();
        
        if (saw.checkPlayerCollision(mouseX, mouseY)) {
            gameOver();
            return;
        }
    });
    
    animationId = requestAnimationFrame(gameLoop);
}

// Fonction pour démarrer le jeu
function startGame() {
    if (gameStarted) return;
    
    gameStarted = true;
    gameRunning = true;
    startOverlay.classList.add('hidden');
    
    mouseX = window.innerWidth / 2;
    mouseY = window.innerHeight / 2;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    
    createSaws();
    startTimer();
    gameLoop();
}

// Fonction de fin de partie
function gameOver() {
    gameRunning = false;
    stopTimer();
    exitPointerLock();
    
    const finalTime = getCurrentTime();
    finalTimeSpan.textContent = formatTime(finalTime);
    
    gameOverScreen.classList.remove('hidden');
    cancelAnimationFrame(animationId);
}

// Fonction de redémarrage
function restartGame() {
    gameRunning = false;
    gameStarted = false;
    gameOverScreen.classList.add('hidden');
    startOverlay.classList.remove('hidden');
    
    timerElement.textContent = '00:00';
    scoreElement.textContent = '00:00';
    
    saws.forEach(saw => saw.destroy());
    saws = [];
    
    mouseX = window.innerWidth / 2;
    mouseY = window.innerHeight / 2;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
}

// Événements
document.addEventListener('mousemove', moveCursor);
document.addEventListener('pointerlockchange', handlePointerLockChange);
document.addEventListener('mozpointerlockchange', handlePointerLockChange);
document.addEventListener('webkitpointerlockchange', handlePointerLockChange);

startOverlay.addEventListener('click', () => {
    lockPointer();
});

restartBtn.addEventListener('click', restartGame);

// Gestion visibilité curseur
document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
    if (!isPointerLocked) {
        cursor.style.opacity = '0';
    }
});

// Initialisation
window.addEventListener('load', () => {
    cursor.style.opacity = '1';
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    console.log('Jeu rétro chargé ! Cliquez pour commencer.');
});

// Redimensionnement
window.addEventListener('resize', () => {
    saws.forEach(saw => {
        const margin = 20;
        if (saw.x > window.innerWidth - saw.size - margin) {
            saw.x = window.innerWidth - saw.size - margin;
        }
        if (saw.y > window.innerHeight - saw.size - margin) {
            saw.y = window.innerHeight - saw.size - margin;
        }
        saw.updatePosition();
    });
    
    const margin = 25;
    mouseX = Math.max(margin, Math.min(mouseX, window.innerWidth - margin));
    mouseY = Math.max(margin, Math.min(mouseY, window.innerHeight - margin));
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
});