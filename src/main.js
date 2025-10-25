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

      color1: '#ff0080',
      color2: '#ff8c00',
      color3: '#ffff00',
      color4: '#00ff00',
      color5: '#00ffff',
      color6: '#0080ff',
      color7: '#8000ff',
      colorStops: 7,

      fadeWidth: 0.2,
      fadeStrength: 1.0,
    };

    this.wave = new Wave(this.params);
    this.scene.add(this.wave.mesh);

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
      });
    colorFolder
      .addColor(this.params, 'color1')
      .name('Color 1')
      .onChange(() => this.wave.updateSingleColor(0));
    colorFolder
      .addColor(this.params, 'color2')
      .name('Color 2')
      .onChange(() => this.wave.updateSingleColor(1));
    colorFolder
      .addColor(this.params, 'color3')
      .name('Color 3')
      .onChange(() => this.wave.updateSingleColor(2));
    colorFolder
      .addColor(this.params, 'color4')
      .name('Color 4')
      .onChange(() => this.wave.updateSingleColor(3));
    colorFolder
      .addColor(this.params, 'color5')
      .name('Color 5')
      .onChange(() => this.wave.updateSingleColor(4));
    colorFolder
      .addColor(this.params, 'color6')
      .name('Color 6')
      .onChange(() => this.wave.updateSingleColor(5));
    colorFolder
      .addColor(this.params, 'color7')
      .name('Color 7')
      .onChange(() => this.wave.updateSingleColor(6));
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
    });
  }

  animate() {
    this.statsFPS.begin();
    this.statsMS.begin();
    this.statsMB.begin();

    const elapsedTime = this.clock.getElapsedTime();
    if (this.wave.material) WaveShader.uniforms.uTime.value = elapsedTime;

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
