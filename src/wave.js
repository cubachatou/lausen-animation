// Wave Class for animated wave mesh
import * as THREE from 'three';
import vertexShader from './shaders/wave/vertex.glsl';
import fragmentShader from './shaders/wave/fragment.glsl';

export class Wave {
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
      toneMapped: false,
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
    this.material.uniforms.uColors.value = activeColors;
  }

  updateSingleColor(index) {
    this.material.uniforms.uColors.value[index] = new THREE.Color(this.params[`color${index + 1}`]);
  }
}
