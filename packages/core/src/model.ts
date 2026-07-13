// The unified node model. Everything in the design-system memory is a Node;
// `kind` selects the typed payload carried in `data`.

export type Kind =
  | 'token'
  | 'component'
  | 'pattern'
  | 'guideline'
  | 'screen'
  | 'flow'
  | 'ia'
  | 'doc';

export type Level = 'atom' | 'molecule' | 'organism' | 'template';

export type Origin = 'recipe' | 'client';

/** personal = never leaves your machine; studio = shareable/deployable; client = belongs to one client. */
export type Visibility = 'personal' | 'studio' | 'client';

export interface Node {
  id: string;
  kind: Kind;
  name: string | null;
  level: Level | null;
  data: unknown;
  body: string | null;
  origin: Origin;
  visibility?: Visibility;
  created: string;
  updated: string;
}

// --- token payload (W3C DTCG-aligned) -------------------------------------

export type TokenType =
  | 'color'
  | 'dimension'
  | 'number'
  | 'duration'
  | 'fontFamily'
  | 'fontWeight'
  | 'string';

export interface TokenData {
  $value: string | number;
  $type: TokenType;
  $description?: string;
  /** top-level group, e.g. "color" in "color.brand.primary" */
  group?: string;
}

// --- component payload (the definition layer) -----------------------------

export interface ComponentProp {
  name: string;
  type?: string;
  default?: string;
  description?: string;
}

export interface ComponentVariant {
  name: string;
  when?: string;
}

export interface Alternative {
  use: string;
  when: string;
}

/** The usage rules — the part that lets an agent choose, not guess. */
export interface ComponentUsage {
  when?: string;
  whenNot?: string;
  alternatives?: Alternative[];
  pairsWith?: string[];
  do?: string[];
  dont?: string[];
  a11y?: string;
}

export interface ComponentData {
  intents?: string[];
  props?: ComponentProp[];
  variants?: ComponentVariant[];
  sizes?: string[];
  tokensUsed?: string[];
  usage?: ComponentUsage;
}

// --- pattern: a recommended solution to a recurring problem ----------------

export interface PatternData {
  problem: string;
  solution?: string;
  componentsUsed?: string[];
  rationale?: string;
}

// --- guideline: a cross-cutting rule that governs components ----------------

export interface GuidelineData {
  rule: string;
  scope?: string;
  governs?: string[];
}

// --- screen: an information-architecture node -------------------------------

export interface ScreenData {
  purpose?: string;
  states?: string[];
  uiElements?: string[];
  components?: string[];
}

// --- flow: a user-flow graph ------------------------------------------------

export interface FlowNode {
  id: string;
  title: string;
  subtitle?: string;
  type?: string; // main | normal | error | retry — the connector/colour class
  shape?: string; // rectangle | pill | parallelogram | diamond | triangle | hexagon | oval | square | circle
  details?: string;
  screen?: string;
  /** the phase band this node belongs to */
  section?: string;
  /** canvas position, RELATIVE to the node's band */
  x?: number;
  y?: number;
}

export interface FlowEdge {
  id?: string;
  from: string;
  to: string;
  type?: string; // main | normal | error | retry
  triggerType?: string; // gesture | system | condition
  trigger?: string;
  condition?: string;
  label?: string;
}

export interface FlowSection {
  id: string;
  label: string;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** vertical phase bands; older flows may carry plain string labels */
  sections?: (FlowSection | string)[];
}

// --- doc: a data-layer reference the agents read for grounding --------------

export interface DocData {
  /** free category, e.g. prd | brand | research | spec | note */
  type?: string;
  tags?: string[];
}
