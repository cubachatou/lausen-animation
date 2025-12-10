import * as THREE from 'three';
import vertexShader from './shaders/bar/vertex.glsl';
import fragmentShader from './shaders/bar/fragment.glsl';

export class SpectrumBars {
  constructor(params = {}) {
    this.params = {
      barCount: params.barCount,
      barGap: params.barGap,
      totalWidth: params.totalWidth, // Total width to fill (matches meshWidth)
      colors: params.colors, // Array of THREE.Color
      colorStops: params.colorStops,
      baseHeight: params.baseHeight,
      maxHeight: params.maxHeight,
      speed: params.speed, // Overall animation speed
      smoothness: params.smoothness, // How smooth the transitions are (0-1)
      fadeStart: params.fadeStart, // Where vertical fade begins (0 = bottom, 1 = top)
      fadeEnd: params.fadeEnd, // Where vertical fade ends (fully transparent)
      opacity: params.opacity, // Overall opacity
    };

    this.clock = new THREE.Clock();
    this.dummy = new THREE.Object3D();
    this.instanceColor = new THREE.Color();

    // Generate random offsets for each bar to create non-repeating patterns
    this.randomOffsets = [];
    this.initRandomOffsets();

    this.createMesh();
  }

  /**
   * Initialize random phase offsets for each bar
   * Uses multiple layers of randomness for organic movement
   * Stores in Float32Arrays for GPU upload
   */
  initRandomOffsets() {
    const barCount = this.params.barCount;

    // Use Float32Arrays for GPU-compatible data
    this._randomPhases = new Float32Array(barCount * 4);
    this._randomFreqs = new Float32Array(barCount * 4);
    this._randomAmps = new Float32Array(barCount * 4);

    for (let i = 0; i < barCount; i++) {
      const idx = i * 4;

      // Phases (0 to 2π)
      this._randomPhases[idx] = Math.random() * Math.PI * 2;
      this._randomPhases[idx + 1] = Math.random() * Math.PI * 2;
      this._randomPhases[idx + 2] = Math.random() * Math.PI * 2;
      this._randomPhases[idx + 3] = Math.random() * Math.PI * 2;

      // Frequencies
      this._randomFreqs[idx] = 0.5 + Math.random() * 1.5;
      this._randomFreqs[idx + 1] = 0.3 + Math.random() * 1.2;
      this._randomFreqs[idx + 2] = 0.7 + Math.random() * 0.8;
      this._randomFreqs[idx + 3] = 0.2 + Math.random() * 0.6;

      // Amplitudes
      this._randomAmps[idx] = 0.2 + Math.random() * 0.3;
      this._randomAmps[idx + 1] = 0.15 + Math.random() * 0.25;
      this._randomAmps[idx + 2] = 0.1 + Math.random() * 0.2;
      this._randomAmps[idx + 3] = 0.05 + Math.random() * 0.15;
    }
  }

  /**
   * Calculate bar width based on total width, bar count, and gap
   */
  getBarWidth() {
    // totalWidth = barCount * barWidth + (barCount - 1) * gap
    // barWidth = (totalWidth - (barCount - 1) * gap) / barCount
    const gapTotal = (this.params.barCount - 1) * this.params.barGap;
    return Math.max(0.01, (this.params.totalWidth - gapTotal) / this.params.barCount);
  }

  /**
   * Get color for a bar at given index using gradient interpolation
   */
  getBarColor(index) {
    const { colors, colorStops, barCount } = this.params;
    const activeColors = colors.slice(0, colorStops);

    if (activeColors.length === 1) {
      return activeColors[0];
    }

    // Normalize index to 0-1 range
    const t = index / (barCount - 1);

    // Find which two colors to interpolate between
    const segmentCount = activeColors.length - 1;
    const segment = t * segmentCount;
    const segmentIndex = Math.min(Math.floor(segment), segmentCount - 1);
    const segmentT = segment - segmentIndex;

    // Interpolate between the two colors
    const color1 = activeColors[segmentIndex];
    const color2 = activeColors[Math.min(segmentIndex + 1, activeColors.length - 1)];

    this.instanceColor.copy(color1).lerp(color2, segmentT);
    return this.instanceColor;
  }

  createMesh() {
    const barWidth = this.getBarWidth();

    // Create base geometry for a single bar
    const geometry = new THREE.PlaneGeometry(barWidth, 1);

    // Translate geometry so pivot point is at the bottom
    // This ensures bars grow upwards from Y=0
    geometry.translate(0, 0.5, 0);

    // Create custom shader material with GPU-based animation
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uFadeStart: { value: this.params.fadeStart },
        uFadeEnd: { value: this.params.fadeEnd },
        uMaxHeight: { value: this.params.maxHeight },
        uBaseHeight: { value: this.params.baseHeight },
        uOpacity: { value: this.params.opacity },
        uTime: { value: 0.0 },
        uSpeed: { value: this.params.speed },
        uSmoothness: { value: this.params.smoothness },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(geometry, material, this.params.barCount);

    // Enable instance colors
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.params.barCount * 3), 3);

    // Add instance attributes for GPU animation
    this.mesh.geometry.setAttribute('aRandomPhases', new THREE.InstancedBufferAttribute(this._randomPhases, 4));
    this.mesh.geometry.setAttribute('aRandomFreqs', new THREE.InstancedBufferAttribute(this._randomFreqs, 4));
    this.mesh.geometry.setAttribute('aRandomAmps', new THREE.InstancedBufferAttribute(this._randomAmps, 4));

    // Set initial colors
    this.updateColors();

    // Cache X positions and set initial instance matrices (position only, no height scaling)
    this._cachedXPositions = new Float32Array(this.params.barCount);
    const barWidthCalc = this.getBarWidth();
    const startX = -this.params.totalWidth / 2 + barWidthCalc / 2;
    const step = barWidthCalc + this.params.barGap;

    for (let i = 0; i < this.params.barCount; i++) {
      this._cachedXPositions[i] = startX + i * step;

      // Set position only (height is handled in shader)
      this.dummy.position.set(this._cachedXPositions[i], 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update all instance colors based on gradient
   */
  updateColors() {
    for (let i = 0; i < this.params.barCount; i++) {
      const color = this.getBarColor(i);
      this.mesh.setColorAt(i, color);
    }
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Calculate the X position for a bar at given index, centered around origin
   * Uses cached positions when available
   */
  getBarXPosition(index) {
    if (this._cachedXPositions && this._cachedXPositions[index] !== undefined) {
      return this._cachedXPositions[index];
    }
    const barWidth = this.getBarWidth();
    const startX = -this.params.totalWidth / 2 + barWidth / 2;
    return startX + index * (barWidth + this.params.barGap);
  }

  /**
   * Update animation - call this in your render loop
   * Only updates the time uniform (height is calculated in GPU shader)
   */
  update() {
    const time = this.clock.getElapsedTime();
    if (this.mesh && this.mesh.material.uniforms) {
      this.mesh.material.uniforms.uTime.value = time;
    }
  }

  /**
   * Update parameters dynamically
   */
  setParams(newParams) {
    Object.assign(this.params, newParams);

    // Update colors if colors or colorStops changed
    if (newParams.colors !== undefined || newParams.colorStops !== undefined) {
      this.updateColors();
    }

    // Update uniforms if changed
    if (this.mesh && this.mesh.material.uniforms) {
      const uniforms = this.mesh.material.uniforms;

      if (newParams.fadeStart !== undefined) {
        uniforms.uFadeStart.value = newParams.fadeStart;
      }
      if (newParams.fadeEnd !== undefined) {
        uniforms.uFadeEnd.value = newParams.fadeEnd;
      }
      if (newParams.maxHeight !== undefined) {
        uniforms.uMaxHeight.value = this.params.maxHeight;
      }
      if (newParams.baseHeight !== undefined) {
        uniforms.uBaseHeight.value = this.params.baseHeight;
      }
      if (newParams.opacity !== undefined) {
        uniforms.uOpacity.value = newParams.opacity;
      }
      if (newParams.speed !== undefined) {
        uniforms.uSpeed.value = newParams.speed;
      }
      if (newParams.smoothness !== undefined) {
        uniforms.uSmoothness.value = newParams.smoothness;
      }
    }
  }

  /**
   * Recreate the mesh (useful when bar count or gap changes)
   * Returns the old mesh for removal from scene
   */
  recreateMesh() {
    const oldMesh = this.mesh;
    const wasVisible = oldMesh.visible;
    const positionY = oldMesh.position.y;
    const positionZ = oldMesh.position.z;

    this.dispose();

    // Regenerate random offsets for new bar count
    this.initRandomOffsets();

    this.createMesh();

    // Preserve visibility and position
    this.mesh.visible = wasVisible;
    this.mesh.position.y = positionY;
    this.mesh.position.z = positionZ;

    return oldMesh;
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material) {
        this.mesh.material.dispose();
      }
      this.mesh = null;
    }
    // Clear typed arrays to help GC
    this._randomPhases = null;
    this._randomFreqs = null;
    this._randomAmps = null;
    this._cachedXPositions = null;
  }
}
