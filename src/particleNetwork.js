import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import vertexShader from './shaders/particle/vertex.glsl';
import fragmentShader from './shaders/particle/fragment.glsl';

/**
 * ParticleNetwork creates a network graph of particles connected by lines.
 * Particles move chaotically within bounds, and connections are fixed at initialization.
 */
export class ParticleNetwork {
  constructor(params) {
    this.params = {
      particleCount: params.particleCount,
      particleSize: params.particleSize,
      lineWidth: params.lineWidth,
      opacity: params.opacity,
      colors: params.colors,
      colorStops: params.colorStops,
      movementSpeed: params.movementSpeed,
      movementRange: params.movementRange,
      zPosition: params.zPosition ?? -3.0,
      boundsX: params.boundsX,
      boundsY: params.boundsY,
      boundsZ: params.boundsZ,
      maxConnectionDistance: params.maxConnectionDistance,
      scaleRange: params.scaleRange,
      seed: params.seed,
    };

    this.particles = [];
    this.connections = [];
    this.group = new THREE.Group();

    // Initialize seeded random number generator
    this.rng = this.createSeededRandom(this.params.seed);

    this.initialize();
  }

  /**
   * Seeded random number generator (mulberry32 algorithm)
   * Returns a function that generates deterministic random numbers
   */
  createSeededRandom(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Check if three points are nearly collinear (form a nearly straight line)
   */
  isNearlyCollinear(p1, p2, p3, threshold = 0.15) {
    // Calculate the area of triangle formed by three points
    // If area is very small, points are nearly collinear
    const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;

    // Calculate the perimeter
    const d12 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const d23 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));
    const d31 = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
    const perimeter = d12 + d23 + d31;

    // If area/perimeter ratio is very small, points are collinear
    return area / perimeter < threshold;
  }

  /**
   * Generate evenly distributed positions using Poisson disk sampling
   * This ensures particles are well-spread with no clustering
   */
  generatePoissonDiskPositions(count, width, height, minDistance) {
    const positions = [];

    // Adjust minimum distance to ensure particles spread across the full width
    // Calculate how many particles can fit in the width with given minDistance
    const maxParticlesInRow = Math.floor(width / minDistance);

    // If we have fewer particles than can fit, reduce minDistance to spread them out
    if (count < maxParticlesInRow * 2) {
      minDistance = Math.min(minDistance, (width / Math.sqrt(count)) * 0.6);
    }

    const cellSize = minDistance / Math.sqrt(2);
    const gridWidth = Math.ceil(width / cellSize);
    const gridHeight = Math.ceil(height / cellSize);
    const grid = new Array(gridWidth * gridHeight).fill(null);
    const activeList = [];

    // Helper to get grid index
    const getGridIndex = (x, y) => {
      const gridX = Math.floor((x + width / 2) / cellSize);
      const gridY = Math.floor((y + height / 2) / cellSize);
      if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) return -1;
      return gridY * gridWidth + gridX;
    };

    // Add multiple seed points across the width to ensure full coverage
    const seedCount = Math.min(5, Math.ceil(count / 10));
    for (let i = 0; i < seedCount; i++) {
      const seedPoint = {
        x: (i / (seedCount - 1) - 0.5) * width * 0.9,
        y: (this.rng() - 0.5) * height * 0.8,
      };
      positions.push(seedPoint);
      activeList.push(seedPoint);
      const seedIdx = getGridIndex(seedPoint.x, seedPoint.y);
      if (seedIdx >= 0) grid[seedIdx] = seedPoint;
    }

    // Generate points
    const maxAttempts = 30;
    while (activeList.length > 0 && positions.length < count) {
      const randomIndex = Math.floor(this.rng() * activeList.length);
      const point = activeList[randomIndex];
      let found = false;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const angle = this.rng() * Math.PI * 2;
        const radius = minDistance * (1 + this.rng());
        const newPoint = {
          x: point.x + Math.cos(angle) * radius,
          y: point.y + Math.sin(angle) * radius,
        };

        // Check if in bounds
        if (Math.abs(newPoint.x) > width / 2 || Math.abs(newPoint.y) > height / 2) {
          continue;
        }

        // Check if far enough from existing points
        const gridIdx = getGridIndex(newPoint.x, newPoint.y);
        if (gridIdx < 0) continue;

        let valid = true;
        const gridX = Math.floor((newPoint.x + width / 2) / cellSize);
        const gridY = Math.floor((newPoint.y + height / 2) / cellSize);

        // Check neighboring cells
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const checkX = gridX + dx;
            const checkY = gridY + dy;
            if (checkX < 0 || checkX >= gridWidth || checkY < 0 || checkY >= gridHeight) continue;

            const checkIdx = checkY * gridWidth + checkX;
            const neighbor = grid[checkIdx];
            if (neighbor) {
              const dist = Math.sqrt(Math.pow(newPoint.x - neighbor.x, 2) + Math.pow(newPoint.y - neighbor.y, 2));
              if (dist < minDistance) {
                valid = false;
                break;
              }
            }
          }
          if (!valid) break;
        }

        if (valid) {
          // Additional check: avoid creating collinear points with nearby positions
          let isCollinear = false;
          if (positions.length >= 2) {
            // Check if this new point is collinear with any pair of existing nearby points
            const nearbyPositions = positions.filter(p => {
              const dist = Math.sqrt(Math.pow(newPoint.x - p.x, 2) + Math.pow(newPoint.y - p.y, 2));
              return dist < minDistance * 3;
            });

            for (let i = 0; i < nearbyPositions.length - 1; i++) {
              for (let j = i + 1; j < nearbyPositions.length; j++) {
                if (this.isNearlyCollinear(nearbyPositions[i], nearbyPositions[j], newPoint)) {
                  isCollinear = true;
                  break;
                }
              }
              if (isCollinear) break;
            }
          }

          if (!isCollinear) {
            positions.push(newPoint);
            activeList.push(newPoint);
            grid[gridIdx] = newPoint;
            found = true;
            break;
          }
        }
      }

      if (!found) {
        activeList.splice(randomIndex, 1);
      }
    }

    // If we didn't get enough points, fill with random positions (fallback)
    while (positions.length < count) {
      positions.push({
        x: (this.rng() - 0.5) * width,
        y: (this.rng() - 0.5) * height,
      });
    }

    return positions;
  }

  /**
   * Initialize particle positions, velocities, and create connection graph
   */
  initialize() {
    // Generate well-distributed particle positions using Poisson disk sampling
    const positions = this.generatePoissonDiskPositions(
      this.params.particleCount,
      this.params.boundsX,
      this.params.boundsY,
      this.params.maxConnectionDistance * 0.5 // Minimum distance between particles
    );

    // Create particles with generated positions
    for (let i = 0; i < positions.length; i++) {
      const particle = {
        id: i,
        position: new THREE.Vector3(
          positions[i].x,
          positions[i].y,
          this.params.zPosition + (this.rng() - 0.5) * this.params.boundsZ
        ),
        startPosition: new THREE.Vector3(), // Will be set after position
        // Store movement offset and phase for sine wave movement
        offsetX: this.rng() * Math.PI * 2,
        offsetY: this.rng() * Math.PI * 2,
        offsetZ: this.rng() * Math.PI * 2,
        speedMultX: 0.5 + this.rng() * 1.0,
        speedMultY: 0.5 + this.rng() * 1.0,
        speedMultZ: 0.5 + this.rng() * 1.0,
        connections: [],
      };
      particle.startPosition.copy(particle.position);
      this.particles.push(particle);
    }

    // Create connection graph using minimum spanning tree + additional connections
    this.createConnectionGraph();

    // Create visual meshes
    this.createParticleMeshes();
    this.createLineMeshes();
  }

  /**
   * Create connection graph where each particle connects to all others within reach distance
   * Ensures minimum 2 connections per particle using MST first
   */
  createConnectionGraph() {
    // Step 1: Build minimum spanning tree to ensure all particles are connected with at least 2 connections each
    const connected = new Set([0]); // Start with first particle
    const unconnected = new Set(this.particles.slice(1).map(p => p.id));

    // Prim's algorithm for MST - ensures connectivity
    while (unconnected.size > 0) {
      let minDist = Infinity;
      let closestPair = null;

      for (const connectedId of connected) {
        for (const unconnectedId of unconnected) {
          const dist = this.particles[connectedId].position.distanceTo(this.particles[unconnectedId].position);
          if (dist < minDist) {
            minDist = dist;
            closestPair = [connectedId, unconnectedId];
          }
        }
      }

      if (closestPair) {
        const [a, b] = closestPair;
        this.addConnection(a, b);
        connected.add(b);
        unconnected.delete(b);
      }
    }

    // Step 2: Connect each particle to ALL other particles within maxConnectionDistance
    for (let i = 0; i < this.params.particleCount; i++) {
      const particleA = this.particles[i];

      for (let j = i + 1; j < this.params.particleCount; j++) {
        const particleB = this.particles[j];

        // Only add if not already connected
        if (!particleA.connections.includes(j)) {
          const dist = particleA.position.distanceTo(particleB.position);

          // Connect if within reach distance
          if (dist <= this.params.maxConnectionDistance) {
            this.addConnection(i, j);
          }
        }
      }
    }

    // Step 3: Aggressively ensure minimum 4 connections per particle
    const minConnections = 4;
    let maxIterations = 10;
    let iteration = 0;

    // Keep iterating until all particles have at least 4 connections
    while (iteration < maxIterations) {
      let allSatisfied = true;
      iteration++;

      for (let i = 0; i < this.params.particleCount; i++) {
        const particle = this.particles[i];

        if (particle.connections.length < minConnections) {
          allSatisfied = false;

          // Find ALL neighbors sorted by distance (no distance limit)
          const neighbors = this.particles
            .map((p, idx) => ({ id: idx, dist: p.position.distanceTo(particle.position) }))
            .filter(n => n.id !== i && !particle.connections.includes(n.id))
            .sort((a, b) => a.dist - b.dist);

          const needed = minConnections - particle.connections.length;

          // Add connections to nearest neighbors
          for (let j = 0; j < Math.min(needed, neighbors.length); j++) {
            this.addConnection(i, neighbors[j].id);
          }
        }
      }

      // If all particles are satisfied, break early
      if (allSatisfied) {
        console.log(`All particles have minimum ${minConnections} connections after ${iteration} iteration(s)`);
        break;
      }
    }

    // Final verification and detailed logging
    let minConnectionsFound = Infinity;
    let maxConnectionsFound = 0;
    let particlesWithIssues = [];

    for (let i = 0; i < this.params.particleCount; i++) {
      const count = this.particles[i].connections.length;
      minConnectionsFound = Math.min(minConnectionsFound, count);
      maxConnectionsFound = Math.max(maxConnectionsFound, count);

      if (count < minConnections) {
        particlesWithIssues.push(i);
        console.error(`❌ Particle ${i} only has ${count} connection(s):`, this.particles[i].connections);
      }
    }

    console.log(`Network stats: ${this.params.particleCount} particles, ${this.connections.length} connections`);
    console.log(`Connections per particle: min=${minConnectionsFound}, max=${maxConnectionsFound}`);

    if (particlesWithIssues.length > 0) {
      console.error(`⚠️ ${particlesWithIssues.length} particles have fewer than ${minConnections} connections!`);
    }
  }

  /**
   * Add bidirectional connection between two particles
   */
  addConnection(idA, idB) {
    if (!this.particles[idA].connections.includes(idB)) {
      this.particles[idA].connections.push(idB);
      this.particles[idB].connections.push(idA);
      this.connections.push([idA, idB]);
    }
  }

  /**
   * Get color based on X position using gradient interpolation
   */
  getColorForPosition(x) {
    const minX = -this.params.boundsX / 2;
    const maxX = this.params.boundsX / 2;
    const normalizedX = (x - minX) / (maxX - minX);

    const activeColorCount = this.params.colorStops;
    const segmentSize = 1.0 / (activeColorCount - 1);
    const segmentIndex = Math.floor(normalizedX / segmentSize);
    const segmentT = (normalizedX - segmentIndex * segmentSize) / segmentSize;

    const colorIndex1 = Math.min(segmentIndex, activeColorCount - 1);
    const colorIndex2 = Math.min(colorIndex1 + 1, activeColorCount - 1);

    const color1 = this.params.colors[colorIndex1];
    const color2 = this.params.colors[colorIndex2];

    return new THREE.Color().lerpColors(color1, color2, segmentT);
  }

  /**
   * Create particle meshes using instanced spheres with vertex colors for gradient
   */
  createParticleMeshes() {
    // Create base geometry with proper size (not scaled later)
    const geometry = new THREE.SphereGeometry(this.params.particleSize, 8, 8);

    // Create custom shader material for gradient colors with depth-based scaling
    const material = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: this.params.opacity },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthWrite: false,
    });

    this.particleMesh = new THREE.InstancedMesh(geometry, material, this.params.particleCount);

    // Set up instance colors and scales
    const colors = new Float32Array(this.params.particleCount * 3);
    const scales = new Float32Array(this.params.particleCount);

    // Calculate scale based on Z position (closer to camera = larger)
    // Camera is at positive Z looking at negative Z
    const minZ = this.params.zPosition - this.params.boundsZ / 2;
    const maxZ = this.params.zPosition + this.params.boundsZ / 2;

    for (let i = 0; i < this.params.particleCount; i++) {
      const color = this.getColorForPosition(this.particles[i].position.x);
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Calculate scale: particles closer to camera (higher Z) are larger
      const normalizedZ = (this.particles[i].position.z - minZ) / (maxZ - minZ || 1);
      scales[i] = 1.0 - this.params.scaleRange + normalizedZ * this.params.scaleRange * 2;
    }

    this.particleMesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3));
    this.particleMesh.geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1));

    // Set initial positions
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < this.params.particleCount; i++) {
      matrix.setPosition(this.particles[i].position);
      this.particleMesh.setMatrixAt(i, matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    this.group.add(this.particleMesh);
  }

  /**
   * Create line meshes for connections using LineSegments2 for proper width control
   */
  createLineMeshes() {
    const positions = [];
    const colors = [];

    for (let i = 0; i < this.connections.length; i++) {
      const [idA, idB] = this.connections[i];
      const posA = this.particles[idA].position;
      const posB = this.particles[idB].position;

      // Set positions
      positions.push(posA.x, posA.y, posA.z);
      positions.push(posB.x, posB.y, posB.z);

      // Set colors based on X position
      const colorA = this.getColorForPosition(posA.x);
      const colorB = this.getColorForPosition(posB.x);

      colors.push(colorA.r, colorA.g, colorA.b);
      colors.push(colorB.r, colorB.g, colorB.b);
    }

    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(positions);
    geometry.setColors(colors);

    const material = new LineMaterial({
      color: 0xffffff,
      linewidth: this.params.lineWidth,
      vertexColors: true,
      transparent: true,
      opacity: this.params.opacity * 0.5,
      depthWrite: false,
      alphaToCoverage: true,
      dashed: false,
      worldUnits: false,
    });

    // Set resolution for proper line rendering
    material.resolution.set(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2)
    );

    this.lineMesh = new LineSegments2(geometry, material);
    this.group.add(this.lineMesh);
  }

  /**
   * Update particle positions and line geometry
   * @param {number} elapsedTime - Total elapsed time in seconds
   */
  update(elapsedTime) {
    if (!this.particles.length || !this.particleMesh || !this.lineMesh) {
      return;
    }

    const matrix = new THREE.Matrix4();
    const scales = this.particleMesh.geometry.attributes.instanceScale.array;

    // Calculate Z bounds for scale calculation
    const minZ = this.params.zPosition - this.params.boundsZ / 2 - this.params.movementRange * 0.3;
    const maxZ = this.params.zPosition + this.params.boundsZ / 2 + this.params.movementRange * 0.3;

    // Update particle positions using sine waves for smooth, continuous movement
    for (let i = 0; i < this.params.particleCount; i++) {
      const particle = this.particles[i];

      // Calculate new position using sine waves
      const timeX = elapsedTime * this.params.movementSpeed * particle.speedMultX + particle.offsetX;
      const timeY = elapsedTime * this.params.movementSpeed * particle.speedMultY + particle.offsetY;
      const timeZ = elapsedTime * this.params.movementSpeed * particle.speedMultZ + particle.offsetZ;

      particle.position.x = particle.startPosition.x + Math.sin(timeX) * this.params.movementRange;
      particle.position.y = particle.startPosition.y + Math.sin(timeY) * this.params.movementRange;
      particle.position.z = particle.startPosition.z + Math.sin(timeZ) * this.params.movementRange * 0.3;

      // Update scale based on Z position (closer to camera = larger)
      const normalizedZ = (particle.position.z - minZ) / (maxZ - minZ || 1);
      scales[i] = 1.0 - this.params.scaleRange + normalizedZ * this.params.scaleRange * 2;

      // Update instance matrix
      matrix.setPosition(particle.position);
      this.particleMesh.setMatrixAt(i, matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.particleMesh.geometry.attributes.instanceScale.needsUpdate = true;

    // Update line positions
    const positions = [];
    for (let i = 0; i < this.connections.length; i++) {
      const [idA, idB] = this.connections[i];
      const posA = this.particles[idA].position;
      const posB = this.particles[idB].position;

      positions.push(posA.x, posA.y, posA.z);
      positions.push(posB.x, posB.y, posB.z);
    }
    this.lineMesh.geometry.setPositions(positions);
  }

  /**
   * Update colors for all particles and lines
   */
  updateColors() {
    if (!this.particleMesh || !this.lineMesh) return;

    // Update particle colors
    const particleColors = this.particleMesh.geometry.attributes.instanceColor.array;
    for (let i = 0; i < this.params.particleCount; i++) {
      const color = this.getColorForPosition(this.particles[i].position.x);
      particleColors[i * 3 + 0] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }
    this.particleMesh.geometry.attributes.instanceColor.needsUpdate = true;

    // Update line colors
    const lineColors = [];
    for (let i = 0; i < this.connections.length; i++) {
      const [idA, idB] = this.connections[i];
      const posA = this.particles[idA].position;
      const posB = this.particles[idB].position;

      const colorA = this.getColorForPosition(posA.x);
      const colorB = this.getColorForPosition(posB.x);

      lineColors.push(colorA.r, colorA.g, colorA.b);
      lineColors.push(colorB.r, colorB.g, colorB.b);
    }
    this.lineMesh.geometry.setColors(lineColors);
  }

  /**
   * Update visual parameters
   */
  updateParams(newParams) {
    Object.assign(this.params, newParams);

    // Update particle material
    if (this.particleMesh && this.particleMesh.material.uniforms) {
      this.particleMesh.material.uniforms.opacity.value = this.params.opacity;
    }

    // Update line material
    if (this.lineMesh && this.lineMesh.material) {
      this.lineMesh.material.opacity = this.params.opacity * 0.5;
      this.lineMesh.material.linewidth = this.params.lineWidth;
      this.lineMesh.material.needsUpdate = true;
    }

    // If colors changed, update them
    if (newParams.colors || newParams.colorStops) {
      this.updateColors();
    }
  }

  /**
   * Recreate the network with new particle count or connection settings
   */
  recreate() {
    // Clear existing meshes
    this.group.remove(this.particleMesh);
    this.group.remove(this.lineMesh);

    if (this.particleMesh) {
      this.particleMesh.geometry.dispose();
      this.particleMesh.material.dispose();
    }
    if (this.lineMesh) {
      this.lineMesh.geometry.dispose();
      this.lineMesh.material.dispose();
    }

    // Reset data
    this.particles = [];
    this.connections = [];

    // Reinitialize seeded random number generator with same seed
    this.rng = this.createSeededRandom(this.params.seed);

    // Reinitialize
    this.initialize();
  }

  /**
   * Update resolution for line rendering on window resize
   */
  updateResolution(width, height) {
    if (this.lineMesh && this.lineMesh.material) {
      this.lineMesh.material.resolution.set(
        width * Math.min(window.devicePixelRatio, 2),
        height * Math.min(window.devicePixelRatio, 2)
      );
    }
  }

  /**
   * Get the group containing all meshes
   */
  getGroup() {
    return this.group;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    if (this.particleMesh) {
      this.particleMesh.geometry.dispose();
      this.particleMesh.material.dispose();
    }
    if (this.lineMesh) {
      this.lineMesh.geometry.dispose();
      this.lineMesh.material.dispose();
    }
    this.group.clear();
  }
}
