attribute vec3 instanceColor;
attribute float instanceScale;
varying vec3 vColor;

void main() {
  vColor = instanceColor;

  // Apply depth-based scale to the position
  vec3 scaledPosition = position * instanceScale;

  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(scaledPosition, 1.0);
}
