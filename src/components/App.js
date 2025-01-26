
.mobile-wallet-guide {
  background: rgba(0, 0, 0, 0.05);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.mobile-wallet-guide p {
  margin: 0 0 10px 0;
  font-weight: bold;
}

.mobile-wallet-guide ol {
  margin: 0;
  padding-left: 20px;
}

.mobile-wallet-guide li {
  margin-bottom: 5px;
}/* Base container styles */
#root {
  max-width: 1280px;
  margin: 0 auto;
  text-align: center;
}

.game-container {
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

/* Game canvas styling */
.game-canvas {
  width: 100%;
  max-width: 800px;
  height: 700px;
  background: linear-gradient(145deg, #1c1c1c, #252525);
  border-radius: 15px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.4);
  margin: 2rem 0;
  background: url('https://i.imgflip.com/4zei4c.jpg') no-repeat center bottom;
  background-size: cover;
}

/* Header and wallet connection styles */
header {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.wallet-status {
  text-align: center;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  margin: 1rem 0;
  width: 100%;
}

.wallet-info {
  color: #2054c9;
  font-weight: 500;
}

/* Mode selector styling */
.mode-selector {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  width: 100%;
}

.mode-selector button {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #2054c9;
  border-radius: 8px;
  background: transparent;
  color: #2054c9;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-selector button.active {
  background: #2054c9;
  color: white;
}

.mode-selector button:hover:not(.active) {
  background: rgba(32, 84, 201, 0.1);
}

/* Leaderboard styles */
.leaderboards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px;
  justify-content: center;
  width: 100%;
  max-width: 1280px;
}

.leaderboard-section {
  flex: 1;
  min-width: 300px;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.leaderboard-section h3 {
  text-align: center;
  color: #2054c9;
  margin-bottom: 20px;
  font-size: 1.5rem;
  font-weight: 600;
}

/* Table styles */
table {
  width: 100%;
  border-collapse: collapse;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

thead {
  background-color: #f4f4f4;
  position: sticky;
  top: 0;
  z-index: 1;
}

tbody {
  display: block;
  max-height: 600px;
  overflow-y: auto;
  width: auto;
}

thead, tbody tr {
  display: table;
  width: 100%;
}

th, td {
  font-size: 1rem;
  padding: 10px;
  border: 5px solid #ddd;
}

th {
  background-color: #f4f4f4;
  text-align: center;
}

tr:nth-child(even) {
  background-color: #8c8c8c;
}

/* Score popup styles */
.score-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 400px;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 20px;
  z-index: 9999;
  text-align: center;
}

.score-popup button {
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #444;
  border-radius: 5px;
  color: #2054c9;
  margin: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.score-popup button:hover {
  background-color: #2054c9;
  color: #f1f1f1;
}

/* Wallet container styles */
.wallet-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.wallet-button, .game-mode-button {
  padding: 10px 20px;
  border-radius: 8px;
  background-color: #2054c9;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
  margin: 5px;
  transition: background-color 0.3s ease;
}

.wallet-button:hover, .game-mode-button:hover {
  background-color: #10389d;
}

/* Responsive design */
@media (max-width: 768px) {
  .game-container {
    padding: 1rem;
  }
  
  .leaderboard-section {
    min-width: 100%;
  }
  
  header {
    width: 90%;
    padding: 1.5rem;
  }
  
  .mode-selector {
    flex-direction: column;
  }
  
  .mode-selector button {
    width: 100%;
  }
  
  .game-canvas {
    height: 400px;
  }
}
.leaderboards-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  gap: 20px;
  margin: 20px 0;
  padding: 20px;
}

.leaderboard-section {
  flex: 1;
  min-width: 300px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 15px;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
}

.leaderboard-table th,
.leaderboard-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.leaderboard-table th {
  background: rgba(255, 255, 255, 0.1);
  font-weight: bold;
}

.rank-1 { background: rgba(255, 215, 0, 0.1); }
.rank-2 { background: rgba(192, 192, 192, 0.1); }
.rank-3 { background: rgba(205, 127, 50, 0.1); }

.wallet-cell {
  font-family: monospace;
  cursor: help;
}

.score-cell {
  text-align: right;
  font-weight: bold;
}

.leaderboard-loading {
  text-align: center;
  padding: 20px;
  color: #fff;
}
.countdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.countdown-popup {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  color: white;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  animation: popIn 0.3s ease-out;
}

.countdown-number {
  font-size: 72px;
  font-weight: bold;
  margin: 20px 0;
  color: #4CAF50;
  text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

.countdown-progress {
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin: 20px auto;
  overflow: hidden;
}

.countdown-bar {
  height: 100%;
  background: #4CAF50;
  border-radius: 2px;
}

@keyframes popIn {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.countdown-popup h2 {
  margin: 0 0 10px 0;
  color: #4CAF50;
}

.countdown-popup p {
  margin: 0;
  opacity: 0.8;
}
