/**
 * Happy Birthday Tawan - Web Application Logic
 * Premium Jigsaw Puzzle & Custom Video Player
 */

document.addEventListener('DOMContentLoaded', () => {
  // Screen elements
  const screenIntro = document.getElementById('screen-intro');
  const screenPuzzle = document.getElementById('screen-puzzle');

  // Buttons & Controls
  const btnStart = document.getElementById('btn-start');
  const btnBackToIntro = document.getElementById('btn-back-to-intro');
  const btnPreview = document.getElementById('btn-preview');
  const btnClosePreview = document.getElementById('btn-close-preview');
  const btnReset = document.getElementById('btn-reset');
  const btnReplayPuzzle = document.getElementById('btn-replay-puzzle');
  const difficultySelect = document.getElementById('difficulty-select');
  const previewOverlay = document.getElementById('preview-overlay');
  
  // Stats
  const timerDisplay = document.getElementById('puzzle-timer');
  const movesDisplay = document.getElementById('puzzle-moves');
  
  // Game Board & Canvas
  const puzzleBoard = document.getElementById('puzzle-board');
  const previewCanvas = document.getElementById('preview-canvas');
  const hiddenVideo = document.getElementById('hidden-video');

  // Video Player elements
  const bdayVideo = document.getElementById('birthday-video');
  const customPlayer = document.getElementById('custom-player');

  // Global App State
  let difficulty = parseInt(difficultySelect.value); // cols & rows (3x3, 4x4, 5x5)
  let puzzleImage = null; // Canvas source (holds video frame or fallback image)
  let puzzlePieces = []; // Array of piece objects
  let selectedPiece = null; // For click-to-swap on mobile
  let timerInterval = null;
  let secondsElapsed = 0;
  let moveCount = 0;
  let isGameActive = false;
  let isVideoCaptured = false;

  // Fallback image path
  const fallbackImageSrc = 'birthday_cover.png';

  // Audio Context (Synthesized sound effects)
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playSound(type) {
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'click') {
        // Subtle wood block / click sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'swap') {
        // High soft bubble pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'success') {
        // Celebration chime (arpeggio)
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const timeOffset = idx * 0.08;
          const noteOsc = audioCtx.createOscillator();
          const noteGain = noteOsc.connect(audioCtx.createGain());
          noteGain.connect(audioCtx.destination);
          
          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(freq, now + timeOffset);
          
          noteGain.gain.setValueAtTime(0.15, now + timeOffset);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.4);
          
          noteOsc.start(now + timeOffset);
          noteOsc.stop(now + timeOffset + 0.4);
        });
      }
    } catch (e) {
      console.warn("Audio synthesis failed:", e);
    }
  }

  // --- Decorative Twinkling Background ---
  function initBackgroundEffects() {
    const container = document.getElementById('floating-container');
    container.innerHTML = ''; // clear

    // 1. Create twinkling stars
    const starCount = 40;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'twinkle-star';
      star.style.left = `${Math.random() * 100}vw`;
      star.style.top = `${Math.random() * 100}vh`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      star.style.transform = `scale(${0.5 + Math.random()})`;
      container.appendChild(star);
    }

    // 2. Create floating balloons
    const balloonColors = ['#ec4899', '#f59e0b', '#06b6d4', '#8b5cf6', '#10b981'];
    const balloonCount = 8;
    for (let i = 0; i < balloonCount; i++) {
      createBalloon(container, balloonColors);
    }
    
    // Periodically spawn a new balloon to keep it alive
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        createBalloon(container, balloonColors);
      }
    }, 4000);
  }

  function createBalloon(container, colors) {
    const balloon = document.createElement('div');
    balloon.className = 'floating-balloon';
    balloon.style.left = `${Math.random() * 90}vw`;
    balloon.style.color = colors[Math.floor(Math.random() * colors.length)];
    balloon.style.animationDuration = `${12 + Math.random() * 8}s`;
    balloon.style.animationDelay = `${Math.random() * 5}s`;
    
    const scale = 0.6 + Math.random() * 0.6;
    balloon.style.transform = `scale(${scale})`;
    
    container.appendChild(balloon);

    // Remove balloon after it exits the screen
    balloon.addEventListener('animationend', () => {
      balloon.remove();
    });
  }

  initBackgroundEffects();

  // --- Confetti System ---
  const confettiCanvas = document.getElementById('confetti-canvas');
  const confettiCtx = confettiCanvas.getContext('2d');
  let confettiParticles = [];
  let confettiAnimationId = null;

  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfettiCanvas);
  resizeConfettiCanvas();

  class Confetti {
    constructor() {
      this.x = Math.random() * confettiCanvas.width;
      this.y = Math.random() * -confettiCanvas.height - 20;
      this.size = Math.random() * 8 + 6;
      this.speedY = Math.random() * 4 + 4;
      this.speedX = Math.random() * 3 - 1.5;
      this.color = `hsl(${Math.random() * 360}, 90%, 65%)`;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = Math.random() * 4 - 2;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.y / 30) * 0.5;
      this.rotation += this.rotationSpeed;
    }

    draw() {
      confettiCtx.save();
      confettiCtx.translate(this.x, this.y);
      confettiCtx.rotate((this.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = this.color;
      confettiCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      confettiCtx.restore();
    }
  }

  function startConfettiCelebration() {
    stopConfettiCelebration();
    confettiParticles = [];
    for (let i = 0; i < 150; i++) {
      confettiParticles.push(new Confetti());
    }
    animateConfetti();
  }

  function stopConfettiCelebration() {
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    let activeParticles = 0;
    confettiParticles.forEach((p) => {
      p.update();
      p.draw();
      if (p.y < confettiCanvas.height) {
        activeParticles++;
      }
    });

    if (activeParticles > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    }
  }

  // --- Video Frame Extractor & Image Loader ---
  // Try to load video frame, fallback to background cover on failure or security block.
  function loadPuzzleSource() {
    return new Promise((resolve) => {
      if (isVideoCaptured && puzzleImage) {
        resolve(puzzleImage);
        return;
      }

      // Preload fallback cover image
      const fallbackImage = new Image();
      fallbackImage.src = fallbackImageSrc;

      // Handle fallback image loaded
      fallbackImage.onload = () => {
        // Set fallback first as general case
        if (!puzzleImage) {
          puzzleImage = fallbackImage;
        }
      };

      // Set up hidden video to capture frame
      hiddenVideo.addEventListener('loadedmetadata', () => {
        // Adjust aspect ratio styling
        const aspect = hiddenVideo.videoWidth / hiddenVideo.videoHeight;
        document.documentElement.style.setProperty('--board-aspect-ratio', aspect.toString());
        
        // Seek to 2.0s or 10% of duration to get a nice bright frame
        hiddenVideo.currentTime = Math.min(2.0, hiddenVideo.duration / 2);
      });

      hiddenVideo.addEventListener('seeked', () => {
        try {
          // Try to paint video frame on a canvas
          const masterCanvas = document.createElement('canvas');
          masterCanvas.width = hiddenVideo.videoWidth;
          masterCanvas.height = hiddenVideo.videoHeight;
          const ctx = masterCanvas.getContext('2d');
          
          // Draw video frame to master canvas
          ctx.drawImage(hiddenVideo, 0, 0, masterCanvas.width, masterCanvas.height);
          
          // Test if canvas is tainted due to CORS under file://
          // This will throw an error if tainted
          masterCanvas.toDataURL('image/png');
          
          // If no error, we use the video canvas as puzzle image source
          puzzleImage = masterCanvas;
          isVideoCaptured = true;
          console.log("Successfully captured frame from birthday video.");
          resolve(puzzleImage);
        } catch (e) {
          console.warn("Video frame capture blocked by browser CORS policy. Falling back to cover image.", e);
          // If video capture fails, resolve using fallback image
          if (fallbackImage.complete) {
            puzzleImage = fallbackImage;
            resolve(puzzleImage);
          } else {
            fallbackImage.onload = () => {
              puzzleImage = fallbackImage;
              resolve(puzzleImage);
            };
          }
        }
      });

      hiddenVideo.addEventListener('error', (e) => {
        console.warn("Could not load video for puzzle frame. Using fallback cover image.", e);
        if (fallbackImage.complete) {
          puzzleImage = fallbackImage;
          resolve(puzzleImage);
        } else {
          fallbackImage.onload = () => {
            puzzleImage = fallbackImage;
            resolve(puzzleImage);
          };
        }
      });

      // Try loading the video
      hiddenVideo.load();

      // Timeout safety: if video metadata doesn't load in 3 seconds, use fallback cover
      setTimeout(() => {
        if (!puzzleImage) {
          puzzleImage = fallbackImage;
          resolve(puzzleImage);
        }
      }, 3000);
    });
  }

  // --- JIGSAW PUZZLE ENGINE ---
  
  function initPuzzle() {
    difficulty = parseInt(difficultySelect.value);
    
    // Set grid CSS variables
    puzzleBoard.style.setProperty('--grid-cols', difficulty);
    puzzleBoard.style.setProperty('--grid-rows', difficulty);

    // Setup preview canvas dimensions
    const aspect = puzzleImage.width / puzzleImage.height;
    document.documentElement.style.setProperty('--board-aspect-ratio', aspect.toString());

    previewCanvas.width = 480;
    previewCanvas.height = 480 / aspect;
    const pCtx = previewCanvas.getContext('2d');
    pCtx.drawImage(puzzleImage, 0, 0, previewCanvas.width, previewCanvas.height);

    // Clear board
    puzzleBoard.innerHTML = '';
    puzzlePieces = [];
    selectedPiece = null;

    const totalPieces = difficulty * difficulty;

    // Generate puzzle pieces
    for (let i = 0; i < totalPieces; i++) {
      const pieceContainer = document.createElement('div');
      pieceContainer.className = 'puzzle-piece';
      pieceContainer.setAttribute('draggable', 'true');
      pieceContainer.dataset.correctIdx = i;
      pieceContainer.dataset.currentIdx = i;

      const pieceCanvas = document.createElement('canvas');
      pieceContainer.appendChild(pieceCanvas);
      
      // Store reference
      puzzlePieces.push({
        correctIdx: i,
        currentIdx: i,
        element: pieceContainer,
        canvas: pieceCanvas
      });

      puzzleBoard.appendChild(pieceContainer);
    }

    // Render original image slices onto canvases
    renderPieces();
    
    // Shuffle pieces
    shufflePieces();
    
    // Setup event listeners for interaction
    setupDragAndDrop();

    // Reset stats
    moveCount = 0;
    movesDisplay.textContent = '0 ครั้ง';
    resetTimer();
    startTimer();
    isGameActive = true;
  }

  function renderPieces() {
    const sw = puzzleImage.width / difficulty;
    const sh = puzzleImage.height / difficulty;

    puzzlePieces.forEach((piece) => {
      const i = piece.correctIdx;
      const col = i % difficulty;
      const row = Math.floor(i / difficulty);

      // Slice boundaries in source image
      const sx = col * sw;
      const sy = row * sh;

      const canvas = piece.canvas;
      const ctx = canvas.getContext('2d');

      // Set canvas size (scaled down representation)
      canvas.width = 180;
      canvas.height = 180 / (puzzleImage.width / puzzleImage.height);

      ctx.drawImage(puzzleImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    });
  }

  function shufflePieces() {
    // Generate simple array of indices and shuffle
    let shuffledIndices = puzzlePieces.map(p => p.correctIdx);
    
    // Fisher-Yates Shuffle
    do {
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }
    } while (isSolved(shuffledIndices)); // Keep shuffling if it starts solved

    // Apply indices to pieces and physically re-arrange DOM elements
    puzzlePieces.forEach((piece, idx) => {
      const targetIdx = shuffledIndices[idx];
      piece.currentIdx = targetIdx;
      piece.element.dataset.currentIdx = targetIdx;
      
      // Update DOM order to render in grid
      piece.element.style.order = targetIdx;
    });
  }

  function isSolved(indices = null) {
    if (indices) {
      return indices.every((val, idx) => val === idx);
    }
    return puzzlePieces.every(p => p.correctIdx === parseInt(p.element.style.order));
  }

  // Swap logic
  function swapPieces(pieceA, pieceB) {
    if (!isGameActive) return;

    playSound('swap');

    const orderA = pieceA.style.order;
    const orderB = pieceB.style.order;

    pieceA.style.order = orderB;
    pieceB.style.order = orderA;

    // Update stats
    moveCount++;
    movesDisplay.textContent = `${moveCount} ครั้ง`;

    // Check win condition
    if (isSolved()) {
      handleGameWin();
    }
  }

  // Setup Event Listeners for Drag and Drop (Mouse + Touch support)
  function setupDragAndDrop() {
    let dragSourceElement = null;

    puzzlePieces.forEach((piece) => {
      const el = piece.element;

      // --- HTML5 Drag & Drop (Desktop) ---
      el.addEventListener('dragstart', (e) => {
        if (!isGameActive) {
          e.preventDefault();
          return;
        }
        dragSourceElement = el;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        // Set small text to satisfy browser drag require
        e.dataTransfer.setData('text/plain', el.style.order);
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        puzzlePieces.forEach(p => p.element.classList.remove('drag-over'));
      });

      el.addEventListener('dragover', (e) => {
        if (e.preventDefault) e.preventDefault();
        return false;
      });

      el.addEventListener('dragenter', () => {
        if (el !== dragSourceElement) {
          el.classList.add('drag-over');
        }
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over');
      });

      el.addEventListener('drop', (e) => {
        e.stopPropagation();
        if (dragSourceElement && dragSourceElement !== el) {
          swapPieces(dragSourceElement, el);
        }
        return false;
      });

      // --- Click to Swap (Mobile / Desktop Accessible fallback) ---
      el.addEventListener('pointerdown', (e) => {
        // Initialize sound on first tap (Safari requirement)
        initAudio();
        
        if (!isGameActive) return;

        if (selectedPiece === null) {
          // Select first piece
          selectedPiece = el;
          el.classList.add('selected');
          playSound('click');
        } else if (selectedPiece === el) {
          // Deselect
          selectedPiece.classList.remove('selected');
          selectedPiece = null;
          playSound('click');
        } else {
          // Select second piece - Swap!
          selectedPiece.classList.remove('selected');
          swapPieces(selectedPiece, el);
          selectedPiece = null;
        }
      });
    });
  }

  function handleGameWin() {
    isGameActive = false;
    clearInterval(timerInterval);
    
    playSound('success');
    startConfettiCelebration();

    // Reset video to start
    bdayVideo.currentTime = 0;

    // Highlights winning state on board
    puzzlePieces.forEach(p => {
      p.element.style.borderColor = 'var(--gold-accent)';
      p.element.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.4)';
    });

    // Seamlessly transition to the video player
    setTimeout(() => {
      document.getElementById('game-card').classList.add('game-solved');
      playBirthdayVideo();
    }, 1500);
  }

  // --- Timer ---
  function startTimer() {
    secondsElapsed = 0;
    updateTimerText();
    timerInterval = setInterval(() => {
      secondsElapsed++;
      updateTimerText();
    }, 1000);
  }

  function resetTimer() {
    clearInterval(timerInterval);
    secondsElapsed = 0;
    updateTimerText();
  }

  function updateTimerText() {
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
  }

  // --- Screen Navigation ---
  function transitionToScreen(targetScreen) {
    const activeScreen = document.querySelector('.screen.active');
    
    if (activeScreen) {
      activeScreen.classList.remove('active');
    }
    
    // Short delay to allow display change to hook up with fade transitions
    targetScreen.style.display = 'flex';
    setTimeout(() => {
      targetScreen.classList.add('active');
    }, 50);

    // Pause video if moving away from game/puzzle screen
    if (targetScreen !== screenPuzzle) {
      pauseBirthdayVideo();
    }
  }

  // Button Action Handlers
  btnStart.addEventListener('click', () => {
    playSound('click');
    loadPuzzleSource().then(() => {
      transitionToScreen(screenPuzzle);
      initPuzzle();
    });
  });

  btnBackToIntro.addEventListener('click', () => {
    playSound('click');
    transitionToScreen(screenIntro);
  });

  btnPreview.addEventListener('click', () => {
    playSound('click');
    previewOverlay.classList.add('active');
  });

  btnClosePreview.addEventListener('click', () => {
    playSound('click');
    previewOverlay.classList.remove('active');
  });

  btnReset.addEventListener('click', () => {
    playSound('click');
    initPuzzle();
  });

  btnReplayPuzzle.addEventListener('click', () => {
    playSound('click');
    document.getElementById('game-card').classList.remove('game-solved');
    pauseBirthdayVideo();
    initPuzzle();
  });

  difficultySelect.addEventListener('change', () => {
    initPuzzle();
  });


  // --- VIDEO PLAYER LOGIC ---

  function playBirthdayVideo() {
    bdayVideo.play();
    startConfettiCelebration(); // Confetti on playing video!
    
    // Slow down confetti after 6 seconds to not block video view
    setTimeout(() => {
      if (bdayVideo.paused === false) {
        confettiParticles = confettiParticles.slice(0, 30);
      }
    }, 6000);
  }

  function pauseBirthdayVideo() {
    bdayVideo.pause();
    stopConfettiCelebration();
  }

  // Toggle play/pause by clicking on the video (only when solved)
  bdayVideo.addEventListener('click', () => {
    if (document.getElementById('game-card').classList.contains('game-solved')) {
      if (bdayVideo.paused) {
        playBirthdayVideo();
      } else {
        pauseBirthdayVideo();
      }
    }
  });
});
