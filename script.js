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

// Écouteurs d'événements
document.addEventListener('mousemove', moveCursor);

// Animation de démarrage
window.addEventListener('load', () => {
    cursor.style.opacity = '1';
    console.log('Curseur circulaire simple activé !');
});

// Fonction pour masquer/afficher le curseur quand la souris sort/entre dans la fenêtre
document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
});