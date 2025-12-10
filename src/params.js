/**
 * Default parameters for the animation application
 */
export const defaultParams = {
  // Visibility controls
  waveVisible: true,
  particleNetworkVisible: true,
  spectrumBarsVisible: true,
  floatingNumbersVisible: true,

  lineCount: 60,
  pointsPerLine: 7,
  lineWidth: 0.3,
  opacity: 0.7,

  waveAmplitude: 0,
  waveFrequency: 0,
  waveSpeed: 0,

  twistAmount: 5,
  twistFrequency: 0.7,
  twistSpeed: 0.05,
  twistStagger: 0.2,

  meshWidth: 25,
  meshHeight: 8,

  color1: '#9d00ff',
  color2: '#bf94ff',
  color3: '#67a8fe',
  color4: '#52b7ff',
  color5: '#76dafe',
  color6: '#5cffb3',
  color7: '#00ddff',
  colorStops: 7,

  fadeWidth: 0.2,
  fadeStrength: 1,
  fadeWidthY: 0.3,
  fadeStrengthY: 1,

  // Particle Network params
  particleCount: 50,
  particleSize: 0.07,
  particleLineWidth: 2.0, // Line2 uses pixel width
  particleOpacity: 0.9,
  movementSpeed: 0.1,
  movementRange: 1.0,
  particleSpreadWidth: 0.8, // Multiplier for particle spread (0.3-2.0)
  particleSpreadHeight: 1.0, // Multiplier for particle spread height (0.3-2.0)
  particleSpreadDepth: 5, // Z-axis spread depth
  particleScaleRange: 0.5, // Depth-based scale variation (0 = no variation, 1 = full variation)
  maxConnectionDistance: 2.0,
  particleSeed: 42857, // Seed for random generation

  // Spectrum Bars params
  spectrumBarCount: 120,
  spectrumBarGap: 0.0,
  spectrumBaseHeight: 1,
  spectrumMaxHeight: 5,
  spectrumSpeed: 0.5,
  spectrumSmoothness: 0.3,
  spectrumOpacity: 0.95,
  spectrumFadeStart: 0.5,
  spectrumFadeEnd: 0.2,
  spectrumPositionY: -3,

  // Floating Numbers params
  floatingNumberCount: 15,
  floatingNumberFontSize: 24,
  floatingNumberOpacity: 1,
  floatingNumberSpeed: 5,
  floatingNumberSpeedVariation: 0.5,
  floatingNumberMinSpacing: 2,
  floatingNumberValueChangeInterval: 0.05,
  floatingNumberDigitGap: -0.1,
  floatingNumberSeed: 98765,
};
