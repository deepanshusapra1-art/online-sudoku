let selectedTile = null;
let board = [];
let solution = [];

// Initialize on load
window.onload = function() {
    newGame('easy');
};

function newGame(difficulty) {
    // Clear board UI
    const boardDiv = document.getElementById("game-board");
    boardDiv.innerHTML = "";
    selectedTile = null;

    // Generate logic
    generateSudoku(); // Fills 'solution' with a full valid board
    createPuzzle(difficulty); // Removes numbers to create 'board' based on difficulty

    // Draw board
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            let tile = document.createElement("div");
            tile.id = r.toString() + "-" + c.toString();
            tile.classList.add("tile");
            
            if (board[r][c] != "-") {
                tile.innerText = board[r][c];
                tile.classList.add("fixed");
            } else {
                tile.classList.add("user-input");
                tile.addEventListener("click", selectTile);
            }
            
            // Add specific borders via JS classes if CSS :nth-child gets messy (optional)
            if (c == 2 || c == 5) tile.style.borderRight = "2px solid #333";
            if (r == 2 || r == 5) tile.style.borderBottom = "2px solid #333";

            boardDiv.appendChild(tile);
        }
    }
}

function selectTile() {
    if (selectedTile != null) {
        selectedTile.classList.remove("selected");
    }
    selectedTile = this;
    selectedTile.classList.add("selected");
}

function fillNumber(num) {
    if (selectedTile == null || selectedTile.classList.contains("fixed")) return;

    if (num === 'X') {
        selectedTile.innerText = "";
        selectedTile.classList.remove("error");
        return;
    }

    selectedTile.innerText = num;
    
    // Check against solution logic
    let coords = selectedTile.id.split("-");
    let r = parseInt(coords[0]);
    let c = parseInt(coords[1]);

    if (solution[r][c] == num) {
        selectedTile.classList.remove("error");
        // Check if game is won after this valid move
        checkWin();
    } else {
        selectedTile.classList.add("error");
    }
}

function checkWin() {
    // Loop through every single tile on the board (0-0 to 8-8)
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            let tile = document.getElementById(r + "-" + c);
            let value = tile.innerText;

            // 1. If any tile is empty, the game is not finished
            if (value === "") return;

            // 2. If the number doesn't match the solution, not finished
            // (We use != to handle string '5' vs number 5)
            if (value != solution[r][c]) return;
        }
    }
    
    // If we survive the loop, the board is perfect. Show the modal!
    let modal = document.getElementById("win-modal");
    if(modal) {
        modal.style.display = "flex";
    } else {
        alert("🎉 YOU WON! 🎉"); // Fallback if modal HTML is missing
    }
}

function closeModalAndRestart() {
    let modal = document.getElementById("win-modal");
    if (modal) modal.style.display = "none";
    newGame('medium');
}

// --- SUDOKU GENERATOR LOGIC ---

function generateSudoku() {
    // 1. Create empty 9x9
    solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    
    // 2. Fill diagonal 3x3 boxes (independent of each other) to ensure randomness
    fillDiagonal();
    
    // 3. Solve the rest using backtracking
    solveScript(solution);
}

function fillDiagonal() {
    for (let i = 0; i < 9; i = i + 3) {
        fillBox(i, i);
    }
}

function fillBox(row, col) {
    let num;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            do {
                num = Math.floor(Math.random() * 9) + 1;
            } while (!isSafeInBox(row, col, num));
            solution[row + i][col + j] = num;
        }
    }
}

function isSafeInBox(rowStart, colStart, num) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (solution[rowStart + i][colStart + j] === num) return false;
        }
    }
    return true;
}

function isSafe(grid, row, col, num) {
    for (let x = 0; x < 9; x++) if (grid[row][x] === num) return false;
    for (let x = 0; x < 9; x++) if (grid[x][col] === num) return false;
    let startRow = row - row % 3, startCol = col - col % 3;
    for (let i = 0; i < 3; i++) 
        for (let j = 0; j < 3; j++) 
            if (grid[i + startRow][j + startCol] === num) return false;
    return true;
}

function solveScript(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isSafe(grid, row, col, num)) {
                        grid[row][col] = num;
                        if (solveScript(grid)) return true;
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function createPuzzle(difficulty) {
    // Clone solution to board
    board = JSON.parse(JSON.stringify(solution));
    
    let attempts = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 55;
    
    while (attempts > 0) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        if (board[r][c] != "-") {
            board[r][c] = "-";
            attempts--;
        }
    }
}

// Enable keyboard input
document.addEventListener('keydown', (event) => {
    const key = event.key;
    if (key >= '1' && key <= '9') fillNumber(key);
    if (key === 'Backspace' || key === 'Delete') fillNumber('X');
});
