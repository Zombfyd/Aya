// GameManager.js - Main game controller class

class GameManager {
  constructor() {
    this.UI_SIZES = {
      BUCKET_WIDTH: 70,
      BUCKET_HEIGHT: 70,
      TEAR_WIDTH: 50,
      TEAR_HEIGHT: 50,
      SCORE_FONT: "25px Inconsolata",
      LIVES_FONT: "18px Inconsolata",
      LEGEND_FONT: "18px Inconsolata",
      BACKGROUND_HEIGHT: 700
    };
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
      background: this.loadImage("https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/674fa00dfaa922f1c9d76f9c_black-and-white-anime-2560-x-1600-background-d8u8u9i7yoalq57c.webp")
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
    // Keep all your existing reset code
    this.score = 0;
    this.lives = 10;
    this.speedMultiplier = 1;
    this.lastCheckpoint = 0;
    this.gameActive = true;

    // Replace the bucket initialization with this:
    this.bucket = {
      x: this.canvas.width / 2 - this.UI_SIZES.BUCKET_WIDTH / 2,
      y: this.canvas.height - this.UI_SIZES.BUCKET_HEIGHT - 10,
      width: this.UI_SIZES.BUCKET_WIDTH,
      height: this.UI_SIZES.BUCKET_HEIGHT,
      speed: 0
    };

    // Keep all your existing array initializations
    this.teardrops = [];
    this.goldtears = [];
    this.redtears = [];
    this.blacktears = [];
    this.splashes = [];

    // Keep your existing timer clearing code
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
    const tear = new Teardrop(this.canvas.width, this.speedMultiplier);
    tear.forming = true;
    tear.formationProgress = 0;
    tear.scaleY = 0.2;
    tear.y = tear.initialY;
    this.teardrops.push(tear);
    this.spawnTimers.teardrop = setTimeout(() => this.spawnTeardrop(), Math.random() * 750 + 300);
  }

  spawnGoldtear() {
    if (!this.gameActive) return;
    const tear = new Teardrop(this.canvas.width, this.speedMultiplier);
    tear.forming = true;
    tear.formationProgress = 0;
    tear.scaleY = 0.2;
    tear.y = tear.initialY;
    this.goldtears.push(tear);
    this.spawnTimers.goldtear = setTimeout(() => this.spawnGoldtear(), Math.random() * 3000 + 1500);
  }

  spawnRedtear() {
    if (!this.gameActive) return;
    const tear = new Teardrop(this.canvas.width, this.speedMultiplier);
    tear.forming = true;
    tear.formationProgress = 0;
    tear.scaleY = 0.2;
    tear.y = tear.initialY;
    this.redtears.push(tear);
    this.spawnTimers.redtear = setTimeout(() => this.spawnRedtear(), Math.random() * 12000 + 3000);
  }

  spawnBlacktear() {
    if (!this.gameActive) return;
    const tear = new Teardrop(this.canvas.width, this.speedMultiplier);
    tear.forming = true;
    tear.formationProgress = 0;
    tear.scaleY = 0.2;
    tear.y = tear.initialY;
    this.blacktears.push(tear);
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
      
      // Create ground splash effect
      const splashX = entity.x + entity.width / 2;
      const splashY = this.canvas.height;
      
      if (isGold) {
        this.splashes.push(new GoldSplash(splashX, splashY));
      } else if (isRed) {
        this.splashes.push(new RedSplash(splashX, splashY));
      } else if (isBlack) {
        this.splashes.push(new GreenSplash(splashX, splashY));
      } else {
        this.splashes.push(new BlueSplash(splashX, splashY));
      }
      
      // Handle life reduction for non-red tears
      if (!isRed) {
        this.lives--;
      }
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
  const splashX = entity.x + entity.width / 2;
  const splashY = this.bucket.y;

  if (isGold) {
    this.score += 15;
    this.splashes.push(new GoldSplash(splashX, splashY));
  } else if (isRed) {
    this.lives--;
    this.splashes.push(new RedSplash(splashX, splashY));
  } else if (isBlack) {
    this.lives++;
    this.splashes.push(new GreenSplash(splashX, splashY));
  } else {
    this.score += 1;
    this.splashes.push(new BlueSplash(splashX, splashY));  // Changed from base Splash to BlueSplash
  }
}

  // Drawing Methods
  drawGame() {
    if (!this.ctx) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background with fixed height and crop from right side
    if (this.images.background) {
      const height = this.canvas.height;
      const aspectRatio = this.images.background.width / this.images.background.height;
      const desiredWidth = height * aspectRatio;
      
      this.ctx.drawImage(
        this.images.background,
        0,                    // source x (start from left)
        0,                    // source y
        this.images.background.width,  // source width
        this.images.background.height, // source height
        0,                    // destination x (start from left)
        0,                    // destination y
        desiredWidth,         // destination width
        height               // destination height
      );
    }

    // Reset transform before drawing UI elements
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw bucket with fixed size
    if (this.bucket && this.images.bucket) {
      this.ctx.drawImage(
        this.images.bucket,
        this.bucket.x,
        this.bucket.y,
        this.UI_SIZES.BUCKET_WIDTH,
        this.UI_SIZES.BUCKET_HEIGHT
      );
    }

    // Draw teardrops with fixed sizes
    const drawTear = (tear, image) => {
      this.ctx.drawImage(
        image,
        tear.x,
        tear.y,
        this.UI_SIZES.TEAR_WIDTH,
        this.UI_SIZES.TEAR_HEIGHT
      );
    };

    this.teardrops.forEach(tear => drawTear(tear, this.images.teardrop));
    this.goldtears.forEach(tear => drawTear(tear, this.images.goldtear));
    this.redtears.forEach(tear => drawTear(tear, this.images.redtear));
    this.blacktears.forEach(tear => drawTear(tear, this.images.blacktear));

    // Draw splashes with fixed sizing
    this.splashes.forEach(splash => {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      splash.draw(this.ctx);
    });

    // Draw UI with fixed fonts
    this.drawUI();
}


drawUI() {
  if (!this.ctx) return;

  // Reset transform before drawing text
  this.ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Draw score
  this.ctx.font = this.UI_SIZES.SCORE_FONT;
  this.ctx.fillStyle = "#2054c9";
  this.ctx.fillText(`Score: ${this.score}`, 20, 30);

  // Draw lives
  this.ctx.font = this.UI_SIZES.LIVES_FONT;
  if (this.bucket) {
    this.ctx.fillText(`${this.lives}`, this.bucket.x + 25, this.bucket.y + 40);
  }

  // Draw speed
  this.ctx.font = this.UI_SIZES.SCORE_FONT;
  this.ctx.fillText(`Speed ${Math.round(this.speedMultiplier * 10) - 10}`, this.canvas.width - 120, 30);

  this.drawLegend();
}

  drawLegend() {
    if (!this.ctx) return;

    // Reset transform before drawing legend
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    this.ctx.font = this.UI_SIZES.LEGEND_FONT;

    const legends = [
      { text: 'Blue Tear = 1 point', color: '#2054c9', y: 50 },
      { text: 'Gold Tear = 15 points', color: '#FFD04D', y: 70 },
      { text: 'Red Tear = -1 life', color: '#FF4D6D', y: 90 },
      { text: 'Green Tear = +1 life', color: '#39B037', y: 110 }
    ];

    legends.forEach(({ text, color, y }) => {
      this.ctx.fillStyle = color;
      this.ctx.fillText(text, 20, y);
    });
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
      20, // Start slightly below top of screen to be visible
      50, // fixed width
      50, // fixed height
      Math.random() * 2 + 2 * speedMultiplier // speed
    );
    
    // Add formation state properties
    this.forming = true;
    this.formationProgress = 0;
    this.formationSpeed = 0.02; // Controls how fast the tear forms
    this.initialY = 20; // Where the tear should form - slightly below top
    
    // Separate scales for width and height to create flat effect
    this.scaleX = 1; // Start full width
    this.scaleY = 0.2; // Start very flat
    
    // Keep tear dimensions fixed for collision purposes
    this.width = 50;
    this.height = 50;
  }

  update() {
    if (this.forming) {
      // Update formation progress
      this.formationProgress += this.formationSpeed;
      
      // Keep width constant but grow height
      this.scaleY = 0.2 + (this.formationProgress * 0.8); // Grow from 0.2 to 1.0
      
      if (this.formationProgress >= 1) {
        this.forming = false;
        this.scaleY = 1;
      }
      
      // Stay at initial position during formation
      this.y = this.initialY;
    } else {
      // Normal falling behavior once formed
      this.y += this.speed;
    }
  }

  draw(ctx, image) {
    if (!ctx || !image) return;

    if (this.forming) {
      // Draw forming animation
      const currentWidth = this.width * this.scaleX;
      const currentHeight = this.height * this.scaleY;
      const xOffset = (this.width - currentWidth) / 2;
      const yOffset = (this.height - currentHeight) / 2;

      ctx.drawImage(
        image,
        this.x + xOffset,
        this.y + yOffset,
        currentWidth,
        currentHeight
      );
    } else {
      // Normal draw
      ctx.drawImage(image, this.x, this.y, this.width, this.height);
    }
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
class BaseSplash {
  constructor(x, y, color) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error("Invalid coordinates for splash effect");
    }
    this.x = x;
    this.y = y;
    this.opacity = 1;
    this.fillColor = color;
    this.droplets = this.createDroplets();
  }

  createDroplets() {
    let droplets = [];
    // Create more droplets since they're now the main visual element
    let count = Math.floor(Math.random() * 8) + 6; // 6-13 droplets
    
    for (let i = 0; i < count; i++) {
      let angle = (Math.PI * (i / count * 2 - 1)) + (Math.random() * 0.5 - 0.25); // More controlled spread
      let speed = Math.random() * 4 + 3; // Increased speed for more dramatic effect
      droplets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Added upward boost
        radius: Math.random() * 4 + 2, // Slightly smaller droplets
        opacity: 1
      });
    }
    return droplets;
  }

  update() {
    this.opacity = Math.max(0, this.opacity - 0.03); // Slower fade

    this.droplets.forEach((drop) => {
      drop.x += drop.vx;
      drop.y += drop.vy;
      drop.vy += 0.2; // Increased gravity effect
      drop.vx *= 0.99; // Slight horizontal slowdown
      drop.opacity = this.opacity; // Match main opacity
    });

    // Remove drops that have faded out
    return this.opacity > 0;
  }

  draw(ctx) {
    if (!ctx) return;

    this.droplets.forEach((drop) => {
      ctx.beginPath();
      ctx.fillStyle = `${this.fillColor}${drop.opacity})`;
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    });
  }
}


/**
 * Specialized splash effects for different tear types
 */
class BlueSplash extends BaseSplash {
  constructor(x, y) {
    super(x, y, "rgba(32, 84, 201, ");
  }
}

class GoldSplash extends BaseSplash {
  constructor(x, y) {
    super(x, y, "rgba(255, 204, 51, ");
  }
}

class RedSplash extends BaseSplash {
  constructor(x, y) {
    super(x, y, "rgba(255, 0, 0, ");
  }
}

class GreenSplash extends BaseSplash {
  constructor(x, y) {
    super(x, y, "rgba(0, 255, 0, ");
  }
}

// Create and export the game manager instance
export const gameManager = new GameManager();
