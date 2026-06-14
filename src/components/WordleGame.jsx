import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../contexts/store';
import './WordleGame.css';

const ROWS = 6;
const COLS = 5;

// Common valid 5-letter words for guess validation (subset — just enough to feel real)
const VALID_WORDS = new Set([
  'about','above','abuse','acted','acute','admit','adopt','adult','after','again',
  'agent','agree','ahead','alarm','album','alert','alien','align','alike','alive',
  'allow','alone','along','alter','among','angel','anger','angle','angry','anime',
  'ankle','annex','antic','apart','apple','apply','arena','argue','arise','armor',
  'array','arrow','aside','asset','atlas','audio','audit','avoid','await','awake',
  'award','aware','awful','badge','badly','baker','bases','basic','basis','beach',
  'beard','beast','begin','being','below','bench','berry','blade','blame','blank',
  'blast','blaze','bleed','blend','bless','blind','block','bloom','blown','board',
  'boast','bonus','booth','bound','brace','brain','brand','brave','bread','break',
  'breed','brick','bride','brief','bring','broad','broke','brook','brown','brush',
  'build','bunch','burst','buyer','cabin','cable','camel','carry','catch','cause',
  'cease','chain','chair','chalk','chaos','charm','chase','cheap','check','cheek',
  'chess','chest','chief','child','china','chord','chunk','civic','civil','claim',
  'class','clean','clear','clerk','click','cliff','climb','cling','clock','close',
  'cloud','coach','coast','color','coral','count','court','cover','crack','craft',
  'crane','crash','crazy','cream','crime','cross','crowd','crown','cruel','crush',
  'curve','cycle','dance','dealt','death','debug','decay','decor','decoy','delay',
  'delta','dense','depth','derby','detox','diary','dirty','dodge','doing','donor',
  'doubt','dough','draft','drain','drake','drama','drank','drape','drawn','dream',
  'dress','dried','drift','drill','drink','drive','drown','dying','eager','early',
  'earth','eight','elder','elect','elite','embed','empty','enemy','enjoy','enter',
  'entry','equal','equip','error','essay','event','every','exact','exile','exist',
  'extra','faint','fairy','faith','false','fancy','fatal','feast','fence','fetch',
  'fever','fewer','fiber','field','fifth','fight','final','first','fixed','flame',
  'flash','fleet','flesh','float','flood','floor','flora','flour','fluid','flush',
  'focus','force','forge','forth','forum','found','frame','frank','fraud','fresh',
  'front','froze','fruit','fully','funny','ghost','giant','given','glass','gleam',
  'globe','glory','glove','going','grace','grade','grain','grand','grant','grape',
  'graph','grasp','grass','grave','great','greed','green','greet','grief','grill',
  'grind','groan','gross','group','grove','grown','guard','guess','guest','guide',
  'guild','guilt','given','habit','happy','harsh','haste','heart','heavy','hence',
  'hobby','honor','horse','hotel','house','human','humor','ideal','image','imply',
  'index','inner','input','irony','issue','ivory','joint','judge','juice','karma',
  'knife','knock','known','label','large','laser','later','laugh','layer','learn',
  'lease','least','leave','legal','lemon','level','light','limit','linen','liver',
  'local','logic','loose','lover','lower','loyal','lucky','lunch','lying','magic',
  'major','maker','manor','march','marry','match','mayor','medal','media','mercy',
  'merit','metal','meter','might','minor','minus','model','money','month','moral',
  'motor','mount','mouse','mouth','movie','music','naval','nerve','never','night',
  'noble','noise','north','noted','novel','nurse','nylon','occur','ocean','offer',
  'olive','onset','opera','orbit','organ','other','outer','oxide','ozone','paint',
  'panel','panic','paper','party','pasta','patch','pause','peace','peach','pearl',
  'penny','phase','phone','photo','piano','piece','pilot','pinch','pitch','pixel',
  'pizza','place','plain','plane','plant','plate','plaza','plead','pluck','plumb',
  'plump','plunge','point','polar','porch','pouch','pound','power','press','price',
  'pride','prime','print','prior','prize','probe','prone','proof','proud','prove',
  'psalm','pulse','punch','pupil','purse','queen','query','quest','queue','quick',
  'quiet','quite','quota','quote','radar','radio','raise','rally','ranch','range',
  'rapid','ratio','reach','ready','realm','rebel','refer','reign','relax','repay',
  'reply','rider','ridge','rifle','right','rigid','risky','rival','river','robin',
  'robot','rocky','roman','rouge','rough','round','route','royal','rugby','ruler',
  'rural','sadly','saint','salad','scale','scare','scene','scope','score','scout',
  'scrap','sense','serve','setup','seven','shade','shake','shall','shame','shape',
  'share','shark','sharp','sheep','sheer','sheet','shelf','shell','shift','shine',
  'shirt','shock','shoot','shore','short','shout','sight','sigma','since','sixth',
  'skate','skill','skull','slate','slave','sleep','slice','slide','slope','small',
  'smart','smell','smile','smoke','snake','solar','solid','solve','sorry','sound',
  'south','space','spare','spark','speak','speed','spend','spill','spine','split',
  'spoke','spoon','sport','spray','squad','stack','staff','stage','stain','stake',
  'stale','stall','stamp','stand','stare','stark','start','state','stave','stead',
  'steak','steal','steam','steel','steep','steer','stern','stick','stiff','still',
  'stock','stone','stood','store','storm','story','stout','stove','strap','straw',
  'strip','stuck','study','stuff','style','sugar','suite','sunny','super','surge',
  'swamp','swear','sweep','sweet','swept','swift','swing','sword','swore','sworn',
  'syrup','table','taken','taste','teach','teeth','tempo','tense','tenth','terms',
  'theft','theme','there','thick','thing','think','third','those','three','threw',
  'throw','thumb','tiger','tight','timer','tired','title','today','token','total',
  'touch','tough','towel','tower','toxic','trace','track','trade','trail','train',
  'trait','trash','treat','trend','trial','tribe','trick','tried','troop','truck',
  'truly','trump','trunk','trust','truth','tumor','twice','twist','ultra','uncle',
  'under','union','unite','unity','until','upper','upset','urban','usage','usual',
  'utter','valid','value','valve','vapor','vault','venue','verse','video','vigor',
  'viola','viral','virus','visit','vista','vital','vivid','vocal','vodka','voice',
  'voter','wages','waste','watch','water','weary','weave','wheat','wheel','where',
  'which','while','white','whole','whose','wider','witch','woman','world','worry',
  'worse','worst','worth','would','wound','wrath','write','wrong','wrote','yacht',
  'yield','young','yours','youth','waste','crane','slate','trace','crate','arise',
  'raise','stare','later','alert','alter','heart','earth','ocean','flame','bloom',
  'ghost','charm','brave','grape','shard','tiger','piano','melon','cider','drift',
  'plumb','globe','frost','noble','spark','lunar','realm','quest','glyph','prism',
  'vivid','blitz','crux','flint','nexus','adore','amble','angel','badge','bagel',
  'balmy','baron','bezel','birch','bliss','brisk','brook','camel','cedar','charm',
  'chunk','clasp','cleft','comet','conch','creek','daisy','demon','depot','dodge',
  'drape','ember','epoch','fable','feast','filth','flask','flock','fluke','forge',
  'gauge','gleam','gnome','grain','grief','grill','grove','haven','hazel','heist',
  'heron','hoard','haste','ivory','joker','joust','knelt','kudos','latch','ledge',
  'llama','lotus','maple','marsh','medal','melon','merge','mirth','mocha','mossy',
  'mural','nectar','niece','onset','otter','oxide','pedal','perch','plaza','plume',
  'pouch','prawn','quail','quilt','raven','realm','ridge','riper','rivet','robin',
  'rogue','rumor','sable','salve','scion','scone','scree','siege','siren','skimp',
  'slang','sloth','smirk','snare','snore','spore','staid','stoic','strum','swoop',
  'thorn','thyme','titan','towel','tulip','tunic','usher','valor','venom','verge',
  'vigil','viola','visor','vixen','vogue','wafer','wager','waltz','waxen','whelp',
  'wrist','yodel','zesty',
]);

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

// ─── Tile ──────────────────────────────────────────────────────────────────────
function Tile({ letter, state, delay, isCurrentRow }) {
  const [revealed, setRevealed] = useState(false);
  const [bounce, setBounce] = useState(false);
  const prevLetterRef = useRef('');

  useEffect(() => {
    if (state && state !== 'tbd' && !revealed) {
      const timer = setTimeout(() => setRevealed(true), delay);
      return () => clearTimeout(timer);
    }
  }, [state, delay, revealed]);

  useEffect(() => {
    if (letter && isCurrentRow && letter !== prevLetterRef.current) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 100);
      prevLetterRef.current = letter;
      return () => clearTimeout(timer);
    }
  }, [letter, isCurrentRow]);

  const classes = [
    'wdl-tile',
    state || '',
    revealed ? 'revealed' : '',
    bounce ? 'bounce' : '',
    letter ? 'filled' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={{ animationDelay: `${delay}ms` }}>
      <span className="wdl-tile-letter">{letter}</span>
    </div>
  );
}

// ─── Game Board ────────────────────────────────────────────────────────────────
function GameBoard({ guesses, currentGuess, gameStatus }) {
  const rows = [];

  for (let i = 0; i < ROWS; i++) {
    const guess = guesses[i];
    const isCurrentRow = i === guesses.length && gameStatus === 'playing';

    const tiles = [];
    for (let j = 0; j < COLS; j++) {
      let letter = '';
      let state = '';

      if (guess) {
        letter = guess.word[j]?.toUpperCase() || '';
        state = guess.result[j] || '';
      } else if (isCurrentRow) {
        letter = currentGuess[j]?.toUpperCase() || '';
        state = currentGuess[j] ? 'tbd' : '';
      }

      tiles.push(
        <Tile
          key={`${i}-${j}`}
          letter={letter}
          state={state}
          delay={guess ? j * 300 : 0}
          isCurrentRow={isCurrentRow && !!currentGuess[j]}
          colIndex={j}
        />
      );
    }

    rows.push(
      <div key={i} className="wdl-row">
        {tiles}
      </div>
    );
  }

  return <div className="wdl-board">{rows}</div>;
}

// ─── Keyboard ──────────────────────────────────────────────────────────────────
function Keyboard({ onKey, letterStates }) {
  return (
    <div className="wdl-keyboard">
      {KEYBOARD_ROWS.map((row, ri) => (
        <div key={ri} className="wdl-kb-row">
          {ri === 1 && <div className="wdl-kb-spacer" />}
          {row.map(key => {
            const state = letterStates[key.toLowerCase()] || '';
            return (
              <button
                key={key}
                className={`wdl-kb-key ${state} ${key.length > 1 ? 'wide' : ''}`}
                onClick={() => onKey(key)}
                aria-label={key === '⌫' ? 'Backspace' : key}
              >
                {key === 'ENTER' ? '↵' : key}
              </button>
            );
          })}
          {ri === 1 && <div className="wdl-kb-spacer" />}
        </div>
      ))}
    </div>
  );
}

// ─── Player List ───────────────────────────────────────────────────────────────
function PlayerList({ players }) {
  if (!players.length) return null;
  return (
    <div className="wdl-players">
      {players.map(p => (
        <span key={p.name} className="wdl-player-chip">
          <span className="wdl-player-dot" />
          {p.name}
        </span>
      ))}
    </div>
  );
}

// ─── Main Wordle Game ──────────────────────────────────────────────────────────
export function WordleGame() {
  const {
    gameStatus, gameGuesses, gameMaxGuesses, gamePlayers,
    submitGuess, endGame, user,
  } = useAppStore();

  const [currentGuess, setCurrentGuess] = useState('');
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  // Compute letter states from guesses
  const letterStates = {};
  gameGuesses.forEach(g => {
    for (let i = 0; i < g.word.length; i++) {
      const ch = g.word[i];
      const result = g.result[i];
      const current = letterStates[ch];
      if (result === 'correct') {
        letterStates[ch] = 'correct';
      } else if (result === 'present' && current !== 'correct') {
        letterStates[ch] = 'present';
      } else if (!current) {
        letterStates[ch] = 'absent';
      }
    }
  });

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  const handleKey = useCallback((key) => {
    if (gameStatus !== 'playing') return;

    if (key === 'ENTER') {
      if (currentGuess.length < 5) {
        showToast('Not enough letters');
        setShake(true);
        setTimeout(() => setShake(false), 600);
        return;
      }
      if (!VALID_WORDS.has(currentGuess.toLowerCase())) {
        showToast('Not in word list');
        setShake(true);
        setTimeout(() => setShake(false), 600);
        return;
      }
      submitGuess(currentGuess);
      setCurrentGuess('');
      return;
    }

    if (key === '⌫' || key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
      return;
    }

    if (currentGuess.length >= 5) return;
    if (/^[a-zA-Z]$/.test(key)) {
      setCurrentGuess(prev => prev + key.toLowerCase());
    }
  }, [currentGuess, gameStatus, submitGuess, showToast]);

  // Physical keyboard input
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') handleKey('ENTER');
      else if (e.key === 'Backspace') handleKey('⌫');
      else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  // Status messages
  const statusMsg = gameStatus === 'won'
    ? '🎉 Brilliant!'
    : gameStatus === 'lost'
      ? `The word was ${useAppStore.getState().gameWord.toUpperCase()}`
      : `Guess ${gameGuesses.length + 1} of ${gameMaxGuesses}`;

  return (
    <div className="wdl-game">
      <div className="wdl-header">
        <div className="wdl-header-left">
          <span className="wdl-title font-mono">wordle</span>
          <span className="wdl-status">{statusMsg}</span>
        </div>
        <div className="wdl-header-right">
          <PlayerList players={gamePlayers} />
        </div>
      </div>

      <div className={`wdl-body ${shake ? 'shake' : ''}`}>
        <GameBoard
          guesses={gameGuesses}
          currentGuess={currentGuess}
          gameStatus={gameStatus}
        />
      </div>

      {toast && <div className="wdl-toast">{toast}</div>}

      {(gameStatus === 'won' || gameStatus === 'lost') && (
        <div className="wdl-result-banner">
          <p className="wdl-result-text">
            {gameStatus === 'won'
              ? `You got it in ${gameGuesses.length}/${gameMaxGuesses}!`
              : `Better luck next time!`}
          </p>
          <button className="wdl-play-again" onClick={endGame}>
            Close Game
          </button>
        </div>
      )}

      <div className="wdl-footer">
        <Keyboard onKey={handleKey} letterStates={letterStates} />
      </div>
    </div>
  );
}
