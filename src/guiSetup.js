import { GUI } from 'lil-gui';

/**
 * Sets up the GUI controls for the animation application
 * @param {Object} app - The main application instance
 */
export function setupGUI(app) {
  const gui = new GUI();

  setupVisibilityFolder(gui, app);
  setupSettingsFolder(gui, app);
  setupLineFolder(gui, app);
  setupWaveFolder(gui, app);
  setupTwistFolder(gui, app);
  setupMeshFolder(gui, app);
  setupColorFolder(gui, app);
  setupFadeFolder(gui, app);
  setupParticleFolder(gui, app);
  setupSpectrumFolder(gui, app);
  setupFloatingNumbersFolder(gui, app);

  return gui;
}

function setupVisibilityFolder(gui, app) {
  const visibilityFolder = gui.addFolder('👁️ Visibility');
  visibilityFolder
    .add(app.params, 'waveVisible')
    .name('Wave')
    .onChange(visible => {
      app.wave.mesh.visible = visible;
    });
  visibilityFolder
    .add(app.params, 'particleNetworkVisible')
    .name('Particle Network')
    .onChange(visible => {
      app.particleNetwork.getGroup().visible = visible;
    });
  visibilityFolder
    .add(app.params, 'spectrumBarsVisible')
    .name('Spectrum Bars')
    .onChange(visible => {
      app.spectrumBars.mesh.visible = visible;
    });
  visibilityFolder
    .add(app.params, 'floatingNumbersVisible')
    .name('Floating Numbers')
    .onChange(visible => {
      app.floatingNumbers.getGroup().visible = visible;
    });
  visibilityFolder.open();
}

function setupSettingsFolder(gui, app) {
  const settingsFolder = gui.addFolder('Settings Export/Import');
  settingsFolder
    .add(
      {
        exportJSON: () => {
          const settingsJSON = JSON.stringify(app.params, null, 2);
          const blob = new Blob([settingsJSON], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wave-settings.json';
          a.click();
          // Revoke the URL immediately after use to prevent memory leak
          setTimeout(() => URL.revokeObjectURL(url), 100);
        },
      },
      'exportJSON'
    )
    .name('💾 Download Settings JSON');
  settingsFolder.close();
}

function setupLineFolder(gui, app) {
  const lineFolder = gui.addFolder('Line Settings');
  lineFolder
    .add(app.params, 'lineCount', 20, 200, 1)
    .name('Line Count')
    .onChange(() => {
      const oldMesh = app.wave.mesh;
      app.scene.remove(oldMesh);
      // Dispose old geometry and material
      if (oldMesh.geometry) oldMesh.geometry.dispose();
      if (oldMesh.material) oldMesh.material.dispose();
      app.wave.createMesh();
      app.scene.add(app.wave.mesh);
    });
  lineFolder
    .add(app.params, 'pointsPerLine', 5, 500, 1)
    .name('Points Per Line')
    .onChange(() => {
      const oldMesh = app.wave.mesh;
      app.scene.remove(oldMesh);
      // Dispose old geometry and material
      if (oldMesh.geometry) oldMesh.geometry.dispose();
      if (oldMesh.material) oldMesh.material.dispose();
      app.wave.createMesh();
      app.scene.add(app.wave.mesh);
    });
  lineFolder
    .add(app.params, 'lineWidth', 0.1, 1, 0.01)
    .name('Line Width')
    .onChange(() => app.wave.updateUniforms());
  lineFolder
    .add(app.params, 'opacity', 0.1, 1, 0.05)
    .name('Opacity')
    .onChange(() => app.wave.updateUniforms());
  lineFolder.close();
}

function setupWaveFolder(gui, app) {
  const waveFolder = gui.addFolder('Wave Settings');
  waveFolder
    .add(app.params, 'waveAmplitude', 0, 3, 0.1)
    .name('Wave Amplitude')
    .onChange(() => app.wave.updateUniforms());
  waveFolder
    .add(app.params, 'waveFrequency', 0.1, 5, 0.1)
    .name('Wave Frequency')
    .onChange(() => app.wave.updateUniforms());
  waveFolder
    .add(app.params, 'waveSpeed', 0, 2, 0.05)
    .name('Wave Speed')
    .onChange(() => app.wave.updateUniforms());
  waveFolder.close();
}

function setupTwistFolder(gui, app) {
  const twistFolder = gui.addFolder('Twist Settings');
  twistFolder
    .add(app.params, 'twistAmount', 0, 10, 0.1)
    .name('Twist Amount')
    .onChange(() => app.wave.updateUniforms());
  twistFolder
    .add(app.params, 'twistFrequency', 0.1, 3, 0.1)
    .name('Twist Frequency')
    .onChange(() => app.wave.updateUniforms());
  twistFolder
    .add(app.params, 'twistSpeed', 0, 2, 0.05)
    .name('Twist Speed')
    .onChange(() => app.wave.updateUniforms());
  twistFolder
    .add(app.params, 'twistStagger', 0, 20, 0.1)
    .name('Twist Stagger')
    .onChange(() => app.wave.updateUniforms());
  twistFolder.close();
}

function setupMeshFolder(gui, app) {
  const meshFolder = gui.addFolder('Mesh Dimensions');
  meshFolder
    .add(app.params, 'meshWidth', 5, 30, 0.5)
    .name('Mesh Width')
    .onChange(() => {
      app.wave.updateUniforms();
      // Update spectrum bars totalWidth and recreate
      app.spectrumBars.setParams({ totalWidth: app.params.meshWidth });
      const oldMesh = app.spectrumBars.recreateMesh();
      app.scene.remove(oldMesh);
      // Dispose old mesh resources
      if (oldMesh.geometry) oldMesh.geometry.dispose();
      if (oldMesh.material) oldMesh.material.dispose();
      app.scene.add(app.spectrumBars.mesh);
    });
  meshFolder
    .add(app.params, 'meshHeight', 0.5, 10, 0.1)
    .name('Mesh Height')
    .onChange(() => app.wave.updateUniforms());
  meshFolder.close();
}

function setupColorFolder(gui, app) {
  const colorFolder = gui.addFolder('Gradient Colors');
  colorFolder
    .add(app.params, 'colorStops', 1, 7, 1)
    .name('Color Stops')
    .onChange(() => {
      app.wave.updateUniforms();
      app.wave.updateColors();
      app.invalidateColorCache();
      // Update particle network colors
      app.particleNetwork.updateParams({
        colors: app.getActiveColors(),
        colorStops: app.params.colorStops,
      });
      // Update spectrum bars colors
      app.spectrumBars.setParams({
        colors: app.getActiveColors(),
        colorStops: app.params.colorStops,
      });
      // Update floating numbers colors
      app.floatingNumbers.updateColors(app.getActiveColors(), app.params.colorStops);
    });

  // Create color controllers using a loop to reduce redundancy
  for (let i = 1; i <= 7; i++) {
    colorFolder
      .addColor(app.params, `color${i}`)
      .name(`Color ${i}`)
      .onChange(() => {
        app.updateCachedColor(i - 1);
        app.wave.updateSingleColor(i - 1);
        app.particleNetwork.updateParams({ colors: app.getActiveColors() });
        app.spectrumBars.setParams({ colors: app.getActiveColors() });
        app.floatingNumbers.updateColors(app.getActiveColors(), app.params.colorStops);
      });
  }
  colorFolder.close();
}

function setupFadeFolder(gui, app) {
  const fadeFolder = gui.addFolder('Edge Fade');
  fadeFolder
    .add(app.params, 'fadeWidth', 0, 0.5, 0.01)
    .name('Fade Width (X)')
    .onChange(() => {
      app.edgeFadePass.uniforms.fadeWidth.value = app.params.fadeWidth;
    });
  fadeFolder
    .add(app.params, 'fadeStrength', 0, 1, 0.05)
    .name('Fade Strength (X)')
    .onChange(() => {
      app.edgeFadePass.uniforms.fadeStrength.value = app.params.fadeStrength;
    });
  fadeFolder
    .add(app.params, 'fadeWidthY', 0, 0.5, 0.01)
    .name('Fade Width (Y)')
    .onChange(() => {
      app.edgeFadePass.uniforms.fadeWidthY.value = app.params.fadeWidthY;
    });
  fadeFolder
    .add(app.params, 'fadeStrengthY', 0, 1, 0.05)
    .name('Fade Strength (Y)')
    .onChange(() => {
      app.edgeFadePass.uniforms.fadeStrengthY.value = app.params.fadeStrengthY;
    });
  fadeFolder.close();
}

function setupParticleFolder(gui, app) {
  const particleFolder = gui.addFolder('Particle Network');

  // Manual seed input
  const seedController = particleFolder
    .add(app.params, 'particleSeed', 0, 999999, 1)
    .name('Seed Number')
    .onChange(seed => {
      app.particleNetwork.params.seed = seed;
      app.particleNetwork.params.colors = app.getActiveColors();
      app.particleNetwork.params.colorStops = app.params.colorStops;
      app.particleNetwork.recreate();
    });

  // Random seed button
  particleFolder
    .add(
      {
        randomSeed: () => {
          // Generate new random seed
          const newSeed = Math.floor(Math.random() * 999999);
          app.params.particleSeed = newSeed;

          // Update the GUI controller to show new value
          seedController.updateDisplay();

          // Apply the new seed
          app.particleNetwork.params.seed = newSeed;
          app.particleNetwork.params.colors = app.getActiveColors();
          app.particleNetwork.params.colorStops = app.params.colorStops;
          app.particleNetwork.recreate();
        },
      },
      'randomSeed'
    )
    .name('🎲 Random Seed');

  particleFolder
    .add(app.params, 'particleCount', 20, 200, 1)
    .name('Particle Count')
    .onChange(() => {
      app.particleNetwork.params.particleCount = app.params.particleCount;
      app.particleNetwork.params.colors = app.getActiveColors();
      app.particleNetwork.params.colorStops = app.params.colorStops;
      app.particleNetwork.recreate();
    });
  particleFolder
    .add(app.params, 'particleSize', 0.01, 0.2, 0.01)
    .name('Particle Size')
    .onChange(() => {
      app.particleNetwork.params.particleSize = app.params.particleSize;
      app.particleNetwork.params.colors = app.getActiveColors();
      app.particleNetwork.params.colorStops = app.params.colorStops;
      app.particleNetwork.recreate();
    });
  particleFolder
    .add(app.params, 'particleLineWidth', 0.1, 10, 0.1)
    .name('Line Width (px)')
    .onChange(() => {
      app.particleNetwork.updateParams({ lineWidth: app.params.particleLineWidth });
    });
  particleFolder
    .add(app.params, 'particleOpacity', 0.1, 1, 0.05)
    .name('Opacity')
    .onChange(() => {
      app.particleNetwork.updateParams({ opacity: app.params.particleOpacity });
    });
  particleFolder
    .add(app.params, 'movementSpeed', 0, 1, 0.05)
    .name('Movement Speed')
    .onChange(() => {
      app.particleNetwork.params.movementSpeed = app.params.movementSpeed;
    });
  particleFolder
    .add(app.params, 'movementRange', 0.1, 5, 0.1)
    .name('Movement Range')
    .onChange(() => {
      app.particleNetwork.params.movementRange = app.params.movementRange;
    });
  particleFolder
    .add(app.params, 'particleScaleRange', 0, 1, 0.05)
    .name('Depth Scale Variation')
    .onChange(() => {
      app.particleNetwork.params.scaleRange = app.params.particleScaleRange;
    });
  particleFolder
    .add(app.params, 'particleSpreadWidth', 0.1, 2.0, 0.1)
    .name('Spread Width')
    .onChange(() => {
      app.particleNetwork.params.boundsX = app.params.meshWidth * app.params.particleSpreadWidth;
      app.particleNetwork.params.colors = app.getActiveColors();
      app.particleNetwork.params.colorStops = app.params.colorStops;
      app.particleNetwork.recreate();
    });
  particleFolder
    .add(app.params, 'particleSpreadHeight', 0.3, 2.0, 0.1)
    .name('Spread Height')
    .onChange(() => {
      app.particleNetwork.params.boundsY = app.params.meshHeight * app.params.particleSpreadHeight;
      app.particleNetwork.params.colors = app.getActiveColors();
      app.particleNetwork.params.colorStops = app.params.colorStops;
      app.particleNetwork.recreate();
    });
  particleFolder
    .add(app.params, 'particleSpreadDepth', 0, 10.0, 0.1)
    .name('Spread Depth (Z)')
    .onChange(() => {
      app.particleNetwork.params.boundsZ = app.params.particleSpreadDepth;
      app.particleNetwork.params.colors = app.getActiveColors();
      app.particleNetwork.params.colorStops = app.params.colorStops;
      app.particleNetwork.recreate();
    });
  particleFolder
    .add(app.params, 'maxConnectionDistance', 1, 10, 0.1)
    .name('Connection Reach Distance')
    .onChange(() => {
      app.particleNetwork.params.maxConnectionDistance = app.params.maxConnectionDistance;
      app.particleNetwork.params.colors = app.getActiveColors();
      app.particleNetwork.params.colorStops = app.params.colorStops;
      app.particleNetwork.recreate();
    });
  particleFolder.close();
}

function setupSpectrumFolder(gui, app) {
  const spectrumFolder = gui.addFolder('Spectrum Bars');
  spectrumFolder
    .add(app.params, 'spectrumBarCount', 10, 200, 1)
    .name('Bar Count')
    .onChange(value => {
      app.spectrumBars.setParams({ barCount: value });
      const oldMesh = app.spectrumBars.recreateMesh();
      app.scene.remove(oldMesh);
      // Dispose old mesh resources
      if (oldMesh.geometry) oldMesh.geometry.dispose();
      if (oldMesh.material) oldMesh.material.dispose();
      app.scene.add(app.spectrumBars.mesh);
    });
  spectrumFolder
    .add(app.params, 'spectrumBarGap', 0.0, 1.0, 0.01)
    .name('Bar Gap')
    .onChange(value => {
      app.spectrumBars.setParams({ barGap: value });
      const oldMesh = app.spectrumBars.recreateMesh();
      app.scene.remove(oldMesh);
      // Dispose old mesh resources
      if (oldMesh.geometry) oldMesh.geometry.dispose();
      if (oldMesh.material) oldMesh.material.dispose();
      app.scene.add(app.spectrumBars.mesh);
    });
  spectrumFolder
    .add(app.params, 'spectrumPositionY', -10, 10, 0.1)
    .name('Position Y')
    .onChange(value => {
      app.spectrumBars.mesh.position.y = value;
    });
  spectrumFolder
    .add(app.params, 'spectrumBaseHeight', 0, 2.0, 0.1)
    .name('Base Height')
    .onChange(value => {
      app.spectrumBars.setParams({ baseHeight: value });
    });
  spectrumFolder
    .add(app.params, 'spectrumMaxHeight', 1.0, 10.0, 0.1)
    .name('Max Height')
    .onChange(value => {
      app.spectrumBars.setParams({ maxHeight: value });
    });
  spectrumFolder
    .add(app.params, 'spectrumSpeed', 0.1, 5.0, 0.01)
    .name('Speed')
    .onChange(value => {
      app.spectrumBars.setParams({ speed: value });
    });
  spectrumFolder
    .add(app.params, 'spectrumSmoothness', 0, 1.0, 0.01)
    .name('Smoothness')
    .onChange(value => {
      app.spectrumBars.setParams({ smoothness: value });
    });
  spectrumFolder
    .add(app.params, 'spectrumOpacity', 0, 1.0, 0.01)
    .name('Opacity')
    .onChange(value => {
      app.spectrumBars.setParams({ opacity: value });
    });
  spectrumFolder
    .add(app.params, 'spectrumFadeStart', 0, 1.0, 0.01)
    .name('Fade Start')
    .onChange(value => {
      app.spectrumBars.setParams({ fadeStart: value });
    });
  spectrumFolder
    .add(app.params, 'spectrumFadeEnd', 0, 1.0, 0.01)
    .name('Fade End')
    .onChange(value => {
      app.spectrumBars.setParams({ fadeEnd: value });
    });
  spectrumFolder.close();
}

function setupFloatingNumbersFolder(gui, app) {
  const floatingNumbersFolder = gui.addFolder('Floating Numbers');

  // Seed control with random button
  const floatingSeedController = floatingNumbersFolder
    .add(app.params, 'floatingNumberSeed', 0, 999999, 1)
    .name('Seed Number')
    .onChange(seed => {
      app.floatingNumbers.params.seed = seed;
      app.floatingNumbers.params.colors = app.getActiveColors();
      app.floatingNumbers.params.colorStops = app.params.colorStops;
      app.floatingNumbers.recreate();
    });

  floatingNumbersFolder
    .add(
      {
        randomSeed: () => {
          const newSeed = Math.floor(Math.random() * 999999);
          app.params.floatingNumberSeed = newSeed;
          floatingSeedController.updateDisplay();
          app.floatingNumbers.params.seed = newSeed;
          app.floatingNumbers.params.colors = app.getActiveColors();
          app.floatingNumbers.params.colorStops = app.params.colorStops;
          app.floatingNumbers.recreate();
        },
      },
      'randomSeed'
    )
    .name('🎲 Random Seed');

  floatingNumbersFolder
    .add(app.params, 'floatingNumberCount', 10, 50, 1)
    .name('Number Count')
    .onChange(value => {
      app.floatingNumbers.params.numberCount = value;
      app.floatingNumbers.params.colors = app.getActiveColors();
      app.floatingNumbers.params.colorStops = app.params.colorStops;
      app.floatingNumbers.recreate();
    });

  floatingNumbersFolder
    .add(app.params, 'floatingNumberFontSize', 8, 48, 1)
    .name('Font Size')
    .onChange(value => {
      app.floatingNumbers.params.fontSize = value;
      app.floatingNumbers.params.colors = app.getActiveColors();
      app.floatingNumbers.params.colorStops = app.params.colorStops;
      app.floatingNumbers.recreate();
    });

  floatingNumbersFolder
    .add(app.params, 'floatingNumberOpacity', 0.1, 1.0, 0.05)
    .name('Opacity')
    .onChange(value => {
      app.floatingNumbers.setParams({ opacity: value });
      // Update all existing sprites
      for (const num of app.floatingNumbers.numbers) {
        num.sprite.material.opacity = value;
      }
    });

  floatingNumbersFolder
    .add(app.params, 'floatingNumberSpeed', 0.1, 10, 0.1)
    .name('Speed')
    .onChange(value => {
      app.floatingNumbers.setParams({ speed: value });
    });

  floatingNumbersFolder
    .add(app.params, 'floatingNumberSpeedVariation', 0, 1.0, 0.05)
    .name('Speed Variation')
    .onChange(value => {
      app.floatingNumbers.setParams({ speedVariation: value });
    });

  floatingNumbersFolder
    .add(app.params, 'floatingNumberMinSpacing', 0.5, 10.0, 0.1)
    .name('Min Spacing')
    .onChange(value => {
      app.floatingNumbers.setParams({ minSpacing: value });
    });

  floatingNumbersFolder
    .add(app.params, 'floatingNumberValueChangeInterval', 0.01, 1.0, 0.01)
    .name('Value Change Interval')
    .onChange(value => {
      app.floatingNumbers.setParams({ valueChangeInterval: value });
    });

  floatingNumbersFolder
    .add(app.params, 'floatingNumberDigitGap', -0.1, 0.3, 0.01)
    .name('Digit Gap')
    .onChange(value => {
      app.floatingNumbers.params.digitGap = value;
      app.floatingNumbers.params.colors = app.getActiveColors();
      app.floatingNumbers.params.colorStops = app.params.colorStops;
      app.floatingNumbers.recreate();
    });

  floatingNumbersFolder.close();
}
