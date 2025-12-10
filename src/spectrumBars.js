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
   */
  initRandomOffsets() {
    this.randomOffsets = [];
    for (let i = 0; i < this.params.barCount; i++) {
      this.randomOffsets.push({
        phase1: Math.random() * Math.PI * 2,
        phase2: Math.random() * Math.PI * 2,
        phase3: Math.random() * Math.PI * 2,
        phase4: Math.random() * Math.PI * 2,
        freq1: 0.5 + Math.random() * 1.5, // Random frequency multiplier
        freq2: 0.3 + Math.random() * 1.2,
        freq3: 0.7 + Math.random() * 0.8,
        freq4: 0.2 + Math.random() * 0.6,
        amp1: 0.2 + Math.random() * 0.3, // Random amplitude weights
        amp2: 0.15 + Math.random() * 0.25,
        amp3: 0.1 + Math.random() * 0.2,
        amp4: 0.05 + Math.random() * 0.15,
      });
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

    // Create custom shader material with vertical fade
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uFadeStart: { value: this.params.fadeStart },
        uFadeEnd: { value: this.params.fadeEnd },
        uMaxHeight: { value: this.params.maxHeight + this.params.baseHeight },
        uOpacity: { value: this.params.opacity },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(geometry, material, this.params.barCount);

    // Enable instance colors
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.params.barCount * 3), 3);

    // Set initial colors
    this.updateColors();

    // Initial positioning
    this.updatePositions(0);
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
   */
  getBarXPosition(index) {
    const barWidth = this.getBarWidth();
    const startX = -this.params.totalWidth / 2 + barWidth / 2;
    return startX + index * (barWidth + this.params.barGap);
  }

  /**
   * Calculate simulated height based on index and time
   * Uses multiple sine waves with random offsets for organic, non-repeating movement
   */
  calculateHeight(index, time) {
    const { maxHeight, baseHeight, speed, smoothness } = this.params;
    const offsets = this.randomOffsets[index];

    if (!offsets) return baseHeight;

    const t = time * speed;

    // Combine multiple sine waves with different frequencies and phases
    // Each bar has its own random offsets, creating unique movement patterns
    // Use absolute values to ensure waves are always positive
    const wave1 = Math.abs(Math.sin(t * offsets.freq1 + offsets.phase1)) * offsets.amp1;
    const wave2 = Math.abs(Math.sin(t * offsets.freq2 + offsets.phase2)) * offsets.amp2;
    const wave3 = Math.abs(Math.sin(t * offsets.freq3 + offsets.phase3)) * offsets.amp3;
    const wave4 = Math.abs(Math.sin(t * offsets.freq4 + offsets.phase4)) * offsets.amp4;

    // Sum of all amplitudes for normalization
    const totalAmp = offsets.amp1 + offsets.amp2 + offsets.amp3 + offsets.amp4;

    // Combine waves and normalize to 0-1 range
    const combined = (wave1 + wave2 + wave3 + wave4) / totalAmp;

    // Apply smoothness - higher smoothness creates more gradual changes
    const smoothed = Math.pow(combined, 1 - smoothness * 0.5);

    // Remap from 0-1 to minValue-1 range (minValue = 0.2 means bars never go below 20%)
    const minValue = 0.2;
    const remapped = minValue + smoothed * (1 - minValue);

    // Calculate final height
    return remapped * maxHeight + baseHeight;
  }

  /**
   * Update all bar positions and heights
   */
  updatePositions(time) {
    for (let i = 0; i < this.params.barCount; i++) {
      const x = this.getBarXPosition(i);
      const height = this.calculateHeight(i, time);

      // Set position and scale
      this.dummy.position.set(x, 0, 0);
      this.dummy.scale.set(1, height, 1);
      this.dummy.updateMatrix();

      // Apply matrix to instance
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    // Flag that instance matrices need to be updated on GPU
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update animation - call this in your render loop
   */
  update() {
    const time = this.clock.getElapsedTime();
    this.updatePositions(time);
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
    if (this.mesh.material.uniforms) {
      if (newParams.fadeStart !== undefined) {
        this.mesh.material.uniforms.uFadeStart.value = newParams.fadeStart;
      }
      if (newParams.fadeEnd !== undefined) {
        this.mesh.material.uniforms.uFadeEnd.value = newParams.fadeEnd;
      }
      if (newParams.maxHeight !== undefined || newParams.baseHeight !== undefined) {
        this.mesh.material.uniforms.uMaxHeight.value = this.params.maxHeight + this.params.baseHeight;
      }
      if (newParams.opacity !== undefined) {
        this.mesh.material.uniforms.uOpacity.value = newParams.opacity;
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
    // Clear arrays to help GC
    this.randomOffsets = [];
  }
}
