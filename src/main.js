import './style.css';
import * as THREE from 'three';
import { GUI } from 'lil-gui';
import Stats from 'stats.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { EdgeFadeShader } from './edgeFade.js';
import { Wave } from './wave.js';
import { ParticleNetwork } from './particleNetwork.js';
import { SpectrumBars } from './spectrumBars.js';
import { FloatingNumbers } from './floatingNumbers.js';

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
      // Visibility controls
      waveVisible: true,
      particleNetworkVisible: true,
      spectrumBarsVisible: true,
      floatingNumbersVisible: true,

      lineCount: 60,
      pointsPerLine: 7,
      lineWidth: 0.3,
      opacity: 0.7,

      waveAmplitude: 0,
      waveFrequency: 0,
      waveSpeed: 0,

      twistAmount: 5,
      twistFrequency: 0.7,
      twistSpeed: 0.05,
      twistStagger: 0.2,

      meshWidth: 25,
      meshHeight: 8,

      color1: '#9d00ff',
      color2: '#bf94ff',
      color3: '#67a8fe',
      color4: '#52b7ff',
      color5: '#76dafe',
      color6: '#5cffb3',
      color7: '#00ddff',
      colorStops: 7,

      fadeWidth: 0.2,
      fadeStrength: 1,
      fadeWidthY: 0.3,
      fadeStrengthY: 1,

      // Particle Network params
      particleCount: 50,
      particleSize: 0.07,
      particleLineWidth: 2.0, // Line2 uses pixel width
      particleOpacity: 0.9,
      movementSpeed: 0.1,
      movementRange: 1.0,
      particleSpreadWidth: 0.8, // Multiplier for particle spread (0.3-2.0)
      particleSpreadHeight: 1.0, // Multiplier for particle spread height (0.3-2.0)
      particleSpreadDepth: 5, // Z-axis spread depth
      particleScaleRange: 0.5, // Depth-based scale variation (0 = no variation, 1 = full variation)
      maxConnectionDistance: 2.0,
      particleSeed: 42857, // Seed for random generation

      // Spectrum Bars params
      spectrumBarCount: 120,
      spectrumBarGap: 0.0,
      spectrumBaseHeight: 1,
      spectrumMaxHeight: 5,
      spectrumSpeed: 0.5,
      spectrumSmoothness: 0.3,
      spectrumOpacity: 0.95,
      spectrumFadeStart: 0.5,
      spectrumFadeEnd: 0.2,
      spectrumPositionY: -3,

      // Floating Numbers params
      floatingNumberCount: 15,
      floatingNumberFontSize: 24,
      floatingNumberOpacity: 1,
      floatingNumberSpeed: 5,
      floatingNumberSpeedVariation: 0.5,
      floatingNumberMinSpacing: 2,
      floatingNumberValueChangeInterval: 0.05,
      floatingNumberDigitGap: -0.1,
      floatingNumberSeed: 98765,
    };

    // Cache active colors to avoid repeated creation
    this.cachedActiveColors = null;

    // Helper to get active colors as THREE.Color array
    this.getActiveColors = () => {
      if (!this.cachedActiveColors) {
        this.cachedActiveColors = [
          new THREE.Color(this.params.color1),
          new THREE.Color(this.params.color2),
          new THREE.Color(this.params.color3),
          new THREE.Color(this.params.color4),
          new THREE.Color(this.params.color5),
          new THREE.Color(this.params.color6),
          new THREE.Color(this.params.color7),
        ];
      }
      return this.cachedActiveColors;
    };

    // Helper to update a single color in the cache
    this.updateCachedColor = index => {
      if (this.cachedActiveColors) {
        this.cachedActiveColors[index].set(this.params[`color${index + 1}`]);
      }
    };

    // Helper to invalidate color cache
    this.invalidateColorCache = () => {
      this.cachedActiveColors = null;
    };

    this.wave = new Wave(this.params);
    this.wave.mesh.visible = this.params.waveVisible;
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
      boundsX: this.params.meshWidth * this.params.particleSpreadWidth,
      boundsY: this.params.meshHeight * this.params.particleSpreadHeight,
      boundsZ: this.params.particleSpreadDepth,
      scaleRange: this.params.particleScaleRange,
      maxConnectionDistance: this.params.maxConnectionDistance,
      seed: this.params.particleSeed,
    });
    this.particleNetwork.getGroup().visible = this.params.particleNetworkVisible;
    this.scene.add(this.particleNetwork.getGroup());

    // Initialize spectrum bars
    this.spectrumBars = new SpectrumBars({
      barCount: this.params.spectrumBarCount,
      barGap: this.params.spectrumBarGap,
      totalWidth: this.params.meshWidth,
      colors: this.getActiveColors(),
      colorStops: this.params.colorStops,
      baseHeight: this.params.spectrumBaseHeight,
      maxHeight: this.params.spectrumMaxHeight,
      speed: this.params.spectrumSpeed,
      smoothness: this.params.spectrumSmoothness,
      opacity: this.params.spectrumOpacity,
      fadeStart: this.params.spectrumFadeStart,
      fadeEnd: this.params.spectrumFadeEnd,
    });
    this.spectrumBars.mesh.position.y = this.params.spectrumPositionY;
    this.spectrumBars.mesh.position.z = -10; // Position far behind particle network
    this.spectrumBars.mesh.visible = this.params.spectrumBarsVisible;
    this.scene.add(this.spectrumBars.mesh);

    // Initialize floating numbers (works together with particle network)
    this.floatingNumbers = new FloatingNumbers({
      numberCount: this.params.floatingNumberCount,
      fontSize: this.params.floatingNumberFontSize,
      colors: this.getActiveColors(),
      colorStops: this.params.colorStops,
      opacity: this.params.floatingNumberOpacity,
      speed: this.params.floatingNumberSpeed,
      speedVariation: this.params.floatingNumberSpeedVariation,
      boundsX: this.params.meshWidth * this.params.particleSpreadWidth,
      boundsY: this.params.meshHeight * this.params.particleSpreadHeight,
      minSpacing: this.params.floatingNumberMinSpacing,
      valueChangeInterval: this.params.floatingNumberValueChangeInterval,
      digitGap: this.params.floatingNumberDigitGap,
      seed: this.params.floatingNumberSeed,
      zPosition: -2.5, // Positioned near particle network
    });
    this.floatingNumbers.getGroup().visible = this.params.floatingNumbersVisible;
    this.scene.add(this.floatingNumbers.getGroup());

    this.setupStats();
    this.setupCamera();
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
  }

  setupCamera() {
    const aspect = this.sizes.width / this.sizes.height;
    const frustumSize = 12;
    this.camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 6);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // TAA handles antialiasing
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false, // Disable stencil buffer if not needed
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  setupComposer() {
    this.composer = new EffectComposer(this.renderer);

    // TAA (Temporal Anti-Aliasing) pass with 2 samples, no jitter
    this.taaPass = new TAARenderPass(this.scene, this.camera);
    this.taaPass.sampleLevel = 2; // Use 2 samples
    this.taaPass.unbiased = true; // Disable jitter (no camera movement)
    this.composer.addPass(this.taaPass);

    // Edge fade pass
    this.edgeFadePass = new ShaderPass(EdgeFadeShader);
    this.edgeFadePass.uniforms.fadeWidth.value = this.params.fadeWidth;
    this.edgeFadePass.uniforms.fadeStrength.value = this.params.fadeStrength;
    this.edgeFadePass.uniforms.fadeWidthY.value = this.params.fadeWidthY;
    this.edgeFadePass.uniforms.fadeStrengthY.value = this.params.fadeStrengthY;
    this.edgeFadePass.uniforms.backgroundColor.value = this.scene.background;
    this.edgeFadePass.renderToScreen = true; // Final pass renders to screen
    this.composer.addPass(this.edgeFadePass);

    this.composer.setSize(this.sizes.width, this.sizes.height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  setupGUI() {
    this.gui = new GUI();

    // Visibility Controls - Open by default
    const visibilityFolder = this.gui.addFolder('👁️ Visibility');
    visibilityFolder
      .add(this.params, 'waveVisible')
      .name('Wave')
      .onChange(visible => {
        this.wave.mesh.visible = visible;
      });
    visibilityFolder
      .add(this.params, 'particleNetworkVisible')
      .name('Particle Network')
      .onChange(visible => {
        this.particleNetwork.getGroup().visible = visible;
      });
    visibilityFolder
      .add(this.params, 'spectrumBarsVisible')
      .name('Spectrum Bars')
      .onChange(visible => {
        this.spectrumBars.mesh.visible = visible;
      });
    visibilityFolder
      .add(this.params, 'floatingNumbersVisible')
      .name('Floating Numbers')
      .onChange(visible => {
        this.floatingNumbers.getGroup().visible = visible;
      });
    visibilityFolder.open();

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
            // Revoke the URL immediately after use to prevent memory leak
            setTimeout(() => URL.revokeObjectURL(url), 100);
          },
        },
        'exportJSON'
      )
      .name('💾 Download Settings JSON');
    settingsFolder.close();

    const lineFolder = this.gui.addFolder('Line Settings');
    lineFolder
      .add(this.params, 'lineCount', 20, 200, 1)
      .name('Line Count')
      .onChange(() => {
        const oldMesh = this.wave.mesh;
        this.wave.createMesh();
        this.scene.remove(oldMesh);
        this.scene.add(this.wave.mesh);
      });
    lineFolder
      .add(this.params, 'pointsPerLine', 5, 500, 1)
      .name('Points Per Line')
      .onChange(() => {
        const oldMesh = this.wave.mesh;
        this.wave.createMesh();
        this.scene.remove(oldMesh);
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
    lineFolder.close();

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
    waveFolder.close();

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
    twistFolder
      .add(this.params, 'twistStagger', 0, 20, 0.1)
      .name('Twist Stagger')
      .onChange(() => this.wave.updateUniforms());
    twistFolder.close();

    const meshFolder = this.gui.addFolder('Mesh Dimensions');
    meshFolder
      .add(this.params, 'meshWidth', 5, 30, 0.5)
      .name('Mesh Width')
      .onChange(() => {
        this.wave.updateUniforms();
        // Update spectrum bars totalWidth and recreate
        this.spectrumBars.setParams({ totalWidth: this.params.meshWidth });
        const oldMesh = this.spectrumBars.recreateMesh();
        this.scene.remove(oldMesh);
        this.scene.add(this.spectrumBars.mesh);
      });
    meshFolder
      .add(this.params, 'meshHeight', 0.5, 10, 0.1)
      .name('Mesh Height')
      .onChange(() => this.wave.updateUniforms());
    meshFolder.close();

    const colorFolder = this.gui.addFolder('Gradient Colors');
    colorFolder
      .add(this.params, 'colorStops', 1, 7, 1)
      .name('Color Stops')
      .onChange(() => {
        this.wave.updateUniforms();
        this.wave.updateColors();
        this.invalidateColorCache();
        // Update particle network colors
        this.particleNetwork.updateParams({
          colors: this.getActiveColors(),
          colorStops: this.params.colorStops,
        });
        // Update spectrum bars colors
        this.spectrumBars.setParams({
          colors: this.getActiveColors(),
          colorStops: this.params.colorStops,
        });
        // Update floating numbers colors
        this.floatingNumbers.updateColors(this.getActiveColors(), this.params.colorStops);
      });

    // Create color controllers using a loop to reduce redundancy
    for (let i = 1; i <= 7; i++) {
      colorFolder
        .addColor(this.params, `color${i}`)
        .name(`Color ${i}`)
        .onChange(() => {
          this.updateCachedColor(i - 1);
          this.wave.updateSingleColor(i - 1);
          this.particleNetwork.updateParams({ colors: this.getActiveColors() });
          this.spectrumBars.setParams({ colors: this.getActiveColors() });
          this.floatingNumbers.updateColors(this.getActiveColors(), this.params.colorStops);
        });
    }
    colorFolder.close();

    const fadeFolder = this.gui.addFolder('Edge Fade');
    fadeFolder
      .add(this.params, 'fadeWidth', 0, 0.5, 0.01)
      .name('Fade Width (X)')
      .onChange(() => {
        this.edgeFadePass.uniforms.fadeWidth.value = this.params.fadeWidth;
      });
    fadeFolder
      .add(this.params, 'fadeStrength', 0, 1, 0.05)
      .name('Fade Strength (X)')
      .onChange(() => {
        this.edgeFadePass.uniforms.fadeStrength.value = this.params.fadeStrength;
      });
    fadeFolder
      .add(this.params, 'fadeWidthY', 0, 0.5, 0.01)
      .name('Fade Width (Y)')
      .onChange(() => {
        this.edgeFadePass.uniforms.fadeWidthY.value = this.params.fadeWidthY;
      });
    fadeFolder
      .add(this.params, 'fadeStrengthY', 0, 1, 0.05)
      .name('Fade Strength (Y)')
      .onChange(() => {
        this.edgeFadePass.uniforms.fadeStrengthY.value = this.params.fadeStrengthY;
      });
    fadeFolder.close();

    // Particle Network Controls
    const particleFolder = this.gui.addFolder('Particle Network');

    // Manual seed input
    const seedController = particleFolder
      .add(this.params, 'particleSeed', 0, 999999, 1)
      .name('Seed Number')
      .onChange(seed => {
        this.particleNetwork.params.seed = seed;
        this.particleNetwork.params.colors = this.getActiveColors();
        this.particleNetwork.params.colorStops = this.params.colorStops;
        this.particleNetwork.recreate();
      });

    // Random seed button
    particleFolder
      .add(
        {
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
          },
        },
        'randomSeed'
      )
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
      .add(this.params, 'particleScaleRange', 0, 1, 0.05)
      .name('Depth Scale Variation')
      .onChange(() => {
        this.particleNetwork.params.scaleRange = this.params.particleScaleRange;
      });
    particleFolder
      .add(this.params, 'particleSpreadWidth', 0.1, 2.0, 0.1)
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
    particleFolder.close();

    // Spectrum Bars Controls
    const spectrumFolder = this.gui.addFolder('Spectrum Bars');
    spectrumFolder
      .add(this.params, 'spectrumBarCount', 10, 200, 1)
      .name('Bar Count')
      .onChange(value => {
        this.spectrumBars.setParams({ barCount: value });
        const oldMesh = this.spectrumBars.recreateMesh();
        this.scene.remove(oldMesh);
        this.scene.add(this.spectrumBars.mesh);
      });
    spectrumFolder
      .add(this.params, 'spectrumBarGap', 0.0, 1.0, 0.01)
      .name('Bar Gap')
      .onChange(value => {
        this.spectrumBars.setParams({ barGap: value });
        const oldMesh = this.spectrumBars.recreateMesh();
        this.scene.remove(oldMesh);
        this.scene.add(this.spectrumBars.mesh);
      });
    spectrumFolder
      .add(this.params, 'spectrumPositionY', -10, 10, 0.1)
      .name('Position Y')
      .onChange(value => {
        this.spectrumBars.mesh.position.y = value;
      });
    spectrumFolder
      .add(this.params, 'spectrumBaseHeight', 0, 2.0, 0.1)
      .name('Base Height')
      .onChange(value => {
        this.spectrumBars.setParams({ baseHeight: value });
      });
    spectrumFolder
      .add(this.params, 'spectrumMaxHeight', 1.0, 10.0, 0.1)
      .name('Max Height')
      .onChange(value => {
        this.spectrumBars.setParams({ maxHeight: value });
      });
    spectrumFolder
      .add(this.params, 'spectrumSpeed', 0.1, 5.0, 0.01)
      .name('Speed')
      .onChange(value => {
        this.spectrumBars.setParams({ speed: value });
      });
    spectrumFolder
      .add(this.params, 'spectrumSmoothness', 0, 1.0, 0.01)
      .name('Smoothness')
      .onChange(value => {
        this.spectrumBars.setParams({ smoothness: value });
      });
    spectrumFolder
      .add(this.params, 'spectrumOpacity', 0, 1.0, 0.01)
      .name('Opacity')
      .onChange(value => {
        this.spectrumBars.setParams({ opacity: value });
      });
    spectrumFolder
      .add(this.params, 'spectrumFadeStart', 0, 1.0, 0.01)
      .name('Fade Start')
      .onChange(value => {
        this.spectrumBars.setParams({ fadeStart: value });
      });
    spectrumFolder
      .add(this.params, 'spectrumFadeEnd', 0, 1.0, 0.01)
      .name('Fade End')
      .onChange(value => {
        this.spectrumBars.setParams({ fadeEnd: value });
      });
    spectrumFolder.close();

    // Floating Numbers Controls
    const floatingNumbersFolder = this.gui.addFolder('Floating Numbers');

    // Seed control with random button
    const floatingSeedController = floatingNumbersFolder
      .add(this.params, 'floatingNumberSeed', 0, 999999, 1)
      .name('Seed Number')
      .onChange(seed => {
        this.floatingNumbers.params.seed = seed;
        this.floatingNumbers.params.colors = this.getActiveColors();
        this.floatingNumbers.params.colorStops = this.params.colorStops;
        this.floatingNumbers.recreate();
      });

    floatingNumbersFolder
      .add(
        {
          randomSeed: () => {
            const newSeed = Math.floor(Math.random() * 999999);
            this.params.floatingNumberSeed = newSeed;
            floatingSeedController.updateDisplay();
            this.floatingNumbers.params.seed = newSeed;
            this.floatingNumbers.params.colors = this.getActiveColors();
            this.floatingNumbers.params.colorStops = this.params.colorStops;
            this.floatingNumbers.recreate();
          },
        },
        'randomSeed'
      )
      .name('🎲 Random Seed');

    floatingNumbersFolder
      .add(this.params, 'floatingNumberCount', 10, 50, 1)
      .name('Number Count')
      .onChange(value => {
        this.floatingNumbers.params.numberCount = value;
        this.floatingNumbers.params.colors = this.getActiveColors();
        this.floatingNumbers.params.colorStops = this.params.colorStops;
        this.floatingNumbers.recreate();
      });

    floatingNumbersFolder
      .add(this.params, 'floatingNumberFontSize', 8, 48, 1)
      .name('Font Size')
      .onChange(value => {
        this.floatingNumbers.params.fontSize = value;
        this.floatingNumbers.params.colors = this.getActiveColors();
        this.floatingNumbers.params.colorStops = this.params.colorStops;
        this.floatingNumbers.recreate();
      });

    floatingNumbersFolder
      .add(this.params, 'floatingNumberOpacity', 0.1, 1.0, 0.05)
      .name('Opacity')
      .onChange(value => {
        this.floatingNumbers.setParams({ opacity: value });
        // Update all existing sprites
        for (const num of this.floatingNumbers.numbers) {
          num.sprite.material.opacity = value;
        }
      });

    floatingNumbersFolder
      .add(this.params, 'floatingNumberSpeed', 0.1, 10, 0.1)
      .name('Speed')
      .onChange(value => {
        this.floatingNumbers.setParams({ speed: value });
      });

    floatingNumbersFolder
      .add(this.params, 'floatingNumberSpeedVariation', 0, 1.0, 0.05)
      .name('Speed Variation')
      .onChange(value => {
        this.floatingNumbers.setParams({ speedVariation: value });
      });

    floatingNumbersFolder
      .add(this.params, 'floatingNumberMinSpacing', 0.5, 10.0, 0.1)
      .name('Min Spacing')
      .onChange(value => {
        this.floatingNumbers.setParams({ minSpacing: value });
      });

    floatingNumbersFolder
      .add(this.params, 'floatingNumberValueChangeInterval', 0.01, 1.0, 0.01)
      .name('Value Change Interval')
      .onChange(value => {
        this.floatingNumbers.setParams({ valueChangeInterval: value });
      });

    floatingNumbersFolder
      .add(this.params, 'floatingNumberDigitGap', -0.1, 0.3, 0.01)
      .name('Digit Gap')
      .onChange(value => {
        this.floatingNumbers.params.digitGap = value;
        this.floatingNumbers.params.colors = this.getActiveColors();
        this.floatingNumbers.params.colorStops = this.params.colorStops;
        this.floatingNumbers.recreate();
      });

    floatingNumbersFolder.close();
  }

  setupEventListeners() {
    // Store resize handler to allow removal later
    this.handleResize = () => {
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;

      const aspect = this.sizes.width / this.sizes.height;
      const frustumSize = 10;
      this.camera.left = (frustumSize * aspect) / -2;
      this.camera.right = (frustumSize * aspect) / 2;
      this.camera.top = frustumSize / 2;
      this.camera.bottom = frustumSize / -2;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.sizes.width, this.sizes.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      this.composer.setSize(this.sizes.width, this.sizes.height);

      // Update particle network line resolution
      if (this.particleNetwork) {
        this.particleNetwork.updateResolution(this.sizes.width, this.sizes.height);
      }
    };

    window.addEventListener('resize', this.handleResize);
  }

  animate() {
    this.statsFPS.begin();

    const elapsedTime = this.clock.getElapsedTime();

    // Update shader time uniform
    if (this.wave.material) {
      this.wave.material.uniforms.uTime.value = elapsedTime;
    }

    // Update particle network
    if (this.particleNetwork) {
      this.particleNetwork.update(elapsedTime);
    }

    // Update spectrum bars
    if (this.spectrumBars && this.params.spectrumBarsVisible) {
      this.spectrumBars.update();
    }

    // Update floating numbers
    if (this.floatingNumbers && this.params.floatingNumbersVisible) {
      this.floatingNumbers.update(elapsedTime);
    }

    // Render with TAA
    this.composer.render();

    this.statsFPS.end();

    this.animationFrameId = window.requestAnimationFrame(() => this.animate());
  }

  /**
   * Cleanup method to dispose of all resources and prevent memory leaks
   */
  dispose() {
    // Cancel animation loop
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
    }

    // Remove event listeners
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }

    // Dispose GUI
    if (this.gui) {
      this.gui.destroy();
    }

    // Remove stats
    if (this.statsFPS && this.statsFPS.dom && this.statsFPS.dom.parentElement) {
      this.statsFPS.dom.parentElement.removeChild(this.statsFPS.dom);
    }

    // Dispose wave
    if (this.wave) {
      this.wave.dispose();
    }

    // Dispose particle network
    if (this.particleNetwork) {
      this.particleNetwork.dispose();
    }

    // Dispose spectrum bars
    if (this.spectrumBars) {
      this.spectrumBars.dispose();
    }

    // Dispose floating numbers
    if (this.floatingNumbers) {
      this.floatingNumbers.dispose();
    }

    // Dispose composer and passes
    if (this.composer) {
      this.composer.dispose();
    }

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
    }

    // Clear scene
    if (this.scene) {
      this.scene.clear();
    }

    // Clear cached colors
    this.cachedActiveColors = null;
  }
}

// Initialize the app
new App();
