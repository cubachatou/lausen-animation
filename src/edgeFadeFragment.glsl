uniform sampler2D tDiffuse;
uniform float fadeWidth;
uniform float fadeStrength;
uniform vec3 backgroundColor;
varying vec2 vUv;

void main() {
    vec4 texel = texture2D(tDiffuse, vUv);

    // Calculate distance from left and right edges
    float distFromLeft = vUv.x;
    float distFromRight = 1.0 - vUv.x;

    // Calculate fade factors for left and right edges
    float leftFade = smoothstep(0.0, fadeWidth, distFromLeft);
    float rightFade = smoothstep(0.0, fadeWidth, distFromRight);

    // Combine fades (multiply to get the minimum effect)
    float combinedFade = leftFade * rightFade;

    // Apply fade strength (interpolate between no fade and full fade)
    float finalFade = mix(1.0, combinedFade, fadeStrength);

    // Mix between background color and rendered scene
    vec3 finalColor = mix(backgroundColor, texel.rgb, finalFade);

    gl_FragColor = vec4(finalColor, texel.a);
}