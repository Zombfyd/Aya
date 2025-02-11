import React, { useState, useEffect } from 'react';
import { createAvatar } from '@dicebear/core';
import { pixelArt, lorelei, adventurer } from '@dicebear/collection';
import config from '../config/web2Config';
import { gameManager } from '../game/GameManager.js';
window.gameManager = gameManager;

// Add a logging utility
const log = (message, type = 'info') => {
  if (config.debug.enabled) {
    const styles = {
      info: 'color: #2054c9',
      error: 'color: #ff0000',
      success: 'color: #00ff00',
      warning: 'color: #ffa500'
    };
    console.log(`%c[Tears of Aya] ${message}`, styles[type]);
  }
};

const GameApp = () => {
  // Basic game state
  const [gameState, setGameState] = useState({
    gameStarted: false,
    score: 0,
    isGameOver: false
  });
  
  // User state
  const [userState, setUserState] = useState({
    username: '',
    avatar: null,
    isRegistered: false,
    registrationStep: 'username' // 'username' | 'avatar' | 'complete'
  });
  
  // Game management state
  const [gameManagerInitialized, setGameManagerInitialized] = useState(false);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [countdown, setCountdown] = useState(null);
  
  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  
  // Web3 discovery modal
  const [showWeb3Info, setShowWeb3Info] = useState(false);

  // Avatar generation helper function
  const generateAvatar = (style, seed, size = 32) => {
    try {
      const avatar = createAvatar(style, {
        seed,
        size: size,
        backgroundColor: ['b6e3f4','c0aede','d1d4f9']
      });
      
      // Use toDataUriSync() instead of toDataUrl
      return avatar.toDataUriSync();
    } catch (error) {
      console.error(`Avatar generation failed for style ${style.name}:`, error);
      return config.fallbacks.avatarUrl;
    }
  };

  // Enhanced game manager initialization
  useEffect(() => {
    const initializeGameManager = async () => {
      try {
        log('Initializing game manager...', 'info');
        if (!window.gameManager) {
          throw new Error('GameManager not found on window object');
        }

        // Ensure canvas element exists first
        const canvas = document.getElementById('tearCatchGameCanvas');
        if (!canvas) {
          throw new Error('Canvas element not found');
        }

        // Set initial canvas dimensions
        canvas.width = 800;
        canvas.height = 600;

        // Wait for next frame to ensure DOM is ready
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const success = await window.gameManager.initialize();
        if (success) {
          log('Game manager initialized successfully', 'success');
          setGameManagerInitialized(true);
        } else {
          throw new Error('Game manager initialization returned false');
        }
      } catch (error) {
        log(`Game manager initialization failed: ${error.message}`, 'error');
        // Show user-friendly error message
        alert('Failed to initialize game. Please refresh the page.');
      }
    };

    // Delay initialization slightly to ensure DOM is ready
    setTimeout(initializeGameManager, 100);
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Enhanced leaderboard fetching
  const fetchLeaderboard = async () => {
    try {
      log('Fetching leaderboard data...', 'info');
      setIsLeaderboardLoading(true);
      const response = await fetch(`${config.apiBaseUrl}${config.api.scores.leaderboard}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      log(`Leaderboard data fetched successfully: ${data.length} entries`, 'success');
      setLeaderboardData(data);
    } catch (error) {
      log(`Leaderboard fetch failed: ${error.message}`, 'error');
      setLeaderboardData([]);
      // Show user-friendly error message
      alert('Unable to load leaderboard. Please try again later.');
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  // Handle username submission
  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (userState.username.length < 3 || userState.username.length > 25) {
      alert('Username must be between 3 and 25 characters');
      return;
    }

    // Generate avatar options
    const avatarOptions = generatePlayerAvatars(userState.username);
    setUserState(prev => ({
      ...prev,
      avatarOptions,
      registrationStep: 'avatar'
    }));
  };

  // Handle avatar selection
  const handleAvatarSelect = (avatarUrl) => {
    setUserState(prev => ({
      ...prev,
      avatar: avatarUrl,
      isRegistered: true,
      registrationStep: 'complete'
    }));
  };

  // Start game with countdown
  const startGame = () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setGameState(prev => ({ ...prev, gameStarted: true }));
          window.gameManager.startGame();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Enhanced score submission
  const submitScore = async (score) => {
    try {
      log(`Submitting score: ${score} for player: ${userState.username}`, 'info');
      const response = await fetch(`${config.apiBaseUrl}${config.api.scores.submit}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: userState.username,
          score: score
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit score');
      }

      log('Score submitted successfully', 'success');
      await fetchLeaderboard(); // Refresh leaderboard after submission
    } catch (error) {
      log(`Score submission failed: ${error.message}`, 'error');
      alert('Failed to submit score. Your score was: ' + score);
    }
  };

  // Enhanced game over handling
  useEffect(() => {
    if (!gameManager) return;

    gameManager.onGameOver = async (finalScore) => {
      log(`Game Over triggered with score: ${finalScore}`, 'info');
      
      setGameState(prev => ({
        ...prev,
        score: finalScore,
        isGameOver: true,
        gameStarted: false
      }));

      await submitScore(finalScore);
    };
  }, [userState.username]);

  // Render registration steps
  const renderRegistration = () => {
    switch (userState.registrationStep) {
      case 'username':
        return (
          <div className="registration-container">
            <h2>Enter Your Username</h2>
            <form onSubmit={handleUsernameSubmit}>
              <input
                type="text"
                value={userState.username}
                onChange={(e) => setUserState(prev => ({
                  ...prev,
                  username: e.target.value
                }))}
                placeholder="3-25 characters"
                maxLength={25}
                minLength={3}
                required
              />
              <button type="submit">Continue</button>
            </form>
          </div>
        );

      case 'avatar':
        return (
          <div className="avatar-selection">
            <h2>Choose Your Avatar</h2>
            <div className="avatar-options">
              {userState.avatarOptions?.map((avatarUrl, index) => (
                <img
                  key={index}
                  src={avatarUrl}
                  alt={`Avatar option ${index + 1}`}
                  onClick={() => handleAvatarSelect(avatarUrl)}
                  className="avatar-option"
                />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render leaderboard
  const renderLeaderboard = () => (
    <div className="leaderboard-container">
      <h2>Leaderboard</h2>
      {isLeaderboardLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((entry, index) => {
              // Generate avatar with fallback
              const avatarUri = generateAvatar(pixelArt, entry.playerName);
              
              return (
                <tr key={index} className={`rank-${index + 1}`}>
                  <td>{index + 1}</td>
                  <td className="player-cell">
                    <img 
                      src={avatarUri}
                      alt="avatar" 
                      className="player-avatar"
                      onError={(e) => {
                        e.target.src = config.fallbacks.avatarUrl;
                      }}
                    />
                    {entry.playerName}
                  </td>
                  <td className="score-cell">{entry.score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  // Render Web3 info modal
  const renderWeb3InfoModal = () => (
    showWeb3Info && (
      <div className="modal-overlay" onClick={() => setShowWeb3Info(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h2>Try the Web3 Version!</h2>
          <p>{config.web3Info.description}</p>
          <a 
            href={config.web3Info.playUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="web3-button"
          >
            Play Web3 Version
          </a>
          <button onClick={() => setShowWeb3Info(false)}>Close</button>
        </div>
      </div>
    )
  );

  // Update player avatar generation
  const generatePlayerAvatars = (seed) => {
    try {
      log(`Generating avatars for seed: ${seed}`, 'info');
      return {
        pixelArt: generateAvatar(pixelArt, `${seed}-pixel`, 128),
        lorelei: generateAvatar(lorelei, `${seed}-lorelei`, 128),
        adventurer: generateAvatar(adventurer, `${seed}-adventurer`, 128)
      };
    } catch (error) {
      log('Avatar generation failed completely', 'error');
      return {
        pixelArt: config.fallbacks.avatarUrl,
        lorelei: config.fallbacks.avatarUrl,
        adventurer: config.fallbacks.avatarUrl
      };
    }
  };

  // Main render method
  return (
    <div className={`game-container ${gameState.gameStarted ? 'active' : ''}`}>
      {!userState.isRegistered ? (
        renderRegistration()
      ) : (
        <>
          <header className={gameState.gameStarted ? 'scrolled' : ''}>
            <div className="player-info">
              <img src={userState.avatar} alt="Your avatar" className="player-avatar" />
              <span>{userState.username}</span>
            </div>
            {!gameState.gameStarted && (
              <button onClick={() => setShowWeb3Info(true)} className="web3-info-button">
                Try Web3 Version
              </button>
            )}
          </header>

          {countdown && (
            <div className="countdown-overlay">
              <div className="countdown-popup">
                <div className="countdown-number">{countdown}</div>
              </div>
            </div>
          )}

          <canvas
            id="tearCatchGameCanvas"
            className="game-canvas"
            style={{ display: gameState.gameStarted ? 'block' : 'none' }}
          />

          {!gameState.gameStarted && !gameState.isGameOver && gameManagerInitialized && (
            <button onClick={startGame} className="start-button">
              Start Game
            </button>
          )}

          {gameState.isGameOver && (
            <div className="game-over">
              <h2>Game Over!</h2>
              <p>Final Score: {gameState.score}</p>
              <button onClick={startGame}>Play Again</button>
            </div>
          )}

          {!gameState.gameStarted && renderLeaderboard()}
        </>
      )}

      {renderWeb3InfoModal()}
    </div>
  );
};

export default GameApp;
