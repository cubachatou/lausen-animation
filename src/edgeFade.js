// Edge Fade Shader for post-processing
import * as THREE from 'three';
import vertexShader from './shaders/edgeFadeVertex.glsl';
import fragmentShader from './shaders/edgeFadeFragment.glsl';

export const EdgeFadeShader = {
  uniforms: {
    tDiffuse: { value: null },
    fadeWidth: { value: 0.15 },
    fadeStrength: { value: 1.0 },
    backgroundColor: { value: new THREE.Color(0xffffff) },
  },

  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
};
