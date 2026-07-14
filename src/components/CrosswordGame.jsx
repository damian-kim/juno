import React, { useState, useEffect } from 'react';

// Block cells: true = blocked (blacked out), false = editable
const GRID_BLOCKED = [
  [false, false, false, false, true,  false, false, false],
  [false, true,  true,  true,  true,  false, true,  true],
  [false, false, false, false, false, false, true,  true],
  [false, true,  true,  true,  true,  true,  true,  true],
  [true,  false, false, false, true,  false, true,  true],
  [true,  true,  true,  true,  true,  false, true,  true],
  [true,  true,  true,  true,  true,  false, true,  true],
  [true,  true,  true,  true,  true,  false, true,  true],
];

const GRID_NUMBERS = [
  [1,    2,    null, null, null, 3,    null, null],
  [null, null, null, null, null, null, null, null],
  [4,    null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, 5,    null, null, null, 6,    null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
];

export function CrosswordGame({ sendCustomStreamMessage }) {
  const [grid, setGrid] = useState(
    Array(8).fill(null).map(() => Array(8).fill(''))
  );
  const [activeCell, setActiveCell] = useState(null); // { r, c }

  useEffect(() => {
    const handleSync = (e) => {
      const { r, c, val } = e.detail;
      if (r !== undefined && c !== undefined && val !== undefined) {
        setGrid(prev => {
          const next = prev.map(row => [...row]);
          next[r][c] = val.toUpperCase();
          return next;
        });
      }
    };
    window.addEventListener('crossword-sync-evt', handleSync);
    return () => window.removeEventListener('crossword-sync-evt', handleSync);
  }, []);

  const handleCellClick = (r, c) => {
    if (GRID_BLOCKED[r][c]) return;
    setActiveCell({ r, c });
  };

  const handleKeyDown = (e) => {
    if (!activeCell) return;
    const { r, c } = activeCell;
    
    // Check if character is a letter
    if (e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
      const char = e.key.toUpperCase();
      setGrid(prev => {
        const next = prev.map(row => [...row]);
        next[r][c] = char;
        return next;
      });

      // Broadcast letter sync
      if (typeof sendCustomStreamMessage === 'function') {
        sendCustomStreamMessage({
          type: 'crossword-sync',
          r,
          c,
          val: char
        });
      }

      // Move selector forward
      if (c < 7 && !GRID_BLOCKED[r][c + 1]) {
        setActiveCell({ r, c: c + 1 });
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      setGrid(prev => {
        const next = prev.map(row => [...row]);
        next[r][c] = '';
        return next;
      });

      if (typeof sendCustomStreamMessage === 'function') {
        sendCustomStreamMessage({
          type: 'crossword-sync',
          r,
          c,
          val: ''
        });
      }

      // Move selector backward
      if (c > 0 && !GRID_BLOCKED[r][c - 1]) {
        setActiveCell({ r, c: c - 1 });
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell]);

  return (
    <div className="crossword-foreground-wrapper">
      <div className="crossword-sidebar-panel">
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#5c3db7' }}>CLUES LIST</h4>
        
        <div className="crossword-clues-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
            <div>
              <strong style={{ color: '#7c6dfa', fontSize: 12 }}>ACROSS</strong>
              <div style={{ color: '#5c3db7', marginTop: 3 }}>1. (1,0) Web skeleton standard</div>
              <div style={{ color: '#5c3db7' }}>4. (2,0) Voice framework engine</div>
              <div style={{ color: '#5c3db7' }}>5. (4,1) Style formatting sheets</div>
            </div>
            
            <div style={{ marginTop: 10 }}>
              <strong style={{ color: '#7c6dfa', fontSize: 12 }}>DOWN</strong>
              <div style={{ color: '#5c3db7', marginTop: 3 }}>1. (0,0) Workspace App name</div>
              <div style={{ color: '#5c3db7' }}>2. (0,1) Real-time protocols</div>
              <div style={{ color: '#5c3db7' }}>3. (0,5) Fun team game interaction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Crossword Grid Container */}
      <div className="crossword-board-outer">
        <div className="crossword-board-grid">
          {grid.map((row, r) => (
            <div key={r} className="crossword-board-row">
              {row.map((cell, c) => {
                const blocked = GRID_BLOCKED[r][c];
                const cellNumber = GRID_NUMBERS[r][c];
                const active = activeCell && activeCell.r === r && activeCell.c === c;

                return (
                  <div
                    key={c}
                    onClick={() => handleCellClick(r, c)}
                    style={{
                      cursor: blocked ? 'default' : 'pointer',
                      background: blocked 
                        ? '#d1c4e9' 
                        : (active ? 'rgba(124, 109, 250, 0.3)' : '#ffffff'),
                    }}
                    className={`crossword-board-cell ${active ? 'active' : ''}`}
                  >
                    {cellNumber && (
                      <span className="crossword-cell-number">
                        {cellNumber}
                      </span>
                    )}
                    {!blocked && <span className="crossword-cell-text" style={{ color: '#3f2a8c' }}>{cell}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
