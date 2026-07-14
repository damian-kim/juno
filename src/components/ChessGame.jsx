import React, { useState, useEffect } from 'react';

const INITIAL_BOARD = [
  ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
  ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
  ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
];

// Beautiful chess.com-like vector inline SVGs
const PawnSvg = ({ isWhite }) => (
  <svg viewBox="0 0 100 100" width="80%" height="80%" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
    <circle cx="50" cy="32" r="14" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <path d="M35 78 C 35 58, 42 48, 42 43 L58 43 C 58 48, 65 58, 65 78 Z" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <rect x="30" y="76" width="40" height="8" rx="2" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
  </svg>
);

const RookSvg = ({ isWhite }) => (
  <svg viewBox="0 0 100 100" width="80%" height="80%" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
    <rect x="33" y="32" width="34" height="44" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <rect x="26" y="24" width="48" height="10" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <rect x="30" y="74" width="40" height="8" rx="2" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <path d="M26 24 L26 16 L34 16 L34 24 M42 24 L42 16 L50 16 L50 24 M58 24 L58 16 L66 16 L66 24" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="4" />
  </svg>
);

const KnightSvg = ({ isWhite }) => (
  <svg viewBox="0 0 100 100" width="85%" height="85%" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
    <path d="M30 78 C 28 65, 20 60, 26 44 C 30 35, 34 32, 36 24 C 42 16, 52 14, 62 18 C 72 22, 74 38, 70 50 C 68 58, 64 68, 64 78 Z" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <path d="M46 26 C 36 26, 26 30, 24 40 C 24 46, 30 48, 38 48" fill="none" stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="4" strokeLinecap="round" />
    <circle cx="56" cy="30" r="3.5" fill={isWhite ? "#1a1918" : "#ffffff"} />
    <rect x="30" y="76" width="40" height="8" rx="2" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
  </svg>
);

const BishopSvg = ({ isWhite }) => (
  <svg viewBox="0 0 100 100" width="82%" height="82%" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
    <circle cx="50" cy="18" r="4.5" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="4" />
    <path d="M34 76 C 34 54, 38 32, 50 26 C 62 32, 66 54, 66 76 Z" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <path d="M44 38 L56 50" stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" strokeLinecap="round" />
    <rect x="30" y="74" width="40" height="8" rx="2" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
  </svg>
);

const QueenSvg = ({ isWhite }) => (
  <svg viewBox="0 0 100 100" width="85%" height="85%" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
    <rect x="30" y="76" width="40" height="8" rx="2" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <path d="M30 76 L22 36 L38 56 L50 26 L62 56 L78 36 L70 76 Z" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <circle cx="22" cy="30" r="4.5" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="4" />
    <circle cx="50" cy="20" r="4.5" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="4" />
    <circle cx="78" cy="30" r="4.5" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="4" />
  </svg>
);

const KingSvg = ({ isWhite }) => (
  <svg viewBox="0 0 100 100" width="88%" height="88%" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
    <rect x="30" y="76" width="40" height="8" rx="2" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <path d="M32 76 L28 42 L50 32 L72 42 L68 76 Z" fill={isWhite ? "#ffffff" : "#4b4847"} stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" />
    <path d="M50 14 L50 26 M44 20 L56 20" stroke={isWhite ? "#454545" : "#1a1918"} strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const renderPiece = (cell) => {
  if (!cell) return null;
  const isWhite = cell.startsWith('w');
  const type = cell.substring(1);
  switch (type) {
    case 'P': return <PawnSvg isWhite={isWhite} />;
    case 'R': return <RookSvg isWhite={isWhite} />;
    case 'N': return <KnightSvg isWhite={isWhite} />;
    case 'B': return <BishopSvg isWhite={isWhite} />;
    case 'Q': return <QueenSvg isWhite={isWhite} />;
    case 'K': return <KingSvg isWhite={isWhite} />;
    default: return null;
  }
};

// Procedural synthesizer for Chess.com standard "tock" and "capture" sounds
export const playChessMoveSound = (isCapture = false) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;

    if (isCapture) {
      // Woodblock-strike friction for capture
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);
      gainNode.gain.setValueAtTime(0.0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      // Noise elements simulating physical contact friction
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.03, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } else {
      // Clean Chess.com classic "tock" sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
      gainNode.gain.setValueAtTime(0.0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
    setTimeout(() => ctx.close(), 200);
  } catch (e) {}
};

export function ChessGame({ sendCustomStreamMessage }) {
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [selectedCell, setSelectedCell] = useState(null); // { r, c }
  const [turn, setTurn] = useState('w'); // 'w' or 'b'
  const [myColor, setMyColor] = useState('w'); // 'w', 'b', or 'spectator'
  const [logs, setLogs] = useState([]);
  const [lastMoveCoordinates, setLastMoveCoordinates] = useState(null); // { from: { r, c }, to: { r, c } }

  useEffect(() => {
    const handleSync = (e) => {
      const { board: nextBoard, turn: nextTurn, lastMove, isCapture, from, to } = e.detail;
      if (nextBoard) setBoard(nextBoard);
      if (nextTurn) setTurn(nextTurn);
      if (lastMove) setLogs(prev => [lastMove, ...prev].slice(0, 10));
      if (from && to) setLastMoveCoordinates({ from, to });
      playChessMoveSound(!!isCapture);
    };
    window.addEventListener('chess-move-sync', handleSync);
    return () => window.removeEventListener('chess-move-sync', handleSync);
  }, []);

  const handleCellClick = (r, c) => {
    if (myColor === 'spectator') return;
    if (turn !== myColor) return; // not my turn

    const piece = board[r][c];

    if (selectedCell) {
      // If clicked the same spot or another of their own color, select that instead
      if (piece && piece.startsWith(myColor)) {
        setSelectedCell({ r, c });
        return;
      }

      // Perform Move
      const nextBoard = board.map(row => [...row]);
      const movingPiece = board[selectedCell.r][selectedCell.c];
      
      const isCap = !!piece; // Capture if target cell holds a piece
      nextBoard[selectedCell.r][selectedCell.c] = null;
      nextBoard[r][c] = movingPiece;

      const nextTurn = turn === 'w' ? 'b' : 'w';
      const moveStr = `${myColor === 'w' ? 'White' : 'Black'}: ${selectedCell.r},${selectedCell.c} to ${r},${c}`;

      setBoard(nextBoard);
      setTurn(nextTurn);
      setLastMoveCoordinates({ from: selectedCell, to: { r, c } });
      setSelectedCell(null);
      setLogs(prev => [moveStr, ...prev].slice(0, 10));
      
      // Play local synthesis move sound
      playChessMoveSound(isCap);

      // Broadcast move to Agora channel
      if (typeof sendCustomStreamMessage === 'function') {
        sendCustomStreamMessage({
          type: 'chess-move',
          board: nextBoard,
          turn: nextTurn,
          lastMove: moveStr,
          isCapture: isCap,
          from: selectedCell,
          to: { r, c }
        });
      }
    } else {
      // Select piece if it belongs to current player color
      if (piece && piece.startsWith(myColor)) {
        setSelectedCell({ r, c });
      }
    }
  };

  const handleReset = () => {
    setBoard(INITIAL_BOARD);
    setTurn('w');
    setSelectedCell(null);
    setLastMoveCoordinates(null);
    setLogs(prev => ['Game restarted', ...prev].slice(0, 10));
    playChessMoveSound(false);
    
    if (typeof sendCustomStreamMessage === 'function') {
      sendCustomStreamMessage({
        type: 'chess-move',
        board: INITIAL_BOARD,
        turn: 'w',
        lastMove: 'Game restarted',
        isCapture: false,
        from: null,
        to: null
      });
    }
  };

  return (
    <div className="chess-foreground-wrapper">
      <div className="chess-sidebar-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, width: '100%' }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#9485fb' }}>CHESS MATCH</h4>
          <div style={{ display: 'flex', gap: 4 }}>
            <select 
              value={myColor} 
              onChange={(e) => { setMyColor(e.target.value); setSelectedCell(null); }}
              style={{ background: '#1c112e', color: '#fff', fontSize: 11, border: '1px solid #7c6dfa44', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
            >
              <option value="w">Play White</option>
              <option value="b">Play Black</option>
              <option value="spectator">Spectator</option>
            </select>
            <button 
              onClick={handleReset}
              style={{ background: '#7c6dfa', color: '#fff', fontSize: 10, fontWeight: 700, border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
            >
              RESET
            </button>
          </div>
        </div>

        {/* Dashboard and game logs */}
        <div className="chess-dashboard">
          <div style={{ fontSize: 11, fontWeight: 700, borderBottom: '1px solid #7c6dfa22', paddingBottom: 4, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>TURN: {turn === 'w' ? 'WHITE' : 'BLACK'}</span>
            <span style={{ color: turn === myColor ? '#3dd68c' : '#f04d4d' }}>
              {turn === myColor ? 'YOUR TURN' : 'WAITING'}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', fontSize: 10, fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {logs.length === 0 ? (
              <span style={{ color: '#5c5f7a' }}>No moves yet. Make a move!</span>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} style={{ color: log.startsWith('White') ? '#9485fb' : '#ffb86c' }}>
                  • {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Spacious Centered Board container */}
      <div className="chess-board-outer">
        <div className="chess-board-grid">
          {board.map((row, r) => (
            <div key={r} className="chess-board-row">
              {row.map((cell, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
                
                // Highlight last move from/to squares
                const isLastMoveSquare = lastMoveCoordinates && (
                  (lastMoveCoordinates.from?.r === r && lastMoveCoordinates.from?.c === c) ||
                  (lastMoveCoordinates.to?.r === r && lastMoveCoordinates.to?.c === c)
                );

                let bg = isDark ? '#769656' : '#eeeed2'; // chess.com classic
                if (isSelected) {
                  bg = 'rgba(247, 247, 133, 0.6)'; // Selection highlight
                } else if (isLastMoveSquare) {
                  bg = isDark ? '#baca44' : '#f7f785'; // Soft move highlight
                }

                return (
                  <div
                    key={c}
                    onClick={() => handleCellClick(r, c)}
                    style={{ background: bg }}
                    className="chess-board-cell"
                  >
                    {renderPiece(cell)}
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
