varying vec2 vUv;
varying vec3 vPosition;

uniform float uLineCount;
uniform float uLineWidth;
uniform float uOpacity;
uniform vec3 uColors[7];
uniform int uColorStops;
uniform float uMeshHeight;

void main() {
    // Calculate which line this fragment belongs to
    float lineIndex = vUv.y * uLineCount;
    float lineFract = fract(lineIndex);

    // Calculate distance from line center (for anti-aliasing)
    float distToLine = abs(lineFract - 0.5) * 2.0;
    float lineThickness = uLineWidth;

    // Enhanced anti-aliasing with derivative-based edge width
    // This adjusts softness based on how stretched the geometry is
    vec2 fw = fwidth(vUv * uLineCount);
    float derivativeWidth = length(fw);
    float edgeSoftness = max(0.01, derivativeWidth * 2.0); // Adaptive edge softness

    float alpha = 1.0 - smoothstep(lineThickness - edgeSoftness, lineThickness + edgeSoftness, distToLine);

    // Additional smoothing for very thin/stretched areas
    alpha = clamp(alpha, 0.0, 1.0);

    // Calculate gradient color based on X position
    float colorProgress = vUv.x;
    vec3 finalColor = uColors[0];

    if (uColorStops > 1) {
        float colorIndex = colorProgress * float(uColorStops - 1);
        int colorIndexFloor = int(floor(colorIndex));
        int colorIndexCeil = min(colorIndexFloor + 1, uColorStops - 1);
        float colorMix = fract(colorIndex);

        finalColor = mix(uColors[colorIndexFloor], uColors[colorIndexCeil], colorMix);
    }

    gl_FragColor = vec4(finalColor, alpha * uOpacity);
}