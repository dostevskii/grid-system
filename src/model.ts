export type PageUnit = "px" | "mm" | "in";
export type ViewMode = "overlay" | "grid" | "text";
export type LayoutStyle = "aligned" | "asymmetric" | "editorial" | "free";
export const IMAGE_RATIOS = [
  { id: "1:1", width: 1, height: 1 },
  { id: "2:3", width: 2, height: 3 },
  { id: "4:5", width: 4, height: 5 },
  { id: "5:7", width: 5, height: 7 },
  { id: "5:8", width: 5, height: 8 },
  { id: "16:9", width: 16, height: 9 },
  { id: "3:2", width: 3, height: 2 },
  { id: "4:3", width: 4, height: 3 },
  { id: "9:16", width: 9, height: 16 },
] as const;
export type ImageRatioId = (typeof IMAGE_RATIOS)[number]["id"];
export type CompositionMode = "legacy" | "empty" | "typography" | "typography-image";
export interface WorkflowSettings {
  gridSeed: number;
  gridLocked: boolean;
  compositionLocked: boolean;
  mode: CompositionMode;
  imageRatios: ImageRatioId[];
}

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
  workflow: WorkflowSettings;
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
export interface ImageBlock {
  id: string;
  role: "image";
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: ImageRatioId;
}
export interface LayoutResult {
  width: number;
  height: number;
  moduleWidth: number;
  moduleHeight: number;
  blocks: TextBlock[];
  images: ImageBlock[];
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
