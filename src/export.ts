import { strToU8, zipSync } from "fflate";
import type {
  FontDefinition,
  LayoutResult,
  Settings,
  TextBlock,
} from "./model";
import { fontFaceCss, fontStack, getFont, nearestWeight } from "./fonts";

const xml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&apos;",
        '"': "&quot;",
      })[c] as string,
  );
const n = (value: number) => Number(value.toFixed(3));
const archivePath = (path: string) =>
  path.replace(/^\/+/, "").startsWith("fonts/")
    ? path.replace(/^\/+/, "")
    : `fonts/${path.replace(/^\/+/, "")}`;
const relativePath = (path: string) => `./${archivePath(path)}`;

export function serializeSettings(settings: Settings): string {
  return JSON.stringify(settings, null, 2);
}

function svgGrid(settings: Settings, layout: LayoutResult): string {
  const cells = Array.from({ length: settings.rows }, (_, row) =>
    Array.from({ length: settings.columns }, (_, col) => {
      const x =
        settings.margin.left + col * (layout.moduleWidth + settings.gutter.x);
      const y =
        settings.margin.top + row * (layout.moduleHeight + settings.gutter.y);
      return `<rect x="${n(x)}" y="${n(y)}" width="${n(layout.moduleWidth)}" height="${n(layout.moduleHeight)}"/>`;
    }).join(""),
  ).join("");
  return `${cells}<rect class="grid-boundary" fill="none" x="${settings.margin.left}" y="${settings.margin.top}" width="${n(layout.width - settings.margin.left - settings.margin.right)}" height="${n(layout.height - settings.margin.top - settings.margin.bottom)}"/>`;
}

export function exportSvg(
  settings: Settings,
  layout: LayoutResult,
  font: FontDefinition,
): string {
  const physical =
    settings.page.unit === "px"
      ? `width="${layout.width}px" height="${layout.height}px"`
      : `width="${settings.page.width}${settings.page.unit}" height="${settings.page.height}${settings.page.unit}"`;
  const guides =
    settings.view === "text"
      ? ""
      : `<g class="grid" fill="${settings.gridColor}" fill-opacity="${settings.gridOpacity}" stroke="${settings.gridColor}" stroke-opacity="${settings.gridOpacity}" stroke-width=".5">${svgGrid(settings, layout)}</g>`;
  const baseline =
    settings.baseline && settings.view !== "text"
      ? `<g class="baseline" fill="none" stroke="${settings.gridColor}" stroke-opacity="${settings.gridOpacity}" stroke-width=".5">${layout.blocks.flatMap((block) => block.lines.map((line) => `<line x1="${n(block.x)}" y1="${n(line.y)}" x2="${n(block.x + block.width)}" y2="${n(line.y)}"/>`)).join("")}</g>`
      : "";
  const text =
    settings.view === "grid"
      ? ""
      : layout.blocks
          .map(
            (block) =>
              `<text font-family="${xml(fontStack(font))}" font-weight="${settings.fontWeight}" font-size="${block.fontSize}" letter-spacing="${settings.letterSpacing}" fill="${settings.textColor}" fill-opacity="${settings.textOpacity}">${block.lines.map((line) => `<tspan x="${n(line.x)}" y="${n(line.y)}">${xml(line.text)}</tspan>`).join("")}</text>`,
          )
          .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Editable SVG text depends on ${font.name} being installed or available in the importing app. -->\n<svg xmlns="http://www.w3.org/2000/svg" ${physical} viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="Grid System layout"><rect width="${layout.width}" height="${layout.height}" fill="#fff"/>${guides}${baseline}${text}</svg>`;
}

function lines(block: TextBlock): string {
  return block.lines
    .map(
      (line) =>
        `<span class="line" style="--line-x:${n(line.x - block.x)}px;--line-y:${n(line.y - block.y)}px">${xml(line.text)}</span>`,
    )
    .join("");
}

function flowText(block: TextBlock): string {
  const value =
    (block as TextBlock & { text?: string }).text ??
    block.lines.map((line) => line.text).join(" ");
  return `<span class="flow-text">${xml(value)}</span>`;
}

function guideCells(settings: Settings): string {
  return Array.from({ length: settings.rows }, (_, row) =>
    Array.from(
      { length: settings.columns },
      (_, col) =>
        `<i class="guide-cell" style="grid-column:${col + 1};grid-row:${row + 1}"></i>`,
    ).join(""),
  ).join("");
}

function html(settings: Settings, layout: LayoutResult): string {
  const blocks =
    settings.view === "grid"
      ? ""
      : layout.blocks
          .map(
            (block) =>
              `<${block.role === "heading" ? "h1" : "p"} class="block ${block.role}" style="--col:${block.col + 1};--row:${block.row + 1};--col-span:${block.colSpan};--row-span:${block.rowSpan};--font-size:${block.fontSize}px;--line-height:${block.lineHeight}px">${lines(block)}${flowText(block)}</${block.role === "heading" ? "h1" : "p"}>`,
          )
          .join("\n");
  const baselines =
    settings.baseline && settings.view !== "text"
      ? `<div class="baselines" aria-hidden="true">${layout.blocks.flatMap((block) => block.lines.map((line) => `<i class="baseline" style="--baseline-x:${n(line.x)}px;--baseline-y:${n(line.y)}px;--baseline-width:${n(block.width)}px"></i>`)).join("")}</div>`
      : "";
  return `<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grid System export</title><link rel="stylesheet" href="styles.css"></head><body><main class="page">${settings.view === "text" ? "" : `<div class="guides" aria-hidden="true">${guideCells(settings)}<i class="guide-boundary"></i></div>`}${baselines}<article class="content">${blocks}</article></main></body></html>`;
}

function css(
  settings: Settings,
  layout: LayoutResult,
  font: FontDefinition,
  faces: string,
): string {
  const width =
    settings.page.unit === "px"
      ? `${layout.width}px`
      : `${settings.page.width}${settings.page.unit}`;
  const height =
    settings.page.unit === "px"
      ? `${layout.height}px`
      : `${settings.page.height}${settings.page.unit}`;
  return `${faces}
@page { size: ${width} ${height}; margin: 0; }
* { box-sizing: border-box; } body { margin: 0; background:#eceef0; color:${settings.textColor}; font-family:${fontStack(font)}; font-synthesis:none; }
.page { width:${width}; height:${height}; margin:0 auto; overflow:hidden; position:relative; background:#fff; padding:${settings.margin.top}px ${settings.margin.right}px ${settings.margin.bottom}px ${settings.margin.left}px; }
.content { height:${Math.max(0, layout.height - settings.margin.top - settings.margin.bottom)}px; position:relative; z-index:1; display:grid; grid-template-columns:repeat(${settings.columns},minmax(0,1fr)); grid-template-rows:repeat(${settings.rows},minmax(0,1fr)); gap:${settings.gutter.y}px ${settings.gutter.x}px; }
.block { grid-column:var(--col) / span var(--col-span); grid-row:var(--row) / span var(--row-span); min-width:0; margin:0; position:relative; font-size:var(--font-size); line-height:var(--line-height); letter-spacing:${settings.letterSpacing}px; font-weight:${settings.fontWeight}; color:${settings.textColor}; opacity:${settings.textOpacity}; }.heading { font-weight:${settings.fontWeight}; }
.line { position:absolute; left:var(--line-x); top:var(--line-y); display:block; width:max-content; height:0; white-space:pre; line-height:0; }.line::before { content:""; display:inline-block; width:0; height:0; vertical-align:baseline; }.flow-text { display:none; }
.guides { position:absolute; inset:${settings.margin.top}px ${settings.margin.right}px ${settings.margin.bottom}px ${settings.margin.left}px; z-index:0; pointer-events:none; display:grid; grid-template-columns:repeat(${settings.columns},minmax(0,1fr)); grid-template-rows:repeat(${settings.rows},minmax(0,1fr)); gap:${settings.gutter.y}px ${settings.gutter.x}px; opacity:${settings.gridOpacity}; }.guide-cell { background:${settings.gridColor}; border:.5px solid ${settings.gridColor}; }.guide-boundary { grid-area:1 / 1 / -1 / -1; border:.5px solid ${settings.gridColor}; pointer-events:none; }
.baselines { position:absolute; inset:0; z-index:2; pointer-events:none; opacity:${settings.gridOpacity}; }.baseline { position:absolute; left:var(--baseline-x); top:var(--baseline-y); width:var(--baseline-width); border-top:.5px solid ${settings.gridColor}; }
@media screen and (max-width:700px) { .page { width:100%; height:auto; min-height:100vh; overflow:visible; padding:24px; }.content { display:block; height:auto; }.block { margin:0 0 1.5rem; overflow-wrap:anywhere; }.line { display:none; }.flow-text { display:inline; overflow-wrap:anywhere; }.guides,.baselines { display:none; } }
@media print { html,body { width:${width}; height:${height}; background:#fff; }.page { width:${width}; height:${height}; margin:0; }.content { display:grid; height:${Math.max(0, layout.height - settings.margin.top - settings.margin.bottom)}px; }.line { position:absolute; display:block; width:max-content; height:0; white-space:pre; line-height:0; }.flow-text { display:none; }.guides,.baselines { display:grid; } .baselines { display:block; } }
`;
}

async function text(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`자산을 가져오지 못했습니다: ${path}`);
  return response.text();
}
async function binary(path: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`폰트 파일을 가져오지 못했습니다: ${path}`);
  return new Uint8Array(await response.arrayBuffer());
}
function hasWeight(value: string, selected: number): boolean {
  const values = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return values.length === 1
    ? values[0] === selected
    : values.length > 1 && selected >= values[0]! && selected <= values[1]!;
}
function facesForWeight(source: string, selected: number): string {
  return source.replace(/@font-face\s*\{[^}]*\}/g, (face) =>
    hasWeight(/font-weight\s*:\s*([^;]+);/i.exec(face)?.[1] ?? "", selected)
      ? face
      : "",
  );
}
function urls(source: string, cssPath: string): string[] {
  const found = [...source.matchAll(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi)]
    .map((match) => match[2]!.trim())
    .filter((url) => !/^(data:|https?:)/i.test(url))
    .map((url) =>
      url.startsWith("/")
        ? url
        : `${cssPath.slice(0, cssPath.lastIndexOf("/") + 1)}${url}`,
    );
  return [...new Set(found)];
}
function rewriteUrls(source: string, cssPath: string): string {
  return source.replace(
    /url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi,
    (_all, _quote, value: string) =>
      /^(data:|https?:)/i.test(value)
        ? `url(${JSON.stringify(value)})`
        : `url(${JSON.stringify(relativePath(value.startsWith("/") ? value : `${cssPath.slice(0, cssPath.lastIndexOf("/") + 1)}${value}`))})`,
  );
}

type Collected = {
  files: Record<string, Uint8Array>;
  css: string;
  notices: string[];
};
async function collect(
  font: FontDefinition,
  weight: number,
): Promise<Collected> {
  const files: Record<string, Uint8Array> = {};
  const style: string[] = [];
  for (const asset of font.assets)
    if (asset.path.endsWith(".css")) {
      const selected = facesForWeight(await text(asset.path), weight);
      style.push(rewriteUrls(selected, asset.path));
      for (const url of urls(selected, asset.path))
        files[archivePath(url)] = await binary(url);
    } else if (hasWeight(asset.weight, weight)) {
      files[archivePath(asset.path)] = await binary(asset.path);
      style.push(fontFaceCss({ ...font, assets: [asset] }, weight, true));
    }
  return {
    files,
    css: style.join("\n"),
    notices: await Promise.all(
      font.notices.map(
        async (notice) => `--- ${notice} ---\n${await text(notice)}`,
      ),
    ),
  };
}

/** Creates an offline HTML/CSS package with selected font assets and source notices. */
export async function exportHtmlPackage(
  settings: Settings,
  layout: LayoutResult,
  font: FontDefinition,
): Promise<Blob> {
  const selected = await collect(
    font,
    nearestWeight(font, settings.fontWeight),
  );
  const inter =
    font.category === "한국어" && font.id !== "inter"
      ? await collect(getFont("inter"), 400)
      : undefined;
  const archive = zipSync(
    {
      "index.html": strToU8(html(settings, layout)),
      "styles.css": strToU8(
        css(
          settings,
          layout,
          font,
          [selected.css, inter?.css].filter(Boolean).join("\n"),
        ),
      ),
      "settings.json": strToU8(serializeSettings(settings)),
      "FONT-NOTICES.txt": strToU8(
        [...selected.notices, ...(inter?.notices ?? [])].join("\n\n"),
      ),
      ...selected.files,
      ...(inter?.files ?? {}),
    },
    { level: 6 },
  );
  return new Blob([archive], { type: "application/zip" });
}
