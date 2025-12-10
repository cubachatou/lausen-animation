import * as THREE from 'three';

/**
 * FloatingNumbers creates randomly positioned floating numbers that
 * rise from the bottom of the screen, changing values dynamically.
 * Uses the Overtime LCD font for visual consistency.
 *
 * OPTIMIZED: Uses a pre-rendered digit atlas to avoid creating new textures
 * on every value change. Reuses textures from the atlas.
 */
export class FloatingNumbers {
  constructor(params) {
    this.params = {
      numberCount: params.numberCount ?? 40,
      fontSize: params.fontSize ?? 48,
      colors: params.colors, // Array of THREE.Color
      colorStops: params.colorStops ?? 7,
      opacity: params.opacity ?? 0.8,
      speed: params.speed ?? 0.3, // Base vertical speed
      speedVariation: params.speedVariation ?? 0.5, // Speed variation factor
      boundsX: params.boundsX ?? 20,
      boundsY: params.boundsY ?? 12,
      zPosition: params.zPosition ?? -2.0,
      minSpacing: params.minSpacing ?? 1.5, // Minimum spacing between numbers
      valueChangeInterval: params.valueChangeInterval ?? 0.1, // Seconds between value changes
      digitGap: params.digitGap ?? 0, // Gap between digits within a number
      seed: params.seed ?? 12345,
    };

    this.group = new THREE.Group();
    this.numbers = [];
    this.fontLoaded = false;
    this.time = 0;

    // Digit atlas - stores pre-rendered textures for each digit and color
    this.digitAtlas = new Map();

    // Material pool for sprite reuse - keyed by colorIndex
    this._materialPool = new Map();

    // Spatial grid for fast collision detection
    this._spatialGrid = new Map();
    this._gridCellSize = this.params.minSpacing;

    // Pre-allocated character array for string generation (max 7 chars: 3 + 1 + 3)
    this._charBuffer = new Array(7);

    // Initialize seeded random number generator
    this.rng = this.createSeededRandom(this.params.seed);

    // Load font and initialize
    this.loadFont().then(() => {
      this.fontLoaded = true;
      this.buildDigitAtlas();
      this.initialize();
    });
  }

  /**
   * Load the Overtime LCD font
   */
  async loadFont() {
    const font = new FontFace('Overtime LCD', 'url(./fonts/LCD.woff2)');
    try {
      const loadedFont = await font.load();
      document.fonts.add(loadedFont);
    } catch (error) {
      // Font loading failed, fallback to system font
    }
  }

  /**
   * Seeded random number generator (mulberry32 algorithm)
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
   * Build the digit atlas with pre-rendered textures for all digits and colors
   */
  buildDigitAtlas() {
    const chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'];
    const colors = this.params.colors.slice(0, this.params.colorStops);

    // Create textures for each character and color combination
    for (const char of chars) {
      for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        const key = char + '_' + i;
        this.digitAtlas.set(key, this.createDigitTexture(char, color));
      }
    }
  }

  /**
   * Create a single digit/character texture
   */
  createDigitTexture(char, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Use 2x resolution for sharper text (retina-like)
    const scale = 1.5;
    const fontSize = this.params.fontSize * scale;
    const padding = 2 * scale; // Minimal padding

    // Set font and measure text
    ctx.font = fontSize + 'px "Overtime LCD", "LCD", monospace';
    const metrics = ctx.measureText(char);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Set canvas size with padding
    canvas.width = Math.ceil(textWidth + padding * 2);
    canvas.height = Math.ceil(textHeight + padding * 2);

    // Clear and set font again (canvas reset clears it)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontSize + 'px "Overtime LCD", "LCD", monospace';
    ctx.fillStyle =
      'rgb(' + Math.floor(color.r * 255) + ', ' + Math.floor(color.g * 255) + ', ' + Math.floor(color.b * 255) + ')';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Enable better text rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw character
    ctx.fillText(char, canvas.width / 2, canvas.height / 2);

    // Create texture with better filtering
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = 1;

    return {
      texture,
      // Return logical size (not scaled size) for positioning
      width: canvas.width / scale,
      height: canvas.height / scale,
    };
  }

  /**
   * Get color index based on X position
   */
  getColorIndexForPosition(x) {
    const minX = -this.params.boundsX / 2;
    const maxX = this.params.boundsX / 2;
    const normalizedX = (x - minX) / (maxX - minX);

    const activeColorCount = this.params.colorStops;
    const colorIndex = Math.floor(normalizedX * (activeColorCount - 1) + 0.5);
    return Math.max(0, Math.min(colorIndex, activeColorCount - 1));
  }

  /**
   * Generate a random number string (1-3 digits before dot, 1-3 after)
   * Uses pre-allocated character buffer to avoid string concatenation
   */
  generateRandomValue() {
    const digitsBefore = Math.floor(this.rng() * 3) + 1;
    const digitsAfter = Math.floor(this.rng() * 3) + 1;
    const chars = this._charBuffer;
    let idx = 0;

    // Digits before dot
    for (let i = 0; i < digitsBefore; i++) {
      if (i === 0 && digitsBefore > 1) {
        chars[idx++] = String.fromCharCode(49 + Math.floor(this.rng() * 9)); // '1'-'9'
      } else {
        chars[idx++] = String.fromCharCode(48 + Math.floor(this.rng() * 10)); // '0'-'9'
      }
    }

    chars[idx++] = '.';

    // Digits after dot
    for (let i = 0; i < digitsAfter; i++) {
      chars[idx++] = String.fromCharCode(48 + Math.floor(this.rng() * 10)); // '0'-'9'
    }

    return chars.slice(0, idx).join('');
  }

  /**
   * Check if a new position would overlap with existing numbers
   */
  wouldOverlap(x, y, existingNumbers) {
    const minSpacing = this.params.minSpacing;

    for (const num of existingNumbers) {
      const dx = Math.abs(x - num.x);
      const dy = Math.abs(y - num.y);

      if (dx < minSpacing && dy < minSpacing * 1.5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate a position that doesn't overlap with existing numbers
   */
  generateNonOverlappingPosition(existingNumbers, y = null) {
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const x = (this.rng() - 0.5) * this.params.boundsX;
      const posY = y !== null ? y : (this.rng() - 0.5) * this.params.boundsY;

      if (!this.wouldOverlap(x, posY, existingNumbers)) {
        return { x, y: posY };
      }

      attempts++;
    }

    return {
      x: (this.rng() - 0.5) * this.params.boundsX,
      y: y !== null ? y : (this.rng() - 0.5) * this.params.boundsY,
    };
  }

  /**
   * Initialize floating numbers
   */
  initialize() {
    const totalHeight = this.params.boundsY + 4;
    const startY = -this.params.boundsY / 2 - 2;

    const positions = [];
    for (let i = 0; i < this.params.numberCount; i++) {
      const baseY = startY + (i / this.params.numberCount) * totalHeight;
      const y = baseY + (this.rng() - 0.5) * 2;
      const pos = this.generateNonOverlappingPosition(positions, y);
      positions.push(pos);
      this.createNumber(pos.x, pos.y);
    }
  }

  /**
   * Create a single floating number (as a group of digit sprites)
   */
  createNumber(x, y) {
    const value = this.generateRandomValue();
    const colorIndex = this.getColorIndexForPosition(x);

    // Create a group to hold all digit sprites
    const numberGroup = new THREE.Group();
    numberGroup.position.set(x, y, this.params.zPosition);

    // Create sprites for each character
    const digitSprites = this.createDigitSprites(value, colorIndex);
    for (const sprite of digitSprites) {
      numberGroup.add(sprite);
    }

    const numberData = {
      group: numberGroup,
      x: x,
      y: y,
      value,
      colorIndex,
      digitSprites,
      speed: this.params.speed * (0.5 + this.rng() * this.params.speedVariation),
      lastValueChange: 0,
    };

    this.numbers.push(numberData);
    this.group.add(numberGroup);
    
    // Add to spatial grid
    this._updateSpatialGrid(numberData);

    return numberData;
  }

  /**
   * Get or create a shared material for a digit sprite
   * Materials are cached by character+colorIndex for reuse
   */
  getSpriteMaterial(char, colorIndex) {
    const key = char + '_' + colorIndex;

    if (!this._materialPool.has(key)) {
      const digitData = this.digitAtlas.get(key);
      if (!digitData) return null;

      const material = new THREE.SpriteMaterial({
        map: digitData.texture,
        transparent: true,
        opacity: this.params.opacity,
        depthWrite: false,
        depthTest: true,
      });
      this._materialPool.set(key, material);
    }

    return this._materialPool.get(key);
  }

  /**
   * Create sprites for each digit in a value string
   */
  createDigitSprites(value, colorIndex) {
    const sprites = [];
    const scale = this.params.fontSize / 48;
    const gap = this.params.digitGap;
    let offsetX = 0;

    // Calculate total width first to center the number (including gaps)
    let totalWidth = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      const key = char + '_' + colorIndex;
      const digitData = this.digitAtlas.get(key);
      if (digitData) {
        totalWidth += (digitData.width / this.params.fontSize) * scale;
        if (i < value.length - 1) {
          totalWidth += gap;
        }
      }
    }

    // Start offset to center
    offsetX = -totalWidth / 2;

    for (const char of value) {
      const key = char + '_' + colorIndex;
      const digitData = this.digitAtlas.get(key);

      if (digitData) {
        // Get or create shared material
        const material = this.getSpriteMaterial(char, colorIndex);
        if (!material) continue;

        const sprite = new THREE.Sprite(material);
        const charWidth = (digitData.width / this.params.fontSize) * scale;
        const charHeight = (digitData.height / this.params.fontSize) * scale;

        sprite.scale.set(charWidth, charHeight, 1);
        sprite.position.x = offsetX + charWidth / 2;

        sprites.push(sprite);
        offsetX += charWidth + gap;
      }
    }

    return sprites;
  }

  /**
   * Update a number's displayed value (reuses textures from atlas - very fast)
   */
  updateNumberValue(numberData) {
    const newValue = this.generateRandomValue();
    const oldValue = numberData.value;

    // If same length, just swap textures (extremely fast - no allocation)
    if (newValue.length === oldValue.length) {
      for (let i = 0; i < newValue.length; i++) {
        if (newValue[i] !== oldValue[i]) {
          // Get shared material for new character
          const material = this.getSpriteMaterial(newValue[i], numberData.colorIndex);
          if (material && numberData.digitSprites[i]) {
            numberData.digitSprites[i].material = material;
          }
        }
      }
    } else {
      // Different length - rebuild sprites (less common)
      // Don't dispose materials as they're shared
      for (const sprite of numberData.digitSprites) {
        numberData.group.remove(sprite);
      }

      const newSprites = this.createDigitSprites(newValue, numberData.colorIndex);
      for (const sprite of newSprites) {
        numberData.group.add(sprite);
      }
      numberData.digitSprites = newSprites;
    }

    numberData.value = newValue;
  }

  /**
   * Get spatial grid cell key for a position
   */
  _getGridCell(x) {
    return Math.floor((x + this.params.boundsX / 2) / this._gridCellSize);
  }

  /**
   * Update spatial grid with number position
   */
  _updateSpatialGrid(numberData, oldX = null) {
    // Remove from old cell if provided
    if (oldX !== null) {
      const oldCell = this._getGridCell(oldX);
      const cellNumbers = this._spatialGrid.get(oldCell);
      if (cellNumbers) {
        const idx = cellNumbers.indexOf(numberData);
        if (idx !== -1) cellNumbers.splice(idx, 1);
      }
    }
    
    // Add to new cell
    const newCell = this._getGridCell(numberData.x);
    if (!this._spatialGrid.has(newCell)) {
      this._spatialGrid.set(newCell, []);
    }
    this._spatialGrid.get(newCell).push(numberData);
  }

  /**
   * Check if X position overlaps with numbers in nearby grid cells (bottom region only)
   */
  _checkSpatialOverlap(x, excludeNumber = null) {
    const cell = this._getGridCell(x);
    const minSpacing = this.params.minSpacing;
    const bottomY = -this.params.boundsY / 2 + 3;
    
    // Check current cell and adjacent cells
    for (let c = cell - 1; c <= cell + 1; c++) {
      const cellNumbers = this._spatialGrid.get(c);
      if (!cellNumbers) continue;
      
      for (const num of cellNumbers) {
        if (num === excludeNumber) continue;
        if (num.y >= bottomY) continue; // Only check bottom region
        if (Math.abs(x - num.x) < minSpacing) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Reset a number to the bottom with new position (outside viewport)
   * Uses spatial grid for O(1) collision detection
   */
  resetNumber(numberData) {
    const oldX = numberData.x;
    let newX = (this.rng() - 0.5) * this.params.boundsX;
    const newY = -this.params.boundsY / 2 - 2 - this.rng() * 2;

    // Use spatial grid for fast collision check
    let attempts = 0;
    while (attempts < 30 && this._checkSpatialOverlap(newX, numberData)) {
      newX = (this.rng() - 0.5) * this.params.boundsX;
      attempts++;
    }

    numberData.x = newX;
    numberData.y = newY;
    numberData.group.position.x = newX;
    numberData.group.position.y = newY;
    
    // Update spatial grid
    this._updateSpatialGrid(numberData, oldX);

    const newColorIndex = this.getColorIndexForPosition(newX);
    if (newColorIndex !== numberData.colorIndex) {
      numberData.colorIndex = newColorIndex;
      // Update to use shared materials for new color
      for (let i = 0; i < numberData.value.length; i++) {
        const char = numberData.value[i];
        const material = this.getSpriteMaterial(char, newColorIndex);
        if (material && numberData.digitSprites[i]) {
          numberData.digitSprites[i].material = material;
        }
      }
    }

    this.updateNumberValue(numberData);

    numberData.lastValueChange = this.time;
    numberData.speed = this.params.speed * (0.5 + this.rng() * this.params.speedVariation);
  }

  /**
   * Update all floating numbers
   */
  update(elapsedTime) {
    if (!this.fontLoaded) return;

    const deltaTime = elapsedTime - this.time;
    this.time = elapsedTime;

    for (let i = 0; i < this.numbers.length; i++) {
      const numberData = this.numbers[i];

      numberData.y += numberData.speed * deltaTime;
      numberData.group.position.y = numberData.y;

      if (numberData.y > this.params.boundsY / 2 + 2) {
        this.resetNumber(numberData);
      }

      if (elapsedTime - numberData.lastValueChange > this.params.valueChangeInterval) {
        this.updateNumberValue(numberData);
        numberData.lastValueChange = elapsedTime;
      }
    }
  }

  /**
   * Update colors - rebuild the digit atlas and material pool
   */
  updateColors(colors, colorStops) {
    this.params.colors = colors;
    this.params.colorStops = colorStops;

    // Dispose old materials from pool
    for (const material of this._materialPool.values()) {
      material.dispose();
    }
    this._materialPool.clear();

    // Dispose old textures
    for (const [key, data] of this.digitAtlas) {
      data.texture.dispose();
    }
    this.digitAtlas.clear();

    this.buildDigitAtlas();

    // Update all existing sprites with new materials
    for (const numberData of this.numbers) {
      numberData.colorIndex = this.getColorIndexForPosition(numberData.x);
      for (let i = 0; i < numberData.value.length; i++) {
        const char = numberData.value[i];
        const material = this.getSpriteMaterial(char, numberData.colorIndex);
        if (material && numberData.digitSprites[i]) {
          numberData.digitSprites[i].material = material;
        }
      }
    }
  }

  /**
   * Update parameters
   */
  setParams(newParams) {
    Object.assign(this.params, newParams);
  }

  /**
   * Recreate with new settings
   */
  recreate() {
    // Remove sprites from groups (don't dispose materials as they're shared)
    for (const numberData of this.numbers) {
      for (const sprite of numberData.digitSprites) {
        numberData.group.remove(sprite);
      }
      this.group.remove(numberData.group);
    }
    this.numbers = [];
    
    // Clear spatial grid
    this._spatialGrid.clear();

    this.rng = this.createSeededRandom(this.params.seed);

    // Dispose old materials from pool
    for (const material of this._materialPool.values()) {
      material.dispose();
    }
    this._materialPool.clear();

    // Dispose old textures
    for (const [key, data] of this.digitAtlas) {
      data.texture.dispose();
    }
    this.digitAtlas.clear();

    if (this.fontLoaded) {
      this.buildDigitAtlas();
      this.initialize();
    }
  }

  /**
   * Get the group containing all sprites
   */
  getGroup() {
    return this.group;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    // Remove sprites from groups (don't dispose individual materials as they're shared)
    for (const numberData of this.numbers) {
      for (const sprite of numberData.digitSprites) {
        numberData.group.remove(sprite);
      }
      this.group.remove(numberData.group);
    }
    this.numbers = [];
    
    // Clear spatial grid
    this._spatialGrid.clear();

    // Dispose shared materials from pool
    for (const material of this._materialPool.values()) {
      material.dispose();
    }
    this._materialPool.clear();

    // Dispose textures
    for (const [key, data] of this.digitAtlas) {
      data.texture.dispose();
    }
    this.digitAtlas.clear();

    this.group.clear();
  }
}
