export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(60, 400 / 500, 0.1, 100); 
export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gameCanvas"), antialias: true });

export function initScene() {
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.FogExp2(0x050510, 0.02);

  camera.position.set(0, 20, 15);
  camera.lookAt(0, 0, -5);

  renderer.shadowMap.enabled = true;

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404060, 1.0);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xaaccff, 1.5);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0x00d2ff, 1, 20);
  pointLight.position.set(0, 2, 5);
  scene.add(pointLight);

  // Ground
  const planeGeometry = new THREE.PlaneGeometry(100, 100);
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a1a,
    roughness: 0.8,
    metalness: 0.2,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.z = -20;
  plane.receiveShadow = true;
  scene.add(plane);

  // Grid
  const gridHelper = new THREE.GridHelper(100, 50, 0x00d2ff, 0x111133);
  gridHelper.position.z = -20;
  scene.add(gridHelper);
}
