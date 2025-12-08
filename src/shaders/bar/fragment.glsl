uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uMaxHeight;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vColor;
varying float vWorldY;

void main() {
  // vWorldY is the actual world Y position of this fragment
  // Fade from top (full opacity) to bottom (transparent)
  // Normalize worldY based on max possible height
  float normalizedY = vWorldY / uMaxHeight;
  
  float alpha = 1.0;
  
  // uFadeStart: where fade begins (0 = bottom of spectrum, 1 = top)
  // uFadeEnd: where fade ends (fully transparent)
  // Fade OUT at the bottom, so invert the logic
  if (uFadeEnd > 0.0) {
    // At uFadeStart and above: alpha = 1 (fully visible)
    // At uFadeEnd and below: alpha = 0 (fully transparent)
    // The fade happens between uFadeEnd and uFadeStart
    alpha = smoothstep(uFadeEnd, uFadeStart, normalizedY);
  }
  
  // Apply overall opacity
  gl_FragColor = vec4(vColor, alpha * uOpacity);
}
