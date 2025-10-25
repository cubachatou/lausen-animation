// Wave Shader for animated wave mesh
import * as THREE from 'three';
import vertexShader from './shaders/waveVertex.glsl';
import fragmentShader from './shaders/waveFragment.glsl';

export const WaveShader = {
  uniforms: {
    uTime: { value: 0 },
    uLineCount: { value: 50 },
    uLineWidth: { value: 0.3 },
    uOpacity: { value: 0.7 },
    uWaveAmplitude: { value: 1.5 },
    uWaveFrequency: { value: 3 },
    uWaveSpeed: { value: 0.3 },
    uTwistAmount: { value: 5 },
    uTwistFrequency: { value: 1 },
    uTwistSpeed: { value: 0.15 },
    uMeshWidth: { value: 25 },
    uMeshHeight: { value: 3 },
    uWidthVariation: { value: 0.5 },
    uWidthFrequency: { value: 5.0 },
    uWidthSpeed: { value: 0.2 },
    uWidthPattern: { value: 0.5 },
    uColors: {
      value: [
        new THREE.Color('#ff0080'),
        new THREE.Color('#ff8c00'),
        new THREE.Color('#ffff00'),
        new THREE.Color('#00ff00'),
        new THREE.Color('#00ffff'),
        new THREE.Color('#0080ff'),
        new THREE.Color('#8000ff'),
      ],
    },
    uColorStops: { value: 7 },
  },

  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
};
