let selectedTile = null;
let board = [];
let solution = [];
let currentDifficulty = 'easy';
let timerSeconds = 0;
let timerInterval = null;
let timerPaused = false;
let mistakeCount = 0;
let moveHistory = [];
let notesMode = false;
let notesGrid = [];

// Initialize on load
window.onload = function() {
    newGame('easy');
};

function formatTime(seconds) {
    if (seconds < 3600) {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    } else {
        let h = Math.floor(seconds / 3600);
        let remainder = seconds % 3600;
        let m = Math.floor(remainder / 60);
        let s = remainder % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
}

function startTimer() {
    timerInterval = setInterval(function() {
        timerSeconds++;
        let display = document.getElementById("timer-display");
        if (display) display.textContent = formatTime(timerSeconds);
    }, 1000);
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function toggleTimer() {
    let board = document.getElementById("game-board");
    let pauseBtn = document.getElementById("btn-pause");
    if (!timerPaused) {
        stopTimer();
        timerPaused = true;
        if (board) board.classList.add("board-hidden");
        if (pauseBtn) pauseBtn.textContent = "▶";
    } else {
        startTimer();
        timerPaused = false;
        if (board) board.classList.remove("board-hidden");
        if (pauseBtn) pauseBtn.textContent = "⏸";
    }
}

function newGame(difficulty) {
    // Clear board UI
    const boardDiv = document.getElementById("game-board");
    boardDiv.innerHTML = "";
    selectedTile = null;
    currentDifficulty = difficulty;

    // Reset timer
    stopTimer();
    timerSeconds = 0;
    timerPaused = false;
    let timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) timerDisplay.textContent = "00:00";
    let pauseBtn = document.getElementById("btn-pause");
    if (pauseBtn) pauseBtn.textContent = "⏸";
    if (boardDiv) boardDiv.classList.remove("board-hidden");
    startTimer();

    // Reset mistake counter
    mistakeCount = 0;
    let mistakeDisplay = document.getElementById("mistake-display");
    if (mistakeDisplay) mistakeDisplay.textContent = "Mistakes: 0";

    // Reset move history
    moveHistory = [];

    // Reset notes mode and grid
    notesMode = false;
    notesGrid = Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => new Set())
    );
    let notesBtn = document.getElementById("btn-notes");
    if (notesBtn) notesBtn.classList.remove("active");

    // Update active difficulty button
    document.querySelectorAll('.controls button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('btn-' + difficulty);
    if (activeBtn) activeBtn.classList.add('active');

    // Update difficulty label
    const difficultyLabel = document.getElementById('difficulty-label');
    if (difficultyLabel) {
        difficultyLabel.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    }

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
            
            // Add thick borders for 3x3 box boundaries via CSS classes
            if (c == 2 || c == 5) tile.classList.add("border-right-thick");
            if (r == 2 || r == 5) tile.classList.add("border-bottom-thick");

            boardDiv.appendChild(tile);
        }
    }

    // Update completion indicators for pre-filled cells
    updateCompletionIndicators();
}

function clearHighlighting() {
    let allTiles = document.querySelectorAll(".tile");
    allTiles.forEach(function(t) {
        t.classList.remove("highlight-row", "highlight-col", "highlight-box", "highlight-peer");
    });
}

function applyHighlighting(tile) {
    clearHighlighting();

    let coords = tile.id.split("-");
    let r = parseInt(coords[0]);
    let c = parseInt(coords[1]);

    // Highlight row
    for (let i = 0; i < 9; i++) {
        let t = document.getElementById(r + "-" + i);
        if (t) t.classList.add("highlight-row");
    }

    // Highlight column
    for (let i = 0; i < 9; i++) {
        let t = document.getElementById(i + "-" + c);
        if (t) t.classList.add("highlight-col");
    }

    // Highlight 3x3 box
    let boxRowStart = Math.floor(r / 3) * 3;
    let boxColStart = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            let t = document.getElementById((boxRowStart + i) + "-" + (boxColStart + j));
            if (t) t.classList.add("highlight-box");
        }
    }

    // Highlight peers with the same number
    let num = tile.innerText;
    if (num !== "") {
        let allTiles = document.querySelectorAll(".tile");
        allTiles.forEach(function(t) {
            if (t !== tile && t.innerText === num) {
                t.classList.add("highlight-peer");
            }
        });
    }
}

function selectTile() {
    if (selectedTile != null) {
        selectedTile.classList.remove("selected");
    }
    selectedTile = this;
    selectedTile.classList.add("selected");
    applyHighlighting(this);
}

function fillNumber(num) {
    if (selectedTile == null || selectedTile.classList.contains("fixed")) return;

    let coords = selectedTile.id.split("-");
    let r = parseInt(coords[0]);
    let c = parseInt(coords[1]);

    if (num === 'X') {
        // Record undo entry for delete
        let prevValue = selectedTile.innerText;
        let prevNotes = new Set(notesGrid[r][c]);
        if (prevValue !== "" || prevNotes.size > 0) {
            moveHistory.push({ row: r, col: c, prevValue: prevValue, newValue: "", prevNotes: prevNotes });
        }
        selectedTile.innerText = "";
        selectedTile.classList.remove("error");
        notesGrid[r][c].clear();
        // Remove notes display if any
        let existingNotes = selectedTile.querySelector(".notes-cell");
        if (existingNotes) existingNotes.remove();
        if (typeof updateCompletionIndicators === 'function') updateCompletionIndicators();
        // Re-apply highlighting to refresh peer highlights after delete
        applyHighlighting(selectedTile);
        return;
    }

    // Notes mode: toggle candidate digit
    if (notesMode) {
        // Only allow notes on user cells without a final number
        if (selectedTile.innerText !== "" && !selectedTile.querySelector(".notes-cell")) return;

        let prevNotes = new Set(notesGrid[r][c]);
        if (notesGrid[r][c].has(num)) {
            notesGrid[r][c].delete(num);
        } else {
            notesGrid[r][c].add(num);
        }
        moveHistory.push({ row: r, col: c, prevValue: "", newValue: "", prevNotes: prevNotes });
        renderNotes(r, c);
        return;
    }

    // Normal mode: place final number
    let prevValue = selectedTile.innerText;
    let prevNotes = new Set(notesGrid[r][c]);
    moveHistory.push({ row: r, col: c, prevValue: prevValue, newValue: String(num), prevNotes: prevNotes });

    // Clear notes from this cell
    notesGrid[r][c].clear();
    let existingNotes = selectedTile.querySelector(".notes-cell");
    if (existingNotes) existingNotes.remove();

    selectedTile.innerText = num;
    
    if (solution[r][c] === num) {
        selectedTile.classList.remove("error");
        removeNoteFromPeers(r, c, num);
        if (typeof updateCompletionIndicators === 'function') updateCompletionIndicators();
        // Re-apply highlighting to refresh peer highlights
        applyHighlighting(selectedTile);
        checkWin();
    } else {
        selectedTile.classList.add("error");
        mistakeCount++;
        let mistakeDisplay = document.getElementById("mistake-display");
        if (mistakeDisplay) mistakeDisplay.textContent = "Mistakes: " + mistakeCount;
        if (typeof updateCompletionIndicators === 'function') updateCompletionIndicators();
        applyHighlighting(selectedTile);
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
    stopTimer();
    let winTime = document.getElementById("win-time");
    if (winTime) winTime.textContent = "Time: " + formatTime(timerSeconds);
    let winMistakes = document.getElementById("win-mistakes");
    if (winMistakes) winMistakes.textContent = "Mistakes: " + mistakeCount;
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
    newGame(currentDifficulty);
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

// --- UNDO FUNCTIONALITY ---

function undoLastMove() {
    if (moveHistory.length === 0) return;

    let entry = moveHistory.pop();
    let tile = document.getElementById(entry.row + "-" + entry.col);
    if (!tile) return;

    // Remove any existing notes display
    let existingNotes = tile.querySelector(".notes-cell");
    if (existingNotes) existingNotes.remove();

    // Restore previous value
    tile.innerText = entry.prevValue;

    // Restore previous notes
    notesGrid[entry.row][entry.col] = new Set(entry.prevNotes);
    if (entry.prevNotes.size > 0) {
        renderNotes(entry.row, entry.col);
    }

    // Update error class
    if (entry.prevValue === "") {
        tile.classList.remove("error");
    } else {
        let num = parseInt(entry.prevValue);
        if (!isNaN(num) && solution[entry.row][entry.col] === num) {
            tile.classList.remove("error");
        } else {
            tile.classList.add("error");
        }
    }

    if (typeof updateCompletionIndicators === 'function') updateCompletionIndicators();
}

// --- NOTES MODE ---

function toggleNotesMode() {
    notesMode = !notesMode;
    let btn = document.getElementById("btn-notes");
    if (btn) {
        if (notesMode) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    }
}

function renderNotes(row, col) {
    let tile = document.getElementById(row + "-" + col);
    if (!tile) return;

    // Remove existing notes display and text
    let existing = tile.querySelector(".notes-cell");
    if (existing) existing.remove();
    tile.innerText = "";

    let notes = notesGrid[row][col];
    if (notes.size === 0) return;

    let div = document.createElement("div");
    div.classList.add("notes-cell");

    for (let d = 1; d <= 9; d++) {
        let span = document.createElement("span");
        if (notes.has(d)) {
            span.textContent = d;
        }
        div.appendChild(span);
    }

    tile.appendChild(div);
}

function removeNoteFromPeers(row, col, num) {
    // Remove num from notes in same row
    for (let c = 0; c < 9; c++) {
        if (c !== col && notesGrid[row][c].has(num)) {
            notesGrid[row][c].delete(num);
            renderNotes(row, c);
        }
    }

    // Remove num from notes in same column
    for (let r = 0; r < 9; r++) {
        if (r !== row && notesGrid[r][col].has(num)) {
            notesGrid[r][col].delete(num);
            renderNotes(r, col);
        }
    }

    // Remove num from notes in same 3x3 box
    let boxRowStart = Math.floor(row / 3) * 3;
    let boxColStart = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            let br = boxRowStart + r;
            let bc = boxColStart + c;
            if ((br !== row || bc !== col) && notesGrid[br][bc].has(num)) {
                notesGrid[br][bc].delete(num);
                renderNotes(br, bc);
            }
        }
    }
}

// --- NUMBER COMPLETION TRACKING ---

function updateCompletionIndicators() {
    for (let d = 1; d <= 9; d++) {
        let count = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                let tile = document.getElementById(r + "-" + c);
                if (tile && tile.innerText === String(d) && solution[r][c] === d) {
                    count++;
                }
            }
        }
        let btn = document.getElementById("numpad-" + d);
        if (btn) {
            if (count === 9) {
                btn.classList.add("numpad-disabled");
            } else {
                btn.classList.remove("numpad-disabled");
            }
        }
    }
}

// Enable keyboard input
document.addEventListener('keydown', (event) => {
    const key = event.key;
    if (key >= '1' && key <= '9') fillNumber(parseInt(key));
    if (key === 'Backspace' || key === 'Delete') fillNumber('X');
});
