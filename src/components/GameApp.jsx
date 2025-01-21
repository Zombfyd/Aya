<script>
async function fetchLeaderboard(type, gameMode) {
    try {
        const response = await fetch(`https://ayagame.onrender.com/api/scores/leaderboard/${type}/${gameMode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
        }

        const data = await response.json();
        const tableId = `${type}${gameMode === 'paid' ? 'Paid' : 'Free'}Leaderboard`;
        const tableBody = document.querySelector(`#${tableId} tbody`);
        
        // Add error checking for tableBody
        if (!tableBody) {
            console.error(`Table body not found for ID: ${tableId}`);
            return;
        }
        
        // Clear existing rows
        tableBody.innerHTML = '';

        // Populate leaderboard
        data.forEach((score, index) => {
            const row = document.createElement('tr');
            
            // Rank cell
            const rankCell = document.createElement('td');
            rankCell.textContent = index + 1;
            
            // Wallet cell with formatting
            const walletCell = document.createElement('td');
            const walletAddress = score.playerWallet;
            walletCell.textContent = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
            
            // Score cell
            const scoreCell = document.createElement('td');
            scoreCell.textContent = score.score;

            row.appendChild(rankCell);
            row.appendChild(walletCell);
            row.appendChild(scoreCell);
            
            // Use direct appendChild on tableBody
            if (tableBody.appendChild) {
                tableBody.appendChild(row);
            } else {
                console.error('tableBody does not support appendChild');
            }
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
}

async function resetLeaderboard() {
    const type = document.getElementById('leaderboardType').value;
    const gameMode = document.getElementById('gameMode').value;
    
    if (!confirm(`Are you sure you want to reset the ${type} ${gameMode} leaderboard? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch('https://ayagame.onrender.com/api/scores/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, gameMode })
        });

        if (!response.ok) {
            throw new Error(`Failed to reset leaderboard: ${response.statusText}`);
        }

        const result = await response.json();
        alert(`${result.message} (${result.deletedCount} records deleted)`);

        // Refresh the leaderboards after reset
        fetchLeaderboard('main', 'free');
        fetchLeaderboard('secondary', 'free');
        fetchLeaderboard('main', 'paid');
        fetchLeaderboard('secondary', 'paid');
    } catch (error) {
        console.error('Error resetting leaderboard:', error);
        alert('Failed to reset leaderboard. Please try again.');
    }
}

// Load all leaderboards when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Fetch free leaderboards
    fetchLeaderboard('main', 'free');
    fetchLeaderboard('secondary', 'free');
    
    // Fetch paid leaderboards
    fetchLeaderboard('main', 'paid');
    fetchLeaderboard('secondary', 'paid');
    
    // Refresh leaderboards every 30 seconds
    setInterval(() => {
        fetchLeaderboard('main', 'free');
        fetchLeaderboard('secondary', 'free');
        fetchLeaderboard('main', 'paid');
        fetchLeaderboard('secondary', 'paid');
    }, 30000);
});
</script>
