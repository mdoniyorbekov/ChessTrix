import { type ReactNode, useState } from "react";
import {
  BrainCircuit,
  Database,
  FileCode2,
  Gamepad2,
  QrCode,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { publicAssetUrl } from "../theme/assetPath";
import "./poster.css";

const features = ["Classic Chess", "Bots", "Stockfish", "Game Review", "Puzzle Training", "Tournaments", "Chess960", "Four-Player Chess", "Themes"];
const repositoryUrl = "https://github.com/mdoniyorbekov/ChessTrix";

const functionalRequirements = [
  "Start and play a chess game",
  "Validate legal moves and special rules",
  "Support player vs player and player vs bot modes",
  "Integrate Stockfish for engine evaluation",
  "Generate game review with accuracy and move classification",
  "Support Chess960 and four-player chess",
  "Provide puzzle training mode",
  "Manage tournaments",
  "Allow board themes and piece-set customization",
  "Save settings, profile, achievements, archive, and review cache"
];

const nonFunctionalRequirements = [
  "Responsive GUI interaction",
  "Offline desktop availability",
  "Accurate chess rule validation",
  "Stable engine communication",
  "Modular and maintainable architecture",
  "Clear separation of UI, logic, and data",
  "Reusable C++ OOP components",
  "Smooth board rendering and interaction",
  "Safe handling of invalid moves and engine errors"
];

const nouns = ["Game", "Board", "Piece", "Move", "Player", "BotPlayer", "ChessEngine", "GameAnalyzer", "Tournament", "ThemeManager"];
const verbs = ["makeMove()", "getLegalMoves()", "validateMove()", "analyzeGame()", "calculateAccuracy()", "classifyMove()", "startTournament()", "applyTheme()", "saveProgress()"];

const testingItems = [
  "Legal move generation",
  "Invalid move rejection",
  "Castling",
  "En passant",
  "Promotion",
  "Check/checkmate/stalemate",
  "Chess960 castling",
  "Four-player castling",
  "Bot move generation",
  "Stockfish evaluation",
  "Accuracy calculation",
  "Puzzle progression",
  "Tournament generation",
  "Theme and asset loading",
  "Save/load settings and progress"
];

const cppMappings = [
  ["Class attributes", "private / protected data members"],
  ["Methods", "public member functions"],
  ["Composition", "member object or unique_ptr ownership"],
  ["Aggregation", "vector of references / pointers / IDs"],
  ["Inheritance", "derived classes using public inheritance"],
  ["Polymorphism", "virtual functions and overriding"],
  ["Multiplicity 0..*", "std::vector"],
  ["Object lifetime", "constructors / destructors / smart pointers"]
];

function QrPlaceholder() {
  const [hasQr, setHasQr] = useState(true);
  return (
    <div className="poster-qr">
      <div className="poster-qr__box">
        {hasQr ? (
          <img src={publicAssetUrl("app-assets/poster-qr.png")} alt="GitHub repository QR code" onError={() => setHasQr(false)} />
        ) : (
          <>
            <QrCode size={54} />
            <strong>[QR CODE HERE]</strong>
          </>
        )}
      </div>
      <div>
        <strong>Scan for Online Poster / Demo / Repository</strong>
        <span>{repositoryUrl}</span>
      </div>
    </div>
  );
}

function PosterHeader({ page, title, kicker }: { page: string; title: string; kicker?: string }) {
  return (
    <header className="poster-page__header">
      <div>
        <span>{page}</span>
        <h2>{title}</h2>
      </div>
      {kicker && <p>{kicker}</p>}
    </header>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="poster-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="poster-chips">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function RequirementsList({ items }: { items: string[] }) {
  return (
    <ul className="poster-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ArchitectureDiagram() {
  const layers = [
    ["UI Layer / Presentation", "React components", "Electron desktop shell", "Chess board UI", "Menus and settings", "Game review UI", "Puzzle and tournament screens", "Theme and piece rendering"],
    ["Logic Layer / Business Logic", "C++ OOP chess core", "Game", "Board", "Piece hierarchy", "Move validation", "Special rules", "GameAnalyzer", "ChessEngine interface"],
    ["Data Layer / Storage", "localStorage", "JSON puzzle/opening data", "settings", "review cache", "archive/profile/achievements", "saved tournament data"]
  ];

  return (
    <div className="architecture-diagram">
      {layers.map(([title, ...items], index) => (
        <div className="architecture-layer" key={title}>
          <div>
            <strong>{title}</strong>
            <span>Layer {index + 1}</span>
          </div>
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      <div className="architecture-flow architecture-flow--a">UI Layer -&gt; Logic Layer</div>
      <div className="architecture-flow architecture-flow--b">Logic Layer -&gt; Data Layer</div>
      <div className="architecture-flow architecture-flow--c">GameAnalyzer &lt;-&gt; ChessEngine / Stockfish</div>
    </div>
  );
}

function OopPillars() {
  const pillars = [
    ["Abstraction", "Abstract interfaces hide complex chess rules behind simple public methods such as makeMove(), getLegalMoves(), getStatus(), and analyzeGame()."],
    ["Encapsulation", "Board stores squares and pieces privately. Game controls turn, move history, castling rights, and game status through controlled public methods."],
    ["Inheritance", "King, Queen, Rook, Bishop, Knight, and Pawn inherit from the abstract Piece class and reuse shared attributes such as color, position, and movement state."],
    ["Polymorphism", "A Piece pointer can call getPseudoLegalMoves(), and the correct derived piece behavior is executed through virtual function overriding."]
  ];

  return (
    <div className="pillar-grid">
      {pillars.map(([title, text]) => (
        <article key={title} className="pillar-card">
          <strong>{title}</strong>
          <p>{text}</p>
        </article>
      ))}
      <article className="pillar-card pillar-card--wide">
        <strong>Polymorphism in the current C++ code</strong>
        <p>Static example: overloaded Board constructors support default construction and copy construction. Dynamic example: Piece declares virtual getPseudoLegalMoves(), type(), symbol(), and clone(); each concrete piece overrides them.</p>
      </article>
    </div>
  );
}

function UseCaseDiagram() {
  const useCase = (label: string, x: number, y: number, rx = 86) => (
    <g key={label}>
      <ellipse className="usecase" cx={x} cy={y} rx={rx} ry="30" />
      {label.includes(" / ") ? (
        <>
          <text x={x} y={y - 2} textAnchor="middle">{label.split(" / ")[0]}</text>
          <text x={x} y={y + 15} textAnchor="middle">{label.split(" / ")[1]}</text>
        </>
      ) : (
        <text x={x} y={y + 5} textAnchor="middle">{label}</text>
      )}
    </g>
  );

  return (
    <div className="uml-frame usecase-diagram" aria-label="UML use case diagram">
      <svg viewBox="0 0 920 680" role="img">
        <defs>
          <marker id="poster-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        <rect className="usecase-paper" x="18" y="18" width="884" height="644" />
        <rect className="usecase-title-band" x="38" y="32" width="260" height="34" />
        <text className="usecase-main-title" x="54" y="55">ChessTrix use case diagram</text>
        <rect className="uml-boundary" x="216" y="86" width="508" height="520" rx="4" />
        <text className="uml-title" x="470" y="118" textAnchor="middle">ChessTrix Chess Arena</text>

        <g className="actor" transform="translate(78 208)">
          <circle cx="32" cy="22" r="17" />
          <path d="M32 40v64M4 64h56M32 104l-28 44M32 104l28 44" />
          <text x="32" y="176" textAnchor="middle">Player</text>
        </g>
        <g className="actor" transform="translate(784 186)">
          <circle cx="32" cy="22" r="17" />
          <path d="M32 40v64M4 64h56M32 104l-28 44M32 104l28 44" />
          <text x="32" y="176" textAnchor="middle">Bot / Stockfish</text>
          <text x="32" y="194" textAnchor="middle">Engine</text>
        </g>
        <g className="database-actor" transform="translate(788 475)">
          <path d="M0 18c0-10 56-10 56 0v78c0 10-56 10-56 0z" />
          <path d="M0 18c0 10 56 10 56 0M0 48c0 10 56 10 56 0M0 78c0 10 56 10 56 0" />
          <text x="28" y="126" textAnchor="middle">Local Storage</text>
        </g>

        <g className="usecase-group">
          <text x="338" y="154" textAnchor="middle">Gameplay</text>
          {useCase("Start Game", 338, 198)}
          {useCase("Make Move", 338, 276)}
          {useCase("Validate Move", 560, 276)}
          {useCase("Play Against Bot", 560, 198)}
        </g>
        <g className="usecase-group">
          <text x="338" y="366" textAnchor="middle">Training and Review</text>
          {useCase("Analyze Game", 338, 410)}
          {useCase("Review Accuracy", 560, 410)}
          {useCase("Solve Puzzle", 338, 500)}
        </g>
        <g className="usecase-group">
          <text x="560" y="496" textAnchor="middle">Progress and Customization</text>
          {useCase("Start Tournament", 560, 538)}
          {useCase("Change Theme", 560, 604)}
          {useCase("Save Progress", 338, 604)}
          {useCase("View Statistics / Achievements", 454, 342, 116)}
        </g>

        <g className="uml-line">
          <path d="M142 294L252 198M142 294L252 276M142 294L252 410M142 294L252 500M142 294L452 538M142 294L446 604M142 294L367 342" />
          <path d="M646 198L784 266M646 410L784 266" />
          <path d="M646 604L788 526M424 604L788 526M562 342L788 526" />
        </g>
        <g className="uml-include">
          <path d="M424 276L474 276" markerEnd="url(#poster-arrow)" />
          <path d="M424 410L474 410" markerEnd="url(#poster-arrow)" />
          <text x="449" y="264" textAnchor="middle">&lt;&lt;include&gt;&gt;</text>
          <text x="449" y="398" textAnchor="middle">&lt;&lt;include&gt;&gt;</text>
        </g>
        <rect className="usecase-footer-band" x="18" y="622" width="884" height="40" />
        <text className="usecase-footer-title" x="46" y="648">Actors interact with focused use cases while validation, review, and storage remain separate responsibilities.</text>
      </svg>
    </div>
  );
}

function ClassDiagram() {
  const box = (
    id: string,
    x: number,
    y: number,
    width: number,
    title: string,
    attributes: string[],
    methods: string[],
    stereotype?: string,
    tone: "core" | "interface" | "design" = "core"
  ) => {
    const headerHeight = stereotype ? 46 : 30;
    const rowHeight = 16;
    const height = headerHeight + Math.max(36, attributes.length * rowHeight + 12) + Math.max(34, methods.length * rowHeight + 12);
    const attrY = y + headerHeight;
    const methodY = attrY + Math.max(36, attributes.length * rowHeight + 12);

    return (
      <g key={id} className={`uml-class uml-class--${tone}`}>
        <rect x={x} y={y} width={width} height={height} />
        <line x1={x} y1={attrY} x2={x + width} y2={attrY} />
        <line x1={x} y1={methodY} x2={x + width} y2={methodY} />
        {stereotype && <text className="uml-class__stereotype" x={x + width / 2} y={y + 16} textAnchor="middle">{stereotype}</text>}
        <text className="uml-class__title" x={x + width / 2} y={y + (stereotype ? 34 : 20)} textAnchor="middle">{title}</text>
        {attributes.map((row, index) => (
          <text key={`${id}-attr-${row}`} x={x + 8} y={attrY + 17 + index * rowHeight}>{row}</text>
        ))}
        {methods.map((row, index) => (
          <text key={`${id}-method-${row}`} x={x + 8} y={methodY + 17 + index * rowHeight}>{row}</text>
        ))}
      </g>
    );
  };

  return (
    <div className="class-diagram">
      <svg viewBox="0 0 920 1080" role="img" aria-label="UML class diagram for ChessTrix">
        <defs>
          <marker id="uml-inherit" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto">
            <path d="M 1 1 L 11 6 L 1 11 z" />
          </marker>
          <marker id="uml-arrow-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 1 1 L 9 5 L 1 9" />
          </marker>
          <marker id="uml-diamond-filled" viewBox="0 0 14 14" refX="2" refY="7" markerWidth="12" markerHeight="12" orient="auto">
            <path d="M 2 7 L 7 2 L 12 7 L 7 12 z" />
          </marker>
          <marker id="uml-diamond-open" viewBox="0 0 14 14" refX="2" refY="7" markerWidth="12" markerHeight="12" orient="auto">
            <path d="M 2 7 L 7 2 L 12 7 L 7 12 z" />
          </marker>
        </defs>

        <rect className="uml-paper" x="24" y="20" width="872" height="1038" />
        <path className="uml-frame-tab" d="M24 20h66v28l-12 16H24z" />
        <text className="uml-frame-label" x="44" y="43">frame</text>
        <text className="uml-diagram-title" x="460" y="48" textAnchor="middle">ChessTrix C++ Core and Platform Class Model</text>
        <text className="uml-diagram-note" x="46" y="86">Solid diamond = composition | Open diamond = aggregation | Hollow triangle = inheritance | Dashed arrow = dependency / interface use</text>

        <g className="uml-group-label">
          <rect x="42" y="105" width="374" height="26" />
          <text x="229" y="123" textAnchor="middle">Core Chess Model - Implemented C++</text>
        </g>
        <g className="uml-group-label">
          <rect x="492" y="105" width="374" height="26" />
          <text x="679" y="123" textAnchor="middle">Services and Platform Classes</text>
        </g>

        {box("game", 72, 155, 250, "Game", ["- board_: Board", "- fenState_: FenState", "- history_: vector<MoveRecord>", "- castling_: CastlingRights", "- variant_: string"], ["+ makeMove(from,to,promotion): bool", "+ legalMoves(square): vector<Move>", "+ undo(): bool", "+ getFen(): string", "+ getGameStatus(): string"])}
        {box("board", 72, 390, 250, "Board", ["- squares_: array<unique_ptr<Piece>,64>"], ["+ pieceAt(pos): Piece*", "+ movePiece(from,to): void", "+ isEmpty(pos): bool", "+ occupiedSquares(): vector<Position>", "+ toJson(): string"])}
        {box("piece", 72, 606, 250, "Piece", ["- color_: Color"], ["+ type(): PieceType", "+ symbol(): char", "+ getPseudoLegalMoves(board,from): vector<Move>", "+ clone(): unique_ptr<Piece>"], "<<abstract>>", "interface")}
        {box("move", 360, 170, 218, "Move", ["+ from: Position", "+ to: Position", "+ promotion: char", "+ capture: bool", "+ castling: bool", "+ san: string"], ["+ uci(): string"])}
        {box("position", 360, 408, 218, "Position", ["+ file: int", "+ rank: int"], ["+ isValid(): bool", "+ index(): int", "+ square(): string", "+ fromSquare(square): optional<Position>"])}
        {box("move-generator", 360, 625, 248, "MoveGenerator", [], ["+ generateLegalMoves(board,state): vector<Move>", "+ isSquareAttacked(board,pos,by): bool", "+ findKing(board,color): optional<Position>"], "<<utility>>", "core")}
        {box("pieces", 72, 845, 250, "King / Queen / Rook / Bishop / Knight / Pawn", ["Concrete subclasses of Piece"], ["+ getPseudoLegalMoves(board,from): vector<Move>", "+ type(): PieceType", "+ clone(): unique_ptr<Piece>"], "<<concrete pieces>>", "core")}

        {box("analyzer", 640, 160, 222, "GameAnalyzer", [], ["+ analyzeMove(before,after,side): string", "+ accuracyFromCentipawnLoss(loss): double", "+ classifyMove(loss): string"], "<<service>>", "core")}
        {box("engine", 640, 370, 222, "ChessEngine", [], ["+ bestMove(fen): string", "+ evaluate(fen): EngineScore"], "<<interface>>", "interface")}
        {box("stockfish", 640, 552, 222, "Stockfish Bridge", ["Electron IPC", "local engine process"], ["+ bestMove(position,options)", "+ evaluation(position,options)", "+ analysis(position,options)"], "<<external process>>", "design")}
        {box("player", 640, 750, 222, "Player", ["- name_: string", "- color_: Color"], ["+ name(): string", "+ color(): Color"])}
        {box("bot-player", 498, 908, 170, "BotPlayer", ["Design-level role", "Bot profiles in TS"], ["+ chooseMove(game): Move"], "<<design-level>>", "design")}
        {box("human-player", 692, 908, 170, "HumanPlayer", ["Design-level role", "React UI input"], ["+ chooseMove(game): Move"], "<<design-level>>", "design")}
        {box("tournament", 408, 885, 170, "Tournament", ["- players: vector<Player>", "- games: vector<Game>"], ["+ generateBracket()", "+ recordResult(result)"], "<<platform>>", "design")}
        {box("theme", 720, 220, 142, "ThemeManager", ["- currentBoardTheme", "- currentPieceSet"], ["+ applyTheme(themeId)"], "<<UI service>>", "design")}

        <g className="uml-links">
          <path className="composition" d="M197 315V390" markerStart="url(#uml-diamond-filled)" />
          <text x="207" y="356">1</text>
          <text x="139" y="356">composition</text>
          <path className="composition" d="M322 226H360" markerStart="url(#uml-diamond-filled)" />
          <text x="329" y="216">0..*</text>
          <text x="327" y="244">history</text>
          <path className="composition" d="M197 540V606" markerStart="url(#uml-diamond-filled)" />
          <text x="207" y="580">0..32</text>
          <text x="126" y="580">owns pieces</text>

          <path className="association" d="M322 458H360" markerEnd="url(#uml-arrow-open)" />
          <text x="326" y="448">uses</text>
          <path className="dependency" d="M322 720H360" markerEnd="url(#uml-arrow-open)" />
          <text x="326" y="710">validates with</text>
          <path className="inheritance" d="M197 845V770" markerEnd="url(#uml-inherit)" />
          <text x="208" y="817">inherits</text>

          <path className="dependency" d="M578 242H640" markerEnd="url(#uml-arrow-open)" />
          <text x="585" y="232">classified by</text>
          <path className="dependency" d="M751 303V370" markerEnd="url(#uml-arrow-open)" />
          <text x="763" y="340">uses</text>
          <path className="dependency" d="M751 486V552" markerEnd="url(#uml-arrow-open)" />
          <text x="763" y="525">IPC</text>
          <path className="aggregation" d="M751 750V840H493V885" markerStart="url(#uml-diamond-open)" />
          <text x="510" y="874">1..*</text>
          <path className="aggregation" d="M570 885V810H322V250" markerStart="url(#uml-diamond-open)" />
          <text x="334" y="822">0..*</text>
          <path className="inheritance" d="M583 908V840H751V872" markerEnd="url(#uml-inherit)" />
          <path className="inheritance" d="M777 908V840H751V872" markerEnd="url(#uml-inherit)" />
          <path className="dependency" d="M720 292H608V678" markerEnd="url(#uml-arrow-open)" />
          <text x="615" y="312">UI association</text>
        </g>
      </svg>
    </div>
  );
}

function SequenceDiagram() {
  const lifelines = [
    ["Player", 70],
    ["React UI", 185],
    ["GameController", 318],
    ["C++ Game", 442],
    ["Board", 550],
    ["MoveValidator", 662],
    ["GameAnalyzer", 774],
    ["Stockfish", 878]
  ] as const;
  const x = (index: number) => lifelines[index][1];
  const arrows = [
    [0, 1, 128, "1: Select piece + target"],
    [1, 2, 168, "2: Send move request"],
    [2, 3, 208, "3: makeMove(move)"],
    [3, 4, 248, "4: pieceAt() + legalMoves()"],
    [4, 5, 288, "5: validate move"],
    [5, 4, 328, "6: legal / illegal", true],
    [4, 3, 368, "7: update positions", true],
    [3, 2, 408, "8: board state", true],
    [2, 1, 448, "9: Refresh chessboard", true],
    [2, 6, 488, "10: Analyze FEN"],
    [6, 7, 528, "11: Request evaluation"],
    [7, 6, 568, "12: Score + best move", true],
    [6, 6, 608, "13: Calculate accuracy + label"],
    [6, 1, 648, "14: Display classification", true]
  ] as const;

  return (
    <div className="uml-frame sequence-diagram" aria-label="UML sequence diagram">
      <svg viewBox="0 0 950 700" role="img">
        <defs>
          <marker id="seq-arrow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto">
            <path d="M 1 1 L 11 6 L 1 11 z" />
          </marker>
        </defs>

        <rect className="sequence-paper" x="12" y="12" width="926" height="676" />
        <rect className="sequence-title-band" x="26" y="24" width="274" height="36" />
        <text className="sequence-main-title" x="42" y="48">ChessTrix sequence diagram</text>
        <rect className="sequence-footer-band" x="12" y="648" width="926" height="40" />
        <text className="sequence-footer-title" x="38" y="674">Player makes a move and receives analysis feedback</text>

        {lifelines.map(([label], index) => (
          <g key={label} className="sequence-participant">
            <rect x={x(index) - 48} y="80" width="96" height="34" />
            <text x={x(index)} y="103" textAnchor="middle">{label}</text>
            <line className="sequence-lifeline" x1={x(index)} y1="114" x2={x(index)} y2="632" />
          </g>
        ))}

        <g className="sequence-activations">
          <rect x={x(0) - 8} y="126" width="16" height="392" rx="7" />
          <rect x={x(1) - 8} y="154" width="16" height="380" rx="7" />
          <rect x={x(2) - 8} y="190" width="16" height="292" rx="7" />
          <rect x={x(3) - 8} y="230" width="16" height="206" rx="7" />
          <rect x={x(4) - 8} y="270" width="16" height="126" rx="7" />
          <rect x={x(5) - 8} y="310" width="16" height="42" rx="7" />
          <rect x={x(6) - 8} y="506" width="16" height="130" rx="7" />
          <rect x={x(7) - 8} y="546" width="16" height="44" rx="7" />
        </g>

        {arrows.map(([from, to, y, label, dashed]) => {
          const mid = from === to ? x(from as number) + 34 : (x(from as number) + x(to as number)) / 2;
          return (
            <g className={dashed ? "sequence-return" : "sequence-call"} key={label}>
              {from === to ? (
                <path d={`M${x(from as number)} ${y}h54v28h-54`} markerEnd="url(#seq-arrow)" />
              ) : (
                <line x1={x(from as number)} y1={y} x2={x(to as number)} y2={y} markerEnd="url(#seq-arrow)" />
              )}
              <text x={mid} y={(y as number) - 8} textAnchor="middle">{label}</text>
            </g>
          );
        })}

        <g className="sequence-datastore">
          <path d="M860 606c0-14 52-14 52 0v34c0 14-52 14-52 0z" />
          <path d="M860 606c0 14 52 14 52 0" />
          <text x="886" y="632" textAnchor="middle">DataStore</text>
          <line className="sequence-call" x1={x(6)} y1="628" x2="860" y2="628" markerEnd="url(#seq-arrow)" />
          <text x="820" y="620" textAnchor="middle">15: Save cache</text>
        </g>
      </svg>
    </div>
  );
}

export function Poster({ onBack }: { onBack?: () => void }) {
  return (
    <main className="poster">
      <nav className="poster-toolbar" aria-label="Poster actions">
        {onBack && <button onClick={onBack}>Back to App</button>}
        <button onClick={() => window.print()}>Print / Export PDF</button>
      </nav>

      <article className="poster-page poster-page--cover">
        <div className="cover-grid">
          <section className="cover-main">
            <img className="poster-logo" src={publicAssetUrl("app-assets/chesstrix-logo.png")} alt="ChessTrix logo" />
            <p className="poster-kicker">C++ Object-Oriented Desktop Chess Arena</p>
            <h1>ChessTrix</h1>
            <p className="cover-description">
              ChessTrix is an offline desktop chess arena that combines a modern React/Electron interface with an implemented C++ object-oriented chess core and a WebAssembly integration path. The platform supports classic chess, bots, Stockfish-powered review, puzzles, tournaments, themes, and chess variants such as Chess960 and four-player chess.
            </p>
            <ChipList items={features} />
          </section>
          <aside className="cover-meta">
            <div className="meta-card">
              <span>Student</span>
              <strong>Muhammadsodiq Doniyorbekov</strong>
              <small>Student ID: 250169</small>
            </div>
            <div className="meta-card">
              <span>University</span>
              <strong>Central Asian University</strong>
            </div>
            <div className="meta-card">
              <span>Courses</span>
              <strong>Object-Oriented Programming</strong>
              <strong>Introduction to Computing, AI and Professional Ethics</strong>
            </div>
            <div className="meta-card">
              <span>Instructors</span>
              <strong>Dr. Eugene Castro</strong>
              <strong>Prof. Maxammadjon Maxammadjonov</strong>
            </div>
            <div className="meta-grid">
              <div><span>Date</span><strong>May 2026</strong></div>
              <div><span>Application Type</span><strong>Desktop / Game-Based GUI Application</strong></div>
              <div><span>OOP Language</span><strong>C++</strong></div>
            </div>
            <QrPlaceholder />
          </aside>
        </div>
      </article>

      <article className="poster-page">
        <PosterHeader page="Page 2" title="Requirements and User Story" kicker="From chess player goals to classes and methods" />
        <div className="two-column">
          <Section title="Problem Statement">
            <p>Many chess applications focus only on playing matches. ChessTrix combines gameplay, analysis, training, variants, tournaments, and customization in one offline desktop application.</p>
          </Section>
          <Section title="User Story">
            <p>As a chess player, I want to play games, review mistakes, train with puzzles, and explore chess variants so that I can improve my chess skills in one complete desktop platform.</p>
          </Section>
        </div>
        <div className="two-column two-column--requirements">
          <Section title="Functional Requirements">
            <RequirementsList items={functionalRequirements} />
          </Section>
          <Section title="Non-Functional Requirements">
            <RequirementsList items={nonFunctionalRequirements} />
          </Section>
        </div>
        <Section title="Noun-Verb Analysis">
          <table className="poster-table noun-verb-table">
            <thead>
              <tr><th>Nouns -&gt; Classes</th><th>Verbs -&gt; Methods</th></tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(nouns.length, verbs.length) }).map((_, index) => (
                <tr key={index}><td>{nouns[index] ?? ""}</td><td>{verbs[index] ?? ""}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      </article>

      <article className="poster-page">
        <PosterHeader page="Page 3" title="System Architecture and OOP Pillars" kicker="Detected implementation: React/Electron UI with a C++ WebAssembly integration path; Stockfish uses a separate Electron process bridge" />
        <Section title="Actual Architecture">
          <p>
            ChessTrix uses a React/Electron presentation layer with an implemented C++ OOP chess core exposed through a WebAssembly bridge. The TypeScript CppChessController loads window.chesstrixCppWasm when generated WASM artifacts are available; in this workspace the generated src/game/cpp/wasm files are not present, so the current runtime connection should be described as implemented core / integration in progress. Stockfish is separate: Electron IPC talks to a local Stockfish process for engine evaluation.
          </p>
          <ArchitectureDiagram />
        </Section>
        <Section title="Four Pillars of OOP">
          <OopPillars />
        </Section>
      </article>

      <article className="poster-page poster-page--diagram">
        <PosterHeader page="Page 4" title="Use Case Diagram" kicker="Actors, system boundary, associations, and include relationships" />
        <UseCaseDiagram />
        <div className="diagram-legend">
          <span>Solid line: association</span>
          <span>Dashed arrow: &lt;&lt;include&gt;&gt;</span>
          <span>Rectangle: system boundary</span>
          <span>Oval: use case</span>
        </div>
      </article>

      <article className="poster-page poster-page--class">
        <PosterHeader page="Page 5" title="UML Class Diagram" kicker="Actual C++ class names plus marked design-level platform classes" />
        <ClassDiagram />
      </article>

      <article className="poster-page poster-page--diagram">
        <PosterHeader page="Page 6" title="Sequence Diagram" kicker="Player makes a move and receives analysis feedback" />
        <SequenceDiagram />
        <p className="diagram-note">The sequence diagram shows object responsibility and prevents the UI layer from becoming a God Object.</p>
      </article>

      <article className="poster-page">
        <PosterHeader page="Page 7" title="Implementation, Testing, and Conclusion" kicker="How the UML maps into the current project" />
        <div className="two-column">
          <Section title="Implementation Snapshot">
            <ul className="poster-icon-list">
              <li><Workflow size={18} /> React/Electron handles UI and desktop shell</li>
              <li><FileCode2 size={18} /> C++ OOP core handles chess logic</li>
              <li><BrainCircuit size={18} /> Stockfish provides engine evaluation</li>
              <li><Database size={18} /> Local storage / JSON data stores settings, puzzles, review cache, and user progress</li>
              <li><Gamepad2 size={18} /> ChessTrix supports classic chess, Chess960, four-player chess, puzzles, and tournaments</li>
            </ul>
          </Section>
          <Section title="C++ Mapping">
            <table className="poster-table mapping-table">
              <thead><tr><th>UML Concept</th><th>C++ Implementation</th></tr></thead>
              <tbody>
                {cppMappings.map(([concept, implementation]) => (
                  <tr key={concept}><td>{concept}</td><td>{implementation}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
        <Section title="Testing and Validation">
          <div className="check-grid">
            {testingItems.map((item) => (
              <span key={item}><ShieldCheck size={15} /> {item}</span>
            ))}
          </div>
        </Section>
        <Section title="Conclusion">
          <p>ChessTrix demonstrates object-oriented design by separating the visual interface from the chess logic and data storage. The C++ core models the chess domain through encapsulated classes, inheritance-based piece hierarchy, and polymorphic move generation, while the React/Electron interface provides an interactive desktop experience for playing, training, analyzing, and exploring chess variants.</p>
        </Section>
        <div className="qr-reminder">
          <QrCode size={28} />
          <strong>QR code will link to online poster, demo, or repository. Repository: {repositoryUrl}</strong>
        </div>
      </article>
    </main>
  );
}
