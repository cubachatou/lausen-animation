import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'lil-gui'

//===================== CANVAS & SCENE =====================//
const canvas = document.querySelector('#webgl')
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

//===================== WAVE PARAMETERS =====================//
const params = {
    // Line parameters
    lineCount: 80,
    pointsPerLine: 200,
    lineWidth: 1.5,
    opacity: 0.7,
    
    // Wave parameters
    waveAmplitude: 1.2,
    waveFrequency: 1.5,
    waveSpeed: 0.3,
    
    // Twist parameters
    twistAmount: 2.5,
    twistFrequency: 0.8,
    twistSpeed: 0.4,
    
    // Mesh dimensions
    meshWidth: 15,
    meshHeight: 2.5,
    
    // Gradient colors (left to right)
    color1: '#ff0080',
    color2: '#ff8c00',
    color3: '#ffff00',
    color4: '#00ff00',
    color5: '#00ffff',
    color6: '#0080ff',
    color7: '#8000ff',
    colorStops: 5
}

//===================== ANIMATED WAVE MESH =====================//
let lineGroup = new THREE.Group()
let lines = []
let lineMaterials = []

function createWaveMesh() {
    // Clear existing lines
    lines.forEach(line => {
        line.geometry.dispose()
        line.material.dispose()
        lineGroup.remove(line)
    })
    lines = []
    lineMaterials = []
    
    // Get active colors based on colorStops
    const activeColors = [
        params.color1,
        params.color2,
        params.color3,
        params.color4,
        params.color5,
        params.color6,
        params.color7
    ].slice(0, params.colorStops)
    
    for (let i = 0; i < params.lineCount; i++) {
        const points = []
        const colors = []
        
        // Create line points along X axis (horizontal flow)
        for (let j = 0; j < params.pointsPerLine; j++) {
            const x = (j / (params.pointsPerLine - 1)) * params.meshWidth - params.meshWidth / 2
            const y = 0
            const z = 0
            points.push(new THREE.Vector3(x, y, z))
            
            // Calculate color gradient from left to right
            const progress = j / (params.pointsPerLine - 1)
            const colorIndex = progress * (activeColors.length - 1)
            const colorIndexFloor = Math.floor(colorIndex)
            const colorIndexCeil = Math.min(Math.ceil(colorIndex), activeColors.length - 1)
            const colorMix = colorIndex - colorIndexFloor
            
            const color1 = new THREE.Color(activeColors[colorIndexFloor])
            const color2 = new THREE.Color(activeColors[colorIndexCeil])
            const color = color1.lerp(color2, colorMix)
            
            colors.push(color.r, color.g, color.b)
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        
        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: params.lineWidth,
            transparent: true,
            opacity: params.opacity
        })
        
        const line = new THREE.Line(geometry, material)
        line.userData.index = i
        lines.push(line)
        lineMaterials.push(material)
        lineGroup.add(line)
    }
}

createWaveMesh()
scene.add(lineGroup)

function updateWaveAnimation(time) {
    lines.forEach((line, i) => {
        const positions = line.geometry.attributes.position.array
        
        // Calculate this line's position in the mesh (0 to 1)
        const lineProgress = i / (params.lineCount - 1)
        
        // Position this line vertically in the mesh
        const baseY = (lineProgress - 0.5) * params.meshHeight
        
        for (let j = 0; j < params.pointsPerLine; j++) {
            const x = (j / (params.pointsPerLine - 1)) * params.meshWidth - params.meshWidth / 2
            const xProgress = j / (params.pointsPerLine - 1)
            
            // Create flowing wave motion (up and down)
            const wave1 = Math.sin(xProgress * Math.PI * params.waveFrequency + time * params.waveSpeed) * params.waveAmplitude
            const wave2 = Math.sin(xProgress * Math.PI * params.waveFrequency * 2.3 - time * params.waveSpeed * 0.7) * params.waveAmplitude * 0.4
            
            // Create twist effect (lines rotating around center)
            const twistAngle = Math.sin(xProgress * Math.PI * params.twistFrequency + time * params.twistSpeed) * params.twistAmount
            const radius = lineProgress * params.meshHeight
            
            // Apply twist rotation
            const y = baseY * Math.cos(twistAngle) + wave1 + wave2
            const z = baseY * Math.sin(twistAngle)
            
            positions[j * 3] = x
            positions[j * 3 + 1] = y
            positions[j * 3 + 2] = z
        }
        
        line.geometry.attributes.position.needsUpdate = true
    })
}

//===================== SIZES =====================//
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

//===================== CAMERA =====================//
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 0
camera.position.z = 6
camera.lookAt(0, 0, 0)
scene.add(camera)

//===================== CONTROLS =====================//
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

//===================== GUI =====================//
const gui = new GUI()

// Line Settings Folder
const lineFolder = gui.addFolder('Line Settings')
lineFolder.add(params, 'lineCount', 20, 200, 1).name('Line Count').onChange(() => createWaveMesh())
lineFolder.add(params, 'pointsPerLine', 50, 400, 10).name('Points Per Line').onChange(() => createWaveMesh())
lineFolder.add(params, 'lineWidth', 0.5, 5, 0.1).name('Line Width')
lineFolder.add(params, 'opacity', 0.1, 1, 0.05).name('Opacity').onChange((value) => {
    lineMaterials.forEach(mat => mat.opacity = value)
})
lineFolder.open()

// Wave Settings Folder
const waveFolder = gui.addFolder('Wave Settings')
waveFolder.add(params, 'waveAmplitude', 0, 3, 0.1).name('Wave Amplitude')
waveFolder.add(params, 'waveFrequency', 0.1, 5, 0.1).name('Wave Frequency')
waveFolder.add(params, 'waveSpeed', 0, 2, 0.05).name('Wave Speed')
waveFolder.open()

// Twist Settings Folder
const twistFolder = gui.addFolder('Twist Settings')
twistFolder.add(params, 'twistAmount', 0, 10, 0.1).name('Twist Amount')
twistFolder.add(params, 'twistFrequency', 0.1, 3, 0.1).name('Twist Frequency')
twistFolder.add(params, 'twistSpeed', 0, 2, 0.05).name('Twist Speed')
twistFolder.open()

// Mesh Dimensions Folder
const meshFolder = gui.addFolder('Mesh Dimensions')
meshFolder.add(params, 'meshWidth', 5, 30, 0.5).name('Mesh Width')
meshFolder.add(params, 'meshHeight', 0.5, 10, 0.1).name('Mesh Height')
meshFolder.open()

// Color Settings Folder
const colorFolder = gui.addFolder('Gradient Colors')
colorFolder.add(params, 'colorStops', 1, 7, 1).name('Color Stops').onChange(() => createWaveMesh())
colorFolder.addColor(params, 'color1').name('Color 1').onChange(() => createWaveMesh())
colorFolder.addColor(params, 'color2').name('Color 2').onChange(() => createWaveMesh())
colorFolder.addColor(params, 'color3').name('Color 3').onChange(() => createWaveMesh())
colorFolder.addColor(params, 'color4').name('Color 4').onChange(() => createWaveMesh())
colorFolder.addColor(params, 'color5').name('Color 5').onChange(() => createWaveMesh())
colorFolder.addColor(params, 'color6').name('Color 6').onChange(() => createWaveMesh())
colorFolder.addColor(params, 'color7').name('Color 7').onChange(() => createWaveMesh())
colorFolder.open()

//===================== RENDERER =====================//
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

//===================== ANIMATE =====================//
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update wave animation
    updateWaveAnimation(elapsedTime)
    
    // Update line width for all materials
    lineMaterials.forEach(material => {
        material.linewidth = params.lineWidth
    })

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
