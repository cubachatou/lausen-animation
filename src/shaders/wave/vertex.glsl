varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vColor;

uniform float uTime;
uniform float uMeshWidth;
uniform float uMeshHeight;
uniform vec3 uColors[7];
uniform int uColorStops;

void main() {
    vUv = uv;
    vPosition = position;
    vColor = uColors[0];

    vec3 pos = position;
    pos.x = (uv.x - 0.5) * uMeshWidth;
    pos.y = (uv.y - 0.5) * uMeshHeight;

    // Calculate gradient color based on X position
    if(uColorStops > 1) {
      float colorIndex = uv.x * float(uColorStops - 1);
      int colorIndexFloor = int(floor(colorIndex));
      int colorIndexCeil = min(colorIndexFloor + 1, uColorStops - 1);
      float colorMix = fract(colorIndex);

      vColor = mix(uColors[colorIndexFloor], uColors[colorIndexCeil], colorMix);
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}