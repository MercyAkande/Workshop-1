// Three.js Scene Setup
let scene, camera, renderer, controls;
let cube, sphere, torus;

function init() {
    // Get canvas element
    const canvas = document.getElementById('threejs-canvas');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0); // Very light gray background
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        50, 
        canvas.clientWidth / canvas.clientHeight, 
        0.001,  // Reduced near clipping plane to see lines when very close
        1000
    );
    camera.position.set(5, 5, 5);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x888888);
    gridHelper.material.depthTest = true;
    scene.add(gridHelper);
    
    // Create primitives
    createPrimitives();
    
    // Add lighting
    addLighting();
    
    // Start animation loop
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function createPrimitives() {
    // Cube - Green
    const cubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const cubeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,  // Green
        metalness: 0.1,
        roughness: 0.3
    });
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(-2, 0.75, 0);
    cube.castShadow = true;
    scene.add(cube);
    
    // Sphere - Pink
    const sphereGeometry = new THREE.SphereGeometry(1.2, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff69b4,  // Pink
        metalness: 0.1,
        roughness: 0.3
    });
    sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(2, 1.2, 0);
    sphere.castShadow = true;
    scene.add(sphere);
    
    // Torus - Light blue
    const torusGeometry = new THREE.TorusGeometry(0.9, 0.3, 16, 100);
    const torusMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87ceeb,  // Light blue
        metalness: 0.1,
        roughness: 0.3
    });
    torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.position.set(0, 0.9, -2);
    torus.rotation.x = Math.PI / 2;
    torus.castShadow = true;
    scene.add(torus);
    
    // Remove ground plane to show only wireframe grid
}

function addLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    // Static directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);
    
    // Static point light for additional illumination
    const pointLight = new THREE.PointLight(0xffffff, 0.6, 100);
    pointLight.position.set(-3, 8, 3);
    scene.add(pointLight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Primitives are now static - no rotation
    
    // Update controls
    controls.update();
    
    // Render
    renderer.render(scene, camera);
}

function onWindowResize() {
    const canvas = document.getElementById('threejs-canvas');
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

// Initialize the scene when the page loads
window.addEventListener('load', init);
  
