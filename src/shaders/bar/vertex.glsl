// Instance attributes for GPU-based animation
attribute vec4 aRandomPhases;  // phase1, phase2, phase3, phase4
attribute vec4 aRandomFreqs;   // freq1, freq2, freq3, freq4
attribute vec4 aRandomAmps;    // amp1, amp2, amp3, amp4

// Animation uniforms
uniform float uTime;
uniform float uSpeed;
uniform float uMaxHeight;
uniform float uBaseHeight;
uniform float uSmoothness;

varying vec2 vUv;
varying vec3 vColor;
varying float vWorldY;

void main() {
  vUv = uv;
  vColor = instanceColor;
  
  // Calculate height entirely in GPU using multiple sine waves
  float t = uTime * uSpeed;
  
  // Combine multiple sine waves with different frequencies and phases
  // Use absolute values to ensure waves are always positive
  float wave1 = abs(sin(t * aRandomFreqs.x + aRandomPhases.x)) * aRandomAmps.x;
  float wave2 = abs(sin(t * aRandomFreqs.y + aRandomPhases.y)) * aRandomAmps.y;
  float wave3 = abs(sin(t * aRandomFreqs.z + aRandomPhases.z)) * aRandomAmps.z;
  float wave4 = abs(sin(t * aRandomFreqs.w + aRandomPhases.w)) * aRandomAmps.w;
  
  // Sum of all amplitudes for normalization
  float totalAmp = aRandomAmps.x + aRandomAmps.y + aRandomAmps.z + aRandomAmps.w;
  
  // Combine waves and normalize to 0-1 range
  float combined = (wave1 + wave2 + wave3 + wave4) / totalAmp;
  
  // Apply smoothness - higher smoothness creates more gradual changes
  float smoothed = pow(combined, 1.0 - uSmoothness * 0.5);
  
  // Remap from 0-1 to minValue-1 range (minValue = 0.2 means bars never go below 20%)
  float minValue = 0.2;
  float remapped = minValue + smoothed * (1.0 - minValue);
  
  // Calculate final height
  float height = remapped * uMaxHeight + uBaseHeight;
  
  // Apply height to Y position (geometry has pivot at bottom, Y goes 0-1)
  vec3 pos = position;
  pos.y *= height;
  
  // Calculate world position for fragment shader (fade effect)
  vec4 worldPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
  vWorldY = (instanceMatrix * vec4(pos, 1.0)).y;
  
  gl_Position = projectionMatrix * worldPosition;
}
