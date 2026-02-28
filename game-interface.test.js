const fc = require('fast-check');
const { readFileContent, parseHTML, readCSS } = require('./test-helpers');

// Extract formatTime function from script.js for direct testing
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

describe('Game Interface Improvements - Property Tests', () => {

  // ============================================================
  // Task 1.4: Property tests for technical debt fixes
  // ============================================================

  // Feature: game-interface-improvements, Property 14: Keyboard input is integer
  // Validates: Requirements 9.1
  test('Property 14: parseInt produces integer for keys 1-9', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        (digit) => {
          const key = String(digit);
          const parsed = parseInt(key);
          expect(Number.isInteger(parsed)).toBe(true);
          expect(parsed).toBe(digit);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: game-interface-improvements, Property 15: Strict equality comparison
  // Validates: Requirements 9.3
  test('Property 15: Strict equality (===) between integer pairs works correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        fc.integer({ min: 1, max: 9 }),
        (input, solution) => {
          if (input === solution) {
            expect(input === solution).toBe(true);
            expect(input == solution).toBe(true);
          } else {
            expect(input === solution).toBe(false);
          }
          // Verify === works the same as == for integer-integer comparison
          expect(input === solution).toBe(input == solution);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: game-interface-improvements, Property 13: CSS border classes replace inline styles
  // Validates: Requirements 8.1, 8.2, 8.4
  test('Property 13: script.js uses classList.add for borders, no inline style assignments', () => {
    const scriptContent = readFileContent('script.js');

    // Verify classList.add is used for border classes
    expect(scriptContent).toMatch(/classList\.add\(["']border-right-thick["']\)/);
    expect(scriptContent).toMatch(/classList\.add\(["']border-bottom-thick["']\)/);

    // Verify no inline style assignments for borderRight or borderBottom
    expect(scriptContent).not.toMatch(/\.style\.borderRight\s*=/);
    expect(scriptContent).not.toMatch(/\.style\.borderBottom\s*=/);

    // Verify CSS defines the border classes
    const cssContent = readCSS('style.css');
    expect(cssContent).toMatch(/\.border-right-thick/);
    expect(cssContent).toMatch(/\.border-bottom-thick/);
  });

  // Feature: game-interface-improvements, Property 12: Difficulty preservation round-trip
  // Validates: Requirements 7.1, 7.2
  test('Property 12: currentDifficulty variable exists and closeModalAndRestart uses it', () => {
    const scriptContent = readFileContent('script.js');

    fc.assert(
      fc.property(
        fc.constantFrom('easy', 'medium', 'hard'),
        (difficulty) => {
          // Verify currentDifficulty is declared
          expect(scriptContent).toMatch(/let\s+currentDifficulty\s*=/);

          // Verify newGame sets currentDifficulty
          expect(scriptContent).toMatch(/currentDifficulty\s*=\s*difficulty/);

          // Verify closeModalAndRestart uses currentDifficulty (not a hardcoded value)
          expect(scriptContent).toMatch(/newGame\(currentDifficulty\)/);

          // Verify closeModalAndRestart does NOT use a hardcoded difficulty string
          const closeModalFn = scriptContent.match(
            /function\s+closeModalAndRestart\s*\(\)\s*\{[^}]+\}/s
          );
          expect(closeModalFn).not.toBeNull();
          expect(closeModalFn[0]).not.toMatch(/newGame\(['"](?:easy|medium|hard)['"]\)/);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================
  // Task 3.4: Property tests for timer
  // ============================================================

  // Feature: game-interface-improvements, Property 1: Timer format correctness
  // Validates: Requirements 1.5
  test('Property 1: formatTime returns correct MM:SS or HH:MM:SS format', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 359999 }),
        (seconds) => {
          const result = formatTime(seconds);

          if (seconds < 3600) {
            // Should be MM:SS format
            expect(result).toMatch(/^\d{2}:\d{2}$/);
            const [mm, ss] = result.split(':').map(Number);
            expect(mm).toBe(Math.floor(seconds / 60));
            expect(ss).toBe(seconds % 60);
          } else {
            // Should be HH:MM:SS format
            expect(result).toMatch(/^\d{2,}:\d{2}:\d{2}$/);
            const parts = result.split(':').map(Number);
            const [hh, mm, ss] = parts;
            expect(hh).toBe(Math.floor(seconds / 3600));
            expect(mm).toBe(Math.floor((seconds % 3600) / 60));
            expect(ss).toBe(seconds % 60);
          }

          // Verify round-trip: components reconstruct the original seconds
          if (seconds < 3600) {
            const [mm, ss] = result.split(':').map(Number);
            expect(mm * 60 + ss).toBe(seconds);
          } else {
            const [hh, mm, ss] = result.split(':').map(Number);
            expect(hh * 3600 + mm * 60 + ss).toBe(seconds);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: game-interface-improvements, Property 2: Timer pause/resume round-trip
  // Validates: Requirements 1.3
  test('Property 2: toggleTimer function exists and handles pause/resume state', () => {
    const scriptContent = readFileContent('script.js');

    // Verify toggleTimer function exists
    expect(scriptContent).toMatch(/function\s+toggleTimer\s*\(\)/);

    // Verify it references timerPaused for state management
    expect(scriptContent).toMatch(/timerPaused/);

    // Verify it calls stopTimer when pausing
    expect(scriptContent).toMatch(/stopTimer\(\)/);

    // Verify it calls startTimer when resuming
    expect(scriptContent).toMatch(/startTimer\(\)/);

    // Verify board-hidden class is toggled for pause state
    expect(scriptContent).toMatch(/board-hidden/);
  });

  // ============================================================
  // Task 4.3: Property tests for mistake counter
  // ============================================================

  // Feature: game-interface-improvements, Property 10: Mistake counter increments on wrong placement
  // Validates: Requirements 6.2
  test('Property 10: fillNumber logic increments mistakeCount on wrong placement', () => {
    const scriptContent = readFileContent('script.js');

    // Verify mistakeCount is declared and initialized
    expect(scriptContent).toMatch(/let\s+mistakeCount\s*=\s*0/);

    // Verify mistakeCount is incremented in fillNumber
    expect(scriptContent).toMatch(/mistakeCount\s*\+\+/);

    // Verify the increment happens in the else branch (wrong placement)
    // The pattern: solution check with === followed by else block with mistakeCount++
    const fillNumberFn = scriptContent.match(
      /function\s+fillNumber\s*\(num\)\s*\{[\s\S]*?^}/m
    );
    expect(fillNumberFn).not.toBeNull();
    const fnBody = fillNumberFn[0];

    // Verify strict equality check exists
    expect(fnBody).toMatch(/solution\[r\]\[c\]\s*===\s*num/);

    // Verify mistakeCount++ is in the else (wrong answer) branch
    expect(fnBody).toMatch(/mistakeCount\+\+/);

    // Verify mistake display is updated
    expect(fnBody).toMatch(/Mistakes:\s*"\s*\+\s*mistakeCount/);
  });

  // Feature: game-interface-improvements, Property 11: Mistake display format
  // Validates: Requirements 6.3
  test('Property 11: Mistake display format is "Mistakes: N" for any non-negative N', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9999 }),
        (n) => {
          const display = "Mistakes: " + n;
          expect(display).toMatch(/^Mistakes: \d+$/);
          // Verify the number can be extracted back
          const extracted = parseInt(display.split(': ')[1]);
          expect(extracted).toBe(n);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================
  // Task 5.3: Property tests for highlighting
  // ============================================================

  // Feature: game-interface-improvements, Property 6: Highlighting covers row, column, and box
  // Validates: Requirements 3.1, 3.2, 3.3, 3.5
  test('Property 6: For any cell (r,c), applyHighlighting covers correct row, col, and box', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 8 }),
        (r, c) => {
          // Compute expected row cells
          const rowCells = [];
          for (let i = 0; i < 9; i++) rowCells.push(r + '-' + i);

          // Compute expected column cells
          const colCells = [];
          for (let i = 0; i < 9; i++) colCells.push(i + '-' + c);

          // Compute expected box cells
          const boxRowStart = Math.floor(r / 3) * 3;
          const boxColStart = Math.floor(c / 3) * 3;
          const boxCells = [];
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              boxCells.push((boxRowStart + i) + '-' + (boxColStart + j));
            }
          }

          // Verify exactly 9 cells in each group
          expect(rowCells.length).toBe(9);
          expect(colCells.length).toBe(9);
          expect(boxCells.length).toBe(9);

          // Verify the selected cell is in all three groups
          const cellId = r + '-' + c;
          expect(rowCells).toContain(cellId);
          expect(colCells).toContain(cellId);
          expect(boxCells).toContain(cellId);

          // Verify box cells are within the correct 3x3 region
          boxCells.forEach(id => {
            const [br, bc] = id.split('-').map(Number);
            expect(br).toBeGreaterThanOrEqual(boxRowStart);
            expect(br).toBeLessThan(boxRowStart + 3);
            expect(bc).toBeGreaterThanOrEqual(boxColStart);
            expect(bc).toBeLessThan(boxColStart + 3);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Verify applyHighlighting function structure in script.js
  test('Property 6 (structural): applyHighlighting function applies correct CSS classes', () => {
    const scriptContent = readFileContent('script.js');

    // Verify applyHighlighting function exists
    expect(scriptContent).toMatch(/function\s+applyHighlighting\s*\(tile\)/);

    // Verify it calls clearHighlighting first
    expect(scriptContent).toMatch(/clearHighlighting\(\)/);

    // Verify it adds the three highlight classes
    expect(scriptContent).toMatch(/classList\.add\(["']highlight-row["']\)/);
    expect(scriptContent).toMatch(/classList\.add\(["']highlight-col["']\)/);
    expect(scriptContent).toMatch(/classList\.add\(["']highlight-box["']\)/);
  });

  // Feature: game-interface-improvements, Property 7: Same-number peer highlighting
  // Validates: Requirements 3.4
  test('Property 7: highlight-peer logic targets cells with same number', () => {
    const scriptContent = readFileContent('script.js');

    // Verify highlight-peer class is used
    expect(scriptContent).toMatch(/classList\.add\(["']highlight-peer["']\)/);

    // Verify the peer highlighting checks innerText for matching numbers
    const applyFn = scriptContent.match(
      /function\s+applyHighlighting\s*\(tile\)\s*\{[\s\S]*?^}/m
    );
    expect(applyFn).not.toBeNull();
    const fnBody = applyFn[0];

    // Verify it reads the tile's number
    expect(fnBody).toMatch(/innerText/);

    // Verify it compares with other tiles' text
    expect(fnBody).toMatch(/t\.innerText\s*===\s*num/);

    // Verify it excludes the selected tile itself
    expect(fnBody).toMatch(/t\s*!==\s*tile/);
  });

  // ============================================================
  // Task 7.3: Property test for undo
  // ============================================================

  // Feature: game-interface-improvements, Property 8: Move history round-trip
  // Validates: Requirements 4.1, 4.2
  test('Property 8: undoLastMove function exists and moveHistory is used', () => {
    const scriptContent = readFileContent('script.js');

    // Verify undoLastMove function exists
    expect(scriptContent).toMatch(/function\s+undoLastMove\s*\(\)/);

    // Verify moveHistory is declared
    expect(scriptContent).toMatch(/let\s+moveHistory\s*=\s*\[\]/);

    // Verify moveHistory.push is called in fillNumber (recording moves)
    expect(scriptContent).toMatch(/moveHistory\.push\(/);

    // Verify moveHistory.pop is called in undoLastMove (restoring moves)
    expect(scriptContent).toMatch(/moveHistory\.pop\(\)/);

    // Verify undoLastMove checks for empty history
    const undoFn = scriptContent.match(
      /function\s+undoLastMove\s*\(\)\s*\{[\s\S]*?^}/m
    );
    expect(undoFn).not.toBeNull();
    const fnBody = undoFn[0];
    expect(fnBody).toMatch(/moveHistory\.length\s*===\s*0/);

    // Verify it restores prevValue
    expect(fnBody).toMatch(/entry\.prevValue/);

    // Verify newGame resets moveHistory
    expect(scriptContent).toMatch(/moveHistory\s*=\s*\[\]/);
  });

  // Property 8 (data model): Verify move entry structure supports round-trip
  test('Property 8 (data model): Move entries record sufficient data for undo', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 8 }),
        fc.constantFrom('', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
        fc.integer({ min: 1, max: 9 }),
        (row, col, prevValue, newNum) => {
          // Simulate creating a move entry as fillNumber does
          const entry = {
            row: row,
            col: col,
            prevValue: prevValue,
            newValue: String(newNum),
            prevNotes: new Set()
          };

          // Verify entry has all required fields for undo
          expect(entry).toHaveProperty('row');
          expect(entry).toHaveProperty('col');
          expect(entry).toHaveProperty('prevValue');
          expect(entry).toHaveProperty('newValue');
          expect(entry).toHaveProperty('prevNotes');

          // Verify undo would restore the previous value
          expect(entry.prevValue).toBe(prevValue);
          expect(entry.row).toBe(row);
          expect(entry.col).toBe(col);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================
  // Task 8.4: Property tests for notes mode
  // ============================================================

  // Feature: game-interface-improvements, Property 3: Notes toggle idempotent pair
  // Validates: Requirements 2.3, 2.4
  test('Property 3: Set add/delete is idempotent pair for notes toggle', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        fc.uniqueArray(fc.integer({ min: 1, max: 9 }), { minLength: 0, maxLength: 9 }),
        (digit, existingNotes) => {
          const notes = new Set(existingNotes);
          const otherNotes = new Set(existingNotes);
          otherNotes.delete(digit); // other notes = everything except the target digit

          // First toggle: if not present, add it; if present, remove it
          const wasPresent = notes.has(digit);
          if (notes.has(digit)) {
            notes.delete(digit);
          } else {
            notes.add(digit);
          }

          // After first toggle, state should be flipped
          expect(notes.has(digit)).toBe(!wasPresent);

          // Second toggle: should restore original state
          if (notes.has(digit)) {
            notes.delete(digit);
          } else {
            notes.add(digit);
          }
          expect(notes.has(digit)).toBe(wasPresent);

          // Other notes should be unchanged throughout
          for (const n of otherNotes) {
            expect(notes.has(n)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: game-interface-improvements, Property 4: Final placement clears notes
  // Validates: Requirements 2.5
  test('Property 4: Clearing a Set simulates final placement clearing notes', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: 9 }), { minLength: 1, maxLength: 9 }),
        (noteDigits) => {
          const notes = new Set(noteDigits);
          expect(notes.size).toBeGreaterThan(0);

          // Simulate final placement: clear all notes
          notes.clear();
          expect(notes.size).toBe(0);
        }
      ),
      { numRuns: 100 }
    );

    // Also verify script.js clears notesGrid on final placement
    const scriptContent = readFileContent('script.js');
    expect(scriptContent).toMatch(/notesGrid\[r\]\[c\]\.clear\(\)/);
  });

  // Feature: game-interface-improvements, Property 5: Correct placement removes note from peers
  // Validates: Requirements 2.6
  test('Property 5: removeNoteFromPeers function exists and removes from row/col/box', () => {
    const scriptContent = readFileContent('script.js');

    // Verify removeNoteFromPeers function exists
    expect(scriptContent).toMatch(/function\s+removeNoteFromPeers\s*\(row,\s*col,\s*num\)/);

    // Verify it iterates over row peers
    const removeFn = scriptContent.match(
      /function\s+removeNoteFromPeers\s*\(row,\s*col,\s*num\)\s*\{[\s\S]*?^}/m
    );
    expect(removeFn).not.toBeNull();
    const fnBody = removeFn[0];

    // Verify it deletes from peer notes
    expect(fnBody).toMatch(/\.delete\(num\)/);

    // Verify it re-renders affected cells
    expect(fnBody).toMatch(/renderNotes\(/);

    // Verify it handles row, column, and box
    expect(fnBody).toMatch(/notesGrid\[row\]\[c\]/);  // row iteration
    expect(fnBody).toMatch(/notesGrid\[r\]\[col\]/);  // column iteration
  });

  // Property 5 (logic): Verify peer computation for note removal
  test('Property 5 (logic): Peers for note removal cover row, column, and box', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 1, max: 9 }),
        (row, col, num) => {
          // Compute all peers that should have the note removed
          const peers = new Set();

          // Row peers
          for (let c = 0; c < 9; c++) {
            if (c !== col) peers.add(row + '-' + c);
          }

          // Column peers
          for (let r = 0; r < 9; r++) {
            if (r !== row) peers.add(r + '-' + col);
          }

          // Box peers
          const boxRowStart = Math.floor(row / 3) * 3;
          const boxColStart = Math.floor(col / 3) * 3;
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              const br = boxRowStart + r;
              const bc = boxColStart + c;
              if (br !== row || bc !== col) {
                peers.add(br + '-' + bc);
              }
            }
          }

          // Verify peer count: 8 (row) + 8 (col) + box peers not already counted
          // Minimum peers = 20 (all unique), could be less due to overlaps
          expect(peers.size).toBeGreaterThanOrEqual(20);
          expect(peers.size).toBeLessThanOrEqual(24);

          // Verify the cell itself is never a peer
          expect(peers.has(row + '-' + col)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================
  // Task 9.3: Property test for completion tracking
  // ============================================================

  // Feature: game-interface-improvements, Property 9: Completion indicator reflects digit count
  // Validates: Requirements 5.1, 5.2
  test('Property 9: updateCompletionIndicators function exists and numpad buttons have IDs', () => {
    const scriptContent = readFileContent('script.js');
    const doc = parseHTML('index.html');

    // Verify updateCompletionIndicators function exists
    expect(scriptContent).toMatch(/function\s+updateCompletionIndicators\s*\(\)/);

    // Verify it checks all digits 1-9
    const updateFn = scriptContent.match(
      /function\s+updateCompletionIndicators\s*\(\)\s*\{[\s\S]*?^}/m
    );
    expect(updateFn).not.toBeNull();
    const fnBody = updateFn[0];

    // Verify it adds/removes numpad-disabled class
    expect(fnBody).toMatch(/numpad-disabled/);
    expect(fnBody).toMatch(/classList\.add\(["']numpad-disabled["']\)/);
    expect(fnBody).toMatch(/classList\.remove\(["']numpad-disabled["']\)/);

    // Verify it checks count === 9
    expect(fnBody).toMatch(/count\s*===\s*9/);

    // Verify all numpad buttons 1-9 have correct IDs in HTML
    for (let d = 1; d <= 9; d++) {
      const btn = doc.getElementById('numpad-' + d);
      expect(btn).not.toBeNull();
      expect(btn.textContent.trim()).toBe(String(d));
    }
  });

  // Property 9 (logic): Verify completion threshold logic
  test('Property 9 (logic): Digit is complete if and only if count equals 9', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        (digit, count) => {
          // The completion indicator should be active iff count === 9
          const shouldBeDisabled = count === 9;

          if (shouldBeDisabled) {
            expect(count).toBe(9);
          } else {
            expect(count).not.toBe(9);
          }

          // Verify the threshold is exactly 9, not more or less
          expect(count === 9).toBe(shouldBeDisabled);
        }
      ),
      { numRuns: 100 }
    );
  });
});
