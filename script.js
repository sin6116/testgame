// Variables globales
const cursor = document.getElementById('custom-cursor');
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

// Fonction pour appliquer les effets sur tout l'écran
function applyGlobalEffects() {
    // Appliquer les effets de survol et pulsation sur tout l'écran
    cursor.classList.add('hover');
    cursor.classList.add('pulse');
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
    applyGlobalEffects();
});

document.addEventListener('click', handleClick);

// Animation de démarrage
window.addEventListener('load', () => {
    cursor.style.opacity = '1';
    applyGlobalEffects(); // Activer les effets dès le chargement
    console.log('Jeu web initialisé avec succès - Curseur actif sur tout l\'\u00e9cran !');
});

// Fonction pour masquer/afficher le curseur quand la souris sort/entre dans la fenêtre
document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
    applyGlobalEffects();
});

document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
});

// Prévenir le clic droit (optionnel)
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});