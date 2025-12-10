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

    // Reusable Color objects to avoid allocations in hot paths
    this._tempColor = new THREE.Color();
    this._tempColor2 = new THREE.Color();
    // Reusable matrix for instance updates (avoids allocation in hot path)
    this._tempMatrix = new THREE.Matrix4();
    // Reusable array for line positions (will be sized during createLineMeshes)
    this._linePositions = null;

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
    // Calculate the area of triangle formed by three points using determinant formula
    // If area is very small, points are nearly collinear
    const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;

    // Calculate squared distances to avoid sqrt
    const d12sq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
    const d23sq = (p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2;
    const d31sq = (p1.x - p3.x) ** 2 + (p1.y - p3.y) ** 2;

    // Calculate perimeter from squared distances
    const perimeter = Math.sqrt(d12sq) + Math.sqrt(d23sq) + Math.sqrt(d31sq);

    // If area/perimeter ratio is very small, points are collinear
    return area / perimeter < threshold;
  }

  /**
   * Generate evenly distributed positions using grid-based jittered sampling
   * This ensures particles are uniformly spread across the entire area
   */
  generatePoissonDiskPositions(count, width, height, minDistance) {
    const positions = [];

    // Calculate optimal grid dimensions based on particle count
    // We want approximately equal spacing in X and Y
    const aspectRatio = width / height;
    const gridRows = Math.ceil(Math.sqrt(count / aspectRatio));
    const gridCols = Math.ceil(count / gridRows);

    // Calculate cell dimensions
    const cellWidth = width / gridCols;
    const cellHeight = height / gridRows;

    // Create grid cells and assign one particle per cell with jitter
    const cells = [];
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        cells.push({ row, col });
      }
    }

    // Shuffle cells using seeded random to avoid patterns
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    // Place particles in cells with random jitter
    const jitterAmount = 0.7; // How much particles can move within their cell (0-1)
    for (let i = 0; i < Math.min(count, cells.length); i++) {
      const { row, col } = cells[i];

      // Calculate cell center
      const cellCenterX = (col + 0.5) * cellWidth - width / 2;
      const cellCenterY = (row + 0.5) * cellHeight - height / 2;

      // Add random jitter within cell
      const jitterX = (this.rng() - 0.5) * cellWidth * jitterAmount;
      const jitterY = (this.rng() - 0.5) * cellHeight * jitterAmount;

      positions.push({
        x: cellCenterX + jitterX,
        y: cellCenterY + jitterY,
      });
    }

    // If we need more particles than grid cells, use relaxation on additional points
    while (positions.length < count) {
      // Add random point
      const newPoint = {
        x: (this.rng() - 0.5) * width * 0.95,
        y: (this.rng() - 0.5) * height * 0.95,
      };

      // Find area with fewest nearby particles
      let minNeighbors = Infinity;
      let bestPoint = newPoint;

      // Try several random positions and pick the one with fewest neighbors
      for (let attempt = 0; attempt < 10; attempt++) {
        const testPoint = {
          x: (this.rng() - 0.5) * width * 0.95,
          y: (this.rng() - 0.5) * height * 0.95,
        };

        // Count nearby particles
        let neighborCount = 0;
        const searchRadius = Math.max(cellWidth, cellHeight) * 1.5;
        const searchRadiusSq = searchRadius * searchRadius;

        for (const pos of positions) {
          const dx = testPoint.x - pos.x;
          const dy = testPoint.y - pos.y;
          if (dx * dx + dy * dy < searchRadiusSq) {
            neighborCount++;
          }
        }

        if (neighborCount < minNeighbors) {
          minNeighbors = neighborCount;
          bestPoint = testPoint;
        }
      }

      positions.push(bestPoint);
    }

    // Apply Lloyd's relaxation to further improve uniformity
    this.applyLloydRelaxation(positions, width, height, 3);

    return positions;
  }

  /**
   * Apply Lloyd's relaxation algorithm to improve point distribution uniformity
   * Moves each point towards the centroid of its Voronoi cell (approximated)
   */
  applyLloydRelaxation(positions, width, height, iterations) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    for (let iter = 0; iter < iterations; iter++) {
      // For each point, find its neighbors and move towards less dense areas
      const newPositions = positions.map((pos, idx) => {
        // Find nearby points
        const searchRadius = (Math.max(width, height) / Math.sqrt(positions.length)) * 2;
        const searchRadiusSq = searchRadius * searchRadius;

        let sumX = 0;
        let sumY = 0;
        let count = 0;

        for (let i = 0; i < positions.length; i++) {
          if (i === idx) continue;
          const other = positions[i];
          const dx = other.x - pos.x;
          const dy = other.y - pos.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < searchRadiusSq && distSq > 0) {
            // Weight by inverse distance - push away from nearby points
            const dist = Math.sqrt(distSq);
            const weight = 1 / dist;
            sumX -= (dx / dist) * weight;
            sumY -= (dy / dist) * weight;
            count++;
          }
        }

        if (count > 0) {
          // Move point slightly in the direction away from neighbors
          const moveStrength = 0.3;
          const magnitude = Math.sqrt(sumX * sumX + sumY * sumY) || 1;
          const newX = pos.x + (sumX / magnitude) * searchRadius * 0.1 * moveStrength;
          const newY = pos.y + (sumY / magnitude) * searchRadius * 0.1 * moveStrength;

          // Keep within bounds
          return {
            x: Math.max(-halfWidth * 0.95, Math.min(halfWidth * 0.95, newX)),
            y: Math.max(-halfHeight * 0.95, Math.min(halfHeight * 0.95, newY)),
          };
        }

        return pos;
      });

      // Update positions
      for (let i = 0; i < positions.length; i++) {
        positions[i] = newPositions[i];
      }
    }
  }

  /**
   * Initialize particle positions, velocities, and create connection graph
   */
  initialize() {
    // Generate uniformly distributed particle positions using grid-based jittered sampling
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

    // Cache distance squared threshold
    const maxDistSq = this.params.maxConnectionDistance * this.params.maxConnectionDistance;

    // Prim's algorithm for MST - ensures connectivity
    while (unconnected.size > 0) {
      let minDistSq = Infinity;
      let closestPair = null;

      for (const connectedId of connected) {
        for (const unconnectedId of unconnected) {
          const distSq = this.particles[connectedId].position.distanceToSquared(this.particles[unconnectedId].position);
          if (distSq < minDistSq) {
            minDistSq = distSq;
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
          const distSq = particleA.position.distanceToSquared(particleB.position);

          // Connect if within reach distance
          if (distSq <= maxDistSq) {
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
            .map((p, idx) => ({ id: idx, distSq: p.position.distanceToSquared(particle.position) }))
            .filter(n => n.id !== i && !particle.connections.includes(n.id))
            .sort((a, b) => a.distSq - b.distSq);

          const needed = minConnections - particle.connections.length;

          // Add connections to nearest neighbors
          for (let j = 0; j < Math.min(needed, neighbors.length); j++) {
            this.addConnection(i, neighbors[j].id);
          }
        }
      }

      // If all particles are satisfied, break early
      if (allSatisfied) {
        break;
      }
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
   * @param {number} x - X position
   * @param {THREE.Color} [targetColor] - Optional target color to avoid allocation
   * @returns {THREE.Color} The interpolated color
   */
  getColorForPosition(x, targetColor) {
    const result = targetColor || this._tempColor;
    const minX = -this.params.boundsX / 2;
    const maxX = this.params.boundsX / 2;
    const normalizedX = (x - minX) / (maxX - minX);

    const activeColorCount = this.params.colorStops;

    // Handle single color case
    if (activeColorCount <= 1) {
      return result.copy(this.params.colors[0]);
    }

    const segmentSize = 1.0 / (activeColorCount - 1);
    const segmentIndex = Math.floor(normalizedX / segmentSize);
    const segmentT = (normalizedX - segmentIndex * segmentSize) / segmentSize;

    const colorIndex1 = Math.max(0, Math.min(segmentIndex, activeColorCount - 1));
    const colorIndex2 = Math.min(colorIndex1 + 1, activeColorCount - 1);

    const color1 = this.params.colors[colorIndex1];
    const color2 = this.params.colors[colorIndex2];

    return result.lerpColors(color1, color2, segmentT);
  }

  /**
   * Create particle meshes using instanced spheres with vertex colors for gradient
   */
  createParticleMeshes() {
    // Create base geometry with proper size (not scaled later)
    const geometry = new THREE.SphereGeometry(this.params.particleSize, 8, 8);

    // Calculate Z bounds for scale calculation
    const movementRangeZ = this.params.movementRange * 0.3;
    const minZ = this.params.zPosition - this.params.boundsZ / 2 - movementRangeZ;
    const maxZ = this.params.zPosition + this.params.boundsZ / 2 + movementRangeZ;
    const zRange = maxZ - minZ || 1;

    // Create custom shader material for gradient colors with GPU-based animation
    const material = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: this.params.opacity },
        uTime: { value: 0.0 },
        uMovementSpeed: { value: this.params.movementSpeed },
        uMovementRange: { value: this.params.movementRange },
        uMovementRangeZ: { value: movementRangeZ },
        uMinZ: { value: minZ },
        uZRange: { value: zRange },
        uScaleBase: { value: 1.0 - this.params.scaleRange },
        uScaleMultiplier: { value: this.params.scaleRange * 2 },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthWrite: false,
      toneMapped: true, // Better TAA compatibility
    });

    this.particleMesh = new THREE.InstancedMesh(geometry, material, this.params.particleCount);

    // Set up instance attributes
    const colors = new Float32Array(this.params.particleCount * 3);
    const scales = new Float32Array(this.params.particleCount);
    const startPositions = new Float32Array(this.params.particleCount * 3);
    const offsets = new Float32Array(this.params.particleCount * 3);
    const speedMults = new Float32Array(this.params.particleCount * 3);

    for (let i = 0; i < this.params.particleCount; i++) {
      const particle = this.particles[i];

      // Colors
      this.getColorForPosition(particle.startPosition.x, this._tempColor);
      colors[i * 3 + 0] = this._tempColor.r;
      colors[i * 3 + 1] = this._tempColor.g;
      colors[i * 3 + 2] = this._tempColor.b;

      // Base scale (will be multiplied by dynamic scale in shader)
      scales[i] = 1.0;

      // Start positions for GPU animation
      startPositions[i * 3 + 0] = particle.startPosition.x;
      startPositions[i * 3 + 1] = particle.startPosition.y;
      startPositions[i * 3 + 2] = particle.startPosition.z;

      // Animation offsets
      offsets[i * 3 + 0] = particle.offsetX;
      offsets[i * 3 + 1] = particle.offsetY;
      offsets[i * 3 + 2] = particle.offsetZ;

      // Speed multipliers
      speedMults[i * 3 + 0] = particle.speedMultX;
      speedMults[i * 3 + 1] = particle.speedMultY;
      speedMults[i * 3 + 2] = particle.speedMultZ;
    }

    this.particleMesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3));
    this.particleMesh.geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1));
    this.particleMesh.geometry.setAttribute('startPosition', new THREE.InstancedBufferAttribute(startPositions, 3));
    this.particleMesh.geometry.setAttribute('offsets', new THREE.InstancedBufferAttribute(offsets, 3));
    this.particleMesh.geometry.setAttribute('speedMults', new THREE.InstancedBufferAttribute(speedMults, 3));

    // Set identity matrices (position is now handled in shader)
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < this.params.particleCount; i++) {
      this.particleMesh.setMatrixAt(i, matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    this.group.add(this.particleMesh);
  }

  /**
   * Create line meshes for connections using LineSegments2 for proper width control
   */
  createLineMeshes() {
    // Pre-allocate arrays for better performance
    const connectionCount = this.connections.length;
    const positions = new Float32Array(connectionCount * 6);
    const colors = new Float32Array(connectionCount * 6);

    for (let i = 0; i < connectionCount; i++) {
      const connection = this.connections[i];
      const posA = this.particles[connection[0]].position;
      const posB = this.particles[connection[1]].position;

      const posIdx = i * 6;
      // Set positions
      positions[posIdx] = posA.x;
      positions[posIdx + 1] = posA.y;
      positions[posIdx + 2] = posA.z;
      positions[posIdx + 3] = posB.x;
      positions[posIdx + 4] = posB.y;
      positions[posIdx + 5] = posB.z;

      // Set colors based on X position - reuse temp colors
      this.getColorForPosition(posA.x, this._tempColor);
      this.getColorForPosition(posB.x, this._tempColor2);

      colors[posIdx] = this._tempColor.r;
      colors[posIdx + 1] = this._tempColor.g;
      colors[posIdx + 2] = this._tempColor.b;
      colors[posIdx + 3] = this._tempColor2.r;
      colors[posIdx + 4] = this._tempColor2.g;
      colors[posIdx + 5] = this._tempColor2.b;
    }

    // Store line positions array for reuse in update loop
    this._linePositions = new Float32Array(connectionCount * 6);

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
      alphaToCoverage: false, // Disabled for Firefox compatibility
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

    // Update shader time uniform for GPU-based particle animation
    if (this.particleMesh.material.uniforms) {
      this.particleMesh.material.uniforms.uTime.value = elapsedTime;
    }

    // Cache parameters to reduce property access
    const movementSpeed = this.params.movementSpeed;
    const movementRange = this.params.movementRange;
    const particleCount = this.params.particleCount;
    const movementRangeZ = movementRange * 0.3;

    // Update particle positions on CPU (needed for line endpoint calculations)
    // This is a lightweight sync - no matrix updates needed since particles render via GPU
    for (let i = 0; i < particleCount; i++) {
      const particle = this.particles[i];
      const startPos = particle.startPosition;

      // Calculate new position using sine waves (mirrors GPU calculation)
      const timeX = elapsedTime * movementSpeed * particle.speedMultX + particle.offsetX;
      const timeY = elapsedTime * movementSpeed * particle.speedMultY + particle.offsetY;
      const timeZ = elapsedTime * movementSpeed * particle.speedMultZ + particle.offsetZ;

      particle.position.x = startPos.x + Math.sin(timeX) * movementRange;
      particle.position.y = startPos.y + Math.sin(timeY) * movementRange;
      particle.position.z = startPos.z + Math.sin(timeZ) * movementRangeZ;
    }

    // Update line positions - reuse pre-allocated array
    const linePositions = this._linePositions;
    const connectionCount = this.connections.length;
    const particles = this.particles;

    for (let i = 0; i < connectionCount; i++) {
      const connection = this.connections[i];
      const posA = particles[connection[0]].position;
      const posB = particles[connection[1]].position;

      const idx = i * 6;
      linePositions[idx] = posA.x;
      linePositions[idx + 1] = posA.y;
      linePositions[idx + 2] = posA.z;
      linePositions[idx + 3] = posB.x;
      linePositions[idx + 4] = posB.y;
      linePositions[idx + 5] = posB.z;
    }
    this.lineMesh.geometry.setPositions(linePositions);
  }

  /**
   * Update colors for all particles and lines
   */
  updateColors() {
    if (!this.particleMesh || !this.lineMesh) return;

    // Update particle colors - reuse temp color to avoid allocations
    const particleColors = this.particleMesh.geometry.attributes.instanceColor.array;
    for (let i = 0; i < this.params.particleCount; i++) {
      this.getColorForPosition(this.particles[i].position.x, this._tempColor);
      particleColors[i * 3 + 0] = this._tempColor.r;
      particleColors[i * 3 + 1] = this._tempColor.g;
      particleColors[i * 3 + 2] = this._tempColor.b;
    }
    this.particleMesh.geometry.attributes.instanceColor.needsUpdate = true;

    // Update line colors - reuse/grow array to avoid allocations
    const connectionCount = this.connections.length;
    if (!this._lineColors || this._lineColors.length !== connectionCount * 6) {
      this._lineColors = new Float32Array(connectionCount * 6);
    }
    const lineColors = this._lineColors;

    for (let i = 0; i < connectionCount; i++) {
      const connection = this.connections[i];
      const posA = this.particles[connection[0]].position;
      const posB = this.particles[connection[1]].position;

      this.getColorForPosition(posA.x, this._tempColor);
      this.getColorForPosition(posB.x, this._tempColor2);

      const idx = i * 6;
      lineColors[idx] = this._tempColor.r;
      lineColors[idx + 1] = this._tempColor.g;
      lineColors[idx + 2] = this._tempColor.b;
      lineColors[idx + 3] = this._tempColor2.r;
      lineColors[idx + 4] = this._tempColor2.g;
      lineColors[idx + 5] = this._tempColor2.b;
    }
    this.lineMesh.geometry.setColors(lineColors);
  }

  /**
   * Update visual parameters
   */
  updateParams(newParams) {
    Object.assign(this.params, newParams);

    // Update particle material uniforms
    if (this.particleMesh && this.particleMesh.material.uniforms) {
      const uniforms = this.particleMesh.material.uniforms;
      uniforms.opacity.value = this.params.opacity;
      uniforms.uMovementSpeed.value = this.params.movementSpeed;
      uniforms.uMovementRange.value = this.params.movementRange;

      // Recalculate Z-related uniforms
      const movementRangeZ = this.params.movementRange * 0.3;
      const minZ = this.params.zPosition - this.params.boundsZ / 2 - movementRangeZ;
      const maxZ = this.params.zPosition + this.params.boundsZ / 2 + movementRangeZ;
      const zRange = maxZ - minZ || 1;

      uniforms.uMovementRangeZ.value = movementRangeZ;
      uniforms.uMinZ.value = minZ;
      uniforms.uZRange.value = zRange;
      uniforms.uScaleBase.value = 1.0 - this.params.scaleRange;
      uniforms.uScaleMultiplier.value = this.params.scaleRange * 2;
    }

    // Update line material
    if (this.lineMesh && this.lineMesh.material) {
      this.lineMesh.material.opacity = this.params.opacity * 0.5;
      this.lineMesh.material.linewidth = this.params.lineWidth;
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
    // Clear existing meshes and properly dispose
    if (this.particleMesh) {
      this.group.remove(this.particleMesh);
      if (this.particleMesh.geometry) {
        this.particleMesh.geometry.dispose();
      }
      if (this.particleMesh.material) {
        this.particleMesh.material.dispose();
      }
      this.particleMesh = null;
    }

    if (this.lineMesh) {
      this.group.remove(this.lineMesh);
      if (this.lineMesh.geometry) {
        this.lineMesh.geometry.dispose();
      }
      if (this.lineMesh.material) {
        this.lineMesh.material.dispose();
      }
      this.lineMesh = null;
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
    // Remove meshes from group first
    if (this.particleMesh) {
      this.group.remove(this.particleMesh);
      if (this.particleMesh.geometry) {
        this.particleMesh.geometry.dispose();
      }
      if (this.particleMesh.material) {
        this.particleMesh.material.dispose();
      }
      this.particleMesh = null;
    }

    if (this.lineMesh) {
      this.group.remove(this.lineMesh);
      if (this.lineMesh.geometry) {
        this.lineMesh.geometry.dispose();
      }
      if (this.lineMesh.material) {
        this.lineMesh.material.dispose();
      }
      this.lineMesh = null;
    }

    // Clear group and arrays
    this.group.clear();
    this.particles = [];
    this.connections = [];
  }
}
