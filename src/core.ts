import { FONTS } from "./fonts";
import { IMAGE_RATIOS } from "./model";
import type {
  LayoutResult,
  MeasureText,
  Settings,
  ImageBlock,
  ImageRatioId,
  TextBlock,
  TextLine,
  WorkflowSettings,
} from "./model";

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  page: {
    presetId: "web-desktop-1440",
    category: "웹",
    mode: "web",
    unit: "px",
    width: 1440,
    height: 1024,
    orientation: "landscape",
  },
  columns: 4,
  rows: 5,
  margin: { top: 64, right: 64, bottom: 64, left: 64 },
  gutter: { x: 24, y: 24 },
  fontId: "inter",
  fontWeight: 400,
  fontSize: 16,
  lineHeight: 24,
  letterSpacing: 0,
  gridColor: "#E84535",
  gridOpacity: 0.14,
  textColor: "#000000",
  textOpacity: 1,
  layout: "aligned",
  density: 0.8,
  seed: 0,
  view: "overlay",
  baseline: false,
  workflow: {
    gridSeed: 0,
    gridLocked: false,
    compositionLocked: false,
    mode: "legacy",
    imageRatios: IMAGE_RATIOS.map((ratio) => ratio.id),
  },
};
const DEFAULT_WORKFLOW: WorkflowSettings = {
  gridSeed: 0,
  gridLocked: false,
  compositionLocked: false,
  mode: "legacy",
  imageRatios: IMAGE_RATIOS.map((ratio) => ratio.id),
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const own = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const hex = /^#[0-9a-fA-F]{6}$/;
export function toPx(value: number, unit: Settings["page"]["unit"]): number {
  return unit === "px"
    ? value
    : unit === "mm"
      ? (value * 96) / 25.4
      : value * 96;
}
export function fromPx(value: number, unit: Settings["page"]["unit"]): number {
  return unit === "px"
    ? value
    : unit === "mm"
      ? (value * 25.4) / 96
      : value / 96;
}
export function pageSize(page: Settings["page"]): {
  width: number;
  height: number;
} {
  return {
    width: toPx(page.width, page.unit),
    height: toPx(page.height, page.unit),
  };
}

/** Small deterministic generator: never reads prior randomized settings. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function integer(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** Creates a fresh free composition while preserving the visual identity fields. */
export function randomizeSettings(base: Settings, seed: number): Settings {
  if (!Number.isInteger(seed) || Math.abs(seed) > 2147483647)
    throw new Error("구성 seed는 -2,147,483,647~2,147,483,647 정수여야 합니다.");
  const errors = validateSettings(base);
  if (errors.length) throw new Error(errors.join(" "));
  const random = seeded(seed);
  const page = pageSize(base.page);
  const columns = integer(random, 1, Math.max(1, Math.min(12, Math.floor(page.width / 110))));
  const rows = integer(random, 1, Math.max(1, Math.min(12, Math.floor(page.height / 90))));
  // Keep enough room for real glyphs even on dense, small-page compositions.
  const horizontalBudget = Math.max(0, page.width - columns * 72);
  const verticalBudget = Math.max(0, page.height - rows * 56);
  const gutter = {
    x: Math.floor(random() * Math.min(32, horizontalBudget / Math.max(1, columns - 1) / 2)),
    y: Math.floor(random() * Math.min(32, verticalBudget / Math.max(1, rows - 1) / 2)),
  };
  const margin = {
    top: Math.floor(random() * Math.min(page.height * 0.12, verticalBudget / 3)),
    right: Math.floor(random() * Math.min(page.width * 0.12, horizontalBudget / 3)),
    bottom: Math.floor(random() * Math.min(page.height * 0.12, verticalBudget / 3)),
    left: Math.floor(random() * Math.min(page.width * 0.12, horizontalBudget / 3)),
  };
  const font = FONTS.find((item) => item.id === base.fontId)!;
  const fontSize = integer(random, 12, Math.min(48, Math.max(12, Math.floor(Math.min(page.width / columns, page.height / rows) * 0.32))));
  const lineHeight = Math.max(1, Math.min(160, Math.round(fontSize * (0.8 + random() * 0.9))));
  return {
    ...base,
    columns,
    rows,
    margin,
    gutter,
    fontWeight: font.weights[integer(random, 0, font.weights.length - 1)]!,
    fontSize,
    lineHeight,
    letterSpacing: Math.round((-1 + random() * 5) * 10) / 10,
    density: Math.round((0.35 + random() * 0.65) * 100) / 100,
    layout: "free",
    seed,
  };
}

function assertSeed(seed: number): void {
  if (!Number.isInteger(seed) || Math.abs(seed) > 2147483647)
    throw new Error("구성 seed는 -2,147,483,647~2,147,483,647 정수여야 합니다.");
}

/**
 * Generates an intentionally regular grid. It never creates hairline cells or
 * zero margins: the randomness is in a small, useful editorial range.
 */
export function randomizeGrid(base: Settings, seed: number): Settings {
  assertSeed(seed);
  if (validateSettings(base).length) throw new Error("현재 설정이 올바르지 않습니다.");
  if (base.workflow.gridLocked) return base;
  const random = seeded(seed);
  const page = pageSize(base.page);
  const landscape = page.width >= page.height;
  const maxColumns = Math.max(2, Math.min(10, Math.floor(page.width / 132)));
  const maxRows = Math.max(2, Math.min(10, Math.floor(page.height / 112)));
  const columns = integer(random, Math.min(3, maxColumns), maxColumns);
  const rows = integer(random, Math.min(3, maxRows), maxRows);
  const short = Math.min(page.width, page.height);
  const marginBase = Math.max(16, Math.min(short * (landscape ? 0.075 : 0.09), 112));
  const asymmetry = (random() - 0.5) * marginBase * 0.22;
  const margin = {
    top: Math.round(marginBase * (0.92 + random() * 0.22)),
    right: Math.round(marginBase + asymmetry),
    bottom: Math.round(marginBase * (0.92 + random() * 0.22)),
    left: Math.round(marginBase - asymmetry),
  };
  const gutterBase = Math.max(8, Math.min(32, short * 0.018));
  const gutter = {
    x: Math.round(gutterBase * (0.85 + random() * 0.35)),
    y: Math.round(gutterBase * (0.85 + random() * 0.35)),
  };
  // In the unusual event a tiny manually supplied artboard cannot support
  // these ideals, keep the generated geometry valid rather than overfitting.
  const usableW = page.width - margin.left - margin.right - (columns - 1) * gutter.x;
  const usableH = page.height - margin.top - margin.bottom - (rows - 1) * gutter.y;
  if (usableW <= 0 || usableH <= 0) return { ...base, workflow: { ...base.workflow, gridSeed: seed, mode: "empty", compositionLocked: false } };
  return {
    ...base,
    columns,
    rows,
    margin,
    gutter,
    workflow: { ...base.workflow, gridSeed: seed, mode: "empty", compositionLocked: false },
  };
}

/** Randomizes typography only after the user has chosen and locked a grid. */
export function randomizeTypography(
  base: Settings,
  seed: number,
  mode: "typography" | "typography-image",
): Settings {
  assertSeed(seed);
  if (validateSettings(base).length) throw new Error("현재 설정이 올바르지 않습니다.");
  if (!base.workflow.gridLocked || base.workflow.compositionLocked) return base;
  const random = seeded(seed);
  const page = pageSize(base.page);
  // Text size is a page decision, not a one-cell decision. Dense but valid
  // grids merge modules for a paragraph instead of shrinking body type.
  const compactWeb = base.page.mode === "web" && Math.min(page.width, page.height) < 600;
  const minSize = base.page.mode === "print" ? 12 : 14;
  const maxSize = base.page.mode === "print" ? 18 : compactWeb ? 18 : 22;
  const font = FONTS.find((item) => item.id === base.fontId)!;
  const usefulWeights = font.weights.filter((weight) => weight >= 300 && weight <= 700);
  const weights = usefulWeights.length ? usefulWeights : font.weights;
  // The editor is pt-only: sample quarter-points, then store equivalent CSS px.
  const fontSize = Math.round((minSize + random() * (maxSize - minSize)) * 0.75 * 4) / 4 / 0.75;
  return {
    ...base,
    fontWeight: weights[integer(random, 0, weights.length - 1)]!,
    fontSize,
    lineHeight: Math.round(fontSize * (1.42 + random() * 0.2) * 4) / 4,
    letterSpacing: Math.round((-0.15 + random() * 0.55) * 20) / 20,
    density: Math.round((0.58 + random() * 0.26) * 100) / 100,
    layout: "free",
    seed,
    workflow: { ...base.workflow, mode },
  };
}

export function validateSettings(value: unknown): string[] {
  if (!record(value)) return ["설정은 객체여야 합니다."];
  const s = value;
  const errors: string[] = [];
  const keys = [
    "schemaVersion",
    "page",
    "columns",
    "rows",
    "margin",
    "gutter",
    "fontId",
    "fontWeight",
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "gridColor",
    "gridOpacity",
    "textColor",
    "textOpacity",
    "layout",
    "density",
    "seed",
    "view",
    "baseline",
  ];
  for (const key of keys)
    if (!own(s, key)) errors.push(`필수 설정 '${key}'이 없습니다.`);
  if (s.schemaVersion !== 1) errors.push("지원하지 않는 설정 버전입니다.");
  if (!record(s.page)) errors.push("작업판 정보가 올바르지 않습니다.");
  else {
    const p = s.page;
    const pageKeys = [
      "presetId",
      "category",
      "mode",
      "unit",
      "width",
      "height",
      "orientation",
    ];
    if (
      pageKeys.some((key) => !own(p, key)) ||
      typeof p.presetId !== "string" ||
      typeof p.category !== "string" ||
      !["web", "print"].includes(p.mode as string) ||
      !["px", "mm", "in"].includes(p.unit as string) ||
      !["portrait", "landscape"].includes(p.orientation as string) ||
      !finite(p.width) ||
      !finite(p.height)
    )
      errors.push("작업판 메타데이터와 폭·높이를 확인하세요.");
    else {
      const page = pageSize(p as unknown as Settings["page"]);
      if (
        page.width <= 0 ||
        page.height <= 0 ||
        page.width > 16000 ||
        page.height > 16000
      )
        errors.push("작업판은 0보다 크고 16,000px 이하여야 합니다.");
    }
  }
  if (
    !finite(s.columns) ||
    !finite(s.rows) ||
    !Number.isInteger(s.columns) ||
    !Number.isInteger(s.rows) ||
    s.columns < 1 ||
    s.rows < 1 ||
    s.columns > 32 ||
    s.rows > 32 ||
    s.columns * s.rows > 1000
  )
    errors.push("열·행은 1~32 정수이고 전체 모듈은 1,000개 이하여야 합니다.");
  const group = (key: "margin" | "gutter", names: string[]) => {
    const g = s[key];
    if (
      !record(g) ||
      names.some(
        (name) => !own(g, name) || !finite(g[name]) || (g[name] as number) < 0,
      )
    )
      errors.push(
        `${key === "margin" ? "여백" : "간격"}의 모든 값은 0 이상의 유한수여야 합니다.`,
      );
  };
  group("margin", ["top", "right", "bottom", "left"]);
  group("gutter", ["x", "y"]);
  const font =
    typeof s.fontId === "string"
      ? FONTS.find((item) => item.id === s.fontId)
      : undefined;
  if (!font) errors.push("등록되지 않은 폰트입니다.");
  if (
    !finite(s.fontWeight) ||
    !Number.isInteger(s.fontWeight) ||
    !font?.weights.includes(s.fontWeight)
  )
    errors.push("선택한 폰트가 지원하는 글자 굵기를 선택하세요.");
  if (!finite(s.fontSize) || s.fontSize < 6 || s.fontSize > 120)
    errors.push("글자 크기는 4.5~90pt 범위여야 합니다.");
  if (!finite(s.lineHeight) || s.lineHeight < 1 || s.lineHeight > 160)
    errors.push("행간은 1~160px 범위여야 합니다.");
  if (!finite(s.letterSpacing) || s.letterSpacing < -2 || s.letterSpacing > 10)
    errors.push("자간은 -2~10px 범위여야 합니다.");
  if (
    typeof s.gridColor !== "string" ||
    typeof s.textColor !== "string" ||
    !hex.test(s.gridColor) ||
    !hex.test(s.textColor)
  )
    errors.push("색상은 #RRGGBB 형식이어야 합니다.");
  if (
    !finite(s.gridOpacity) ||
    !finite(s.textOpacity) ||
    s.gridOpacity < 0 ||
    s.gridOpacity > 1 ||
    s.textOpacity < 0 ||
    s.textOpacity > 1
  )
    errors.push("불투명도는 0에서 1 사이여야 합니다.");
  if (!["aligned", "asymmetric", "editorial", "free"].includes(s.layout as string))
    errors.push("알 수 없는 배치 방식입니다.");
  if (!finite(s.density) || s.density < 0.15 || s.density > 1)
    errors.push("문단 밀도는 15~100% 범위여야 합니다.");
  if (
    !finite(s.seed) ||
    !Number.isInteger(s.seed) ||
    Math.abs(s.seed) > 2147483647
  )
    errors.push("구성 seed는 안전한 정수여야 합니다.");
  if (own(s, "workflow")) {
    const workflow = s.workflow;
    if (
      !record(workflow) ||
      !finite(workflow.gridSeed) ||
      !Number.isInteger(workflow.gridSeed) ||
      Math.abs(workflow.gridSeed) > 2147483647 ||
      typeof workflow.gridLocked !== "boolean" ||
      typeof workflow.compositionLocked !== "boolean" ||
      !["legacy", "empty", "typography", "typography-image"].includes(workflow.mode as string) ||
      !Array.isArray(workflow.imageRatios) ||
      !workflow.imageRatios.length ||
      workflow.imageRatios.some((id) => !IMAGE_RATIOS.some((ratio) => ratio.id === id)) ||
      new Set(workflow.imageRatios).size !== workflow.imageRatios.length ||
      (workflow.compositionLocked && (!workflow.gridLocked || workflow.mode === "empty"))
    ) errors.push("단계별 생성 상태를 확인하세요.");
  }
  if (
    !["overlay", "grid", "text"].includes(s.view as string) ||
    typeof s.baseline !== "boolean"
  )
    errors.push("보기 모드 또는 베이스라인 값을 확인하세요.");
  if (
    !errors.length &&
    record(s.margin) &&
    record(s.gutter) &&
    record(s.page) &&
    finite(s.columns) &&
    finite(s.rows)
  ) {
    const page = pageSize(s.page as unknown as Settings["page"]);
    const margin = s.margin as Settings["margin"];
    const gutter = s.gutter as Settings["gutter"];
    const usableW =
      page.width - margin.left - margin.right - (s.columns - 1) * gutter.x;
    const usableH =
      page.height - margin.top - margin.bottom - (s.rows - 1) * gutter.y;
    if (usableW <= 0 || usableH <= 0)
      errors.push("여백과 간격 때문에 사용할 수 있는 작업 영역이 없습니다.");
  }
  return errors;
}
export function parseSettings(json: string): Settings {
  try {
    const raw: unknown = JSON.parse(json);
    const errors = validateSettings(raw);
    if (errors.length) throw new Error(errors.join(" "));
    const s = raw as Settings;
    return {
      schemaVersion: 1,
      page: {
        presetId: s.page.presetId,
        category: s.page.category,
        mode: s.page.mode,
        unit: s.page.unit,
        width: s.page.width,
        height: s.page.height,
        orientation: s.page.orientation,
      },
      columns: s.columns,
      rows: s.rows,
      margin: {
        top: s.margin.top,
        right: s.margin.right,
        bottom: s.margin.bottom,
        left: s.margin.left,
      },
      gutter: { x: s.gutter.x, y: s.gutter.y },
      fontId: s.fontId,
      fontWeight: s.fontWeight,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      gridColor: s.gridColor,
      gridOpacity: s.gridOpacity,
      textColor: s.textColor,
      textOpacity: s.textOpacity,
      layout: s.layout,
      density: s.density,
      seed: s.seed,
      view: s.view,
      baseline: s.baseline,
      workflow: "workflow" in s
        ? {
            gridSeed: (s.workflow as WorkflowSettings).gridSeed,
            gridLocked: (s.workflow as WorkflowSettings).gridLocked,
            compositionLocked: (s.workflow as WorkflowSettings).compositionLocked,
            mode: (s.workflow as WorkflowSettings).mode,
            imageRatios: [...(s.workflow as WorkflowSettings).imageRatios],
          }
        : { ...DEFAULT_WORKFLOW, imageRatios: [...DEFAULT_WORKFLOW.imageRatios] },
    };
  } catch (error) {
    throw new Error(
      `설정 JSON을 불러올 수 없습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    );
  }
}
type Span = {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  role: "heading" | "body";
};
type ImageSpan = Omit<Span, "role"> & { ratio: ImageRatioId };
type StagedPlan = { spans: Span[]; images: ImageSpan[]; warning?: string };
function stagedHeadingScale(s: Settings): number {
  return [1.75, 2, 2.25, 2.5][integer(seeded((s.seed ^ 0x1b873593) | 0), 0, 3)]!;
}
function stagedPlan(s: Settings, measure: MeasureText, sample: string): StagedPlan {
  if (s.workflow.mode === "empty") return { spans: [], images: [] };
  const c = s.columns;
  const r = s.rows;
  const random = seeded((s.seed ^ 0x51ed270b) | 0);
  const page = pageSize(s.page);
  const moduleWidth = (page.width - s.margin.left - s.margin.right - (c - 1) * s.gutter.x) / c;
  const moduleHeight = (page.height - s.margin.top - s.margin.bottom - (r - 1) * s.gutter.y) / r;
  type Rect = Omit<Span, "role">;
  const dimensions = (rect: Rect) => ({
    width: rect.colSpan * moduleWidth + (rect.colSpan - 1) * s.gutter.x,
    height: rect.rowSpan * moduleHeight + (rect.rowSpan - 1) * s.gutter.y,
  });
  const candidates = (minWidth: number, minHeight: number, maxArea: number, maxWidth = Infinity): Rect[] => {
    const result: Rect[] = [];
    for (let rowSpan = 1; rowSpan <= r; rowSpan++) for (let colSpan = 1; colSpan <= c; colSpan++) {
      if (rowSpan * colSpan > maxArea) continue;
      for (let row = 0; row <= r - rowSpan; row++) for (let col = 0; col <= c - colSpan; col++) {
        const rect = { col, row, colSpan, rowSpan };
        const size = dimensions(rect);
        if (size.width >= minWidth && size.width <= maxWidth && size.height >= minHeight) result.push(rect);
      }
    }
    return result;
  };
  const overlaps = (a: Rect, b: Rect) =>
    a.col < b.col + b.colSpan && a.col + a.colSpan > b.col && a.row < b.row + b.rowSpan && a.row + a.rowSpan > b.row;
  const area = c * r;
  const excerpt = sample.replace(/\s+/gu, " ").trim().slice(0, 600);
  const averageWidth = measure(excerpt, s.fontSize).width / Math.max(1, excerpt.length);
  const headingSize = Math.max(24, s.fontSize * stagedHeadingScale(s));
  const headingLeading = s.lineHeight * headingSize / s.fontSize;
  const headingGlyph = measure("ÄÖÜäöüßHgjpq", headingSize);
  const headingWidth = measure(excerpt, headingSize).width / Math.max(1, excerpt.length);
  const headingCandidates = candidates(
    headingWidth * 13,
    headingGlyph.ascent + headingGlyph.descent + headingLeading * (s.baseline ? 2 : 1),
    Math.max(1, Math.floor(area * 0.38)),
    Math.max(moduleWidth, headingWidth * 58),
  );
  // calculateLayout applies density after fitting lines, so reserve enough
  // physical height to still show three body lines at the selected density.
  const bodyGlyph = measure("ÄÖÜäöüßHgjpq", s.fontSize);
  const bodyCandidates = candidates(
    averageWidth * 27,
    bodyGlyph.ascent + bodyGlyph.descent + s.lineHeight * (Math.ceil(3 / s.density) - (s.baseline ? 0 : 1)),
    Math.max(1, area - (s.workflow.mode === "typography-image" ? 2 : 1)),
    // A manually chosen single wide column cannot be subdivided implicitly.
    Math.max(moduleWidth, averageWidth * 78),
  );
  const imageCandidates = candidates(64, 64, Math.max(1, Math.floor(area * 0.4)));
  const ratioId = s.workflow.imageRatios[integer(random, 0, s.workflow.imageRatios.length - 1)]!;
  const primaryRatio = IMAGE_RATIOS.find((ratio) => ratio.id === ratioId)!;
  const usableArea = (page.width - s.margin.left - s.margin.right) * (page.height - s.margin.top - s.margin.bottom);
  const prominentImages = imageCandidates.filter((rect) => {
    const size = dimensions(rect);
    const fit = Math.min(size.width / primaryRatio.width, size.height / primaryRatio.height);
    return primaryRatio.width * primaryRatio.height * fit * fit >= usableArea * 0.075;
  });
  if (!headingCandidates.length || !bodyCandidates.length)
    return { spans: [], images: [], warning: "현재 그리드는 읽기 가능한 제목과 3행 문단을 함께 담기에는 너무 작습니다." };
  // Candidate/retry placement makes results open-ended, but keeps every accepted
  // composition within readable physical dimensions. It never falls back to the
  // legacy free generator.
  for (let attempt = 0; attempt < 640; attempt++) {
    const headingRect = headingCandidates[integer(random, 0, headingCandidates.length - 1)]!;
    const possibleBodies = bodyCandidates.filter((rect) => !overlaps(rect, headingRect));
    if (!possibleBodies.length) continue;
    const bodyRect = possibleBodies[integer(random, 0, possibleBodies.length - 1)]!;
    const used: Rect[] = [headingRect, bodyRect];
    const images: ImageSpan[] = [];
    if (s.workflow.mode === "typography-image") {
      const primaryCandidates = attempt < 480 && prominentImages.length ? prominentImages : imageCandidates;
      const possibleImages = primaryCandidates.filter((rect) => used.every((item) => !overlaps(rect, item)));
      if (!possibleImages.length) continue;
      const primary = possibleImages[integer(random, 0, possibleImages.length - 1)]!;
      used.push(primary);
      images.push({ ...primary, ratio: ratioId });
      const wanted = integer(random, 1, 3);
      while (images.length < wanted) {
        const extras = imageCandidates.filter((rect) => used.every((item) => !overlaps(rect, item)));
        if (!extras.length) break;
        const extra = extras[integer(random, 0, extras.length - 1)]!;
        used.push(extra);
        images.push({ ...extra, ratio: s.workflow.imageRatios[integer(random, 0, s.workflow.imageRatios.length - 1)]! });
      }
    }
    const spans: Span[] = [
      { ...headingRect, role: "heading" },
      { ...bodyRect, role: "body" },
    ];
    // A second paragraph is optional and is only admitted when it is also a
    // complete, readable block; blank space remains a deliberate layout tool.
    if (random() > 0.56) {
      const extras = bodyCandidates.filter((rect) => used.every((item) => !overlaps(rect, item)));
      if (extras.length) {
        const extra = extras[integer(random, 0, extras.length - 1)]!;
        spans.push({ ...extra, role: "body" });
      }
    }
    return { spans, images };
  }
  return { spans: [], images: [], warning: "현재 그리드에서는 읽기 가능한 본문과 이미지 상자를 동시에 배치할 수 없습니다." };
}
function freeSpans(s: Settings): Span[] {
  const { columns: c, rows: r } = s;
  // Placement has its own stream so changing randomized dimensions cannot
  // correlate a title's start with the number of preceding parameter draws.
  const random = seeded((s.seed ^ 0x9e3779b9) | 0);
  const occupied = new Set<string>();
  const canPlace = (col: number, row: number, colSpan: number, rowSpan: number) => {
    if (col + colSpan > c || row + rowSpan > r) return false;
    for (let y = row; y < row + rowSpan; y++)
      for (let x = col; x < col + colSpan; x++)
        if (occupied.has(`${x}:${y}`)) return false;
    return true;
  };
  const place = (col: number, row: number, colSpan: number, rowSpan: number, role: Span["role"]) => {
    for (let y = row; y < row + rowSpan; y++)
      for (let x = col; x < col + colSpan; x++) occupied.add(`${x}:${y}`);
    return { col, row, colSpan, rowSpan, role };
  };
  // A title's start is sampled directly, rather than from a fixed template.
  const headingCol = integer(random, 0, c - 1);
  const headingRow = integer(random, 0, r - 1);
  let headingWidth = integer(random, 1, c - headingCol);
  let headingHeight = integer(random, 1, r - headingRow);
  if (c * r > 1 && headingWidth * headingHeight === c * r) {
    if (headingWidth > 1) headingWidth = 1;
    else headingHeight = 1;
  }
  const heading = place(headingCol, headingRow, headingWidth, headingHeight, "heading");
  const result: Span[] = [heading];
  const cells = Array.from({ length: c * r }, (_, index) => index);
  for (let index = cells.length - 1; index > 0; index--) {
    const other = integer(random, 0, index);
    [cells[index], cells[other]] = [cells[other]!, cells[index]!];
  }
  const target = Math.max(1, Math.floor(c * r * (0.35 + random() * 0.45)) - occupied.size);
  let bodyCells = 0;
  for (const cell of cells) {
    if (bodyCells >= target) break;
    const col = cell % c;
    const row = Math.floor(cell / c);
    if (occupied.has(`${col}:${row}`)) continue;
    let colSpan = integer(random, 1, c - col);
    let rowSpan = integer(random, 1, r - row);
    while (!canPlace(col, row, colSpan, rowSpan) && (colSpan > 1 || rowSpan > 1)) {
      if (colSpan > 1 && (rowSpan === 1 || random() < 0.5)) colSpan--;
      else rowSpan--;
    }
    if (!canPlace(col, row, colSpan, rowSpan)) continue;
    result.push(place(col, row, colSpan, rowSpan, "body"));
    bodyCells += colSpan * rowSpan;
  }
  // A one-cell title is the only unavoidable body-less grid.
  if (c * r > 1 && result.length === 1) {
    const cell = cells.find((item) => !occupied.has(`${item % c}:${Math.floor(item / c)}`));
    if (cell !== undefined) result.push(place(cell % c, Math.floor(cell / c), 1, 1, "body"));
  }
  return result;
}
function spansFor(s: Settings): Span[] {
  const { columns: c, rows: r } = s;
  if (s.layout === "free") return freeSpans(s);
  if (r === 1)
    return [{ col: 0, row: 0, colSpan: c, rowSpan: 1, role: "heading" }];
  if (c === 1)
    return [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1, role: "heading" },
      { col: 0, row: 1, colSpan: 1, rowSpan: r - 1, role: "body" },
    ];
  const variant = Math.abs(s.seed) % 3;
  if (s.layout === "aligned") {
    if (variant === 0 && c >= 4)
      return [
        { col: 0, row: 0, colSpan: c, rowSpan: 1, role: "heading" },
        ...Array.from({ length: c }, (_, col) => ({
          col,
          row: 1,
          colSpan: 1,
          rowSpan: r - 1,
          role: "body" as const,
        })),
      ];
    if (variant === 2)
      return [
        { col: 0, row: 0, colSpan: c - 1, rowSpan: 1, role: "heading" },
        { col: 0, row: 1, colSpan: c - 1, rowSpan: r - 1, role: "body" },
      ];
    const split = Math.max(1, Math.floor(c / 2));
    return [
      { col: 0, row: 0, colSpan: c, rowSpan: 1, role: "heading" },
      { col: 0, row: 1, colSpan: split, rowSpan: r - 1, role: "body" },
      { col: split, row: 1, colSpan: c - split, rowSpan: r - 1, role: "body" },
    ];
  }
  const h = variant === 0 ? 1 : Math.min(c - 1, 2);
  if (s.layout === "asymmetric") {
    if (variant === 2 && r >= 3)
      return [
        { col: 0, row: 0, colSpan: h, rowSpan: 1, role: "heading" },
        { col: h, row: 0, colSpan: c - h, rowSpan: 2, role: "body" },
        { col: 0, row: 1, colSpan: h, rowSpan: r - 1, role: "body" },
        { col: h, row: 2, colSpan: c - h, rowSpan: r - 2, role: "body" },
      ];
    return [
      { col: 0, row: 0, colSpan: h, rowSpan: 1, role: "heading" },
      { col: h, row: 0, colSpan: c - h, rowSpan: r, role: "body" },
      { col: 0, row: 1, colSpan: h, rowSpan: r - 1, role: "body" },
    ];
  }
  if (r === 2)
    return [
      {
        col: variant === 1 ? 1 : 0,
        row: 0,
        colSpan: c - 1,
        rowSpan: 1,
        role: "heading",
      },
      {
        col: variant === 1 ? 0 : c - 1,
        row: 0,
        colSpan: 1,
        rowSpan: 1,
        role: "body",
      },
      { col: 0, row: 1, colSpan: c, rowSpan: 1, role: "body" },
    ];
  if (variant === 1)
    return [
      { col: c - h, row: 0, colSpan: h, rowSpan: 2, role: "heading" },
      { col: 0, row: 0, colSpan: c - h, rowSpan: 2, role: "body" },
      { col: 0, row: 2, colSpan: c, rowSpan: r - 2, role: "body" },
    ];
  return [
    { col: 0, row: 0, colSpan: h, rowSpan: 2, role: "heading" },
    { col: h, row: 0, colSpan: c - h, rowSpan: 2, role: "body" },
    { col: 0, row: 2, colSpan: c, rowSpan: r - 2, role: "body" },
  ];
}
function safeSpans(spans: Span[], c: number, r: number): void {
  const used = new Set<string>();
  for (const span of spans)
    for (let y = span.row; y < span.row + span.rowSpan; y++)
      for (let x = span.col; x < span.col + span.colSpan; x++) {
        if (x < 0 || y < 0 || x >= c || y >= r || used.has(`${x}:${y}`))
          throw new Error("안전하지 않은 모듈 배치가 감지되었습니다.");
        used.add(`${x}:${y}`);
      }
}
type Flow = { word: number; offset: number };
function words(sample: string): string[] {
  const result = sample.match(/\S+/gu) ?? [];
  if (!result.length)
    throw new Error("샘플 원문이 비어 있어 문단을 배치할 수 없습니다.");
  return result;
}
function wrap(
  source: string[],
  input: Flow,
  width: number,
  maxLines: number,
  size: number,
  measure: MeasureText,
  wholeWords = false,
): { lines: string[]; text: string; flow: Flow } {
  let flow = { ...input };
  let line = "";
  let startsMidWord = false;
  let steps = 0;
  let text = "";
  const lines: string[] = [];
  const addLine = (value: string, continuation: boolean) => {
    lines.push(value);
    text += `${text && !continuation ? " " : ""}${value}`;
  };
  const fits = (value: string) => measure(value, size).width <= width;
  while (lines.length < maxLines && steps++ < 100000) {
    const word = source[flow.word % source.length]!.slice(flow.offset);
    if (!word) {
      flow = { word: (flow.word + 1) % source.length, offset: 0 };
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      if (!line) startsMidWord = flow.offset > 0;
      line = candidate;
      flow = { word: (flow.word + 1) % source.length, offset: 0 };
      continue;
    }
    if (line) {
      addLine(line, startsMidWord);
      line = "";
      startsMidWord = false;
      continue;
    }
    // Keep a generated heading's last word intact. A long word can continue
    // in the body instead of being torn between two separate text blocks.
    if (wholeWords && lines.length > 0 && flow.offset === 0) break;
    let chars = 0;
    for (const char of word) {
      if (!fits(word.slice(0, chars + char.length))) break;
      chars += char.length;
    }
    if (!chars) return { lines, text, flow };
    addLine(word.slice(0, chars), flow.offset > 0);
    flow =
      chars === word.length
        ? { word: (flow.word + 1) % source.length, offset: 0 }
        : { word: flow.word, offset: flow.offset + chars };
  }
  if (line && lines.length < maxLines) addLine(line, startsMidWord);
  return { lines, text, flow };
}
export function calculateLayout(
  settings: Settings,
  sample: string,
  measure: MeasureText,
): LayoutResult {
  const errors = validateSettings(settings);
  if (errors.length) throw new Error(errors.join(" "));
  const { width, height } = pageSize(settings.page);
  const usableW =
    width -
    settings.margin.left -
    settings.margin.right -
    (settings.columns - 1) * settings.gutter.x;
  const usableH =
    height -
    settings.margin.top -
    settings.margin.bottom -
    (settings.rows - 1) * settings.gutter.y;
  const moduleWidth = usableW / settings.columns;
  const moduleHeight = usableH / settings.rows;
  if (settings.workflow.mode === "empty")
    return { width, height, moduleWidth, moduleHeight, blocks: [], images: [], warnings: [] };
  const plan = settings.workflow.mode === "legacy"
    ? { spans: spansFor(settings), images: [] as ImageSpan[] }
    : stagedPlan(settings, measure, sample);
  const spans = plan.spans;
  safeSpans([...spans, ...plan.images.map((image) => ({ ...image, role: "body" as const }))], settings.columns, settings.rows);
  const source = words(sample);
  const glyph = measure("ÄÖÜäöüßHgjpq", settings.fontSize);
  let flow: Flow = { word: 0, offset: 0 };
  const warnings: string[] = plan.warning ? [plan.warning] : [];
  if (settings.lineHeight < glyph.ascent + glyph.descent)
    warnings.push("행간이 실제 글리프 높이보다 작아 줄이 겹칠 수 있습니다.");
  const blocks: TextBlock[] = [];
  let remainingLineBudget = 10000;
  let reportedLineBudget = false;
  for (const [index, span] of spans.entries()) {
    const x =
      settings.margin.left + span.col * (moduleWidth + settings.gutter.x);
    const y =
      settings.margin.top + span.row * (moduleHeight + settings.gutter.y);
    const blockWidth =
      span.colSpan * moduleWidth + (span.colSpan - 1) * settings.gutter.x;
    const blockHeight =
      span.rowSpan * moduleHeight + (span.rowSpan - 1) * settings.gutter.y;
    const factor = span.role === "heading"
      ? settings.workflow.mode === "legacy" ? sFactor(settings.layout) : stagedHeadingScale(settings)
      : 1;
    const fontSize = Math.min(
      2000,
      Math.max(
        settings.fontSize * factor,
        span.role === "heading" ? 24 : settings.fontSize,
      ),
    );
    const lineHeight = span.role === "heading"
      ? settings.lineHeight * (settings.workflow.mode === "legacy" ? factor : fontSize / settings.fontSize)
      : settings.lineHeight;
    const metric = measure("ÄÖÜäöüßHgjpq", fontSize);
    if (lineHeight < metric.ascent + metric.descent) {
      warnings.push(
        `${index + 1}번 영역의 행간이 실제 글리프 높이보다 작습니다.`,
      );
    }
    const first = settings.baseline
      ? settings.margin.top +
        Math.ceil((y - settings.margin.top + metric.ascent) / lineHeight) *
          lineHeight
      : y + metric.ascent;
    const available =
      Math.floor((y + blockHeight - first - metric.descent) / lineHeight) + 1;
    if (available < 1 || blockWidth < measure("W", fontSize).width) {
      warnings.push(
        `${index + 1}번 영역은 온전한 글리프를 담기에는 너무 작습니다.`,
      );
      continue;
    }
    const requestedLines = span.role === "heading"
      ? Math.min(3, available)
      : Math.max(1, Math.floor(available * settings.density));
    const maxLines = Math.min(requestedLines, remainingLineBudget);
    if (requestedLines > remainingLineBudget && !reportedLineBudget) {
      warnings.push("전체 텍스트 행 수를 성능 보호를 위해 10,000행으로 제한했습니다.");
      reportedLineBudget = true;
    }
    if (maxLines < 1) continue;
    const result = wrap(
      source,
      flow,
      blockWidth,
      maxLines,
      fontSize,
      measure,
      span.role === "heading" && settings.workflow.mode !== "legacy",
    );
    if (!result.lines.length) {
      warnings.push(
        `${index + 1}번 영역은 한 글리프도 온전히 담을 수 없습니다.`,
      );
      continue;
    }
    remainingLineBudget -= result.lines.length;
    flow = result.flow;
    const lines: TextLine[] = result.lines.map((text, line) => ({
      text,
      x,
      y: first + line * lineHeight,
    }));
    blocks.push({
      id: `${span.role}-${index}`,
      role: span.role,
      col: span.col,
      row: span.row,
      colSpan: span.colSpan,
      rowSpan: span.rowSpan,
      x,
      y,
      width: blockWidth,
      height: blockHeight,
      fontSize,
      lineHeight,
      text: result.text,
      lines,
    });
  }
  const images: ImageBlock[] = plan.images.map((span, index) => {
    const reservedX = settings.margin.left + span.col * (moduleWidth + settings.gutter.x);
    const reservedY = settings.margin.top + span.row * (moduleHeight + settings.gutter.y);
    const reservedWidth = span.colSpan * moduleWidth + (span.colSpan - 1) * settings.gutter.x;
    const reservedHeight = span.rowSpan * moduleHeight + (span.rowSpan - 1) * settings.gutter.y;
    const ratio = IMAGE_RATIOS.find((item) => item.id === span.ratio)!;
    const scale = Math.min(reservedWidth / ratio.width, reservedHeight / ratio.height);
    const imageWidth = ratio.width * scale;
    const imageHeight = ratio.height * scale;
    // Align to an edge instead of arbitrarily floating inside the grid cell.
    const edge = integer(seeded((settings.seed ^ (index + 1) * 0x45d9f3b) | 0), 0, 3);
    const x = edge === 1 || edge === 3 ? reservedX + reservedWidth - imageWidth : reservedX;
    const y = edge === 2 || edge === 3 ? reservedY + reservedHeight - imageHeight : reservedY;
    return { id: `image-${index}`, role: "image", ...span, x, y, width: imageWidth, height: imageHeight };
  });
  if (!blocks.length && !images.length)
    warnings.push("현재 설정으로는 온전한 텍스트 행을 배치할 수 없습니다.");
  return { width, height, moduleWidth, moduleHeight, blocks, images, warnings };
}
function sFactor(layout: Settings["layout"]): number {
  return layout === "editorial" ? 4 : layout === "aligned" ? 3 : layout === "free" ? 1.5 : 2.5;
}
