export type AutomatonType = 'DFA' | 'NFA' | 'ENFA';

export type AIProvider = 'AUTO' | 'OPENAI' | 'CLAUDE' | 'GEMINI' | 'GROQ' | 'OPENROUTER' | 'openrouter' | 'groq' | 'gemini';

export interface APIKeys {
  openai: string;
  claude: string;
  gemini: string;
  groq: string;
  openrouter: string;
}

export interface StateNodeData {
  stateId: string;      // e.g. "q0" — shown as primary label
  label: string;        // description — shown as secondary label
  isStart: boolean;
  isAccept: boolean;
  isCurrent?: boolean;
  isSelected?: boolean;
  isVisited?: boolean;
  isRejected?: boolean;
  activePathCount?: number;
  stateIndex?: number;
  dfaTag?: string;       // e.g. "DFA A" or "DFA B"
  colorScheme?: 'indigo' | 'emerald';
  isAnnotation?: boolean;
  subsetEquivalent?: string;
}

export interface AutomatonState {
  id: string;
  label: string;
  isStart: boolean;
  isAccept: boolean;
  x: number;
  y: number;
  dfaTag?: string;
  colorScheme?: 'indigo' | 'emerald';
  isAnnotation?: boolean;
}

export interface AutomatonTransition {
  id: string;
  source: string;
  target: string;
  symbols: string[]; // e.g. ['0', '1'], or ['ε'] / ['e']
}

export interface AutomatonGraph {
  id: string;
  name: string;
  type: AutomatonType;
  alphabet: string[];
  states: AutomatonState[];
  transitions: AutomatonTransition[];
  description?: string;
}

export interface SimulationStep {
  stepIndex: number;
  currentStateIds: string[];
  consumedInput: string;
  remainingInput: string;
  currentSymbol: string | null;
  activeEdgeIds: string[];
  description: string;
  isAccepting: boolean;
  isRejected: boolean;
  epsilonClosureVisited?: string[];
}

export type ValidationErrorType =
  | 'MISSING_START'
  | 'MULTIPLE_START'
  | 'MISSING_TRANSITION'
  | 'MULTIPLE_TRANSITION'
  | 'DISCONNECTED_STATE'
  | 'INVALID_ALPHABET'
  | 'EMPTY_GRAPH';

export interface ValidationError {
  id: string;
  type: ValidationErrorType;
  message: string;
  stateIds?: string[];
  symbol?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SubsetConstructionStep {
  stepIndex: number;
  fromDfaState: string;
  dfaStateMap: { [dfaStateName: string]: string[] };
  symbol: string;
  nfaTargetSet: string[];
  toDfaState: string;
  description: string;
  isNewStateDiscovered: boolean;
  tableRow: {
    dfaState: string;
    nfaStatesStr: string;
    transitions: { [symbol: string]: string };
    isAccepting: boolean;
  };
}

export type MinimizationPhase =
  | 'Initialize'
  | 'Initial Partition'
  | 'Partition Refinement'
  | 'Split Groups'
  | 'Convergence'
  | 'Build Minimal DFA';

export interface TransitionTableRow {
  stateId: string;
  stateLabel: string;
  isAccept: boolean;
  transitions: Record<string, { targetId: string; targetGroupIdx: number; targetGroupLabel: string }>;
}

export interface SplitDetail {
  splitGroupIdx: number;
  splitGroupMembers: string[];
  splitSymbol: string;
  subGroups: Array<{
    subGroupMembers: string[];
    targetGroupIdx: number;
    targetGroupLabel: string;
    sampleState: string;
    sampleTarget: string;
  }>;
  explanation: string;
}

export interface PartitionStep {
  stepIndex: number;
  phase: MinimizationPhase;
  partitions: string[][];
  description: string;
  educationalExplanation: string;
  isRefined: boolean;
  splitBySymbol?: string;
  splitGroupIdx?: number;
  splitDetail?: SplitDetail;
  transitionTable?: TransitionTableRow[];
  workingGraph?: AutomatonGraph;
}

export interface QuizProblem {
  id: string;
  title: string;
  description: string;
  type: AutomatonType;
  alphabet: string[];
  testCases: { input: string; shouldAccept: boolean; explanation?: string }[];
  hint: string;
  solutionAutomaton: AutomatonGraph;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
}

export interface ProjectData {
  id: string;
  name: string;
  updatedAt: string;
  graph: AutomatonGraph;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'cyberpunk' | 'oled';
  accentColor: 'blue' | 'indigo' | 'emerald' | 'violet' | 'amber';
  animationSpeed: number;
  simulationSpeed?: number;
  snapToGrid: boolean;
  showGrid: boolean;
  autoValidate: boolean;
  autoLayout?: boolean;
  aiModel?: string;
}

export interface GeneratedAutomatonResult {
  graph: AutomatonGraph;
  explanation: string;
  stateDescriptions: { [stateId: string]: string };
  transitionTable: { state: string; [symbol: string]: string }[];
  acceptedSamples: string[];
  rejectedSamples: string[];
}
