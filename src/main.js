import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'lil-gui';
import Stats from 'stats.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { EdgeFadeShader } from './edgeFade.js';
import { WaveShader } from './waveShader.js';
import { ParticleNetwork } from './ParticleNetwork.js';

class Wave {
  constructor(params) {
    this.params = params;
    this.material = null;
    this.mesh = null;
    this.createMesh();
  }

  createMesh() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      // Note: scene.remove is handled by the caller
    }

    const activeColors = [
      this.params.color1,
      this.params.color2,
      this.params.color3,
      this.params.color4,
      this.params.color5,
      this.params.color6,
      this.params.color7,
    ].map(color => new THREE.Color(color));

    const geometry = new THREE.PlaneGeometry(1, 1, this.params.pointsPerLine - 1, this.params.lineCount - 1);

    // Update WaveShader uniforms with current params
    WaveShader.uniforms.uLineCount.value = this.params.lineCount;
    WaveShader.uniforms.uLineWidth.value = this.params.lineWidth;
    WaveShader.uniforms.uOpacity.value = this.params.opacity;
    WaveShader.uniforms.uWaveAmplitude.value = this.params.waveAmplitude;
    WaveShader.uniforms.uWaveFrequency.value = this.params.waveFrequency;
    WaveShader.uniforms.uWaveSpeed.value = this.params.waveSpeed;
    WaveShader.uniforms.uTwistAmount.value = this.params.twistAmount;
    WaveShader.uniforms.uTwistFrequency.value = this.params.twistFrequency;
    WaveShader.uniforms.uTwistSpeed.value = this.params.twistSpeed;
    WaveShader.uniforms.uMeshWidth.value = this.params.meshWidth;
    WaveShader.uniforms.uMeshHeight.value = this.params.meshHeight;
    WaveShader.uniforms.uWidthVariation.value = this.params.widthVariation;
    WaveShader.uniforms.uWidthFrequency.value = this.params.widthFrequency;
    WaveShader.uniforms.uWidthSpeed.value = this.params.widthSpeed;
    WaveShader.uniforms.uWidthPattern.value = this.params.widthPattern;
    WaveShader.uniforms.uColors.value = activeColors;
    WaveShader.uniforms.uColorStops.value = this.params.colorStops;

    this.material = new THREE.ShaderMaterial({
      vertexShader: WaveShader.vertexShader,
      fragmentShader: WaveShader.fragmentShader,
      uniforms: WaveShader.uniforms,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  updateUniforms() {
    if (!this.material) return;

    WaveShader.uniforms.uLineCount.value = this.params.lineCount;
    WaveShader.uniforms.uLineWidth.value = this.params.lineWidth;
    WaveShader.uniforms.uOpacity.value = this.params.opacity;
    WaveShader.uniforms.uWaveAmplitude.value = this.params.waveAmplitude;
    WaveShader.uniforms.uWaveFrequency.value = this.params.waveFrequency;
    WaveShader.uniforms.uWaveSpeed.value = this.params.waveSpeed;
    WaveShader.uniforms.uTwistAmount.value = this.params.twistAmount;
    WaveShader.uniforms.uTwistFrequency.value = this.params.twistFrequency;
    WaveShader.uniforms.uTwistSpeed.value = this.params.twistSpeed;
    WaveShader.uniforms.uMeshWidth.value = this.params.meshWidth;
    WaveShader.uniforms.uMeshHeight.value = this.params.meshHeight;
    WaveShader.uniforms.uWidthVariation.value = this.params.widthVariation;
    WaveShader.uniforms.uWidthFrequency.value = this.params.widthFrequency;
    WaveShader.uniforms.uWidthSpeed.value = this.params.widthSpeed;
    WaveShader.uniforms.uWidthPattern.value = this.params.widthPattern;
    WaveShader.uniforms.uColorStops.value = this.params.colorStops;
  }

  updateColors() {
    const activeColors = [
      this.params.color1,
      this.params.color2,
      this.params.color3,
      this.params.color4,
      this.params.color5,
      this.params.color6,
      this.params.color7,
    ].map(color => new THREE.Color(color));
    WaveShader.uniforms.uColors.value = activeColors;
  }

  updateSingleColor(index) {
    WaveShader.uniforms.uColors.value[index] = new THREE.Color(this.params[`color${index + 1}`]);
  }
}

class App {
  constructor() {
    this.canvas = document.querySelector('#webgl');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.params = {
      lineCount: 50,
      pointsPerLine: 100,
      lineWidth: 0.3,
      opacity: 0.7,

      waveAmplitude: 1.5,
      waveFrequency: 3,
      waveSpeed: 0.3,

      twistAmount: 5,
      twistFrequency: 1,
      twistSpeed: 0.15,

      meshWidth: 25,
      meshHeight: 3,

      widthVariation: 0.5,
      widthFrequency: 5.0,
      widthSpeed: 0.2,
      widthPattern: 0.5,

      color1: '#9d00ff',
      color2: '#bf94ff',
      color3: '#67a8fe',
      color4: '#52b7ff',
      color5: '#76dafe',
      color6: '#5cffb3',
      color7: '#00ddff',
      colorStops: 7,

      fadeWidth: 0.2,
      fadeStrength: 1.0,

      // Particle Network params
      particleCount: 50,
      particleSize: 0.07,
      particleLineWidth: 2.0, // Line2 uses pixel width
      particleOpacity: 0.9,
      movementSpeed: 0.1,
      movementRange: 1.0,
      particleZPosition: -3.0,
      particleSpreadWidth: 1.2, // Multiplier for particle spread (0.3-2.0)
      particleSpreadHeight: 1.0, // Multiplier for particle spread height (0.3-2.0)
      particleSpreadDepth: 5, // Z-axis spread depth
      maxConnectionDistance: 2.0,
      particleSeed: 42857, // Seed for random generation
    };

    // Helper to get active colors as THREE.Color array
    this.getActiveColors = () => {
      return [
        this.params.color1,
        this.params.color2,
        this.params.color3,
        this.params.color4,
        this.params.color5,
        this.params.color6,
        this.params.color7,
      ].map(color => new THREE.Color(color));
    };

    this.wave = new Wave(this.params);
    this.scene.add(this.wave.mesh);

    // Initialize particle network
    this.particleNetwork = new ParticleNetwork({
      particleCount: this.params.particleCount,
      particleSize: this.params.particleSize,
      lineWidth: this.params.particleLineWidth,
      opacity: this.params.particleOpacity,
      colors: this.getActiveColors(),
      colorStops: this.params.colorStops,
      movementSpeed: this.params.movementSpeed,
      movementRange: this.params.movementRange,
      zPosition: this.params.particleZPosition,
      boundsX: this.params.meshWidth * this.params.particleSpreadWidth,
      boundsY: this.params.meshHeight * this.params.particleSpreadHeight,
      boundsZ: this.params.particleSpreadDepth,
      maxConnectionDistance: this.params.maxConnectionDistance,
      seed: this.params.particleSeed,
    });
    this.scene.add(this.particleNetwork.getGroup());

    this.setupStats();
    this.setupCamera();
    this.setupControls();
    this.setupRenderer();
    this.setupComposer();
    this.setupGUI();
    this.setupEventListeners();

    this.clock = new THREE.Clock();
    this.animate();
  }

  setupStats() {
    this.statsFPS = new Stats();
    this.statsFPS.showPanel(0);
    document.body.appendChild(this.statsFPS.dom);
    this.statsFPS.dom.style.position = 'absolute';
    this.statsFPS.dom.style.left = '0px';
    this.statsFPS.dom.style.top = '0px';

    this.statsMS = new Stats();
    this.statsMS.showPanel(1);
    document.body.appendChild(this.statsMS.dom);
    this.statsMS.dom.style.position = 'absolute';
    this.statsMS.dom.style.left = '0px';
    this.statsMS.dom.style.top = '48px';

    this.statsMB = new Stats();
    this.statsMB.showPanel(2);
    document.body.appendChild(this.statsMB.dom);
    this.statsMB.dom.style.position = 'absolute';
    this.statsMB.dom.style.left = '0px';
    this.statsMB.dom.style.top = '96px';
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 100);
    this.camera.position.set(0, 0, 6);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  setupComposer() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.edgeFadePass = new ShaderPass(EdgeFadeShader);
    this.edgeFadePass.uniforms.backgroundColor.value = this.scene.background;
    this.composer.addPass(this.edgeFadePass);
    this.composer.setSize(this.sizes.width, this.sizes.height);
  }

  setupGUI() {
    this.gui = new GUI();

    const settingsFolder = this.gui.addFolder('Settings Export/Import');
    settingsFolder
      .add(
        {
          exportJSON: () => {
            const settingsJSON = JSON.stringify(this.params, null, 2);
            const blob = new Blob([settingsJSON], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wave-settings.json';
            a.click();
            URL.revokeObjectURL(url);
          },
        },
        'exportJSON'
      )
      .name('💾 Download Settings JSON');
    settingsFolder.open();

    const lineFolder = this.gui.addFolder('Line Settings');
    lineFolder
      .add(this.params, 'lineCount', 20, 200, 1)
      .name('Line Count')
      .onChange(() => {
        this.scene.remove(this.wave.mesh);
        this.wave.createMesh();
        this.scene.add(this.wave.mesh);
      });
    lineFolder
      .add(this.params, 'pointsPerLine', 50, 500, 10)
      .name('Points Per Line')
      .onChange(() => {
        this.scene.remove(this.wave.mesh);
        this.wave.createMesh();
        this.scene.add(this.wave.mesh);
      });
    lineFolder
      .add(this.params, 'lineWidth', 0.1, 1, 0.01)
      .name('Line Width')
      .onChange(() => this.wave.updateUniforms());
    lineFolder
      .add(this.params, 'opacity', 0.1, 1, 0.05)
      .name('Opacity')
      .onChange(() => this.wave.updateUniforms());
    lineFolder.open();

    const waveFolder = this.gui.addFolder('Wave Settings');
    waveFolder
      .add(this.params, 'waveAmplitude', 0, 3, 0.1)
      .name('Wave Amplitude')
      .onChange(() => this.wave.updateUniforms());
    waveFolder
      .add(this.params, 'waveFrequency', 0.1, 5, 0.1)
      .name('Wave Frequency')
      .onChange(() => this.wave.updateUniforms());
    waveFolder
      .add(this.params, 'waveSpeed', 0, 2, 0.05)
      .name('Wave Speed')
      .onChange(() => this.wave.updateUniforms());
    waveFolder.open();

    const twistFolder = this.gui.addFolder('Twist Settings');
    twistFolder
      .add(this.params, 'twistAmount', 0, 10, 0.1)
      .name('Twist Amount')
      .onChange(() => this.wave.updateUniforms());
    twistFolder
      .add(this.params, 'twistFrequency', 0.1, 3, 0.1)
      .name('Twist Frequency')
      .onChange(() => this.wave.updateUniforms());
    twistFolder
      .add(this.params, 'twistSpeed', 0, 2, 0.05)
      .name('Twist Speed')
      .onChange(() => this.wave.updateUniforms());
    twistFolder.open();

    const meshFolder = this.gui.addFolder('Mesh Dimensions');
    meshFolder
      .add(this.params, 'meshWidth', 5, 30, 0.5)
      .name('Mesh Width')
      .onChange(() => this.wave.updateUniforms());
    meshFolder
      .add(this.params, 'meshHeight', 0.5, 10, 0.1)
      .name('Mesh Height')
      .onChange(() => this.wave.updateUniforms());
    meshFolder.open();

    const widthFolder = this.gui.addFolder('Width Variation');
    widthFolder
      .add(this.params, 'widthVariation', 0, 2, 0.05)
      .name('Variation Strength')
      .onChange(() => this.wave.updateUniforms());
    widthFolder
      .add(this.params, 'widthFrequency', 0.1, 10, 0.1)
      .name('Variation Frequency')
      .onChange(() => this.wave.updateUniforms());
    widthFolder
      .add(this.params, 'widthSpeed', 0, 2, 0.05)
      .name('Animation Speed')
      .onChange(() => this.wave.updateUniforms());
    widthFolder
      .add(this.params, 'widthPattern', 0, 1, 0.05)
      .name('Pattern Type')
      .onChange(() => this.wave.updateUniforms());
    widthFolder.open();

    const colorFolder = this.gui.addFolder('Gradient Colors');
    colorFolder
      .add(this.params, 'colorStops', 1, 7, 1)
      .name('Color Stops')
      .onChange(() => {
        this.wave.updateUniforms();
        this.wave.updateColors();
        // Update particle network colors
        this.particleNetwork.updateParams({
          colors: this.getActiveColors(),
          colorStops: this.params.colorStops,
        });
      });
    colorFolder
      .addColor(this.params, 'color1')
      .name('Color 1')
      .onChange(() => {
        this.wave.updateSingleColor(0);
        this.particleNetwork.updateParams({ colors: this.getActiveColors() });
      });
    colorFolder
      .addColor(this.params, 'color2')
      .name('Color 2')
      .onChange(() => {
        this.wave.updateSingleColor(1);
        this.particleNetwork.updateParams({ colors: this.getActiveColors() });
      });
    colorFolder
      .addColor(this.params, 'color3')
      .name('Color 3')
      .onChange(() => {
        this.wave.updateSingleColor(2);
        this.particleNetwork.updateParams({ colors: this.getActiveColors() });
      });
    colorFolder
      .addColor(this.params, 'color4')
      .name('Color 4')
      .onChange(() => {
        this.wave.updateSingleColor(3);
        this.particleNetwork.updateParams({ colors: this.getActiveColors() });
      });
    colorFolder
      .addColor(this.params, 'color5')
      .name('Color 5')
      .onChange(() => {
        this.wave.updateSingleColor(4);
        this.particleNetwork.updateParams({ colors: this.getActiveColors() });
      });
    colorFolder
      .addColor(this.params, 'color6')
      .name('Color 6')
      .onChange(() => {
        this.wave.updateSingleColor(5);
        this.particleNetwork.updateParams({ colors: this.getActiveColors() });
      });
    colorFolder
      .addColor(this.params, 'color7')
      .name('Color 7')
      .onChange(() => {
        this.wave.updateSingleColor(6);
        this.particleNetwork.updateParams({ colors: this.getActiveColors() });
      });
    colorFolder.open();

    const fadeFolder = this.gui.addFolder('Edge Fade');
    fadeFolder
      .add(this.params, 'fadeWidth', 0, 0.5, 0.01)
      .name('Fade Width')
      .onChange(() => {
        this.edgeFadePass.uniforms.fadeWidth.value = this.params.fadeWidth;
      });
    fadeFolder
      .add(this.params, 'fadeStrength', 0, 1, 0.05)
      .name('Fade Strength')
      .onChange(() => {
        this.edgeFadePass.uniforms.fadeStrength.value = this.params.fadeStrength;
      });
    fadeFolder.open();

    // Particle Network Controls
    const particleFolder = this.gui.addFolder('Particle Network');

    // Manual seed input
    const seedController = particleFolder
      .add(this.params, 'particleSeed', 0, 999999, 1)
      .name('Seed Number')
      .onChange((seed) => {
        this.particleNetwork.params.seed = seed;
        this.particleNetwork.params.colors = this.getActiveColors();
        this.particleNetwork.params.colorStops = this.params.colorStops;
        this.particleNetwork.recreate();
      });

    // Random seed button
    particleFolder
      .add({
        randomSeed: () => {
          // Generate new random seed
          const newSeed = Math.floor(Math.random() * 999999);
          this.params.particleSeed = newSeed;

          // Update the GUI controller to show new value
          seedController.updateDisplay();

          // Apply the new seed
          this.particleNetwork.params.seed = newSeed;
          this.particleNetwork.params.colors = this.getActiveColors();
          this.particleNetwork.params.colorStops = this.params.colorStops;
          this.particleNetwork.recreate();
        }
      }, 'randomSeed')
      .name('🎲 Random Seed');

    particleFolder
      .add(this.params, 'particleCount', 20, 200, 1)
      .name('Particle Count')
      .onChange(() => {
        this.particleNetwork.params.particleCount = this.params.particleCount;
        this.particleNetwork.params.colors = this.getActiveColors();
        this.particleNetwork.params.colorStops = this.params.colorStops;
        this.particleNetwork.recreate();
      });
    particleFolder
      .add(this.params, 'particleSize', 0.01, 0.2, 0.01)
      .name('Particle Size')
      .onChange(() => {
        this.particleNetwork.params.particleSize = this.params.particleSize;
        this.particleNetwork.params.colors = this.getActiveColors();
        this.particleNetwork.params.colorStops = this.params.colorStops;
        this.particleNetwork.recreate();
      });
    particleFolder
      .add(this.params, 'particleLineWidth', 0.1, 10, 0.1)
      .name('Line Width (px)')
      .onChange(() => {
        this.particleNetwork.updateParams({ lineWidth: this.params.particleLineWidth });
      });
    particleFolder
      .add(this.params, 'particleOpacity', 0.1, 1, 0.05)
      .name('Opacity')
      .onChange(() => {
        this.particleNetwork.updateParams({ opacity: this.params.particleOpacity });
      });
    particleFolder
      .add(this.params, 'movementSpeed', 0, 1, 0.05)
      .name('Movement Speed')
      .onChange(() => {
        this.particleNetwork.params.movementSpeed = this.params.movementSpeed;
      });
    particleFolder
      .add(this.params, 'movementRange', 0.1, 5, 0.1)
      .name('Movement Range')
      .onChange(() => {
        this.particleNetwork.params.movementRange = this.params.movementRange;
      });
    particleFolder
      .add(this.params, 'particleZPosition', -10, 0, 0.1)
      .name('Z Position')
      .onChange(() => {
        this.particleNetwork.updateZPosition(this.params.particleZPosition);
      });
    particleFolder
      .add(this.params, 'particleSpreadWidth', 0.3, 2.0, 0.1)
      .name('Spread Width')
      .onChange(() => {
        this.particleNetwork.params.boundsX = this.params.meshWidth * this.params.particleSpreadWidth;
        this.particleNetwork.params.colors = this.getActiveColors();
        this.particleNetwork.params.colorStops = this.params.colorStops;
        this.particleNetwork.recreate();
      });
    particleFolder
      .add(this.params, 'particleSpreadHeight', 0.3, 2.0, 0.1)
      .name('Spread Height')
      .onChange(() => {
        this.particleNetwork.params.boundsY = this.params.meshHeight * this.params.particleSpreadHeight;
        this.particleNetwork.params.colors = this.getActiveColors();
        this.particleNetwork.params.colorStops = this.params.colorStops;
        this.particleNetwork.recreate();
      });
    particleFolder
      .add(this.params, 'particleSpreadDepth', 0, 10.0, 0.1)
      .name('Spread Depth (Z)')
      .onChange(() => {
        this.particleNetwork.params.boundsZ = this.params.particleSpreadDepth;
        this.particleNetwork.params.colors = this.getActiveColors();
        this.particleNetwork.params.colorStops = this.params.colorStops;
        this.particleNetwork.recreate();
      });
    particleFolder
      .add(this.params, 'maxConnectionDistance', 1, 10, 0.1)
      .name('Connection Reach Distance')
      .onChange(() => {
        this.particleNetwork.params.maxConnectionDistance = this.params.maxConnectionDistance;
        this.particleNetwork.params.colors = this.getActiveColors();
        this.particleNetwork.params.colorStops = this.params.colorStops;
        this.particleNetwork.recreate();
      });
    particleFolder.open();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;

      this.camera.aspect = this.sizes.width / this.sizes.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.sizes.width, this.sizes.height);
      this.renderer.setPixelRatio(window.devicePixelRatio);

      this.composer.setSize(this.sizes.width, this.sizes.height);

      // Update particle network line resolution
      if (this.particleNetwork) {
        this.particleNetwork.updateResolution(this.sizes.width, this.sizes.height);
      }
    });
  }

  animate() {
    this.statsFPS.begin();
    this.statsMS.begin();
    this.statsMB.begin();

    const elapsedTime = this.clock.getElapsedTime();

    if (this.wave.material) WaveShader.uniforms.uTime.value = elapsedTime;

    // Update particle network
    if (this.particleNetwork) {
      this.particleNetwork.update(elapsedTime);
    }

    this.controls.update();
    this.composer.render();

    this.statsFPS.end();
    this.statsMS.end();
    this.statsMB.end();

    window.requestAnimationFrame(() => this.animate());
  }
}

// Initialize the app
new App();
