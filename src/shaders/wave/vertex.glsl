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
uniform float uMeshWidth;
uniform float uMeshHeight;
uniform float uWidthVariation;
uniform float uWidthFrequency;
uniform float uWidthSpeed;
uniform float uWidthPattern;
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

    // Calculate width variation factor
    // Combine multiple waves for more interesting patterns
    float widthWave1 = sin(xProgress * 3.14159 * uWidthFrequency + uTime * uWidthSpeed);
    float widthWave2 = sin(xProgress * 3.14159 * uWidthFrequency * 0.7 - uTime * uWidthSpeed * 0.5);
    
    // Blend between smooth (sin) and sharper (pow) patterns based on widthPattern
    float smoothPattern = (widthWave1 + widthWave2 * 0.5) / 1.5;
    float sharpPattern = pow(abs(smoothPattern), 1.0 + uWidthPattern * 2.0) * sign(smoothPattern);
    float widthMod = mix(smoothPattern, sharpPattern, uWidthPattern);
    
    // Apply width variation (1.0 = normal width, can go smaller or larger)
    float widthFactor = 1.0 + widthMod * uWidthVariation;
    
    // Scale the baseY by the width factor to create thinner/wider areas
    baseY = baseY * widthFactor;

    // Create flowing wave motion
    float wave1 = sin(xProgress * 3.14159 * uWaveFrequency + uTime * uWaveSpeed) * uWaveAmplitude;
    float wave2 = sin(xProgress * 3.14159 * uWaveFrequency * 2.3 - uTime * uWaveSpeed * 0.7) * uWaveAmplitude * 0.4;

    // Create twist effect
    float twistAngle = sin(xProgress * 3.14159 * uTwistFrequency + uTime * uTwistSpeed) * uTwistAmount;

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