# Lausen Animation Project

## Overview
An interactive Three.js visualization featuring animated wave meshes with particle networks. The project creates flowing, ribbon-like wave animations combined with dynamic particle networks that form connected graphs.

## Technology Stack
- **Three.js** (v0.180.0) - 3D graphics library
- **Vite** (v7.1.7) - Build tool and dev server
- **lil-gui** (v0.21.0) - Lightweight GUI for controls
- **stats.js** (v0.17.0) - Performance monitoring
- **GLSL Shaders** - Custom vertex and fragment shaders

## Project Structure

### Main Application Files
- **src/main.js** - Main application entry point
  - Initializes Three.js scene, camera, renderer
  - Contains `App` class (manages overall application)
  - Contains `Wave` class (manages wave mesh and shader material)
  - Sets up GUI controls with lil-gui
  - Manages animation loop and updates
  - Configures post-processing effects

### Core Components

#### 1. Wave Animation System
**Files:**
- `src/waveShader.js` - Wave shader configuration
- `src/shaders/waveVertex.glsl` - Vertex shader for wave mesh
- `src/shaders/waveFragment.glsl` - Fragment shader for wave mesh

**Features:**
- Flowing wave motion with sine-based calculations
- Twist/rotation effect along the wave
- Dynamic width variation (creates thinner/wider areas)
- Multi-color gradient system (up to 7 color stops)
- Configurable line rendering with anti-aliasing
- All parameters controllable via GUI

**Wave Parameters:**
- **Line Settings**: Line count, points per line, line width, opacity
- **Wave Motion**: Amplitude, frequency, speed
- **Twist Effect**: Twist amount, frequency, speed
- **Mesh Dimensions**: Width and height
- **Width Variation**: Variation strength, frequency, animation speed, pattern type
- **Gradient Colors**: 7 configurable color stops with interpolation

#### 2. Particle Network System
**Files:**
- `src/ParticleNetwork.js` - Particle network implementation

**Features:**
- **Poisson Disk Sampling** - Even particle distribution without clustering
- **Graph-based Connections** - Particles connect via minimum spanning tree + proximity connections
- **Dynamic Movement** - Sine wave-based smooth particle motion
- **Gradient Coloring** - Particles and connections colored based on X position using project gradient
- **3D Depth Control** - Configurable Z-axis spread (boundsZ parameter)

**Particle Network Parameters:**
- Particle count, size, opacity
- Line width (pixel-based using Line2/LineMaterial)
- Movement speed and range
- Z position (layer depth)
- Spread width/height/depth (boundsX/boundsY/boundsZ)
- Maximum connection distance

**Technical Details:**
- Uses THREE.InstancedMesh for efficient particle rendering
- Uses LineSegments2 for pixel-perfect line width control
- Ensures minimum 4 connections per particle for network integrity
- Checks for collinear points to avoid straight-line clusters

#### 3. Post-Processing Effects
**Files:**
- `src/edgeFade.js` - Edge fade shader configuration
- `src/shaders/edgeFadeVertex.glsl` - Edge fade vertex shader
- `src/shaders/edgeFadeFragment.glsl` - Edge fade fragment shader

**Features:**
- Fades edges of the viewport to background color
- Configurable fade width and strength
- Seamless integration with scene background

### Current Gradient Colors
Default gradient (purple to cyan/turquoise):
1. `#b084cc` - Purple/Lavender
2. `#8b6fb5` - Medium Purple
3. `#4c7ab8` - Blue
4. `#3a8cc8` - Medium Blue
5. `#5eb8d8` - Cyan Blue
6. `#7fcfe0` - Light Cyan
7. `#a8dfe8` - Pale Turquoise

## Application Architecture

### Class: `Wave`
Manages individual wave mesh instances.

**Methods:**
- `constructor(params)` - Initialize with parameters
- `createMesh()` - Creates geometry and shader material
- `updateUniforms()` - Updates shader uniforms (except colors)
- `updateColors()` - Updates all color uniforms
- `updateSingleColor(index)` - Updates a single color stop

### Class: `ParticleNetwork`
Manages particle network visualization.

**Methods:**
- `constructor(params)` - Initialize with parameters
- `initialize()` - Sets up particles and connections
- `generatePoissonDiskPositions()` - Creates evenly distributed particle positions
- `createConnectionGraph()` - Builds minimum spanning tree + proximity connections
- `createParticleMeshes()` - Creates instanced mesh for particles
- `createLineMeshes()` - Creates line segments for connections
- `update(elapsedTime)` - Updates particle positions and lines
- `updateColors()` - Updates gradient colors for particles and lines
- `updateZPosition(newZ)` - Moves all particles to new Z layer
- `updateParams(newParams)` - Updates visual parameters
- `recreate()` - Rebuilds entire network
- `updateResolution(width, height)` - Updates line resolution on window resize

### Class: `App`
Main application controller.

**Methods:**
- `constructor()` - Initializes entire application
- `setupStats()` - Creates FPS/MS/Memory monitors
- `setupCamera()` - Configures perspective camera
- `setupControls()` - Sets up OrbitControls
- `setupRenderer()` - Configures WebGL renderer
- `setupComposer()` - Configures post-processing pipeline
- `setupGUI()` - Creates all GUI controls
- `setupEventListeners()` - Handles window resize
- `animate()` - Main animation loop
- `getActiveColors()` - Helper to get gradient as THREE.Color array

## GUI Organization

The GUI is organized into folders:

1. **Settings Export/Import** - Download settings as JSON
2. **Line Settings** - Wave line appearance
3. **Wave Settings** - Wave motion parameters
4. **Twist Settings** - Twist/rotation effects
5. **Mesh Dimensions** - Width and height
6. **Width Variation** - Dynamic width changes
7. **Gradient Colors** - 7 color stops configuration
8. **Edge Fade** - Viewport edge fade effect
9. **Particle Network** - All particle system controls

## Performance Monitoring
Three Stats.js panels display:
- **FPS** (frames per second)
- **MS** (milliseconds per frame)
- **MB** (memory usage)

## Rendering Pipeline

1. Scene renders wave mesh with custom shaders
2. Particle network updates and renders
3. EffectComposer applies post-processing:
   - RenderPass (main scene render)
   - EdgeFadeShader (viewport edge fade)

## Known Behaviors

### Random Generation Issue
- **Current Behavior**: Particle network positions change on every page refresh
- **Reason**: Uses Math.random() without seeding
- **Needed Solution**: Implement seeded random number generator with preset system

## Future Enhancements Needed

1. **Preset System for Particle Network**
   - Add seeded random number generator
   - Create named presets (e.g., "Preset 1", "Preset 2", "Preset 3")
   - Add preset selector in GUI
   - Ensure same preset generates identical network every time

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Key Technical Concepts

### GLSL Shaders
- **Vertex Shader** - Transforms vertices, calculates wave motion, twist, width variation
- **Fragment Shader** - Renders lines with anti-aliasing, applies colors

### Three.js Components Used
- PlaneGeometry (for wave mesh grid)
- ShaderMaterial (custom GLSL shaders)
- InstancedMesh (efficient particle rendering)
- LineSegments2 (pixel-accurate line width)
- LineMaterial (advanced line rendering)
- EffectComposer (post-processing)
- OrbitControls (camera control)

### Animation Techniques
- **Sine Waves** - Smooth, periodic motion
- **Time-based Animation** - Uses elapsed time for continuous animation
- **Multi-frequency Combinations** - Layering multiple sine waves for complex motion
- **Gradient Interpolation** - Smooth color transitions across X-axis

## File Reference Quick Guide

| File | Purpose |
|------|---------|
| `src/main.js` | Main app, Wave class, GUI setup |
| `src/ParticleNetwork.js` | Particle network with graph connections |
| `src/waveShader.js` | Wave shader uniforms |
| `src/shaders/waveVertex.glsl` | Wave vertex transformations |
| `src/shaders/waveFragment.glsl` | Wave line rendering |
| `src/edgeFade.js` | Edge fade shader uniforms |
| `src/shaders/edgeFadeVertex.glsl` | Edge fade vertex pass-through |
| `src/shaders/edgeFadeFragment.glsl` | Edge fade effect |
| `index.html` | HTML entry point |
| `package.json` | Dependencies and scripts |
