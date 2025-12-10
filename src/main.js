import './style.css';
import * as THREE from 'three';
import Stats from 'stats.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { EdgeFadeShader } from './edgeFade.js';
import { Wave } from './wave.js';
import { ParticleNetwork } from './particleNetwork.js';
import { SpectrumBars } from './spectrumBars.js';
import { FloatingNumbers } from './floatingNumbers.js';
import { defaultParams } from './params.js';
import { setupGUI } from './guiSetup.js';

class App {
  constructor() {
    this.canvas = document.querySelector('#webgl');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.params = { ...defaultParams };

    // Cache active colors to avoid repeated creation
    this.cachedActiveColors = null;

    this.setupColorHelpers();
    this.setupWave();
    this.setupParticleNetwork();
    this.setupSpectrumBars();
    this.setupFloatingNumbers();
    this.setupStats();
    this.setupCamera();
    this.setupRenderer();
    this.setupComposer();
    this.gui = setupGUI(this);
    this.setupEventListeners();

    this.clock = new THREE.Clock();
    this.animate();
  }

  setupColorHelpers() {
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
  }

  setupWave() {
    this.wave = new Wave(this.params);
    this.wave.mesh.visible = this.params.waveVisible;
    this.scene.add(this.wave.mesh);
  }

  setupParticleNetwork() {
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
  }

  setupSpectrumBars() {
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
  }

  setupFloatingNumbers() {
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
