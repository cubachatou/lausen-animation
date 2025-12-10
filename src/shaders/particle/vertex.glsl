// Instance attributes
attribute vec3 instanceColor;
attribute float instanceScale;
attribute vec3 startPosition;
attribute vec3 offsets;      // offsetX, offsetY, offsetZ
attribute vec3 speedMults;   // speedMultX, speedMultY, speedMultZ

// Uniforms for animation
uniform float uTime;
uniform float uMovementSpeed;
uniform float uMovementRange;
uniform float uMovementRangeZ;
uniform float uMinZ;
uniform float uZRange;
uniform float uScaleBase;
uniform float uScaleMultiplier;

varying vec3 vColor;

void main() {
  vColor = instanceColor;

  // Calculate animated position using sine waves (GPU-based)
  float timeX = uTime * uMovementSpeed * speedMults.x + offsets.x;
  float timeY = uTime * uMovementSpeed * speedMults.y + offsets.y;
  float timeZ = uTime * uMovementSpeed * speedMults.z + offsets.z;

  vec3 animatedPosition = startPosition;
  animatedPosition.x += sin(timeX) * uMovementRange;
  animatedPosition.y += sin(timeY) * uMovementRange;
  animatedPosition.z += sin(timeZ) * uMovementRangeZ;

  // Calculate dynamic scale based on Z position (closer to camera = larger)
  float normalizedZ = (animatedPosition.z - uMinZ) / uZRange;
  float dynamicScale = uScaleBase + normalizedZ * uScaleMultiplier;

  // Apply scale to geometry
  vec3 scaledPosition = position * instanceScale * dynamicScale;

  // Transform to world position (no instance matrix needed for position, only for rotation/scale)
  vec4 worldPosition = vec4(scaledPosition + animatedPosition, 1.0);

  gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
}
