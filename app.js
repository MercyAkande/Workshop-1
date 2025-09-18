// Basic scene
let scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b0f14,0.02);

let camera = new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(0,30,80);

let renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);

let controls = new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping = true;

// Lights
let ambientLight = new THREE.AmbientLight(0x404050,0.6); scene.add(ambientLight);
let sunLight = new THREE.DirectionalLight(0xfff1c9,0.8); sunLight.position.set(50,80,20); scene.add(sunLight);
let torchLight = new THREE.PointLight(0xffdcaa,0,200,2); torchLight.position.set(-40,10,20); scene.add(torchLight);

// Groups
let nodeGroup = new THREE.Group(); scene.add(nodeGroup);
let edgeGroup = new THREE.Group(); scene.add(edgeGroup);
let nodeMap = {};

// Styles
let categoryStyle = {
  core:0x60e6ff, light:0xffd17a, usage:0x9be76b,
  property:0xd78fff, constraint:0xff8b8b, process:0xa7c0ff
};

// CSV Loader
function loadCSV(file, callback){
  Papa.parse(file,{
    download:true, header:true, dynamicTyping:true, complete: function(results){
      callback(results.data);
    }
  });
}

// Load nodes first
loadCSV('nodes.csv', function(nodeData){
  nodeData.forEach(n=>{
    if(!n.id) return;
    let mat = new THREE.MeshStandardMaterial({color:categoryStyle[n.category]||0xffffff});
    let mesh = new THREE.Mesh(new THREE.SphereGeometry(2,24,24),mat);
    mesh.position.set(n.x,n.y,n.z);
    mesh.userData={id:n.id};
    nodeGroup.add(mesh);
    nodeMap[n.id]=mesh;
  });

  // Load edges after nodes
  loadCSV('edges.csv', function(edgeData){
    edgeData.forEach(e=>{
      if(!e.source || !e.target) return;
      if(nodeMap[e.source] && nodeMap[e.target]){
        let points=[nodeMap[e.source].position,nodeMap[e.target].position];
        let geo=new THREE.BufferGeometry().setFromPoints(points);
        let line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x2f82ff}));
        edgeGroup.add(line);
      }
    });
  });
});

// Interaction
let raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
function onPointerDown(ev){
  pointer.x=(ev.clientX/window.innerWidth)*2-1;
  pointer.y=-(ev.clientY/window.innerHeight)*2+1;
  raycaster.setFromCamera(pointer,camera);
  let intersects=raycaster.intersectObjects(Object.values(nodeMap));
  if(intersects.length>0){
    let mesh=intersects[0].object;
    mesh.scale.set(3,3,3);
    setTimeout(()=>mesh.scale.set(2,2,2),400);
    if(mesh.userData.id==='Sun') sunLight.intensity=2;
    if(mesh.userData.id==='Torch') torchLight.intensity=2;
  }
}
renderer.domElement.addEventListener('pointerdown',onPointerDown);

// Reset
document.getElementById('resetBtn').onclick=()=>{
  controls.reset(); camera.position.set(0,30,80); sunLight.intensity=0.8; torchLight.intensity=0;
};

// Animate
function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene,camera);
}
animate();

// Resize
window.addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
