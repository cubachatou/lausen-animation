varying vec2 vUv;
varying vec3 vColor;
varying float vWorldY;

void main() {
  vUv = uv;
  vColor = instanceColor;
  
  // Calculate world position to get the actual Y coordinate in world space
  vec4 worldPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldY = (instanceMatrix * vec4(position, 1.0)).y;
  
  gl_Position = projectionMatrix * worldPosition;
}
