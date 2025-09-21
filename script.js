// Variables globales
const cursor = document.getElementById('custom-cursor');
const gameContainer = document.getElementById('game-container');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

let mouseX = 0;
let mouseY = 0;
let saws = [];
let gameRunning = true;
let animationId;

// Classe pour les scies
class Saw {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'saw';
        
        // Position aléatoire
        this.x = Math.random() * (window.innerWidth - 50);
        this.y = Math.random() * (window.innerHeight - 50);
        
        // Vitesse aléatoire
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        
        // Assurer une vitesse minimale
        if (Math.abs(this.speedX) < 2) this.speedX = this.speedX > 0 ? 2 : -2;
        if (Math.abs(this.speedY) < 2) this.speedY = this.speedY > 0 ? 2 : -2;
        
        this.size = 50;
        
        this.updatePosition();
        gameContainer.appendChild(this.element);
    }
    
    updatePosition() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }
    
    move() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Rebondir sur les bords
        if (this.x <= 0 || this.x >= window.innerWidth - this.size) {
            this.speedX = -this.speedX;
            this.x = Math.max(0, Math.min(this.x, window.innerWidth - this.size));
        }
        
        if (this.y <= 0 || this.y >= window.innerHeight - this.size) {
            this.speedY = -this.speedY;
            this.y = Math.max(0, Math.min(this.y, window.innerHeight - this.size));
        }
        
        this.updatePosition();
    }
    
    checkCollision(mouseX, mouseY) {
        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;
        const distance = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2);
        return distance < (this.size / 2 + 10); // 10 = rayon du curseur
    }
    
    destroy() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Fonction pour déplacer le curseur personnalisé
function moveCursor(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
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
        
        // Vérifier les collisions
        if (saw.checkCollision(mouseX, mouseY)) {
            gameOver();
            return;
        }
    });
    
    animationId = requestAnimationFrame(gameLoop);
}

// Fonction de fin de partie
function gameOver() {
    gameRunning = false;
    gameOverScreen.classList.remove('hidden');
    cancelAnimationFrame(animationId);
}

// Fonction de redémarrage
function restartGame() {
    gameRunning = true;
    gameOverScreen.classList.add('hidden');
    
    // Supprimer toutes les scies existantes
    saws.forEach(saw => saw.destroy());
    saws = [];
    
    // Recréer les scies
    createSaws();
    
    // Relancer la boucle de jeu
    gameLoop();
}

// Écouteurs d'événements
document.addEventListener('mousemove', moveCursor);
restartBtn.addEventListener('click', restartGame);

// Gestion de la visibilité du curseur
document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
});

// Initialisation du jeu
window.addEventListener('load', () => {
    cursor.style.opacity = '1';
    createSaws();
    gameLoop();
    console.log('Jeu de scies démarré !');
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
});