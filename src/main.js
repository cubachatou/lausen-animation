import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'lil-gui'
import { Line2 } from 'three/examples/jsm/lines/webgpu/Line2.js'
import { LineMaterial } from 'three/examples/jsm/Addons.js'
import { LineGeometry } from 'three/examples/jsm/Addons.js'

//===================== CANVAS & SCENE =====================//
const canvas = document.querySelector('#webgl')
const scene = new THREE.Scene()
const frontGroup = new THREE.Group()
const backGroup = new THREE.Group()
scene.add(frontGroup, backGroup)

//===================== SIZES, CAMERA, CONTROLS =====================//
// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 6)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

//===================== RENDERER =====================//
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0xf6f7f9, 1)

//===================== PARAMETERS =====================//
const params = {
  orbit: {
    enableDamping: true,
    dampingFactor: 0.05,
    enableZoom: true,
    enablePan: true,
    autoRotate: false,
    autoRotateSpeed: 2,
  },

  scene: {
    backgroundColor: '#f6f7f9',
    showFrontMesh: true,
    showBackMesh: true,
  },

  colors: {
    numberOfColors: 6,
    smoothness: 0.5,
    c1: '#e73100',
    c2: '#ff12ef',
    c3: '#5baaff',
    c4: '#00bfff',
    c5: '#29abe2',
    c6: '#22b573',
    c7: '#0eff0e',
  },

  spiral: {
    numberOfTwists: 2,
    twistStrength: 1.5,
    twistRadius: 0.3,
    animationSpeed: 0.5,
    chaos: 0.5,
    phaseOffset: 0.0,
  },

  frontLines: {
    lineCount: 40,
    segments: 100,
    width: 10,
    height: 2,
    amplitude: 0.5,
    frequency: 1.2,
    opacity: 0.6,
    lineWidth: 0.04,
  },

  network: {
    nodeCount: 80,
    horizontalSpread: 25,
    verticalSpread: 12,
    depthSpread: 8,
    connectionDistance: 6,
    nodeSize: 0.08,
    opacity: 0.5,
    lineWidth: 0.01,
    animationSpeed: 0.2,
    floatIntensity: 1.0,
  },

  edgeFade: {
    fadeAmount: 0.3,
    fadeStart: 0.6,
  },

  postProcessing: {
    bloomIntensity: 0.8,
    bloomRadius: 0.5,
    vignetteOffset: 0.3,
    vignetteDarkness: 0.5,
  },

  performance: {
    showFpsStats: true,
    pixelRatio: 1,
  }
}

//===================== GUI =====================//
const gui = new GUI({ title: 'Controls' })

// Orbit Controls
const fControls = gui.addFolder('Orbit Controls')
fControls.add(params.orbit, 'enableDamping').name('Enable Damping').onChange(v => controls.enableDamping = v)
fControls.add(params.orbit, 'dampingFactor', 0.0, 0.2, 0.005).name('Damping Factor').onChange(v => controls.dampingFactor = v)
fControls.add(params.orbit, 'enableZoom').name('Enable Zoom').onChange(v => controls.enableZoom = v)
fControls.add(params.orbit, 'enablePan').name('Enable Pan').onChange(v => controls.enablePan = v)
fControls.add(params.orbit, 'autoRotate').name('Auto Rotate').onChange(v => controls.autoRotate = v)
fControls.add(params.orbit, 'autoRotateSpeed', 0.1, 10, 0.1).name('Auto Rotate Speed').onChange(v => controls.autoRotateSpeed = v)

// Scene
const fScene = gui.addFolder('Scene')
fScene.addColor(params.scene, 'backgroundColor').name('Background Color').onChange(v => renderer.setClearColor(new THREE.Color(v), 1))
fScene.add(params.scene, 'showFrontMesh').name('Show Front Mesh').onChange(v => frontGroup.visible = v)
fScene.add(params.scene, 'showBackMesh').name('Show Back Mesh').onChange(v => backGroup.visible = v)

// Colors
const fColors = gui.addFolder('Colors')
fColors.add(params.colors, 'numberOfColors', 1, 7, 1).name('Number of Colors')
fColors.add(params.colors, 'smoothness', 0, 1, 0.01).name('Smoothness')
fColors.addColor(params.colors, 'c1').name('Color 1')
fColors.addColor(params.colors, 'c2').name('Color 2')
fColors.addColor(params.colors, 'c3').name('Color 3')
fColors.addColor(params.colors, 'c4').name('Color 4')
fColors.addColor(params.colors, 'c5').name('Color 5')
fColors.addColor(params.colors, 'c6').name('Color 6')
fColors.addColor(params.colors, 'c7').name('Color 7')

// Spiral Twist
const fSpiral = gui.addFolder('Spiral / DNA Twist')
fSpiral.add(params.spiral, 'numberOfTwists', 0, 10, 1).name('Number of Twists')
fSpiral.add(params.spiral, 'twistStrength', 0, 5, 0.05).name('Twist Strength')
fSpiral.add(params.spiral, 'twistRadius', 0.05, 1, 0.01).name('Spiral Radius')
fSpiral.add(params.spiral, 'animationSpeed', 0, 3, 0.01).name('Animation Speed')
fSpiral.add(params.spiral, 'chaos', 0, 1, 0.01).name('Chaos/Variation')
fSpiral.add(params.spiral, 'phaseOffset', -Math.PI, Math.PI, 0.01).name('Phase Offset (Front/Back)')

// Front Line Mesh
const fFront = gui.addFolder('Front Line Mesh')
fFront.add(params.frontLines, 'lineCount', 1, 200, 1).name('Line Count')
fFront.add(params.frontLines, 'segments', 10, 400, 1).name('Segments')
fFront.add(params.frontLines, 'width', 1, 30, 0.1).name('Width')
fFront.add(params.frontLines, 'height', 0.2, 10, 0.1).name('Height')
fFront.add(params.frontLines, 'amplitude', 0, 2, 0.01).name('Amplitude')
fFront.add(params.frontLines, 'frequency', 0, 5, 0.01).name('Frequency')
fFront.add(params.frontLines, 'opacity', 0, 1, 0.01).name('Opacity')
fFront.add(params.frontLines, 'lineWidth', 0.001, 0.2, 0.001).name('Line Width')

// Back Network Mesh
const fBack = gui.addFolder('Back Network Mesh')
fBack.add(params.network, 'nodeCount', 2, 400, 1).name('Node Count')
fBack.add(params.network, 'horizontalSpread', 1, 50, 1).name('Horizontal Spread')
fBack.add(params.network, 'verticalSpread', 1, 50, 1).name('Vertical Spread')
fBack.add(params.network, 'depthSpread', 1, 50, 1).name('Depth Spread')
fBack.add(params.network, 'connectionDistance', 1, 20, 0.1).name('Connection Distance')
fBack.add(params.network, 'nodeSize', 0.01, 0.5, 0.005).name('Node Size')
fBack.add(params.network, 'opacity', 0, 1, 0.01).name('Opacity')
fBack.add(params.network, 'lineWidth', 0.001, 0.1, 0.001).name('Line Width')
fBack.add(params.network, 'animationSpeed', 0, 2, 0.01).name('Animation Speed')
fBack.add(params.network, 'floatIntensity', 0, 3, 0.01).name('Float Intensity')

// Edge Fade Effect
const fFade = gui.addFolder('Edge Fade Effect')
fFade.add(params.edgeFade, 'fadeAmount', 0, 1, 0.01).name('Fade Amount')
fFade.add(params.edgeFade, 'fadeStart', 0, 1, 0.01).name('Fade Start')

// Post-Processing
const fPost = gui.addFolder('Post-Processing')
fPost.add(params.postProcessing, 'bloomIntensity', 0, 3, 0.01).name('Bloom Intensity')
fPost.add(params.postProcessing, 'bloomRadius', 0, 1, 0.01).name('Bloom Radius')
fPost.add(params.postProcessing, 'vignetteOffset', 0, 1, 0.01).name('Vignette Offset')
fPost.add(params.postProcessing, 'vignetteDarkness', 0, 1, 0.01).name('Vignette Darkness')

// Performance
const fPerf = gui.addFolder('Performance')
fPerf.add(params.performance, 'showFpsStats').name('Show FPS Stats')
fPerf.add(params.performance, 'pixelRatio', 0.25, 2, 0.05).name('Pixel Ratio').onChange(v => {
  renderer.setPixelRatio(v)
})

// Initial synchronization of controls and scene visibility
controls.enableDamping = params.orbit.enableDamping
controls.dampingFactor = params.orbit.dampingFactor
controls.enableZoom = params.orbit.enableZoom
controls.enablePan = params.orbit.enablePan
controls.autoRotate = params.orbit.autoRotate
controls.autoRotateSpeed = params.orbit.autoRotateSpeed
frontGroup.visible = params.scene.showFrontMesh
backGroup.visible = params.scene.showBackMesh

//===================== RESIZE EVENT =====================//
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(params.performance.pixelRatio)
})

//===================== HELPER FUNCTIONS =====================//
/**
 * Генерує масив кольорів для градієнта на основі налаштувань
 * @param {number} count - Кількість сегментів для інтерполяції
 * @returns {Float32Array} - Масив RGB кольорів
 */
function generateGradientColors(count) {
  const colorStops = []
  const numColors = params.colors.numberOfColors
  
  // Збираємо активні кольори
  for (let i = 1; i <= numColors; i++) {
    const colorKey = `c${i}`
    const color = new THREE.Color(params.colors[colorKey])
    colorStops.push(color)
  }
  
  const colors = new Float32Array(count * 3)
  const smoothness = params.colors.smoothness
  
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    
    // Визначаємо між якими кольорами інтерполюємо
    const scaledT = t * (numColors - 1)
    const indexA = Math.floor(scaledT)
    const indexB = Math.min(indexA + 1, numColors - 1)
    
    // Локальна інтерполяція з урахуванням smoothness
    let localT = scaledT - indexA
    
    // Застосовуємо smoothness (0 = різкі переходи, 1 = плавні)
    if (smoothness < 0.5) {
      // Більш різкі переходи
      const sharpness = 1 - smoothness * 2
      localT = localT < 0.5 
        ? Math.pow(localT * 2, 1 + sharpness * 3) / 2
        : 1 - Math.pow((1 - localT) * 2, 1 + sharpness * 3) / 2
    } else {
      // Більш плавні переходи
      const ease = (smoothness - 0.5) * 2
      localT = localT * localT * (3 - 2 * localT) * (1 - ease) + localT * ease
    }
    
    const colorA = colorStops[indexA]
    const colorB = colorStops[indexB]
    
    const r = colorA.r + (colorB.r - colorA.r) * localT
    const g = colorA.g + (colorB.g - colorA.g) * localT
    const b = colorA.b + (colorB.b - colorA.b) * localT
    
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }
  
  return colors
}

//===================== FRONT MESH: TWISTED RIBBON (DNA-LIKE) =====================//
let frontLines = []

/**
 * Створює передню фігуру - закручену стрічку з багатьох ліній
 */
function createFrontMesh() {
  // Видаляємо старі лінії
  frontLines.forEach(line => {
    line.geometry.dispose()
    line.material.dispose()
    frontGroup.remove(line)
  })
  frontLines = []
  
  const lineCount = params.frontLines.lineCount
  const segments = params.frontLines.segments
  const width = params.frontLines.width
  const height = params.frontLines.height
  
  for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    const positions = []
    const colors = []
    
    // Генеруємо кольори градієнта для цієї лінії
    const gradientColors = generateGradientColors(segments)
    
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1)
      
      // Базова позиція вздовж X (справа наліво)
      const x = (t - 0.5) * width
      
      // Розподіл ліній по колу/спіралі
      const lineAngle = (lineIndex / lineCount) * Math.PI * 2
      
      // Застосовуємо скручування (twist) - воно змінюється вздовж довжини
      // Використовуємо chaos для варіації
      const twistFreq = params.spiral.numberOfTwists + 
        Math.sin(lineAngle * 3) * params.spiral.chaos * 2
      const twistAmount = t * twistFreq * Math.PI * 2 * params.spiral.twistStrength
      
      // Радіус також може варіюватися
      const radiusVariation = 1 + Math.sin(t * Math.PI * 4) * params.spiral.chaos * 0.3
      const radius = params.spiral.twistRadius * radiusVariation
      
      // Обчислюємо фінальний кут
      const angle = lineAngle + twistAmount
      
      // Позиції Y та Z формують спіраль
      const y = Math.sin(angle) * radius * height
      const z = Math.cos(angle) * radius
      
      // Додаємо хвилястість
      const wave = Math.sin(t * Math.PI * params.frontLines.frequency) * params.frontLines.amplitude
      
      positions.push(x, y + wave, z)
      
      // Додаємо кольори з градієнта
      colors.push(
        gradientColors[i * 3],
        gradientColors[i * 3 + 1],
        gradientColors[i * 3 + 2]
      )
    }
    
    // Створюємо геометрію лінії
    const geometry = new LineGeometry()
    geometry.setPositions(positions)
    geometry.setColors(colors)
    
    // Матеріал з товщиною та прозорістю
    const material = new LineMaterial({
      linewidth: params.frontLines.lineWidth,
      vertexColors: true,
      transparent: true,
      opacity: params.frontLines.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    material.resolution.set(sizes.width, sizes.height)
    
    const line = new Line2(geometry, material)
    frontGroup.add(line)
    frontLines.push(line)
  }
}

//===================== BACK MESH: NETWORK WITH NODES =====================//
let networkNodes = []
let networkLines = []
let nodeOriginalPositions = []

/**
 * Створює задню фігуру - мережу з вузлами та лініями
 */
function createBackMesh() {
  // Видаляємо старі об'єкти
  networkNodes.forEach(node => {
    node.geometry.dispose()
    node.material.dispose()
    backGroup.remove(node)
  })
  networkLines.forEach(line => {
    line.geometry.dispose()
    line.material.dispose()
    backGroup.remove(line)
  })
  networkNodes = []
  networkLines = []
  nodeOriginalPositions = []
  
  const nodeCount = params.network.nodeCount
  const hSpread = params.network.horizontalSpread
  const vSpread = params.network.verticalSpread
  const dSpread = params.network.depthSpread
  
  // Створюємо вузли (точки)
  const nodeGeometry = new THREE.SphereGeometry(params.network.nodeSize, 8, 8)
  
  for (let i = 0; i < nodeCount; i++) {
    // Випадкова позиція
    const x = (Math.random() - 0.5) * hSpread
    const y = (Math.random() - 0.5) * vSpread
    const z = (Math.random() - 0.5) * dSpread - 5 // Зміщуємо назад
    
    nodeOriginalPositions.push(new THREE.Vector3(x, y, z))
    
    // Визначаємо колір вузла на основі X позиції (градієнт справа наліво)
    const t = (x / hSpread + 0.5)
    const gradientColors = generateGradientColors(100)
    const colorIndex = Math.floor(t * 99)
    const color = new THREE.Color(
      gradientColors[colorIndex * 3],
      gradientColors[colorIndex * 3 + 1],
      gradientColors[colorIndex * 3 + 2]
    )
    
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: params.network.opacity,
      depthWrite: false
    })
    
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial)
    node.position.set(x, y, z)
    backGroup.add(node)
    networkNodes.push(node)
  }
  
  // Створюємо з'єднання між близькими вузлами
  const connectionDistance = params.network.connectionDistance
  
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const nodeA = networkNodes[i]
      const nodeB = networkNodes[j]
      const distance = nodeA.position.distanceTo(nodeB.position)
      
      if (distance < connectionDistance) {
        // Створюємо лінію між вузлами
        const positions = [
          nodeA.position.x, nodeA.position.y, nodeA.position.z,
          nodeB.position.x, nodeB.position.y, nodeB.position.z
        ]
        
        // Кольори для кінців лінії (градієнт)
        const tA = (nodeA.position.x / hSpread + 0.5)
        const tB = (nodeB.position.x / hSpread + 0.5)
        const gradientColors = generateGradientColors(100)
        
        const colorIndexA = Math.floor(Math.max(0, Math.min(0.99, tA)) * 99)
        const colorIndexB = Math.floor(Math.max(0, Math.min(0.99, tB)) * 99)
        
        const colors = [
          gradientColors[colorIndexA * 3],
          gradientColors[colorIndexA * 3 + 1],
          gradientColors[colorIndexA * 3 + 2],
          gradientColors[colorIndexB * 3],
          gradientColors[colorIndexB * 3 + 1],
          gradientColors[colorIndexB * 3 + 2]
        ]
        
        const lineGeometry = new LineGeometry()
        lineGeometry.setPositions(positions)
        lineGeometry.setColors(colors)
        
        const lineMaterial = new LineMaterial({
          linewidth: params.network.lineWidth,
          vertexColors: true,
          transparent: true,
          opacity: params.network.opacity * 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
        lineMaterial.resolution.set(sizes.width, sizes.height)
        
        const line = new Line2(lineGeometry, lineMaterial)
        backGroup.add(line)
        networkLines.push({ line, nodeAIndex: i, nodeBIndex: j })
      }
    }
  }
}

//===================== UPDATE FUNCTIONS =====================//
/**
 * Оновлює анімацію передньої фігури (обертання)
 */
function updateFrontMesh(elapsedTime) {
  if (frontLines.length === 0) return
  
  const rotationSpeed = params.spiral.animationSpeed
  frontGroup.rotation.z = elapsedTime * rotationSpeed * 0.5
}

/**
 * Оновлює анімацію задньої мережі (рух вузлів)
 */
function updateBackMesh(elapsedTime) {
  if (networkNodes.length === 0) return
  
  const speed = params.network.animationSpeed
  const intensity = params.network.floatIntensity
  
  // Оновлюємо позиції вузлів
  for (let i = 0; i < networkNodes.length; i++) {
    const node = networkNodes[i]
    const original = nodeOriginalPositions[i]
    
    // Хаотичний рух на основі noise-подібних функцій
    const offsetX = Math.sin(elapsedTime * speed + i * 0.5) * intensity * 0.3
    const offsetY = Math.cos(elapsedTime * speed * 1.3 + i * 0.7) * intensity * 0.3
    const offsetZ = Math.sin(elapsedTime * speed * 0.7 + i * 1.1) * intensity * 0.2
    
    node.position.x = original.x + offsetX
    node.position.y = original.y + offsetY
    node.position.z = original.z + offsetZ
  }
  
  // Оновлюємо лінії між вузлами
  for (const { line, nodeAIndex, nodeBIndex } of networkLines) {
    const nodeA = networkNodes[nodeAIndex]
    const nodeB = networkNodes[nodeBIndex]
    
    const positions = [
      nodeA.position.x, nodeA.position.y, nodeA.position.z,
      nodeB.position.x, nodeB.position.y, nodeB.position.z
    ]
    
    line.geometry.setPositions(positions)
  }
}

//===================== INITIALIZE MESHES =====================//
createFrontMesh()
createBackMesh()

// Додаємо listeners для оновлення геометрії при зміні параметрів
gui.onChange(() => {
  // Оновлюємо resolution для всіх ліній при зміні розміру
  frontLines.forEach(line => {
    line.material.resolution.set(sizes.width, sizes.height)
    line.material.opacity = params.frontLines.opacity
    line.material.linewidth = params.frontLines.lineWidth
    line.material.needsUpdate = true
  })
  
  networkLines.forEach(({ line }) => {
    line.material.resolution.set(sizes.width, sizes.height)
    line.material.opacity = params.network.opacity * 0.5
    line.material.linewidth = params.network.lineWidth
    line.material.needsUpdate = true
  })
  
  // Оновлюємо розмір вузлів
  networkNodes.forEach(node => {
    node.scale.setScalar(1)
    node.material.opacity = params.network.opacity
  })
})

// Кнопки для перегенерації мешів
fFront.add({ regenerate: () => createFrontMesh() }, 'regenerate').name('↻ Regenerate')
fBack.add({ regenerate: () => createBackMesh() }, 'regenerate').name('↻ Regenerate')

//===================== ANIMATE =====================//
const clock = new THREE.Clock()

const tick = () => {
  const elapsedTime = clock.getElapsedTime()

  updateFrontMesh(elapsedTime)
  updateBackMesh(elapsedTime)
  
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}

tick()
