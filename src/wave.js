// Wave Class for animated wave mesh
import * as THREE from 'three';
import vertexShader from './shaders/wave/vertex.glsl';
import fragmentShader from './shaders/wave/fragment.glsl';

export class Wave {
  constructor(params) {
    this.params = params;
    this.material = null;
    this.mesh = null;
    this.cachedColors = null;
    this.createMesh();
  }

  createMesh() {
    // Properly dispose of old resources
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material) {
        this.mesh.material.dispose();
      }
      // Note: scene.remove is handled by the caller
    }

    // Create and cache color array
    this.cachedColors = this.createColorArray();
    const activeColors = this.cachedColors;

    const geometry = new THREE.PlaneGeometry(1, 1, this.params.pointsPerLine - 1, this.params.lineCount - 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
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
      toneMapped: true, // Enable tone mapping for better TAA compatibility
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

  /**
   * Dispose of all resources to prevent memory leaks
   */
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
