varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vColor;

uniform float uTime;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uTwistAmount;
uniform float uTwistFrequency;
uniform float uTwistSpeed;
uniform float uTwistStagger;
uniform float uMeshWidth;
uniform float uMeshHeight;
uniform vec3 uColors[7];
uniform int uColorStops;

void main() {
    vUv = uv;
    vPosition = position;

    vec3 pos = position;

    // Map UV to mesh dimensions
    float xProgress = uv.x;
    float lineProgress = uv.y;

    // X position (horizontal flow)
    pos.x = (xProgress - 0.5) * uMeshWidth;

    // Base Y position for this line
    float baseY = (lineProgress - 0.5) * uMeshHeight;

    // Create flowing wave motion
    float wave1 = sin(xProgress * 3.14159 * uWaveFrequency + uTime * uWaveSpeed) * uWaveAmplitude;
    float wave2 = sin(xProgress * 3.14159 * uWaveFrequency * 2.3 - uTime * uWaveSpeed * 0.7) * uWaveAmplitude * 0.4;

    // Create twist effect with stagger based on line position
    // Stagger adds a progressive offset based on which line we're on (lineProgress)
    float staggerOffset = lineProgress * uTwistStagger;
    float twistAngle = sin(xProgress * 3.14159 * uTwistFrequency + uTime * uTwistSpeed + staggerOffset) * uTwistAmount;

    // Apply twist rotation
    pos.y = baseY * cos(twistAngle) + wave1 + wave2;
    pos.z = baseY * sin(twistAngle);

    // Calculate gradient color based on X position
    float colorProgress = xProgress;
    vColor = uColors[0];

    if (uColorStops > 1) {
        float colorIndex = colorProgress * float(uColorStops - 1);
        int colorIndexFloor = int(floor(colorIndex));
        int colorIndexCeil = min(colorIndexFloor + 1, uColorStops - 1);
        float colorMix = fract(colorIndex);

        vColor = mix(uColors[colorIndexFloor], uColors[colorIndexCeil], colorMix);
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}