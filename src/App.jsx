import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';

const INITIAL_GRID = [
  [0, 1, 1, 0, 0],
  [0, 0, 1, 0, 1],
  [1, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 1, 0],
];

const TARGET_BUTTER = 9;
const INITIAL_MOVES = 16;
const BALARAM_POS = { r: 4, c: 4 };

const App = () => {
  const [gameState, setGameState] = useState('MENU'); // 'MENU', 'PLAYING', 'VICTORY', 'DEFEAT'
  
  const [grid, setGrid] = useState(INITIAL_GRID.map(row => [...row]));
  const [playerPos, setPlayerPos] = useState({ r: 0, c: 0 });
  const [movesLeft, setMovesLeft] = useState(INITIAL_MOVES);
  const [butterEaten, setButterEaten] = useState(0);
  const [hasReachedBalaram, setHasReachedBalaram] = useState(false);
  const [history, setHistory] = useState([]);
  
  const [showInstructions, setShowInstructions] = useState(false);
  
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);

  const [invalidCell, setInvalidCell] = useState(null);

  const [windowDimension, setWindowDimension] = useState({ width: window.innerWidth, height: window.innerHeight });

  const audioRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio('/audio/Chaurastakam.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.2;
  }, []);

  useEffect(() => {
    if (!isMusicMuted) {
      audioRef.current?.play().catch(e => {
        console.log("Audio play prevented:", e);
        setIsMusicMuted(true);
      });
    } else {
      audioRef.current?.pause();
    }
  }, [isMusicMuted]);

  // Audio synths
  const playBeep = (freq = 440, type = 'sine', duration = 0.1) => {
    if (isSfxMuted) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Ignore audio context errors if not supported or blocked
    }
  };

  const playMoveSound = () => playBeep(300, 'square', 0.1);
  const playEatSound = () => {
    if (isSfxMuted) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) { }
  };
  const playErrorSound = () => playBeep(150, 'sawtooth', 0.2);

  const checkWinLossCondition = () => {
    if (gameState === 'VICTORY' || gameState === 'DEFEAT') return;

    const isHome = playerPos.r === 0 && playerPos.c === 0;
    const hasButter = butterEaten === TARGET_BUTTER;

    if (isHome && hasReachedBalaram && hasButter && movesLeft >= 0) {
      setGameState('VICTORY');
      return;
    }

    if (movesLeft === 0) {
      setGameState('DEFEAT');
    }
  };

  useEffect(() => {
    if (gameState === 'PLAYING') {
      checkWinLossCondition();
    }
  }, [playerPos, movesLeft, hasReachedBalaram, butterEaten, gameState]);

  const isValidMove = (r, c) => {
    const dr = Math.abs(r - playerPos.r);
    const dc = Math.abs(c - playerPos.c);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  };

  const handleCellClick = (r, c) => {
    if (gameState !== 'PLAYING') return;
    
    if (!isValidMove(r, c)) {
      playErrorSound();
      setInvalidCell({ r, c });
      setTimeout(() => setInvalidCell(null), 300);
      return;
    }

    setHistory(prev => [
      ...prev,
      {
        grid: grid.map(row => [...row]),
        playerPos: { ...playerPos },
        movesLeft,
        butterEaten,
        hasReachedBalaram
      }
    ]);

    const newGrid = grid.map(row => [...row]);
    let newButterCount = butterEaten;
    
    if (newGrid[r][c] === 1) {
      newGrid[r][c] = 0;
      newButterCount += 1;
      playEatSound();
    } else {
      playMoveSound();
    }

    setGrid(newGrid);
    setPlayerPos({ r, c });
    setMovesLeft(prev => prev - 1);
    setButterEaten(newButterCount);
    
    if (r === BALARAM_POS.r && c === BALARAM_POS.c) {
      setHasReachedBalaram(true);
    }
  };

  const undo = () => {
    if (history.length === 0 || gameState !== 'PLAYING') return;
    const lastState = history[history.length - 1];
    
    setGrid(lastState.grid);
    setPlayerPos(lastState.playerPos);
    setMovesLeft(lastState.movesLeft);
    setButterEaten(lastState.butterEaten);
    setHasReachedBalaram(lastState.hasReachedBalaram);
    
    setHistory(prev => prev.slice(0, -1));
  };

  const restartGame = () => {
    setGrid(INITIAL_GRID.map(row => [...row]));
    setPlayerPos({ r: 0, c: 0 });
    setMovesLeft(INITIAL_MOVES);
    setButterEaten(0);
    setHasReachedBalaram(false);
    setHistory([]);
    setGameState('PLAYING');
  };

  const goHome = () => {
    setGameState('MENU');
  };

  const InstructionsContent = () => (
    <>
      <h2>Story & Rules</h2>
      <p>Each square on the grid represents a Gopi's home in Vrindavan. You play as Krishna.</p>
      <ul style={{textAlign: 'left', margin: '10px 0 10px 20px'}}>
        <li><strong>Movement:</strong> Krishna can move horizontally or vertically to an adjacent square, one step at a time.</li>
        <li><strong>Objectives:</strong>
          <ul>
            <li>Eat all <strong>9 butter pots</strong> (🧈).</li>
            <li>Meet <strong>Balaram</strong> at the far end of the village.</li>
            <li>Krishna has to return back to his home.</li>
          </ul>
        </li>
        <li><strong>Move Limit:</strong> Yashoda Mayya is sleeping, but she will wake up in exactly 16 moves. You must finish your tasks and return to the starting home exactly on your 16th move!</li>
      </ul>
    </>
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'PLAYING') return;
      let newR = playerPos.r;
      let newC = playerPos.c;

      if (e.key === 'ArrowUp' || e.key === 'w') newR -= 1;
      else if (e.key === 'ArrowDown' || e.key === 's') newR += 1;
      else if (e.key === 'ArrowLeft' || e.key === 'a') newC -= 1;
      else if (e.key === 'ArrowRight' || e.key === 'd') newC += 1;
      else return;

      if (newR >= 0 && newR < grid.length && newC >= 0 && newC < grid[0].length) {
        handleCellClick(newR, newC);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, playerPos, grid, butterEaten, movesLeft, hasReachedBalaram]);

  if (gameState === 'MENU') {
    return (
      <div className="app-container menu-container">
        <div style={{ textAlign: 'center' }}>
          <h1 className="sanskrit-title menu-title">चौराष्टकम् </h1>
          <p className="subtitle">The Butter Thief of Vrindavan</p>
        </div>
        
        <div className="menu-image-wrapper">
          <img src="/images/KrishnaButter.png" alt="Krishna with Butter" className="menu-hero-img" />
        </div>
        
        <div className="menu-instructions">
          <InstructionsContent />
        </div>
        
        <button className="cyber-btn start-btn" onClick={restartGame}>
          Start Game
        </button>
      </div>
    );
  }

  if (gameState === 'VICTORY' || gameState === 'DEFEAT') {
    const isHome = playerPos.r === 0 && playerPos.c === 0;
    const hasButter = butterEaten === TARGET_BUTTER;

    let resultTitle = '';
    let resultImage = '';
    let resultHeader = '';
    let resultMessage = '';

    if (gameState === 'VICTORY') {
      resultTitle = 'Victory!';
      resultImage = '/images/KrishnaButter.png';
      resultHeader = 'Navaneet chor ki Jai!!';
      resultMessage = 'You successfully ate all the butter, met Balaram, and returned safely before Yashoda Mayya woke up.';
    } else {
      if (!isHome) {
        resultTitle = 'Yashoda Mayya caught you!';
        resultImage = '/images/Yashoda.jpg';
        resultHeader = 'Yashoda Mayya caught you!';
        if (hasButter && hasReachedBalaram) resultMessage = "You ate all the butter and met Balaram, but you did not reach back home on time!";
        else if (hasButter) resultMessage = "You ate all the butter, but didn't meet Balaram or reach back home on time!";
        else if (hasReachedBalaram) resultMessage = "You met Balaram, but didn't eat all the butter or reach back home on time!";
        else resultMessage = "You ran out of moves before completing your tasks and returning home!";
      } else if (!hasReachedBalaram) {
        resultTitle = 'Balaram misses you';
        resultImage = '/images/Balaram.png';
        resultHeader = 'Balaram misses you';
        if (!hasButter) resultMessage = "You returned home on time, but you didn't eat all the butter or meet Balaram!";
        else resultMessage = "You returned home and ate all the butter, but you didn't meet Balaram!";
      } else if (!hasButter) {
        resultTitle = 'You missed some butter';
        resultImage = 'emoji:🧈';
        resultHeader = 'You missed some butter';
        resultMessage = "You returned home and met Balaram, but you didn't eat all the butter!";
      } else {
        resultTitle = 'Game Over!';
        resultImage = '/images/Yashoda.jpg';
        resultHeader = 'Time ran out!';
        resultMessage = "You did not complete all the objectives!";
      }
    }

    return (
      <div className="app-container menu-container">
        {gameState === 'VICTORY' && <Confetti width={windowDimension.width} height={windowDimension.height} />}
        <h1 className="sanskrit-title menu-title" style={{ fontSize: '2.5rem', textAlign: 'center' }}>
          {resultTitle}
        </h1>
        
        <div className="menu-image-wrapper" style={{ borderColor: gameState === 'VICTORY' ? '#33ff33' : '#ff3333', boxShadow: `0 0 25px ${gameState === 'VICTORY' ? '#33ff33' : '#ff3333'}` }}>
          {resultImage.startsWith('emoji:') ? (
            <span style={{ fontSize: '5rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }}>
              {resultImage.replace('emoji:', '')}
            </span>
          ) : (
            <img src={resultImage} alt="Result" className="menu-hero-img" />
          )}
        </div>

        <div className="menu-instructions" style={{ textAlign: 'center', borderColor: gameState === 'VICTORY' ? '#33ff33' : '#ff3333' }}>
          <h2>{resultHeader}</h2>
          <p>{resultMessage}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="cyber-btn" onClick={restartGame}>
            🔄 Play Again
          </button>
          <button className="cyber-btn" onClick={goHome}>
            🏠 Main Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Instructions Modal */}
      {showInstructions && (
        <div className="modal-overlay">
          <div className="modal-content menu-instructions">
            <InstructionsContent />
            <button className="cyber-btn" onClick={() => setShowInstructions(false)} style={{marginTop: '1rem', width: '100%'}}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="title-section">
        <h1 className="sanskrit-title">🦚 चौराष्टकम् 🦚</h1>
        <p className="subtitle">The Butter Thief of Vrindavan</p>
      </div>

      <div className="header">
        <div className="yashoda-container">
          <img src="/images/Yashoda.jpg" alt="Yashoda Mayya" className="yashoda-img" />
          <span style={{ fontSize: '0.7rem', color: '#ccc' }}>Yashoda Mayya</span>
        </div>
        <div className="stats">
          <div className="stat-row">
            <span>Moves till Yashoda Mayya wakes:</span>
            <span style={{ color: movesLeft <= 3 ? '#ff3333' : 'var(--neon-cyan)', fontWeight: 'bold', fontSize: '1.2rem' }}>
              {movesLeft}
            </span>
          </div>
          <div className="stat-row">
            <span>Butter:</span>
            <span className="butter-icon">🧈</span>
            <span style={{ color: 'var(--neon-yellow)', fontWeight: 'bold' }}>
              {butterEaten}/{TARGET_BUTTER}
            </span>
          </div>
          <div className="stat-row">
            <span>Met Balaram:</span>
            <span>{hasReachedBalaram ? '✅' : '❌'}</span>
          </div>
        </div>
      </div>

      <div className="grid-container">
        {grid.map((row, r) => (
          row.map((cell, c) => {
            const isPlayerHere = playerPos.r === r && playerPos.c === c;
            const isBalaramHere = BALARAM_POS.r === r && BALARAM_POS.c === c;
            const valid = isValidMove(r, c) && gameState === 'PLAYING';
            const objectivesMet = butterEaten === TARGET_BUTTER && hasReachedBalaram;
            const isHome = r === 0 && c === 0;
            const isInvalid = invalidCell?.r === r && invalidCell?.c === c;

            return (
              <div
                key={`${r}-${c}`}
                className={`cell ${valid ? 'valid-move' : ''} ${isPlayerHere ? 'player-cell' : ''} ${isBalaramHere && !isPlayerHere ? 'balaram-cell' : ''} ${isInvalid ? 'shake' : ''}`}
                onClick={() => handleCellClick(r, c)}
              >
                {isHome && objectivesMet && !isPlayerHere && (
                  <div className="go-home-indicator">Come Back, Krishna!</div>
                )}
                {isPlayerHere && !(r === 0 && c === 0 && history.length > 0) && (
                  <img src="/images/Krishna.jpg" alt="Krishna" className="character-img" />
                )}
                {r === 0 && c === 0 && (!isPlayerHere || history.length > 0) && (
                  <span style={{ fontSize: '2.5rem' }}>🏠</span>
                )}
                {!isPlayerHere && isBalaramHere && (
                  <>
                    <img src="/images/Balaram.png" alt="Balaram" className="character-img" />
                    {hasReachedBalaram && <span className="balaram-thumbs-up">👍</span>}
                    {!hasReachedBalaram && <div className="meet-me-label">Meet me!</div>}
                  </>
                )}
                {!isPlayerHere && !isBalaramHere && cell === 1 && (
                  <span className="butter-item">🧈</span>
                )}
              </div>
            );
          })
        ))}
      </div>

      <div className="footer">
        <div className="controls">
          <button className="cyber-btn icon-btn" onClick={goHome} title="Home">
            🏠
          </button>
          
          <button className="cyber-btn icon-btn" onClick={() => setShowInstructions(true)} title="Instructions">
            📖
          </button>

          <button className="cyber-btn icon-btn" onClick={undo} disabled={history.length === 0} title="Undo Move">
            ↩️
          </button>

          <button className="cyber-btn icon-btn" onClick={restartGame} title="Restart Game">
            🔄
          </button>
          
          <div className="audio-controls">
            <button 
              className="cyber-btn icon-btn" 
              onClick={() => setIsMusicMuted(!isMusicMuted)}
              title="Toggle Music"
            >
              <div className={`audio-icon-wrapper ${isMusicMuted ? 'muted' : ''}`}>
                🎵
              </div>
            </button>
            <button 
              className="cyber-btn icon-btn" 
              onClick={() => setIsSfxMuted(!isSfxMuted)}
              title="Toggle Sound Effects"
            >
              <div className={`audio-icon-wrapper ${isSfxMuted ? 'muted' : ''}`}>
                ✨
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
