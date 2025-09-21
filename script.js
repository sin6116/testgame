// Variables globales
const cursor = document.getElementById('custom-cursor');
const gameArea = document.getElementById('game-area');
let mouseX = 0;
let mouseY = 0;

// Fonction pour déplacer le curseur personnalisé
function moveCursor(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Mettre à jour la position du curseur
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
}

// Fonction pour l'effet de survol
function handleHover(e) {
    // Vérifier si la souris survole la zone de jeu
    const rect = gameArea.getBoundingClientRect();
    const isInGameArea = (
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom
    );
    
    if (isInGameArea) {
        cursor.classList.add('hover');
        cursor.classList.add('pulse');
    } else {
        cursor.classList.remove('hover');
        cursor.classList.remove('pulse');
    }
}

// Effet lors du clic
function handleClick() {
    cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
    setTimeout(() => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 150);
}

// Écouteurs d'événements
document.addEventListener('mousemove', (e) => {
    moveCursor(e);
    handleHover(e);
});

document.addEventListener('click', handleClick);

// Animation de démarrage
window.addEventListener('load', () => {
    cursor.style.opacity = '1';
    console.log('Jeu web initialisé avec succès !');
});

// Fonction pour masquer/afficher le curseur quand la souris sort/entre dans la fenêtre
document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
});

// Prévenir le clic droit (optionnel)
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});