// Variables globales
const cursor = document.getElementById('custom-cursor');
const gameContainer = document.getElementById('game-container');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const timerElement = document.getElementById('timer');
const finalTimeSpan = document.querySelector('#final-time span');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let saws = [];
let gameRunning = true;
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
        
        // Rebondir sur les bords
        if (newX <= 0 || newX >= window.innerWidth - this.size) {
            this.speedX = -this.speedX;
            newX = Math.max(0, Math.min(newX, window.innerWidth - this.size));
        }
        
        if (newY <= 0 || newY >= window.innerHeight - this.size) {
            this.speedY = -this.speedY;
            newY = Math.max(0, Math.min(newY, window.innerHeight - this.size));
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
            
            // Calculer la distance entre les centres
            const centerX1 = newX + this.radius;
            const centerY1 = newY + this.radius;
            const centerX2 = otherSaw.x + otherSaw.radius;
            const centerY2 = otherSaw.y + otherSaw.radius;
            
            const distance = Math.sqrt((centerX1 - centerX2) ** 2 + (centerY1 - centerY2) ** 2);
            const minDistance = this.radius + otherSaw.radius;
            
            // Si collision détectée
            if (distance < minDistance) {
                // Calculer l'angle de collision
                const angle = Math.atan2(centerY2 - centerY1, centerX2 - centerX1);
                
                // Séparer les scies pour éviter qu'elles restent collées
                const overlap = minDistance - distance;
                const separationX = Math.cos(angle) * overlap * 0.5;
                const separationY = Math.sin(angle) * overlap * 0.5;
                
                this.x -= separationX;
                this.y -= separationY;
                otherSaw.x += separationX;
                otherSaw.y += separationY;
                
                // Calculer les nouvelles vitesses après collision (collision élastique)
                const relativeSpeedX = this.speedX - otherSaw.speedX;
                const relativeSpeedY = this.speedY - otherSaw.speedY;
                
                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                
                const relativeSpeed = relativeSpeedX * normalX + relativeSpeedY * normalY;
                
                if (relativeSpeed > 0) continue; // Les objets s'éloignent déjà
                
                // Échanger les composantes de vitesse dans la direction normale
                this.speedX -= relativeSpeed * normalX;
                this.speedY -= relativeSpeed * normalY;
                otherSaw.speedX += relativeSpeed * normalX;
                otherSaw.speedY += relativeSpeed * normalY;
                
                // Ajouter un peu d'amortissement pour éviter les oscillations
                this.speedX *= 0.95;
                this.speedY *= 0.95;
                otherSaw.speedX *= 0.95;
                otherSaw.speedY *= 0.95;
                
                // Assurer une vitesse minimale
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
        return distance < (this.radius + 10); // 10 = rayon du curseur
    }
    
    destroy() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Fonction pour verrouiller le pointeur
function lockPointer() {
    document.body.requestPointerLock = document.body.requestPointerLock ||
                                       document.body.mozRequestPointerLock ||
                                       document.body.webkitRequestPointerLock;
    
    if (document.body.requestPointerLock) {
        document.body.requestPointerLock();
    }
}

// Fonction pour gérer les événements de verrouillage du pointeur
function handlePointerLockChange() {
    isPointerLocked = document.pointerLockElement === document.body ||
                      document.mozPointerLockElement === document.body ||
                      document.webkitPointerLockElement === document.body;
    
    if (!isPointerLocked && gameRunning) {
        // Si le joueur sort du mode pointer lock pendant le jeu, on remet le jeu en pause
        // et on redemande le verrouillage
        setTimeout(() => {
            if (gameRunning) {
                lockPointer();
            }
        }, 100);
    }
}

// Fonction pour formater le temps en MM:SS
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
            timerElement.textContent = formatTime(elapsedTime);
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

// Fonction pour déplacer le curseur personnalisé
function moveCursor(e) {
    if (isPointerLocked) {
        // Utiliser movementX et movementY pour les mouvements relatifs
        mouseX += e.movementX || 0;
        mouseY += e.movementY || 0;
        
        // Empêcher la souris de sortir de l'écran
        mouseX = Math.max(10, Math.min(mouseX, window.innerWidth - 10));
        mouseY = Math.max(10, Math.min(mouseY, window.innerHeight - 10));
    } else {
        // Mode normal (pour les menus)
        mouseX = e.clientX;
        mouseY = e.clientY;
    }
    
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
}

// Fonction pour créer les scies
function createSaws() {
    const numberOfSaws = 5; // Nombre de scies
    
    for (let i = 0; i < numberOfSaws; i++) {
        saws.push(new Saw());
    }
}

// Fonction principale de jeu
function gameLoop() {
    if (!gameRunning) return;
    
    // Déplacer toutes les scies
    saws.forEach(saw => {
        saw.move();
        
        // Vérifier les collisions avec le joueur
        if (saw.checkPlayerCollision(mouseX, mouseY)) {
            gameOver();
            return;
        }
    });
    
    animationId = requestAnimationFrame(gameLoop);
}

// Fonction de fin de partie
function gameOver() {
    gameRunning = false;
    stopTimer();
    
    // Libérer le pointeur
    if (document.exitPointerLock) {
        document.exitPointerLock();
    }
    
    // Afficher le temps final
    const finalTime = getCurrentTime();
    finalTimeSpan.textContent = formatTime(finalTime);
    
    gameOverScreen.classList.remove('hidden');
    cancelAnimationFrame(animationId);
}

// Fonction de redémarrage
function restartGame() {
    gameRunning = true;
    gameOverScreen.classList.add('hidden');
    
    // Remettre le timer à zéro
    timerElement.textContent = '00:00';
    
    // Supprimer toutes les scies existantes
    saws.forEach(saw => saw.destroy());
    saws = [];
    
    // Remettre la souris au centre
    mouseX = window.innerWidth / 2;
    mouseY = window.innerHeight / 2;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    
    // Recréer les scies
    createSaws();
    
    // Verrouiller le pointeur
    lockPointer();
    
    // Redémarrer le timer
    startTimer();
    
    // Relancer la boucle de jeu
    gameLoop();
}

// Écouteurs d'événements
document.addEventListener('mousemove', moveCursor);
document.addEventListener('pointerlockchange', handlePointerLockChange);
document.addEventListener('mozpointerlockchange', handlePointerLockChange);
document.addEventListener('webkitpointerlockchange', handlePointerLockChange);
restartBtn.addEventListener('click', restartGame);

// Gestion de la visibilité du curseur
document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
    if (!isPointerLocked) {
        cursor.style.opacity = '0';
    }
});

// Démarrer le jeu au clic
document.addEventListener('click', () => {
    if (!isPointerLocked && gameRunning) {
        lockPointer();
    }
});

// Initialisation du jeu
window.addEventListener('load', () => {
    cursor.style.opacity = '1';
    createSaws();
    
    // Afficher un message pour commencer
    setTimeout(() => {
        alert('Cliquez n\'importe où pour commencer le jeu et verrouiller la souris !');
    }, 500);
});

// Adapter la taille lors du redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    // Ajuster les positions des scies si elles sont hors limites
    saws.forEach(saw => {
        if (saw.x > window.innerWidth - saw.size) {
            saw.x = window.innerWidth - saw.size;
        }
        if (saw.y > window.innerHeight - saw.size) {
            saw.y = window.innerHeight - saw.size;
        }
        saw.updatePosition();
    });
    
    // Ajuster la position de la souris si elle est hors limites
    mouseX = Math.max(10, Math.min(mouseX, window.innerWidth - 10));
    mouseY = Math.max(10, Math.min(mouseY, window.innerHeight - 10));
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
});