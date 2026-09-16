import { FONTS } from "./fonts";
import type {
  LayoutResult,
  MeasureText,
  Settings,
  TextBlock,
  TextLine,
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
    errors.push("글자 크기는 6~120px 범위여야 합니다.");
  if (!finite(s.lineHeight) || s.lineHeight < 8 || s.lineHeight > 160)
    errors.push("행간은 8~160px 범위여야 합니다.");
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
  if (!["aligned", "asymmetric", "editorial"].includes(s.layout as string))
    errors.push("알 수 없는 배치 방식입니다.");
  if (!finite(s.density) || s.density < 0.15 || s.density > 1)
    errors.push("문단 밀도는 15~100% 범위여야 합니다.");
  if (
    !finite(s.seed) ||
    !Number.isInteger(s.seed) ||
    Math.abs(s.seed) > 2147483647
  )
    errors.push("구성 seed는 안전한 정수여야 합니다.");
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
function spansFor(s: Settings): Span[] {
  const { columns: c, rows: r } = s;
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
  const spans = spansFor(settings);
  safeSpans(spans, settings.columns, settings.rows);
  const source = words(sample);
  const glyph = measure("ÄÖÜäöüßHgjpq", settings.fontSize);
  if (settings.lineHeight < glyph.ascent + glyph.descent)
    return {
      width,
      height,
      moduleWidth,
      moduleHeight,
      blocks: [],
      warnings: [
        "행간이 실제 글리프 높이보다 작아 겹침을 방지하기 위해 텍스트 배치를 중단했습니다.",
      ],
    };
  let flow: Flow = { word: 0, offset: 0 };
  const warnings: string[] = [];
  const blocks: TextBlock[] = [];
  for (const [index, span] of spans.entries()) {
    const x =
      settings.margin.left + span.col * (moduleWidth + settings.gutter.x);
    const y =
      settings.margin.top + span.row * (moduleHeight + settings.gutter.y);
    const blockWidth =
      span.colSpan * moduleWidth + (span.colSpan - 1) * settings.gutter.x;
    const blockHeight =
      span.rowSpan * moduleHeight + (span.rowSpan - 1) * settings.gutter.y;
    const factor = span.role === "heading" ? sFactor(settings.layout) : 1;
    const fontSize = Math.min(
      2000,
      Math.max(
        settings.fontSize * factor,
        span.role === "heading" ? 24 : settings.fontSize,
      ),
    );
    const lineHeight =
      span.role === "heading"
        ? Math.max(settings.lineHeight * factor, fontSize * 1.1)
        : settings.lineHeight;
    const metric = measure("ÄÖÜäöüßHgjpq", fontSize);
    if (lineHeight < metric.ascent + metric.descent) {
      warnings.push(
        `${index + 1}번 영역의 행간이 실제 글리프 높이보다 작습니다.`,
      );
      continue;
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
    const result = wrap(
      source,
      flow,
      blockWidth,
      span.role === "heading"
        ? Math.min(3, available)
        : Math.max(1, Math.floor(available * settings.density)),
      fontSize,
      measure,
    );
    if (!result.lines.length) {
      warnings.push(
        `${index + 1}번 영역은 한 글리프도 온전히 담을 수 없습니다.`,
      );
      continue;
    }
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
  if (!blocks.length)
    warnings.push("현재 설정으로는 온전한 텍스트 행을 배치할 수 없습니다.");
  return { width, height, moduleWidth, moduleHeight, blocks, warnings };
}
function sFactor(layout: Settings["layout"]): number {
  return layout === "editorial" ? 4 : layout === "aligned" ? 3 : 2.5;
}
