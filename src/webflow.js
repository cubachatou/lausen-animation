import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const EdgeFadeShader = {
  uniforms: {
    tDiffuse: { value: null },
    fadeWidth: { value: 0.15 },
    fadeStrength: { value: 1.0 },
    backgroundColor: { value: new THREE.Color(0xffffff) },
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float fadeWidth;
    uniform float fadeStrength;
    uniform vec3 backgroundColor;
    varying vec2 vUv;

    void main() {
        vec4 texel = texture2D(tDiffuse, vUv);

        float distFromLeft = vUv.x;
        float distFromRight = 1.0 - vUv.x;

        float leftFade = smoothstep(0.0, fadeWidth, distFromLeft);
        float rightFade = smoothstep(0.0, fadeWidth, distFromRight);

        float combinedFade = leftFade * rightFade;

        float finalFade = mix(1.0, combinedFade, fadeStrength);

        vec3 finalColor = mix(backgroundColor, texel.rgb, finalFade);

        gl_FragColor = vec4(finalColor, texel.a);
    }
  `,
};

class App {
  constructor() {
    // Find the container and create canvas inside it
    this.container = document.querySelector('.hero-team-member_image-wrapper');
    if (!this.container) {
      console.error('Container .hero-team-member_image-wrapper not found');
      return;
    }

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'webgl';
    this.container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // Get dimensions from container
    const rect = this.container.getBoundingClientRect();
    this.sizes = {
      width: rect.width || window.innerWidth,
      height: rect.height || window.innerHeight,
    };

    this.params = {
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
      fadeStrength: 1.0,

      particleCount: 50,
      particleSize: 0.07,
      particleLineWidth: 2.0,
      particleOpacity: 0.9,
      movementSpeed: 0.1,
      movementRange: 1.0,
      particleSpreadWidth: 0.8,
      particleSpreadHeight: 1.0,
      particleSpreadDepth: 5,
      particleScaleRange: 0.5,
      maxConnectionDistance: 2.0,
      particleSeed: 42857,
    };

    this.cachedActiveColors = null;

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

    this.updateCachedColor = index => {
      if (this.cachedActiveColors) {
        this.cachedActiveColors[index].set(this.params[`color${index + 1}`]);
      }
    };

    this.invalidateColorCache = () => {
      this.cachedActiveColors = null;
    };

    this.wave = new Wave(this.params);
    this.scene.add(this.wave.mesh);

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
    this.scene.add(this.particleNetwork.getGroup());

    this.setupCamera();
    this.setupRenderer();
    this.setupComposer();
    this.setupGUI();
    this.setupEventListeners();

    this.clock = new THREE.Clock();
    this.animate();

    requestAnimationFrame(() => {
      this.handleResize();
    });
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
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  setupComposer() {
    this.composer = new EffectComposer(this.renderer);

    this.taaPass = new TAARenderPass(this.scene, this.camera);
    this.taaPass.sampleLevel = 2;
    this.taaPass.unbiased = true;
    this.composer.addPass(this.taaPass);

    this.edgeFadePass = new ShaderPass(EdgeFadeShader);
    this.edgeFadePass.uniforms.backgroundColor.value = this.scene.background;
    this.edgeFadePass.renderToScreen = true;
    this.composer.addPass(this.edgeFadePass);

    this.composer.setSize(this.sizes.width, this.sizes.height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  setupGUI() {
    this.gui = new GUI();
    this.gui.hide();

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
            setTimeout(() => URL.revokeObjectURL(url), 100);
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
    twistFolder
      .add(this.params, 'twistStagger', 0, 20, 0.1)
      .name('Twist Stagger')
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
        });
    }
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

    const particleFolder = this.gui.addFolder('Particle Network');

    const seedController = particleFolder
      .add(this.params, 'particleSeed', 0, 999999, 1)
      .name('Seed Number')
      .onChange(seed => {
        this.particleNetwork.params.seed = seed;
        this.particleNetwork.params.colors = this.getActiveColors();
        this.particleNetwork.params.colorStops = this.params.colorStops;
        this.particleNetwork.recreate();
      });

    particleFolder
      .add(
        {
          randomSeed: () => {
            const newSeed = Math.floor(Math.random() * 999999);
            this.params.particleSeed = newSeed;

            seedController.updateDisplay();

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
      .add(this.params, 'particleSpreadWidth', 0.3, 2.0, 0.8)
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
    this.handleResize = () => {
      // Get dimensions from container
      const rect = this.container.getBoundingClientRect();
      this.sizes.width = rect.width || window.innerWidth;
      this.sizes.height = rect.height || window.innerHeight;

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

      if (this.particleNetwork) {
        this.particleNetwork.updateResolution(this.sizes.width, this.sizes.height);
      }
    };

    window.addEventListener('resize', this.handleResize);
  }

  animate() {
    const elapsedTime = this.clock.getElapsedTime();

    if (this.wave.material) {
      this.wave.material.uniforms.uTime.value = elapsedTime;
    }

    if (this.particleNetwork) {
      this.particleNetwork.update(elapsedTime);
    }

    this.composer.render();

    this.animationFrameId = window.requestAnimationFrame(() => this.animate());
  }

  showControls() {
    if (this.gui) {
      this.gui.show();
      this.gui.domElement.style.zIndex = '999999';
    }
  }

  hideControls() {
    if (this.gui) {
      this.gui.hide();
    }
  }

  toggleControls() {
    if (this.gui) {
      if (this.gui._hidden) {
        this.gui.show();
      } else {
        this.gui.hide();
      }
    }
  }

  dispose() {
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
    }

    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }

    if (this.gui) {
      this.gui.destroy();
    }

    if (this.wave) {
      this.wave.dispose();
    }

    if (this.particleNetwork) {
      this.particleNetwork.dispose();
    }

    if (this.composer) {
      this.composer.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.scene) {
      this.scene.clear();
    }

    this.cachedActiveColors = null;
  }
}
class Wave {
  constructor(params) {
    this.params = params;
    this.material = null;
    this.mesh = null;
    this.cachedColors = null;
    this.createMesh();
  }

  createMesh() {
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material) {
        this.mesh.material.dispose();
      }
    }

    this.cachedColors = this.createColorArray();
    const activeColors = this.cachedColors;

    const geometry = new THREE.PlaneGeometry(1, 1, this.params.pointsPerLine - 1, this.params.lineCount - 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vColor;

        uniform float uTime;
        uniform float uWaveAmplitude;
        uniform float uWaveFrequency;
        uniform float uWaveSpeed;
        uniform float uTwistAmount;
        uniform float uTwistFrequency;
        uniform float uTwistSpeed;
        uniform float uTwistStagger;
        uniform float uMeshWidth;
        uniform float uMeshHeight;
        uniform vec3 uColors[7];
        uniform int uColorStops;

        void main() {
            vUv = uv;
            vPosition = position;

            vec3 pos = position;

            float xProgress = uv.x;
            float lineProgress = uv.y;

            pos.x = (xProgress - 0.5) * uMeshWidth;

            float baseY = (lineProgress - 0.5) * uMeshHeight;

            float wave1 = sin(xProgress * 3.14159 * uWaveFrequency + uTime * uWaveSpeed) * uWaveAmplitude;
            float wave2 = sin(xProgress * 3.14159 * uWaveFrequency * 2.3 - uTime * uWaveSpeed * 0.7) * uWaveAmplitude * 0.4;

            float staggerOffset = lineProgress * uTwistStagger;
            float twistAngle = sin(xProgress * 3.14159 * uTwistFrequency + uTime * uTwistSpeed + staggerOffset) * uTwistAmount;

            pos.y = baseY * cos(twistAngle) + wave1 + wave2;
            pos.z = baseY * sin(twistAngle);

            float colorProgress = xProgress;
            vColor = uColors[0];

            if (uColorStops > 1) {
                float colorIndex = colorProgress * float(uColorStops - 1);
                int colorIndexFloor = int(floor(colorIndex));
                int colorIndexCeil = min(colorIndexFloor + 1, uColorStops - 1);
                float colorMix = fract(colorIndex);

                vColor = mix(uColors[colorIndexFloor], uColors[colorIndexCeil], colorMix);
            }

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vColor;

        uniform float uLineCount;
        uniform float uLineWidth;
        uniform float uOpacity;
        uniform float uMeshHeight;

        void main() {
            float lineIndex = vUv.y * uLineCount;
            float lineFract = fract(lineIndex);

            float distToLine = abs(lineFract - 0.5) * 2.0;
            float lineThickness = uLineWidth;

            vec2 fw = fwidth(vUv * uLineCount);
            float derivativeWidth = length(fw);
            float edgeSoftness = max(0.01, derivativeWidth * 2.0);

            float alpha = 1.0 - smoothstep(lineThickness - edgeSoftness, lineThickness + edgeSoftness, distToLine);

            alpha = clamp(alpha, 0.0, 1.0);

            gl_FragColor = vec4(vColor, alpha * uOpacity);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uLineCount: { value: this.params.lineCount },
        uLineWidth: { value: this.params.lineWidth },
        uOpacity: { value: this.params.opacity },
        uWaveAmplitude: { value: this.params.waveAmplitude },
        uWaveFrequency: { value: this.params.waveFrequency },
        uWaveSpeed: { value: this.params.waveSpeed },
        uTwistAmount: { value: this.params.twistAmount },
        uTwistFrequency: { value: this.params.twistFrequency },
        uTwistSpeed: { value: this.params.twistSpeed },
        uTwistStagger: { value: this.params.twistStagger },
        uMeshWidth: { value: this.params.meshWidth },
        uMeshHeight: { value: this.params.meshHeight },
        uColors: { value: activeColors },
        uColorStops: { value: this.params.colorStops },
      },
      transparent: true,
      depthWrite: false,
      toneMapped: true,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  updateUniforms() {
    if (!this.material) return;

    this.material.uniforms.uLineCount.value = this.params.lineCount;
    this.material.uniforms.uLineWidth.value = this.params.lineWidth;
    this.material.uniforms.uOpacity.value = this.params.opacity;
    this.material.uniforms.uWaveAmplitude.value = this.params.waveAmplitude;
    this.material.uniforms.uWaveFrequency.value = this.params.waveFrequency;
    this.material.uniforms.uWaveSpeed.value = this.params.waveSpeed;
    this.material.uniforms.uTwistAmount.value = this.params.twistAmount;
    this.material.uniforms.uTwistFrequency.value = this.params.twistFrequency;
    this.material.uniforms.uTwistSpeed.value = this.params.twistSpeed;
    this.material.uniforms.uTwistStagger.value = this.params.twistStagger;
    this.material.uniforms.uMeshWidth.value = this.params.meshWidth;
    this.material.uniforms.uMeshHeight.value = this.params.meshHeight;
    this.material.uniforms.uColorStops.value = this.params.colorStops;
  }

  createColorArray() {
    return [
      this.params.color1,
      this.params.color2,
      this.params.color3,
      this.params.color4,
      this.params.color5,
      this.params.color6,
      this.params.color7,
    ].map(color => new THREE.Color(color));
  }

  updateColors() {
    this.cachedColors = this.createColorArray();
    this.material.uniforms.uColors.value = this.cachedColors;
  }

  updateSingleColor(index) {
    if (!this.cachedColors) {
      this.cachedColors = this.createColorArray();
    }
    this.cachedColors[index].set(this.params[`color${index + 1}`]);
    this.material.uniforms.uColors.value = this.cachedColors;
  }

  dispose() {
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material) {
        this.mesh.material.dispose();
      }
    }
    this.material = null;
    this.mesh = null;
    this.cachedColors = null;
  }
}
class ParticleNetwork {
  constructor(params) {
    this.params = {
      particleCount: params.particleCount,
      particleSize: params.particleSize,
      lineWidth: params.lineWidth,
      opacity: params.opacity,
      colors: params.colors,
      colorStops: params.colorStops,
      movementSpeed: params.movementSpeed,
      movementRange: params.movementRange,
      zPosition: params.zPosition ?? -3.0,
      boundsX: params.boundsX,
      boundsY: params.boundsY,
      boundsZ: params.boundsZ,
      maxConnectionDistance: params.maxConnectionDistance,
      scaleRange: params.scaleRange,
      seed: params.seed,
    };

    this.particles = [];
    this.connections = [];
    this.group = new THREE.Group();

    this.rng = this.createSeededRandom(this.params.seed);

    this.initialize();
  }

  createSeededRandom(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  isNearlyCollinear(p1, p2, p3, threshold = 0.15) {
    const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;

    const d12sq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
    const d23sq = (p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2;
    const d31sq = (p1.x - p3.x) ** 2 + (p1.y - p3.y) ** 2;

    const perimeter = Math.sqrt(d12sq) + Math.sqrt(d23sq) + Math.sqrt(d31sq);

    return area / perimeter < threshold;
  }

  generatePoissonDiskPositions(count, width, height, minDistance) {
    const positions = [];

    const maxParticlesInRow = Math.floor(width / minDistance);

    if (count < maxParticlesInRow * 2) {
      minDistance = Math.min(minDistance, (width / Math.sqrt(count)) * 0.6);
    }

    const cellSize = minDistance / Math.sqrt(2);
    const gridWidth = Math.ceil(width / cellSize);
    const gridHeight = Math.ceil(height / cellSize);
    const grid = new Array(gridWidth * gridHeight).fill(null);
    const activeList = [];

    const getGridIndex = (x, y) => {
      const gridX = Math.floor((x + width / 2) / cellSize);
      const gridY = Math.floor((y + height / 2) / cellSize);
      if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) return -1;
      return gridY * gridWidth + gridX;
    };

    const seedCount = Math.min(5, Math.ceil(count / 10));
    for (let i = 0; i < seedCount; i++) {
      const seedPoint = {
        x: (i / (seedCount - 1) - 0.5) * width * 0.9,
        y: (this.rng() - 0.5) * height * 0.8,
      };
      positions.push(seedPoint);
      activeList.push(seedPoint);
      const seedIdx = getGridIndex(seedPoint.x, seedPoint.y);
      if (seedIdx >= 0) grid[seedIdx] = seedPoint;
    }

    const maxAttempts = 30;
    const minDistSq = minDistance * minDistance;

    while (activeList.length > 0 && positions.length < count) {
      const randomIndex = Math.floor(this.rng() * activeList.length);
      const point = activeList[randomIndex];
      let found = false;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const angle = this.rng() * Math.PI * 2;
        const radius = minDistance * (1 + this.rng());
        const newPoint = {
          x: point.x + Math.cos(angle) * radius,
          y: point.y + Math.sin(angle) * radius,
        };

        if (Math.abs(newPoint.x) > width / 2 || Math.abs(newPoint.y) > height / 2) {
          continue;
        }

        const gridIdx = getGridIndex(newPoint.x, newPoint.y);
        if (gridIdx < 0) continue;

        let valid = true;
        const gridX = Math.floor((newPoint.x + width / 2) / cellSize);
        const gridY = Math.floor((newPoint.y + height / 2) / cellSize);

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const checkX = gridX + dx;
            const checkY = gridY + dy;
            if (checkX < 0 || checkX >= gridWidth || checkY < 0 || checkY >= gridHeight) continue;

            const checkIdx = checkY * gridWidth + checkX;
            const neighbor = grid[checkIdx];
            if (neighbor) {
              const dx2 = newPoint.x - neighbor.x;
              const dy2 = newPoint.y - neighbor.y;
              const distSq = dx2 * dx2 + dy2 * dy2;
              if (distSq < minDistSq) {
                valid = false;
                break;
              }
            }
          }
          if (!valid) break;
        }

        if (valid) {
          let isCollinear = false;
          if (positions.length >= 2) {
            const nearbyDistSq = (minDistance * 3) ** 2;

            const nearbyPositions = positions.filter(p => {
              const dx = newPoint.x - p.x;
              const dy = newPoint.y - p.y;
              return dx * dx + dy * dy < nearbyDistSq;
            });

            for (let i = 0; i < nearbyPositions.length - 1; i++) {
              for (let j = i + 1; j < nearbyPositions.length; j++) {
                if (this.isNearlyCollinear(nearbyPositions[i], nearbyPositions[j], newPoint)) {
                  isCollinear = true;
                  break;
                }
              }
              if (isCollinear) break;
            }
          }

          if (!isCollinear) {
            positions.push(newPoint);
            activeList.push(newPoint);
            grid[gridIdx] = newPoint;
            found = true;
            break;
          }
        }
      }

      if (!found) {
        activeList.splice(randomIndex, 1);
      }
    }

    while (positions.length < count) {
      positions.push({
        x: (this.rng() - 0.5) * width,
        y: (this.rng() - 0.5) * height,
      });
    }

    return positions;
  }

  initialize() {
    const positions = this.generatePoissonDiskPositions(
      this.params.particleCount,
      this.params.boundsX,
      this.params.boundsY,
      this.params.maxConnectionDistance * 0.5
    );

    for (let i = 0; i < positions.length; i++) {
      const particle = {
        id: i,
        position: new THREE.Vector3(
          positions[i].x,
          positions[i].y,
          this.params.zPosition + (this.rng() - 0.5) * this.params.boundsZ
        ),
        startPosition: new THREE.Vector3(),
        offsetX: this.rng() * Math.PI * 2,
        offsetY: this.rng() * Math.PI * 2,
        offsetZ: this.rng() * Math.PI * 2,
        speedMultX: 0.5 + this.rng() * 1.0,
        speedMultY: 0.5 + this.rng() * 1.0,
        speedMultZ: 0.5 + this.rng() * 1.0,
        connections: [],
      };
      particle.startPosition.copy(particle.position);
      this.particles.push(particle);
    }

    this.createConnectionGraph();

    this.createParticleMeshes();
    this.createLineMeshes();
  }

  createConnectionGraph() {
    const connected = new Set([0]);
    const unconnected = new Set(this.particles.slice(1).map(p => p.id));

    const maxDistSq = this.params.maxConnectionDistance * this.params.maxConnectionDistance;

    while (unconnected.size > 0) {
      let minDistSq = Infinity;
      let closestPair = null;

      for (const connectedId of connected) {
        for (const unconnectedId of unconnected) {
          const distSq = this.particles[connectedId].position.distanceToSquared(this.particles[unconnectedId].position);
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closestPair = [connectedId, unconnectedId];
          }
        }
      }

      if (closestPair) {
        const [a, b] = closestPair;
        this.addConnection(a, b);
        connected.add(b);
        unconnected.delete(b);
      }
    }

    for (let i = 0; i < this.params.particleCount; i++) {
      const particleA = this.particles[i];

      for (let j = i + 1; j < this.params.particleCount; j++) {
        const particleB = this.particles[j];

        if (!particleA.connections.includes(j)) {
          const distSq = particleA.position.distanceToSquared(particleB.position);

          if (distSq <= maxDistSq) {
            this.addConnection(i, j);
          }
        }
      }
    }

    const minConnections = 4;
    let maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      let allSatisfied = true;
      iteration++;

      for (let i = 0; i < this.params.particleCount; i++) {
        const particle = this.particles[i];

        if (particle.connections.length < minConnections) {
          allSatisfied = false;

          const neighbors = this.particles
            .map((p, idx) => ({ id: idx, distSq: p.position.distanceToSquared(particle.position) }))
            .filter(n => n.id !== i && !particle.connections.includes(n.id))
            .sort((a, b) => a.distSq - b.distSq);

          const needed = minConnections - particle.connections.length;

          for (let j = 0; j < Math.min(needed, neighbors.length); j++) {
            this.addConnection(i, neighbors[j].id);
          }
        }
      }

      if (allSatisfied) {
        console.log(`All particles have minimum ${minConnections} connections after ${iteration} iteration(s)`);
        break;
      }
    }

    let minConnectionsFound = Infinity;
    let maxConnectionsFound = 0;
    let particlesWithIssues = [];

    for (let i = 0; i < this.params.particleCount; i++) {
      const count = this.particles[i].connections.length;
      minConnectionsFound = Math.min(minConnectionsFound, count);
      maxConnectionsFound = Math.max(maxConnectionsFound, count);

      if (count < minConnections) {
        particlesWithIssues.push(i);
        console.error(`❌ Particle ${i} only has ${count} connection(s):`, this.particles[i].connections);
      }
    }

    console.log(`Network stats: ${this.params.particleCount} particles, ${this.connections.length} connections`);
    console.log(`Connections per particle: min=${minConnectionsFound}, max=${maxConnectionsFound}`);

    if (particlesWithIssues.length > 0) {
      console.error(`⚠️ ${particlesWithIssues.length} particles have fewer than ${minConnections} connections!`);
    }
  }

  addConnection(idA, idB) {
    if (!this.particles[idA].connections.includes(idB)) {
      this.particles[idA].connections.push(idB);
      this.particles[idB].connections.push(idA);
      this.connections.push([idA, idB]);
    }
  }

  getColorForPosition(x) {
    const minX = -this.params.boundsX / 2;
    const maxX = this.params.boundsX / 2;
    const normalizedX = (x - minX) / (maxX - minX);

    const activeColorCount = this.params.colorStops;
    const segmentSize = 1.0 / (activeColorCount - 1);
    const segmentIndex = Math.floor(normalizedX / segmentSize);
    const segmentT = (normalizedX - segmentIndex * segmentSize) / segmentSize;

    const colorIndex1 = Math.min(segmentIndex, activeColorCount - 1);
    const colorIndex2 = Math.min(colorIndex1 + 1, activeColorCount - 1);

    const color1 = this.params.colors[colorIndex1];
    const color2 = this.params.colors[colorIndex2];

    return new THREE.Color().lerpColors(color1, color2, segmentT);
  }

  createParticleMeshes() {
    const geometry = new THREE.SphereGeometry(this.params.particleSize, 8, 8);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: this.params.opacity },
      },
      vertexShader: `
        attribute vec3 instanceColor;
        attribute float instanceScale;
        varying vec3 vColor;

        void main() {
          vColor = instanceColor;

          vec3 scaledPosition = position * instanceScale;

          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(scaledPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec3 vColor;

        void main() {
          gl_FragColor = vec4(vColor, opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      toneMapped: true,
    });

    this.particleMesh = new THREE.InstancedMesh(geometry, material, this.params.particleCount);

    const colors = new Float32Array(this.params.particleCount * 3);
    const scales = new Float32Array(this.params.particleCount);

    const minZ = this.params.zPosition - this.params.boundsZ / 2;
    const maxZ = this.params.zPosition + this.params.boundsZ / 2;

    for (let i = 0; i < this.params.particleCount; i++) {
      const color = this.getColorForPosition(this.particles[i].position.x);
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const normalizedZ = (this.particles[i].position.z - minZ) / (maxZ - minZ || 1);
      scales[i] = 1.0 - this.params.scaleRange + normalizedZ * this.params.scaleRange * 2;
    }

    this.particleMesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3));
    this.particleMesh.geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1));

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < this.params.particleCount; i++) {
      matrix.setPosition(this.particles[i].position);
      this.particleMesh.setMatrixAt(i, matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    this.group.add(this.particleMesh);
  }

  createLineMeshes() {
    const positions = [];
    const colors = [];

    for (let i = 0; i < this.connections.length; i++) {
      const [idA, idB] = this.connections[i];
      const posA = this.particles[idA].position;
      const posB = this.particles[idB].position;

      positions.push(posA.x, posA.y, posA.z);
      positions.push(posB.x, posB.y, posB.z);

      const colorA = this.getColorForPosition(posA.x);
      const colorB = this.getColorForPosition(posB.x);

      colors.push(colorA.r, colorA.g, colorA.b);
      colors.push(colorB.r, colorB.g, colorB.b);
    }

    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(positions);
    geometry.setColors(colors);

    const material = new LineMaterial({
      color: 0xffffff,
      linewidth: this.params.lineWidth,
      vertexColors: true,
      transparent: true,
      opacity: this.params.opacity * 0.5,
      depthWrite: false,
      alphaToCoverage: false,
      dashed: false,
      worldUnits: false,
    });

    material.resolution.set(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2)
    );

    this.lineMesh = new LineSegments2(geometry, material);
    this.group.add(this.lineMesh);
  }

  update(elapsedTime) {
    if (!this.particles.length || !this.particleMesh || !this.lineMesh) {
      return;
    }

    const matrix = new THREE.Matrix4();
    const scales = this.particleMesh.geometry.attributes.instanceScale.array;

    const movementSpeed = this.params.movementSpeed;
    const movementRange = this.params.movementRange;
    const scaleRange = this.params.scaleRange;
    const particleCount = this.params.particleCount;

    const movementRangeZ = movementRange * 0.3;
    const minZ = this.params.zPosition - this.params.boundsZ / 2 - movementRangeZ;
    const maxZ = this.params.zPosition + this.params.boundsZ / 2 + movementRangeZ;
    const zRange = maxZ - minZ || 1;
    const scaleBase = 1.0 - scaleRange;
    const scaleMultiplier = scaleRange * 2;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.particles[i];
      const startPos = particle.startPosition;

      const timeX = elapsedTime * movementSpeed * particle.speedMultX + particle.offsetX;
      const timeY = elapsedTime * movementSpeed * particle.speedMultY + particle.offsetY;
      const timeZ = elapsedTime * movementSpeed * particle.speedMultZ + particle.offsetZ;

      particle.position.x = startPos.x + Math.sin(timeX) * movementRange;
      particle.position.y = startPos.y + Math.sin(timeY) * movementRange;
      particle.position.z = startPos.z + Math.sin(timeZ) * movementRangeZ;

      const normalizedZ = (particle.position.z - minZ) / zRange;
      scales[i] = scaleBase + normalizedZ * scaleMultiplier;

      matrix.setPosition(particle.position);
      this.particleMesh.setMatrixAt(i, matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.particleMesh.geometry.attributes.instanceScale.needsUpdate = true;

    const linePositions =
      this.lineMesh.geometry.getAttribute('instanceStart')?.array || new Float32Array(this.connections.length * 6);
    let idx = 0;
    const connectionCount = this.connections.length;
    const particles = this.particles;

    for (let i = 0; i < connectionCount; i++) {
      const [idA, idB] = this.connections[i];
      const posA = particles[idA].position;
      const posB = particles[idB].position;

      linePositions[idx++] = posA.x;
      linePositions[idx++] = posA.y;
      linePositions[idx++] = posA.z;
      linePositions[idx++] = posB.x;
      linePositions[idx++] = posB.y;
      linePositions[idx++] = posB.z;
    }
    this.lineMesh.geometry.setPositions(linePositions);
  }

  updateColors() {
    if (!this.particleMesh || !this.lineMesh) return;

    const particleColors = this.particleMesh.geometry.attributes.instanceColor.array;
    for (let i = 0; i < this.params.particleCount; i++) {
      const color = this.getColorForPosition(this.particles[i].position.x);
      particleColors[i * 3 + 0] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }
    this.particleMesh.geometry.attributes.instanceColor.needsUpdate = true;

    const lineColors = [];
    for (let i = 0; i < this.connections.length; i++) {
      const [idA, idB] = this.connections[i];
      const posA = this.particles[idA].position;
      const posB = this.particles[idB].position;

      const colorA = this.getColorForPosition(posA.x);
      const colorB = this.getColorForPosition(posB.x);

      lineColors.push(colorA.r, colorA.g, colorA.b);
      lineColors.push(colorB.r, colorB.g, colorB.b);
    }
    this.lineMesh.geometry.setColors(lineColors);
  }

  updateParams(newParams) {
    Object.assign(this.params, newParams);

    if (this.particleMesh && this.particleMesh.material.uniforms) {
      this.particleMesh.material.uniforms.opacity.value = this.params.opacity;
    }

    if (this.lineMesh && this.lineMesh.material) {
      this.lineMesh.material.opacity = this.params.opacity * 0.5;
      this.lineMesh.material.linewidth = this.params.lineWidth;
      this.lineMesh.material.needsUpdate = true;
    }

    if (newParams.colors || newParams.colorStops) {
      this.updateColors();
    }
  }

  recreate() {
    if (this.particleMesh) {
      this.group.remove(this.particleMesh);
      if (this.particleMesh.geometry) {
        this.particleMesh.geometry.dispose();
      }
      if (this.particleMesh.material) {
        this.particleMesh.material.dispose();
      }
      this.particleMesh = null;
    }

    if (this.lineMesh) {
      this.group.remove(this.lineMesh);
      if (this.lineMesh.geometry) {
        this.lineMesh.geometry.dispose();
      }
      if (this.lineMesh.material) {
        this.lineMesh.material.dispose();
      }
      this.lineMesh = null;
    }

    this.particles = [];
    this.connections = [];

    this.rng = this.createSeededRandom(this.params.seed);

    this.initialize();
  }

  updateResolution(width, height) {
    if (this.lineMesh && this.lineMesh.material) {
      this.lineMesh.material.resolution.set(
        width * Math.min(window.devicePixelRatio, 2),
        height * Math.min(window.devicePixelRatio, 2)
      );
    }
  }

  getGroup() {
    return this.group;
  }

  dispose() {
    if (this.particleMesh) {
      this.group.remove(this.particleMesh);
      if (this.particleMesh.geometry) {
        this.particleMesh.geometry.dispose();
      }
      if (this.particleMesh.material) {
        this.particleMesh.material.dispose();
      }
      this.particleMesh = null;
    }

    if (this.lineMesh) {
      this.group.remove(this.lineMesh);
      if (this.lineMesh.geometry) {
        this.lineMesh.geometry.dispose();
      }
      if (this.lineMesh.material) {
        this.lineMesh.material.dispose();
      }
      this.lineMesh = null;
    }

    this.group.clear();
    this.particles = [];
    this.connections = [];
  }
}

window.app = new App();
