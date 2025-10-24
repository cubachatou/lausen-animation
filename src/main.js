import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'lil-gui'
import Stats from 'stats.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { EdgeFadeShader } from './edgeFade.js'
import vertexShader from './vertex.glsl?raw'
import fragmentShader from './fragment.glsl?raw'

//===================== CANVAS & SCENE =====================//
const canvas = document.querySelector('#webgl')
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

//===================== PERFORMANCE MONITOR =====================//
// FPS Counter
const statsFPS = new Stats()
statsFPS.showPanel(0) // FPS
document.body.appendChild(statsFPS.dom)
statsFPS.dom.style.position = 'absolute'
statsFPS.dom.style.left = '0px'
statsFPS.dom.style.top = '0px'

// MS Counter
const statsMS = new Stats()
statsMS.showPanel(1) // MS
document.body.appendChild(statsMS.dom)
statsMS.dom.style.position = 'absolute'
statsMS.dom.style.left = '0px'
statsMS.dom.style.top = '48px'

// MB Counter
const statsMB = new Stats()
statsMB.showPanel(2) // MB
document.body.appendChild(statsMB.dom)
statsMB.dom.style.position = 'absolute'
statsMB.dom.style.left = '0px'
statsMB.dom.style.top = '96px'

//===================== WAVE PARAMETERS =====================//
const params = {
    // Line parameters
    lineCount: 50,
    pointsPerLine: 100,
    lineWidth: 0.3,
    opacity: 0.7,
    
    // Wave parameters
    waveAmplitude: 1.5,
    waveFrequency: 3,
    waveSpeed: 0.3,
    
    // Twist parameters
    twistAmount: 5,
    twistFrequency: 1,
    twistSpeed: 0.15,
    
    // Mesh dimensions
    meshWidth: 25,
    meshHeight: 3,
    
    // Width variation parameters
    widthVariation: 0.5,        // How much the width varies (0 = no variation, 1 = strong variation)
    widthFrequency: 5.0,        // How often the width changes along the wave
    widthSpeed: 0.2,            // Animation speed of width changes
    widthPattern: 0.5,          // Pattern type (0 = smooth, 1 = more abrupt)
    
    // Gradient colors (left to right)
    color1: '#ff0080',
    color2: '#ff8c00',
    color3: '#ffff00',
    color4: '#00ff00',
    color5: '#00ffff',
    color6: '#0080ff',
    color7: '#8000ff',
    colorStops: 7,
    
    // Edge fade parameters
    fadeWidth: 0.2,             // How far from edge to start fading (0-0.5)
    fadeStrength: 1.0           // Opacity at the edges (0 = fully transparent, 1 = no fade)
}

//===================== SHADER MESH =====================//
let waveMesh
let waveMaterial

function createShaderMesh() {
    // Remove old mesh
    if (waveMesh) {
        waveMesh.geometry.dispose()
        waveMesh.material.dispose()
        scene.remove(waveMesh)
    }
    
    // Get active colors
    const activeColors = [
        params.color1,
        params.color2,
        params.color3,
        params.color4,
        params.color5,
        params.color6,
        params.color7
    ].map(color => new THREE.Color(color))
    
    // Create plane geometry with higher resolution for smoother animation
    const geometry = new THREE.PlaneGeometry(1, 1, params.pointsPerLine - 1, params.lineCount - 1)
    
    // Create shader material
    waveMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uLineCount: { value: params.lineCount },
            uLineWidth: { value: params.lineWidth },
            uOpacity: { value: params.opacity },
            uWaveAmplitude: { value: params.waveAmplitude },
            uWaveFrequency: { value: params.waveFrequency },
            uWaveSpeed: { value: params.waveSpeed },
            uTwistAmount: { value: params.twistAmount },
            uTwistFrequency: { value: params.twistFrequency },
            uTwistSpeed: { value: params.twistSpeed },
            uMeshWidth: { value: params.meshWidth },
            uMeshHeight: { value: params.meshHeight },
            uWidthVariation: { value: params.widthVariation },
            uWidthFrequency: { value: params.widthFrequency },
            uWidthSpeed: { value: params.widthSpeed },
            uWidthPattern: { value: params.widthPattern },
            uColors: { value: activeColors },
            uColorStops: { value: params.colorStops }
        },
        transparent: true,
        side: THREE.DoubleSide
    })

    waveMaterial.transparent = true;
    waveMaterial.depthWrite = false;
    waveMaterial.toneMapped = false;
    
    waveMesh = new THREE.Mesh(geometry, waveMaterial)
    scene.add(waveMesh)
}

createShaderMesh()

function updateShaderUniforms() {
    if (!waveMaterial) return
    
    waveMaterial.uniforms.uLineCount.value = params.lineCount
    waveMaterial.uniforms.uLineWidth.value = params.lineWidth
    waveMaterial.uniforms.uOpacity.value = params.opacity
    waveMaterial.uniforms.uWaveAmplitude.value = params.waveAmplitude
    waveMaterial.uniforms.uWaveFrequency.value = params.waveFrequency
    waveMaterial.uniforms.uWaveSpeed.value = params.waveSpeed
    waveMaterial.uniforms.uTwistAmount.value = params.twistAmount
    waveMaterial.uniforms.uTwistFrequency.value = params.twistFrequency
    waveMaterial.uniforms.uTwistSpeed.value = params.twistSpeed
    waveMaterial.uniforms.uMeshWidth.value = params.meshWidth
    waveMaterial.uniforms.uMeshHeight.value = params.meshHeight
    waveMaterial.uniforms.uWidthVariation.value = params.widthVariation
    waveMaterial.uniforms.uWidthFrequency.value = params.widthFrequency
    waveMaterial.uniforms.uWidthSpeed.value = params.widthSpeed
    waveMaterial.uniforms.uWidthPattern.value = params.widthPattern
    waveMaterial.uniforms.uColorStops.value = params.colorStops
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
    renderer.setPixelRatio(window.devicePixelRatio)
    
    // Update composer
    composer.setSize(sizes.width, sizes.height)
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

// Export/Import Settings
const settingsFolder = gui.addFolder('Settings Export/Import')
settingsFolder.add({
    exportJSON: () => {
        const settingsJSON = JSON.stringify(params, null, 2)
        const blob = new Blob([settingsJSON], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'wave-settings.json'
        a.click()
        URL.revokeObjectURL(url)
    }
}, 'exportJSON').name('💾 Download Settings JSON')
settingsFolder.open()

// Line Settings Folder
const lineFolder = gui.addFolder('Line Settings')
lineFolder.add(params, 'lineCount', 20, 200, 1).name('Line Count').onChange(() => createShaderMesh())
lineFolder.add(params, 'pointsPerLine', 50, 500, 10).name('Points Per Line').onChange(() => createShaderMesh())
lineFolder.add(params, 'lineWidth', 0.1, 1, 0.01).name('Line Width').onChange(updateShaderUniforms)
lineFolder.add(params, 'opacity', 0.1, 1, 0.05).name('Opacity').onChange(updateShaderUniforms)
lineFolder.open()

// Wave Settings Folder
const waveFolder = gui.addFolder('Wave Settings')
waveFolder.add(params, 'waveAmplitude', 0, 3, 0.1).name('Wave Amplitude').onChange(updateShaderUniforms)
waveFolder.add(params, 'waveFrequency', 0.1, 5, 0.1).name('Wave Frequency').onChange(updateShaderUniforms)
waveFolder.add(params, 'waveSpeed', 0, 2, 0.05).name('Wave Speed').onChange(updateShaderUniforms)
waveFolder.open()

// Twist Settings Folder
const twistFolder = gui.addFolder('Twist Settings')
twistFolder.add(params, 'twistAmount', 0, 10, 0.1).name('Twist Amount').onChange(updateShaderUniforms)
twistFolder.add(params, 'twistFrequency', 0.1, 3, 0.1).name('Twist Frequency').onChange(updateShaderUniforms)
twistFolder.add(params, 'twistSpeed', 0, 2, 0.05).name('Twist Speed').onChange(updateShaderUniforms)
twistFolder.open()

// Mesh Dimensions Folder
const meshFolder = gui.addFolder('Mesh Dimensions')
meshFolder.add(params, 'meshWidth', 5, 30, 0.5).name('Mesh Width').onChange(updateShaderUniforms)
meshFolder.add(params, 'meshHeight', 0.5, 10, 0.1).name('Mesh Height').onChange(updateShaderUniforms)
meshFolder.open()

// Width Variation Folder
const widthFolder = gui.addFolder('Width Variation')
widthFolder.add(params, 'widthVariation', 0, 2, 0.05).name('Variation Strength').onChange(updateShaderUniforms)
widthFolder.add(params, 'widthFrequency', 0.1, 10, 0.1).name('Variation Frequency').onChange(updateShaderUniforms)
widthFolder.add(params, 'widthSpeed', 0, 2, 0.05).name('Animation Speed').onChange(updateShaderUniforms)
widthFolder.add(params, 'widthPattern', 0, 1, 0.05).name('Pattern Type').onChange(updateShaderUniforms)
widthFolder.open()

// Color Settings Folder
const colorFolder = gui.addFolder('Gradient Colors')
colorFolder.add(params, 'colorStops', 1, 7, 1).name('Color Stops').onChange(() => {
    updateShaderUniforms()
    const activeColors = [
        params.color1,
        params.color2,
        params.color3,
        params.color4,
        params.color5,
        params.color6,
        params.color7
    ].map(color => new THREE.Color(color))
    waveMaterial.uniforms.uColors.value = activeColors
})
colorFolder.addColor(params, 'color1').name('Color 1').onChange(() => {
    waveMaterial.uniforms.uColors.value[0] = new THREE.Color(params.color1)
})
colorFolder.addColor(params, 'color2').name('Color 2').onChange(() => {
    waveMaterial.uniforms.uColors.value[1] = new THREE.Color(params.color2)
})
colorFolder.addColor(params, 'color3').name('Color 3').onChange(() => {
    waveMaterial.uniforms.uColors.value[2] = new THREE.Color(params.color3)
})
colorFolder.addColor(params, 'color4').name('Color 4').onChange(() => {
    waveMaterial.uniforms.uColors.value[3] = new THREE.Color(params.color4)
})
colorFolder.addColor(params, 'color5').name('Color 5').onChange(() => {
    waveMaterial.uniforms.uColors.value[4] = new THREE.Color(params.color5)
})
colorFolder.addColor(params, 'color6').name('Color 6').onChange(() => {
    waveMaterial.uniforms.uColors.value[5] = new THREE.Color(params.color6)
})
colorFolder.addColor(params, 'color7').name('Color 7').onChange(() => {
    waveMaterial.uniforms.uColors.value[6] = new THREE.Color(params.color7)
})
colorFolder.open()

// Edge Fade Settings Folder
const fadeFolder = gui.addFolder('Edge Fade')
fadeFolder.add(params, 'fadeWidth', 0, 0.5, 0.01).name('Fade Width').onChange(() => {
    edgeFadePass.uniforms.fadeWidth.value = params.fadeWidth
})
fadeFolder.add(params, 'fadeStrength', 0, 1, 0.05).name('Fade Strength').onChange(() => {
    edgeFadePass.uniforms.fadeStrength.value = params.fadeStrength
})
fadeFolder.open()

//===================== RENDERER =====================//
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
})
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(window.devicePixelRatio)

//===================== POST-PROCESSING =====================//
const composer = new EffectComposer(renderer)

// Render pass - renders the scene
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

// Edge fade pass - fades left and right edges
const edgeFadePass = new ShaderPass(EdgeFadeShader)
edgeFadePass.uniforms.backgroundColor.value = scene.background
composer.addPass(edgeFadePass)

// Update composer size
composer.setSize(sizes.width, sizes.height)

//===================== ANIMATE =====================//
const clock = new THREE.Clock()

const tick = () =>
{
    statsFPS.begin()
    statsMS.begin()
    statsMB.begin()
    
    const elapsedTime = clock.getElapsedTime()

    // Update shader time uniform
    if (waveMaterial) {
        waveMaterial.uniforms.uTime.value = elapsedTime
    }

    // Update controls
    controls.update()

    // Render
    composer.render()
    
    statsFPS.end()
    statsMS.end()
    statsMB.end()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
