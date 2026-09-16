export type PageUnit = "px" | "mm" | "in";
export type ViewMode = "overlay" | "grid" | "text";
export type LayoutStyle = "aligned" | "asymmetric" | "editorial" | "free";

export interface PageSpec {
  presetId: string;
  category: string;
  mode: "web" | "print";
  unit: PageUnit;
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
}

export interface Settings {
  schemaVersion: 1;
  page: PageSpec;
  columns: number;
  rows: number;
  margin: { top: number; right: number; bottom: number; left: number };
  gutter: { x: number; y: number };
  fontId: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  gridColor: string;
  gridOpacity: number;
  textColor: string;
  textOpacity: number;
  layout: LayoutStyle;
  density: number;
  seed: number;
  view: ViewMode;
  baseline: boolean;
}

export interface Preset extends PageSpec {
  name: string;
  source?: string;
}
export interface TextLine {
  text: string;
  x: number;
  y: number;
}
export interface TextBlock {
  id: string;
  role: "heading" | "body";
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  /** Whitespace-normalized source excerpt, retained for responsive HTML flow. */
  text?: string;
  lines: TextLine[];
}
export interface LayoutResult {
  width: number;
  height: number;
  moduleWidth: number;
  moduleHeight: number;
  blocks: TextBlock[];
  warnings: string[];
}
export interface TextMetricsResult {
  width: number;
  ascent: number;
  descent: number;
}
export type MeasureText = (text: string, size: number) => TextMetricsResult;

export interface FontAsset {
  path: string;
  weight: string;
  style?: string;
  unicodeRange?: string;
}
export interface FontDefinition {
  id: string;
  name: string;
  family: string;
  category: "Serif" | "Sans-serif" | "한국어";
  weights: number[];
  assets: FontAsset[];
  notices: string[];
  source: string;
  version: string;
}
