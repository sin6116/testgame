// Variables globales
let scene, camera, renderer;
let world = {};
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

// Matériaux des blocs
const materials = {
    dirt: createBlockMaterial(0x8B4513, 0x654321, 0x5D4037),
    grass: createBlockMaterial(0x228B22, 0x32CD32, 0x8B4513),
    stone: createBlockMaterial(0x808080, 0x696969, 0x555555),
    sand: createBlockMaterial(0xF4E4BC, 0xDEB887, 0xD2B48C),
    water: createWaterMaterial()
};

// Fonction pour créer un matériau de bloc avec textures procédurales
function createBlockMaterial(topColor, sideColor, bottomColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Texture de base
    ctx.fillStyle = `#${topColor.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 64, 64);
    
    // Ajout de détails
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * 64;
        const y = Math.random() * 64;
        const size = Math.random() * 3 + 1;
        const brightness = Math.random() * 0.3 - 0.15;
        
        ctx.fillStyle = `rgba(${Math.floor(255 * brightness)}, ${Math.floor(255 * brightness)}, ${Math.floor(255 * brightness)}, 0.5)`;
        ctx.fillRect(x, y, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    return new THREE.MeshLambertMaterial({ map: texture });
}

// Fonction pour créer le matériau de l'eau
function createWaterMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 64, 64);
    gradient.addColorStop(0, '#0080FF');
    gradient.addColorStop(0.5, '#0066CC');
    gradient.addColorStop(1, '#004499');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    // Effet de vagues
    for (let i = 0; i < 10; i++) {
        const y = i * 6;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < 64; x++) {
            ctx.lineTo(x, y + Math.sin(x * 0.2) * 2);
        }
        ctx.stroke();
    }
    
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
    scene.fog = new THREE.Fog(0x87CEEB, 1, 100);
    
    // Caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Rendu
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Lumières
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);
    
    // Génération du monde
    generateWorld();
    
    // Événements
    setupEventListeners();
    
    // Boucle de rendu
    animate();
}

// Génération du monde
function generateWorld() {
    const size = 30;
    
    for (let x = -size; x <= size; x++) {
        for (let z = -size; z <= size; z++) {
            const height = Math.floor(Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3 + 5);
            const distance = Math.sqrt(x * x + z * z);
            
            // Différents biomes selon la distance
            let blockType;
            if (distance > 20) {
                blockType = 'sand'; // Désert en périphérie
            } else if (distance > 15) {
                blockType = Math.random() > 0.3 ? 'sand' : 'stone';
            } else {
                blockType = 'grass';
            }
            
            // Génération des couches
            for (let y = 0; y <= height; y++) {
                let currentBlockType;
                if (y === height && blockType === 'grass') {
                    currentBlockType = 'grass';
                } else if (y > height - 3) {
                    currentBlockType = blockType === 'sand' ? 'sand' : 'dirt';
                } else {
                    currentBlockType = 'stone';
                }
                
                setBlock(x, y, z, currentBlockType);
            }
            
            // Ajout d'eau dans les zones basses
            if (height < 3) {
                for (let y = height + 1; y <= 3; y++) {
                    setBlock(x, y, z, 'water');
                }
            }
            
            // Structures aléatoires
            if (Math.random() > 0.98 && blockType === 'grass' && height > 3) {
                // Petit arbre
                for (let ty = height + 1; ty <= height + 4; ty++) {
                    setBlock(x, ty, z, 'dirt');
                }
                
                // Feuillage
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        for (let dy = 0; dy <= 1; dy++) {
                            if (Math.random() > 0.3) {
                                setBlock(x + dx, height + 4 + dy, z + dz, 'grass');
                            }
                        }
                    }
                }
            }
        }
    }
}

// Fonction pour placer un bloc
function setBlock(x, y, z, type) {
    const key = `${x},${y},${z}`;
    
    // Supprimer l'ancien bloc s'il existe
    if (world[key]) {
        scene.remove(world[key]);
    }
    
    if (type) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.Mesh(geometry, materials[type]);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
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

// Configuration des événements
function setupEventListeners() {
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        
        // Sélection des blocs
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
        
        if (event.button === 0) { // Clic gauche - casser
            breakBlock();
        } else if (event.button === 2) { // Clic droit - placer
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
    
    // Pointer lock
    document.addEventListener('click', () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    
    // Inventaire
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    inventorySlots.forEach((slot, index) => {
        slot.addEventListener('click', () => {
            selectedBlock = slot.dataset.block;
            updateInventoryUI();
        });
    });
    
    // Redimensionnement
    window.addEventListener('resize', onWindowResize);
}

// Mise à jour de l'interface inventaire
function updateInventoryUI() {
    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach(slot => {
        slot.classList.toggle('active', slot.dataset.block === selectedBlock);
    });
}

// Casser un bloc
function breakBlock() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(Object.values(world));
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const position = intersect.object.position;
        
        if (intersect.object.blockType !== 'water') { // On ne peut pas casser l'eau
            setBlock(position.x, position.y, position.z, null);
        }
    }
}

// Placer un bloc
function placeBlock() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(Object.values(world));
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const face = intersect.face;
        const position = intersect.object.position.clone();
        
        // Calculer la position du nouveau bloc
        position.add(face.normal);
        
        // Vérifier que le joueur ne se trouve pas à cette position
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

// Physique du joueur
function updatePlayer() {
    const moveSpeed = 0.1;
    const jumpForce = 0.15;
    const gravity = -0.01;
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
    
    // Appliquer la résistance de l'eau
    if (player.inWater) {
        moveDirection.multiplyScalar(waterResistance);
    }
    
    player.velocity.x = moveDirection.x;
    player.velocity.z = moveDirection.z;
    
    // Saut/Nage
    if (keys['Space']) {
        if (player.inWater) {
            player.velocity.y = jumpForce * 0.7; // Nage plus lente
        } else if (player.onGround) {
            player.velocity.y = jumpForce;
            player.onGround = false;
        }
    }
    
    // Descendre dans l'eau
    if (keys['ShiftLeft'] && player.inWater) {
        player.velocity.y = -jumpForce * 0.7;
    }
    
    // Gravité
    if (!player.inWater) {
        player.velocity.y += gravity;
    } else {
        player.velocity.y *= 0.9; // Flottabilité
    }
    
    // Collision et mouvement
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

// Vérification des collisions
function checkCollisions() {
    const playerBox = {
        min: {
            x: player.position.x - 0.3,
            y: player.position.y - 0.9,
            z: player.position.z - 0.3
        },
        max: {
            x: player.position.x + 0.3,
            y: player.position.y + 0.9,
            z: player.position.z + 0.3
        }
    };
    
    // Vérifier si le joueur est dans l'eau
    player.inWater = false;
    const headBlock = getBlock(player.position.x, player.position.y + 0.5, player.position.z);
    if (headBlock && headBlock.blockType === 'water') {
        player.inWater = true;
    }
    
    // Collision verticale (sol)
    player.onGround = false;
    for (let x = Math.floor(playerBox.min.x); x <= Math.ceil(playerBox.max.x); x++) {
        for (let z = Math.floor(playerBox.min.z); z <= Math.ceil(playerBox.max.z); z++) {
            const blockBelow = getBlock(x, Math.floor(player.position.y - 1), z);
            if (blockBelow && blockBelow.blockType !== 'water') {
                if (player.position.y - 0.9 <= Math.floor(player.position.y - 1) + 1) {
                    player.onGround = true;
                    player.position.y = Math.floor(player.position.y - 1) + 1.9;
                    player.velocity.y = 0;
                }
            }
        }
    }
    
    // Collision horizontale
    const directions = [
        { axis: 'x', sign: 1 },
        { axis: 'x', sign: -1 },
        { axis: 'z', sign: 1 },
        { axis: 'z', sign: -1 }
    ];
    
    directions.forEach(dir => {
        const checkPos = { ...player.position };
        checkPos[dir.axis] += dir.sign * 0.4;
        
        for (let y = Math.floor(player.position.y - 0.5); y <= Math.ceil(player.position.y + 0.5); y++) {
            const block = getBlock(checkPos.x, y, checkPos.z);
            if (block && block.blockType !== 'water') {
                player.velocity[dir.axis] = 0;
                break;
            }
        }
    });
}

// Redimensionnement de la fenêtre
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Boucle d'animation
function animate() {
    requestAnimationFrame(animate);
    
    updatePlayer();
    
    renderer.render(scene, camera);
}

// Démarrage du jeu
init();