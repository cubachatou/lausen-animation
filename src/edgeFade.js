// Edge Fade Shader for post-processing
import * as THREE from 'three'
import vertexShader from './edgeFadeVertex.glsl?raw'
import fragmentShader from './edgeFadeFragment.glsl?raw'

export const EdgeFadeShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'fadeWidth': { value: 0.15 },
        'fadeStrength': { value: 1.0 },
        'backgroundColor': { value: new THREE.Color(0xffffff) }
    },

    vertexShader: vertexShader,
    fragmentShader: fragmentShader
}