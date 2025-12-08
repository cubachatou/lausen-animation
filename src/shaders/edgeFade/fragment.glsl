uniform sampler2D tDiffuse;
uniform float fadeWidth;
uniform float fadeStrength;
uniform float fadeWidthY;
uniform float fadeStrengthY;
uniform vec3 backgroundColor;
varying vec2 vUv;

void main() {
    vec4 texel = texture2D(tDiffuse, vUv);

    // Calculate distance from left and right edges (X-axis)
    float distFromLeft = vUv.x;
    float distFromRight = 1.0 - vUv.x;

    // Calculate fade factors for left and right edges
    float leftFade = smoothstep(0.0, fadeWidth, distFromLeft);
    float rightFade = smoothstep(0.0, fadeWidth, distFromRight);

    // Combine X fades
    float combinedFadeX = leftFade * rightFade;

    // Apply X fade strength
    float finalFadeX = mix(1.0, combinedFadeX, fadeStrength);

    // Calculate distance from top and bottom edges (Y-axis)
    float distFromBottom = vUv.y;
    float distFromTop = 1.0 - vUv.y;

    // Calculate fade factors for top and bottom edges
    float bottomFade = smoothstep(0.0, fadeWidthY, distFromBottom);
    float topFade = smoothstep(0.0, fadeWidthY, distFromTop);

    // Combine Y fades
    float combinedFadeY = bottomFade * topFade;

    // Apply Y fade strength
    float finalFadeY = mix(1.0, combinedFadeY, fadeStrengthY);

    // Combine X and Y fades
    float finalFade = finalFadeX * finalFadeY;

    // Mix between background color and rendered scene
    vec3 finalColor = mix(backgroundColor, texel.rgb, finalFade);

    gl_FragColor = vec4(finalColor, texel.a);
}