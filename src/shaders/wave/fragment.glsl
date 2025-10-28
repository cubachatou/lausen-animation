varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vColor;

uniform float uLineCount;
uniform float uLineWidth;
uniform float uOpacity;
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

    gl_FragColor = vec4(vColor, alpha * uOpacity);
}