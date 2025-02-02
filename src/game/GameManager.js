// GameManager.js - Main game controller class

class GameManager {
  constructor() {
    // Initialize game state variables
    this.canvas = null;
    this.ctx = null;
    this.gameLoopId = null;
    this.gameActive = false;
    this.score = 0;
    this.lives = 10;
    this.onGameOver = null;
    
    // Initialize arrays for game entities
    this.teardrops = [];
    this.goldtears = [];
    this.redtears = [];
    this.blacktears = [];
    this.splashes = [];
    this.bucket = null;
    
    // Game progression variables
    this.speedMultiplier = 1;
    this.lastCheckpoint = 0;
    
    // Spawn timers for different tear types
    this.spawnTimers = {
      teardrop: null,
      goldtear: null,
      redtear: null,
      blacktear: null
    };

    // Load and manage game images - using direct URLs for now
    // In production, these should be moved to your CDN or static hosting
    this.images = {
      bucket: this.loadImage("https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/674fb166a33aa5af2e8be714_1faa3.svg"),
      teardrop: this.loadImage("https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b2256d6f25cb51c68229b_BlueTear.2.png"),
      goldtear: this.loadImage("https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b32a8d6f25cb51c70748a_GoldTear.2.png"),
      redtear: this.loadImage("https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b2256456275e1857d4646_RedTear.2.png"),
      blacktear: this.loadImage("https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b225c9f972035e5189e4b_GreenTear.2.png"),
      background: this.loadImage("https://i.imgflip.com/4zei4c.jpg")
    };

    // Bind methods to maintain correct 'this' context
    this.gameLoop = this.gameLoop.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handleResize = this.handleResize.bind(this);

    // Add base dimensions for scaling
    this.baseHeight = 700; // Original design height
    this.baseEntitySize = 70; // Original entity size
    this.baseBucketSize = 70; // Original bucket size

    // Fixed sizes for game entities - these won't scale
    this.BUCKET_SIZE = 70;  // Fixed bucket size
    this.TEAR_SIZE = 50;    // Fixed tear size
  }

  // Image Loading Method
  loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  // Game Initialization Methods
  async initialize() {
    this.canvas = document.getElementById('tearCatchGameCanvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return false;
    }

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Set up event listeners
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('resize', this.handleResize);

    // Wait for all images to load
    try {
      await Promise.all(
        Object.values(this.images).map(img => 
          new Promise((resolve, reject) => {
            if (img.complete) resolve();
            else {
              img.onload = resolve;
              img.onerror = reject;
            }
          })
        )
      );
      return true;
    } catch (error) {
      console.error('Failed to load game images:', error);
      return false;
    }
  }

  initGame() {
    // Reset game variables
    this.score = 0;
    this.lives = 10;
    this.speedMultiplier = 1;
    this.lastCheckpoint = 0;
    this.gameActive = true;

    // Initialize bucket with fixed size
    this.bucket = {
      x: this.canvas.width / 2 - this.BUCKET_SIZE / 2,
      y: this.canvas.height - this.BUCKET_SIZE - 10,
      width: this.BUCKET_SIZE,
      height: this.BUCKET_SIZE,
      speed: 0
    };

    // Initialize arrays
    this.teardrops = [];
    this.goldtears = [];
    this.redtears = [];
    this.blacktears = [];
    this.splashes = [];

    // Clear any existing timers
    Object.values(this.spawnTimers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
  }

  // Game Control Methods
  startGame(mode = 'free') {
    // Force a canvas resize before starting the game
    this.resizeCanvas();
    
    this.cleanup();
    this.initGame();
    this.gameMode = mode;

    // Start spawning tears with a delay
    setTimeout(() => {
      if (this.gameActive) {
        this.spawnTeardrop();
        this.spawnGoldtear();
        this.spawnRedtear();
        this.spawnBlacktear();
      }
    }, 1000);

    // Start the game loop
    if (!this.gameLoopId) {
      this.gameLoop();
    }
    
    return true;
  }

  cleanup() {
    // Clear any running game loops
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
    
    // Clear spawn timers
    Object.values(this.spawnTimers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });

    this.spawnTimers = {
      teardrop: null,
      goldtear: null,
      redtear: null,
      blacktear: null
    };

    // Clear entities
    this.teardrops = [];
    this.goldtears = [];
    this.redtears = [];
    this.blacktears = [];
    this.splashes = [];
    this.gameActive = false;

    // Clear canvas if context exists
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Event Handlers
  handlePointerMove(e) {
    if (!this.gameActive || !this.bucket) return;

    // Prevent default behavior to stop scrolling
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    
    // Position bucket relative to canvas scale
    const scaleX = this.canvas.width / rect.width;
    const scaledX = pointerX * scaleX;
    
    // Center the bucket under the cursor
    this.bucket.x = Math.min(
        Math.max(scaledX - (this.bucket.width / 2), 0),
        this.canvas.width - this.bucket.width
    );
  }

  handleResize() {
    this.resizeCanvas();
  }

  // Canvas Management
  resizeCanvas() {
    if (this.canvas) {
        // Get parent width to set canvas width dynamically
        this.canvas.width = this.canvas.parentNode.offsetWidth;
        this.canvas.height = 700; // Keep height fixed

        // Ensure bucket stays within bounds
        if (this.bucket) {
            this.bucket.x = Math.min(this.bucket.x, this.canvas.width - this.bucket.width);
        }
    }
}


  // Spawn Methods
  spawnTeardrop() {
    if (!this.gameActive) return;
    this.teardrops.push(new Teardrop(this.canvas.width, this.speedMultiplier));
    this.spawnTimers.teardrop = setTimeout(() => this.spawnTeardrop(), Math.random() * 750 + 300);
  }

  spawnGoldtear() {
    if (!this.gameActive) return;
    this.goldtears.push(new Teardrop(this.canvas.width, this.speedMultiplier));
    this.spawnTimers.goldtear = setTimeout(() => this.spawnGoldtear(), Math.random() * 3000 + 1500);
  }

  spawnRedtear() {
    if (!this.gameActive) return;
    this.redtears.push(new Teardrop(this.canvas.width, this.speedMultiplier));
    this.spawnTimers.redtear = setTimeout(() => this.spawnRedtear(), Math.random() * 12000 + 3000);
  }

  spawnBlacktear() {
    if (!this.gameActive) return;
    this.blacktears.push(new Teardrop(this.canvas.width, this.speedMultiplier));
    this.spawnTimers.blacktear = setTimeout(() => this.spawnBlacktear(), Math.random() * 6000 + 3000);
  }

  // Game Update Methods
  updateGame() {
    this.updateEntities(this.teardrops, false, false, false);
    this.updateEntities(this.goldtears, true, false, false);
    this.updateEntities(this.redtears, false, true, false);
    this.updateEntities(this.blacktears, false, false, true);

    this.splashes = this.splashes.filter(splash => {
      splash.update();
      return splash.opacity > 0;
    });

    if (this.score >= this.lastCheckpoint + 100) {
      this.speedMultiplier *= 1.1;
      this.lastCheckpoint = this.score;
    }

    if (this.lives <= 0 && this.gameActive) {
      this.gameActive = false;
      if (this.onGameOver) {
        this.onGameOver(this.score);
      }
    }
  }

  updateEntities(entities, isGold, isRed, isBlack) {
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      entity.update();

      if (this.checkCollision(entity, this.bucket)) {
        entities.splice(i, 1);
        this.handleCollision(entity, isGold, isRed, isBlack);
      } else if (entity.y > this.canvas.height) {
        entities.splice(i, 1);
        if (!isRed) this.lives--;
      }
    }
  }

  // Collision Detection
  checkCollision(entity, bucket) {
    return (
      entity.x < bucket.x + bucket.width &&
      entity.x + entity.width > bucket.x &&
      entity.y < bucket.y + bucket.height &&
      entity.y + entity.height > bucket.y
    );
  }

  handleCollision(entity, isGold, isRed, isBlack) {
    if (isGold) {
      this.score += 15;
      this.splashes.push(new GoldSplash(entity.x + entity.width / 2, this.bucket.y));
    } else if (isRed) {
      this.lives--;
      this.splashes.push(new RedSplash(entity.x + entity.width / 2, this.bucket.y));
    } else if (isBlack) {
      this.lives++;
      this.splashes.push(new GreenSplash(entity.x + entity.width / 2, this.bucket.y));
    } else {
      this.score += 1;
      this.splashes.push(new Splash(entity.x + entity.width / 2, this.bucket.y));
    }
  }

  // Drawing Methods
  drawGame() {
    if (!this.ctx) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background without scaling
    if (this.images.background) {
        this.ctx.drawImage(this.images.background, 0, 0, this.canvas.width, this.canvas.height);
    }

    // Reset transform to prevent automatic scaling
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw bucket at fixed size
    if (this.bucket && this.images.bucket) {
        this.ctx.drawImage(this.images.bucket, this.bucket.x, this.bucket.y, 70, 70);
    }

    // Draw teardrops at fixed size
    this.teardrops.forEach(tear => {
        this.ctx.drawImage(this.images.teardrop, tear.x, tear.y, 50, 50);
    });
    this.goldtears.forEach(tear => {
        this.ctx.drawImage(this.images.goldtear, tear.x, tear.y, 50, 50);
    });
    this.redtears.forEach(tear => {
        this.ctx.drawImage(this.images.redtear, tear.x, tear.y, 50, 50);
    });
    this.blacktears.forEach(tear => {
        this.ctx.drawImage(this.images.blacktear, tear.x, tear.y, 50, 50);
    });

    // Add this section to draw splashes
    this.splashes.forEach(splash => {
        splash.draw(this.ctx);
    });

    // Draw text at fixed size
    this.drawUI();
}


  drawUI() {
    if (!this.ctx) return;

    // Fixed font sizes
    this.ctx.font = "25px Inconsolata";
    this.ctx.fillStyle = "#2054c9";
    
    // Draw score with fixed size
    this.ctx.font = "25px Inconsolata";
    this.ctx.fillText(`Score: ${this.score}`, 20, 30);
    
    // Draw lives with fixed size
    this.ctx.font = "18px Inconsolata";
    if (this.bucket) {
      this.ctx.fillText(`${this.lives}`, this.bucket.x + 25, this.bucket.y + 40);
    }
    
    // Draw speed with fixed size
    this.ctx.font = "25px Inconsolata";
    this.ctx.fillText(`Speed ${Math.round(this.speedMultiplier * 10) - 10}`, this.canvas.width - 120, 30);
    
    this.drawLegend();
  }

  drawLegend() {
    if (!this.ctx) return;

    // Fixed font size for legend
    this.ctx.font = "18px Inconsolata";
    
    this.ctx.fillStyle = "#2054c9";
    this.ctx.fillText('Blue Tear = 1 point', 20, 50);
    
    this.ctx.fillStyle = "#FFD04D";
    this.ctx.fillText('Gold Tear = 15 points', 20, 70);
    
    this.ctx.fillStyle = "#FF4D6D";
    this.ctx.fillText('Red Tear = -1 life', 20, 90);
    
    this.ctx.fillStyle = "#39B037";
    this.ctx.fillText('Green Tear = +1 life', 20, 110);
  }

  // Game Loop
  gameLoop() {
    if (!this.gameActive) return;

    try {
      this.updateGame();
      this.drawGame();
      this.gameLoopId = requestAnimationFrame(this.gameLoop);
    } catch (error) {
      console.error('Error in game loop:', error);
      this.gameActive = false;
      if (this.onGameOver) {
        this.onGameOver(this.score);
      }
    }
  }
}

/**
 * Base Entity class for game objects
 */
class Entity {
  constructor(x, y, width, height, speed) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
  }

  update() {
    this.y += this.speed;
  }
}

/**
 * Teardrop class - Base class for all falling tear objects
 */
class Teardrop extends Entity {
  constructor(canvasWidth, speedMultiplier) {
    super(
      Math.random() * (canvasWidth - 50), // x position
      0, // y position
      50, // fixed width
      50, // fixed height
      Math.random() * 2 + 2 * speedMultiplier // speed
    );
  }
}

/**
 * Special tear types extending base Teardrop
 */
class Goldtear extends Teardrop {}
class Redtear extends Teardrop {}
class Blacktear extends Teardrop {}

/**
 * Splash effect base class
 */
class Splash {
  constructor(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Invalid coordinates for splash effect');
    }
    this.x = x;
    this.y = y;
    this.opacity = 1;
    this.fillColor = "rgba(255, 255, 255";
    this.radius = 20; // Initial size of the splash
    this.growthRate = 0.5; // Amount to increase the radius each update
  }

  update() {
    this.radius += this.growthRate; // Increase radius over time
    this.opacity = Math.max(0, this.opacity - 0.03); // Fade out
  }

  draw(ctx) {
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.fillStyle = `${this.fillColor}, ${this.opacity})`;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
}


/**
 * Specialized splash effects for different tear types
 */
class GoldSplash extends Splash {
  constructor(x, y) {
    super(x, y);
    this.fillColor = "rgba(255, 204, 51";
  }
}

class RedSplash extends Splash {
  constructor(x, y) {
    super(x, y);
    this.fillColor = "rgba(255, 0, 0";
  }
}

class GreenSplash extends Splash {
  constructor(x, y) {
    super(x, y);
    this.fillColor = "rgba(0, 255, 0";
  }
}

// Create and export the game manager instance
export const gameManager = new GameManager();