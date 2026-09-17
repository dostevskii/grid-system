import { strFromU8, unzipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateLayout, DEFAULT_SETTINGS } from "./core";
import { exportHtmlPackage, exportSvg } from "./export";
import { getFont } from "./fonts";
import type { LayoutResult } from "./model";

const settings = {
  ...DEFAULT_SETTINGS,
  columns: 2,
  rows: 2,
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  gutter: { x: 10, y: 10 },
  baseline: true,
};
const layout = calculateLayout(
  settings,
  "Internationale Typographie schafft Ordnung und Rhythmus.",
  (value, size) => ({
    width: value.length * size * 0.45,
    ascent: size * 0.8,
    descent: size * 0.2,
  }),
);

const withPlaceholders = (base: LayoutResult): LayoutResult =>
  ({
    ...base,
    images: [
      {
        id: "image-16-9",
        role: "image",
        col: 0,
        row: 0,
        colSpan: 2,
        rowSpan: 1,
        x: 44,
        y: 32,
        width: 160,
        height: 90,
        ratio: "16:9",
      },
      {
        id: "image-1-1",
        role: "image",
        col: 0,
        row: 1,
        colSpan: 1,
        rowSpan: 1,
        x: 34,
        y: 180,
        width: 80,
        height: 80,
        ratio: "1:1",
      },
    ],
  }) as LayoutResult;

describe("SVG export", () => {
  it("writes a white page, filled module cells, an exact outer boundary, and baselines in grid view", () => {
    const svg = exportSvg(
      { ...settings, view: "grid" },
      layout,
      getFont("inter"),
    );
    expect(svg).toContain('<rect width="1440" height="1024" fill="#fff"/>');
    expect((svg.match(/<rect x=/g) ?? []).length).toBe(4);
    expect(svg).toContain('fill-opacity="0.14"');
    expect(svg).toContain('stroke-width=".5"');
    expect(svg).toContain('class="grid-boundary" fill="none"');
    expect(svg).toContain('class="baseline"');
    expect(svg).not.toContain("<text ");
  });

  it("exports neutral ratio-correct placeholder boxes instead of photographs", () => {
    const svg = exportSvg(settings, withPlaceholders(layout), getFont("inter"));
    expect(svg).toContain('data-image-block="image-16-9"');
    expect(svg).toContain('data-image-ratio="16:9"');
    expect(svg).toContain('aria-label="Image placeholder, 16:9"');
    expect(svg).toContain('x="44" y="32" width="160" height="90"');
    expect(svg).toContain('fill="#E4E6E8" stroke="#A1A6AB"');
    expect(svg).toContain(">16:9</text>");
    expect(svg).not.toMatch(/<image(?:\s|>)/);
  });

  it("omits placeholders only in grid-only view", () => {
    const result = withPlaceholders(layout);
    expect(exportSvg({ ...settings, view: "overlay" }, result, getFont("inter"))).toContain(
      'data-image-block="image-1-1"',
    );
    expect(exportSvg({ ...settings, view: "text" }, result, getFont("inter"))).toContain(
      'data-image-block="image-1-1"',
    );
    expect(exportSvg({ ...settings, view: "grid" }, result, getFont("inter"))).not.toContain(
      "data-image-block=",
    );
  });
});

describe("offline HTML package", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves intentionally overlapping 1px leading in SVG and HTML", async () => {
    const dense = {
      ...settings,
      page: { ...settings.page, width: 320, height: 320 },
      lineHeight: 1,
      density: 0.25,
    };
    const result = calculateLayout(dense, "Typography and rhythm", (value, size) => ({
      width: value.length * size * 0.45,
      ascent: size * 0.8,
      descent: size * 0.2,
    }));
    const body = result.blocks.find((block) => block.role === "body")!;
    expect(body.lines.length).toBeGreaterThan(2);
    expect(body.lines[1]!.y - body.lines[0]!.y).toBe(1);
    expect(body.lineHeight).toBeLessThan(body.fontSize);
    vi.stubGlobal("fetch", vi.fn(async (path: string) => {
      if (path.endsWith(".css"))
        return new Response("@font-face { font-family: 'Inter'; font-weight: 100 900; src: url(/fonts/google/inter/inter-0.woff2); }");
      return new Response(path.endsWith(".woff2") ? new Uint8Array([1, 2, 3]) : "SIL Open Font License 1.1");
    }));
    const svg = exportSvg(dense, result, getFont("inter"));
    const zip = unzipSync(new Uint8Array(await (await exportHtmlPackage(dense, result, getFont("inter"))).arrayBuffer()));
    const html = strFromU8(zip["index.html"]!);
    const css = strFromU8(zip["styles.css"]!);
    for (const line of body.lines.slice(0, 3)) {
      expect(svg).toContain(`y="${Number(line.y.toFixed(3))}"`);
      expect(html).toContain(`--line-y:${Number((line.y - body.y).toFixed(3))}px`);
    }
    expect(html).toContain("--line-height:1px");
    expect(css).toContain("line-height:var(--line-height)");
    expect(JSON.parse(strFromU8(zip["settings.json"]!)).lineHeight).toBe(1);
  });

  it("copies CSS-referenced WOFF2 files at their preserved paths and writes real notices", async () => {
    const css =
      "@font-face { font-family: 'Inter'; font-weight: 100 900; src: url(/fonts/google/inter/inter-0.woff2) format('woff2'); }";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string) => {
        if (path.endsWith(".css")) return new Response(css);
        if (path.endsWith(".woff2"))
          return new Response(new Uint8Array([1, 2, 3]));
        if (path.includes("font-notices"))
          return new Response("SIL Open Font License 1.1");
        return new Response("missing", { status: 404 });
      }),
    );
    const blob = await exportHtmlPackage(settings, layout, getFont("inter"));
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const styles = strFromU8(files["styles.css"]!);
    expect(files["fonts/google/inter/inter-0.woff2"]).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(styles).toContain('url("./fonts/google/inter/inter-0.woff2")');
    expect(strFromU8(files["FONT-NOTICES.txt"]!)).toContain(
      "SIL Open Font License 1.1",
    );
    expect(strFromU8(files["index.html"]!)).toContain('class="line"');
    expect(styles).toContain(".heading { font-weight:400; }");
    expect(styles).toContain(
      ".guide-cell { background:#E84535; border:.5px solid #E84535; }",
    );
    expect(styles).toContain("@media screen and (max-width:700px)");
    expect(styles).toContain("height:0; white-space:pre; line-height:0;");
  });

  it("keeps placeholder geometry offline without fetching image assets", async () => {
    const fetch = vi.fn(async (path: string) => {
      if (path.endsWith(".css"))
        return new Response("@font-face { font-family: 'Inter'; font-weight: 100 900; src: url(/fonts/google/inter/inter-0.woff2); }");
      if (path.endsWith(".woff2")) return new Response(new Uint8Array([1]));
      return new Response("SIL Open Font License 1.1");
    });
    vi.stubGlobal("fetch", fetch);
    const blob = await exportHtmlPackage(
      settings,
      withPlaceholders(layout),
      getFont("inter"),
    );
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const html = strFromU8(files["index.html"]!);
    const styles = strFromU8(files["styles.css"]!);
    expect(html).toContain('<figure class="image-block" data-image-block="image-16-9" data-image-ratio="16:9"');
    expect(html).toContain("--image-x:24px;--image-y:12px;--image-width:160px;--image-height:90px;--image-aspect:16 / 9");
    expect(html).toContain("<figcaption>16:9</figcaption>");
    expect(styles).toContain("width:var(--image-width); height:var(--image-height)");
    expect(styles).toContain("aspect-ratio:var(--image-aspect)");
    expect(fetch.mock.calls.flat().join(" ")).not.toMatch(/\.(png|jpe?g|webp|gif|svg)(?:\s|$)/i);
  });

  it("makes SVG guides fully invisible when grid opacity is zero", () => {
    const svg = exportSvg(
      { ...settings, view: "overlay", gridOpacity: 0 },
      layout,
      getFont("inter"),
    );
    expect(svg).toContain('fill-opacity="0"');
    expect(svg).toContain('stroke-opacity="0"');
  });
});
