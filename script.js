// Variables globales
let scene, camera, renderer;
let world = {};
let chunks = {};
let player = {
    position: { x: 0, y: 10, z: 0 },
    rotation: { x: 0, y: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    onGround: false,
    inWater: false
};
let keys = {};
let mouseX = 0, mouseY = 0;
let selectedBlock = 'dirt';
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let isPointerLocked = false;

// Optimisations
const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 3;
let frameCount = 0;
let lastFPSUpdate = 0;
let fps = 0;

// Géométries réutilisables (instancing)
let blockGeometry;
let instancedMeshes = {};

// Matériaux des blocs optimisés
const materials = {};

// Fonction optimisée pour créer un matériau de bloc
function createBlockMaterial(color, name) {
    const canvas = document.createElement('canvas');
    canvas.width = 32; // Réduit de 64 à 32
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    // Texture de base
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 32, 32);
    
    // Ajout de détails réduits
    for (let i = 0; i < 8; i++) { // Réduit de 20 à 8
        const x = Math.random() * 32;
        const y = Math.random() * 32;
        const size = Math.random() * 2 + 1;
        const brightness = Math.random() * 0.2 - 0.1;
        
        ctx.fillStyle = `rgba(${Math.floor(255 * brightness)}, ${Math.floor(255 * brightness)}, ${Math.floor(255 * brightness)}, 0.3)`;
        ctx.fillRect(x, y, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    return new THREE.MeshLambertMaterial({ 
        map: texture,
        transparent: name === 'water',
        opacity: name === 'water' ? 0.8 : 1.0
    });
}

// Fonction pour créer le matériau de l'eau optimisé
function createWaterMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 32, 32);
    gradient.addColorStop(0, '#0080FF');
    gradient.addColorStop(0.5, '#0066CC');
    gradient.addColorStop(1, '#004499');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    return new THREE.MeshLambertMaterial({ 
        map: texture, 
        transparent: true, 
        opacity: 0.8 
    });
}

// Initialisation
function init() {
    // Scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 80); // Distance de fog réduite
    
    // Caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    
    // Rendu optimisé
    renderer = new THREE.WebGLRenderer({ 
        antialias: false, // Désactivé pour les performances
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false; // Désactivé pour les performances
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limité à 2
    document.body.appendChild(renderer.domElement);
    
    // Lumières simplifiées
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    scene.add(directionalLight);
    
    // Initialisation des matériaux
    materials.dirt = createBlockMaterial(0x8B4513, 'dirt');
    materials.grass = createBlockMaterial(0x228B22, 'grass');
    materials.stone = createBlockMaterial(0x808080, 'stone');
    materials.sand = createBlockMaterial(0xF4E4BC, 'sand');
    materials.water = createWaterMaterial();
    
    // Géométrie réutilisable
    blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Génération du monde par chunks
    generateWorld();
    
    // Événements
    setupEventListeners();
    
    // Boucle de rendu
    animate();
}

// Système de chunks pour optimiser le rendu
function getChunkKey(x, z) {
    return `${Math.floor(x / CHUNK_SIZE)},${Math.floor(z / CHUNK_SIZE)}`;
}

function isChunkInRange(chunkX, chunkZ, playerX, playerZ) {
    const playerChunkX = Math.floor(playerX / CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerZ / CHUNK_SIZE);
    
    return Math.abs(chunkX - playerChunkX) <= RENDER_DISTANCE && 
           Math.abs(chunkZ - playerChunkZ) <= RENDER_DISTANCE;
}

// Génération du monde optimisée
function generateWorld() {
    const size = CHUNK_SIZE * RENDER_DISTANCE;
    
    for (let x = -size; x <= size; x += 2) { // Pas de 2 pour réduire le nombre de blocs
        for (let z = -size; z <= size; z += 2) {
            const height = Math.floor(Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2 + 4); // Réduit la variation
            const distance = Math.sqrt(x * x + z * z);
            
            // Biomes simplifiés
            let blockType;
            if (distance > 25) {
                blockType = 'sand';
            } else if (distance > 15) {
                blockType = Math.random() > 0.5 ? 'sand' : 'stone';
            } else {
                blockType = 'grass';
            }
            
            // Génération de couches réduites
            for (let y = 0; y <= height; y++) {
                let currentBlockType;
                if (y === height && blockType === 'grass') {
                    currentBlockType = 'grass';
                } else if (y > height - 2) { // Réduit à 2 couches
                    currentBlockType = blockType === 'sand' ? 'sand' : 'dirt';
                } else {
                    currentBlockType = 'stone';
                }
                
                setBlock(x, y, z, currentBlockType);
            }
            
            // Eau simplifiée
            if (height < 2) {
                for (let y = height + 1; y <= 2; y++) {
                    setBlock(x, y, z, 'water');
                }
            }
            
            // Structures réduites
            if (Math.random() > 0.99 && blockType === 'grass' && height > 2) {
                // Arbre simple
                setBlock(x, height + 1, z, 'dirt');
                setBlock(x, height + 2, z, 'dirt');
                setBlock(x, height + 3, z, 'grass');
            }
        }
    }
}

// Fonction optimisée pour placer un bloc
function setBlock(x, y, z, type) {
    const key = `${x},${y},${z}`;
    
    // Supprimer l'ancien bloc s'il existe
    if (world[key]) {
        scene.remove(world[key]);
    }
    
    if (type) {
        const mesh = new THREE.Mesh(blockGeometry, materials[type]);
        mesh.position.set(x, y, z);
        mesh.frustumCulled = true; // Culling automatique
        
        scene.add(mesh);
        world[key] = mesh;
        world[key].blockType = type;
    } else {
        delete world[key];
    }
}

// Fonction pour obtenir un bloc
function getBlock(x, y, z) {
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    return world[key];
}

// Configuration des événements (identique)
function setupEventListeners() {
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        
        const blockKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
        const blockTypes = ['dirt', 'grass', 'stone', 'sand', 'water'];
        
        const keyIndex = blockKeys.indexOf(event.code);
        if (keyIndex !== -1) {
            selectedBlock = blockTypes[keyIndex];
            updateInventoryUI();
        }
    });
    
    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });
    
    document.addEventListener('mousedown', (event) => {
        if (!isPointerLocked) return;
        
        if (event.button === 0) {
            breakBlock();
        } else if (event.button === 2) {
            placeBlock();
        }
    });
    
    document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
    
    document.addEventListener('mousemove', (event) => {
        if (!isPointerLocked) return;
        
        mouseX += event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        mouseY += event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    });
    
    document.addEventListener('click', () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    inventorySlots.forEach((slot) => {
        slot.addEventListener('click', () => {
            selectedBlock = slot.dataset.block;
            updateInventoryUI();
        });
    });
    
    window.addEventListener('resize', onWindowResize);
}

// Mise à jour de l'interface inventaire
function updateInventoryUI() {
    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach(slot => {
        slot.classList.toggle('active', slot.dataset.block === selectedBlock);
    });
}

// Casser un bloc (optimisé)
function breakBlock() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    
    // Limiter la portée du raycasting
    raycaster.far = 8;
    const intersects = raycaster.intersectObjects(Object.values(world));
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const position = intersect.object.position;
        
        if (intersect.object.blockType !== 'water') {
            setBlock(position.x, position.y, position.z, null);
        }
    }
}

// Placer un bloc (optimisé)
function placeBlock() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = 8;
    const intersects = raycaster.intersectObjects(Object.values(world));
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const face = intersect.face;
        const position = intersect.object.position.clone();
        
        position.add(face.normal);
        
        const playerPos = player.position;
        const distance = Math.sqrt(
            Math.pow(position.x - playerPos.x, 2) +
            Math.pow(position.y - playerPos.y, 2) +
            Math.pow(position.z - playerPos.z, 2)
        );
        
        if (distance > 1.5) {
            setBlock(position.x, position.y, position.z, selectedBlock);
        }
    }
}

// Physique du joueur optimisée
function updatePlayer() {
    const moveSpeed = 0.15; // Légèrement plus rapide
    const jumpForce = 0.15;
    const gravity = -0.012;
    const waterResistance = 0.8;
    
    // Rotation de la caméra
    player.rotation.y -= mouseX * 0.002;
    player.rotation.x -= mouseY * 0.002;
    player.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.rotation.x));
    
    mouseX = 0;
    mouseY = 0;
    
    // Mouvement
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);
    
    forward.applyAxisAngle(up, player.rotation.y);
    right.applyAxisAngle(up, player.rotation.y);
    
    let moveDirection = new THREE.Vector3();
    
    if (keys['KeyW']) moveDirection.add(forward);
    if (keys['KeyS']) moveDirection.sub(forward);
    if (keys['KeyA']) moveDirection.sub(right);
    if (keys['KeyD']) moveDirection.add(right);
    
    moveDirection.normalize();
    moveDirection.multiplyScalar(moveSpeed);
    
    if (player.inWater) {
        moveDirection.multiplyScalar(waterResistance);
    }
    
    player.velocity.x = moveDirection.x;
    player.velocity.z = moveDirection.z;
    
    // Saut/Nage
    if (keys['Space']) {
        if (player.inWater) {
            player.velocity.y = jumpForce * 0.7;
        } else if (player.onGround) {
            player.velocity.y = jumpForce;
            player.onGround = false;
        }
    }
    
    if (keys['ShiftLeft'] && player.inWater) {
        player.velocity.y = -jumpForce * 0.7;
    }
    
    // Gravité
    if (!player.inWater) {
        player.velocity.y += gravity;
    } else {
        player.velocity.y *= 0.9;
    }
    
    // Collision simplifiée
    checkCollisions();
    
    // Appliquer la vélocité
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;
    player.position.z += player.velocity.z;
    
    // Mise à jour de la caméra
    camera.position.copy(player.position);
    camera.rotation.x = player.rotation.x;
    camera.rotation.y = player.rotation.y;
}

// Vérification des collisions simplifiée
function checkCollisions() {
    // Vérifier si le joueur est dans l'eau
    player.inWater = false;
    const headBlock = getBlock(player.position.x, player.position.y + 0.5, player.position.z);
    if (headBlock && headBlock.blockType === 'water') {
        player.inWater = true;
    }
    
    // Collision au sol simplifiée
    player.onGround = false;
    const blockBelow = getBlock(player.position.x, player.position.y - 1, player.position.z);
    if (blockBelow && blockBelow.blockType !== 'water') {
        if (player.position.y - 0.9 <= Math.floor(player.position.y - 1) + 1) {
            player.onGround = true;
            player.position.y = Math.floor(player.position.y - 1) + 1.9;
            player.velocity.y = 0;
        }
    }
    
    // Collision horizontale simplifiée
    const directions = [
        { axis: 'x', sign: 1 },
        { axis: 'x', sign: -1 },
        { axis: 'z', sign: 1 },
        { axis: 'z', sign: -1 }
    ];
    
    directions.forEach(dir => {
        const checkPos = { ...player.position };
        checkPos[dir.axis] += dir.sign * 0.4;
        
        const block = getBlock(checkPos.x, player.position.y, checkPos.z);
        if (block && block.blockType !== 'water') {
            player.velocity[dir.axis] = 0;
        }
    });
}

// Calcul des FPS
function updateFPS() {
    frameCount++;
    const currentTime = Date.now();
    
    if (currentTime - lastFPSUpdate >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastFPSUpdate));
        frameCount = 0;
        lastFPSUpdate = currentTime;
        
        // Afficher les FPS dans l'UI
        let fpsDisplay = document.getElementById('fps');
        if (!fpsDisplay) {
            fpsDisplay = document.createElement('div');
            fpsDisplay.id = 'fps';
            fpsDisplay.style.cssText = 'position:absolute;top:10px;right:10px;color:white;background:rgba(0,0,0,0.5);padding:5px;border-radius:3px;font-family:Arial;font-size:14px;';
            document.body.appendChild(fpsDisplay);
        }
        fpsDisplay.textContent = `FPS: ${fps}`;
    }
}

// Redimensionnement
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Boucle d'animation optimisée
function animate() {
    requestAnimationFrame(animate);
    
    updatePlayer();
    updateFPS();
    
    renderer.render(scene, camera);
}

// Démarrage du jeu
init();