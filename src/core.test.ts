import { describe, expect, it } from "vitest";
import {
  calculateLayout,
  DEFAULT_SETTINGS,
  fromPx,
  parseSettings,
  randomizeSettings,
  randomizeGrid,
  randomizeTypography,
  toPx,
  validateSettings,
} from "./core";
import { FONTS } from "./fonts";

const measure = (text: string, size: number) => ({
  width: text.length * size * 0.5,
  ascent: size * 0.8,
  descent: size * 0.2,
});

describe("unit conversion", () => {
  it("keeps ISO physical dimensions through px conversion", () => {
    expect(fromPx(toPx(210, "mm"), "mm")).toBeCloseTo(210);
    expect(toPx(8.5, "in")).toBe(816);
  });
});

describe("settings validation", () => {
  it("accepts defaults and rejects too many modules", () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual([]);
    expect(
      validateSettings({ ...DEFAULT_SETTINGS, columns: 100, rows: 100 }),
    ).not.toEqual([]);
  });
  it("round-trips valid JSON and reports invalid JSON clearly", () => {
    expect(parseSettings(JSON.stringify(DEFAULT_SETTINGS))).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(() => parseSettings("{oops")).toThrow("설정 JSON");
  });
  it("rejects incomplete, non-finite, unsupported-font and impossible geometry imports", () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, margin: {} })).not.toEqual(
      [],
    );
    expect(
      validateSettings({ ...DEFAULT_SETTINGS, seed: Number.NaN }),
    ).not.toEqual([]);
    expect(
      validateSettings({ ...DEFAULT_SETTINGS, fontId: "unknown-font" }),
    ).not.toEqual([]);
    expect(validateSettings({ ...DEFAULT_SETTINGS, columns: 33 })).not.toEqual(
      [],
    );
    expect(validateSettings({ ...DEFAULT_SETTINGS, rows: 33 })).not.toEqual([]);
    expect(validateSettings({ ...DEFAULT_SETTINGS, fontSize: 5 })).not.toEqual(
      [],
    );
    expect(
      validateSettings({ ...DEFAULT_SETTINGS, lineHeight: 161 }),
    ).not.toEqual([]);
    expect(
      validateSettings({ ...DEFAULT_SETTINGS, letterSpacing: -2.1 }),
    ).not.toEqual([]);
    expect(validateSettings({ ...DEFAULT_SETTINGS, density: 0.1 })).not.toEqual(
      [],
    );
    expect(
      validateSettings({
        ...DEFAULT_SETTINGS,
        margin: { top: 900, right: 900, bottom: 900, left: 900 },
      }),
    ).not.toEqual([]);
    const parsed = parseSettings(
      JSON.stringify({ ...DEFAULT_SETTINGS, ignored: { polluted: true } }),
    );
    expect("ignored" in parsed).toBe(false);
  });
});

describe("layout calculation", () => {
  it("calculates 20 modules and puts non-overlapping whole lines in bounds", () => {
    const result = calculateLayout(
      DEFAULT_SETTINGS,
      "Eins zwei drei vier fünf sechs sieben acht neun zehn.",
      measure,
    );
    expect(result.moduleWidth).toBe(310);
    expect(result.moduleHeight).toBeCloseTo(160);
    const occupied = new Set<string>();
    for (const block of result.blocks) {
      expect(block.lines.length).toBeGreaterThan(0);
      for (const line of block.lines)
        expect(line.y).toBeLessThanOrEqual(block.y + block.height);
      for (let row = block.row; row < block.row + block.rowSpan; row++)
        for (let col = block.col; col < block.col + block.colSpan; col++) {
          expect(occupied.has(`${col}:${row}`)).toBe(false);
          occupied.add(`${col}:${row}`);
        }
    }
  });
  it("breaks an overlong German word without overflow", () => {
    const result = calculateLayout(
      { ...DEFAULT_SETTINGS, columns: 4, fontSize: 20 },
      "Donaudampfschifffahrtsgesellschaftskapitän",
      measure,
    );
    expect(result.blocks.some((block) => block.lines.length > 1)).toBe(true);
  });
  it("is safe for all small grid shapes and preserves a stable seeded structure", () => {
    for (let columns = 1; columns <= 8; columns++)
      for (let rows = 1; rows <= 8; rows++) {
        const settings = {
          ...DEFAULT_SETTINGS,
          columns,
          rows,
          layout:
            (columns + rows) % 3 === 0
              ? ("editorial" as const)
              : (columns + rows) % 2
                ? ("aligned" as const)
                : ("asymmetric" as const),
        };
        const first = calculateLayout(
          settings,
          "eins zwei drei vier fünf sechs sieben acht neun zehn",
          measure,
        );
        const second = calculateLayout(
          settings,
          "eins zwei drei vier fünf sechs sieben acht neun zehn",
          measure,
        );
        expect(second.blocks).toEqual(first.blocks);
        const occupied = new Set<string>();
        for (const block of first.blocks)
          for (let row = block.row; row < block.row + block.rowSpan; row++)
            for (let col = block.col; col < block.col + block.colSpan; col++) {
              expect(col).toBeLessThan(columns);
              expect(row).toBeLessThan(rows);
              expect(occupied.has(`${col}:${row}`)).toBe(false);
              occupied.add(`${col}:${row}`);
            }
      }
  });
  it("does not shift the source start when only the seed changes", () => {
    const a = calculateLayout(
      { ...DEFAULT_SETTINGS, seed: 1 },
      "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda",
      measure,
    );
    const b = calculateLayout(
      { ...DEFAULT_SETTINGS, seed: 2 },
      "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda",
      measure,
    );
    expect(a.blocks[0]?.lines[0]?.text.startsWith("Alpha")).toBe(true);
    expect(b.blocks[0]?.lines[0]?.text.startsWith("Alpha")).toBe(true);
  });
  it("changes the module composition for consecutive seeds in every layout style", () => {
    for (const layout of ["aligned", "asymmetric", "editorial"] as const) {
      const one = calculateLayout(
        { ...DEFAULT_SETTINGS, layout, seed: 1 },
        "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda",
        measure,
      );
      const two = calculateLayout(
        { ...DEFAULT_SETTINGS, layout, seed: 2 },
        "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda",
        measure,
      );
      expect(
        two.blocks.map(({ col, row, colSpan, rowSpan }) => [
          col,
          row,
          colSpan,
          rowSpan,
        ]),
      ).not.toEqual(
        one.blocks.map(({ col, row, colSpan, rowSpan }) => [
          col,
          row,
          colSpan,
          rowSpan,
        ]),
      );
    }
  });
  it("keeps the glyph descent within a block and does not insert spaces into split words", () => {
    const descentMeasure = (text: string, size: number) => ({
      width: text.length * size * 0.5,
      ascent: size * 0.5,
      descent: size * 0.5,
    });
    const layout = calculateLayout(
      {
        ...DEFAULT_SETTINGS,
        columns: 1,
        rows: 2,
        margin: { top: 0, right: 650, bottom: 0, left: 650 },
        gutter: { x: 0, y: 0 },
        fontSize: 16,
        lineHeight: 16,
      },
      "Donaudampfschifffahrtsgesellschaft",
      descentMeasure,
    );
    for (const block of layout.blocks)
      for (const line of block.lines)
        expect(
          line.y + descentMeasure(line.text, block.fontSize).descent,
        ).toBeLessThanOrEqual(block.y + block.height);
    expect(layout.blocks.map((block) => block.text).join(" ")).not.toContain(
      "Donaudampf schiff",
    );
  });
  it("rejects an empty source and warns while continuing for overlapping line height", () => {
    expect(() => calculateLayout(DEFAULT_SETTINGS, "   \n\t", measure)).toThrow(
      "샘플 원문",
    );
    const result = calculateLayout(
      { ...DEFAULT_SETTINGS, lineHeight: 8 },
      "Alpha Beta",
      measure,
    );
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("행간");
  });
  it("keeps text block flow as a prefix of the source, including long word splits", () => {
    const sample = `Donaudampfschifffahrtsgesellschaft ${Array.from({ length: 500 }, (_, index) => `Kapitel${index}`).join(" ")}`;
    const layout = calculateLayout(
      {
        ...DEFAULT_SETTINGS,
        columns: 4,
        rows: 5,
        margin: { top: 64, right: 550, bottom: 64, left: 550 },
        gutter: { x: 8, y: 8 },
        density: 1,
      },
      sample,
      measure,
    );
    const source = sample.replace(/\s+/g, "");
    const used = layout.blocks
      .map((block) => block.text ?? "")
      .join("")
      .replace(/\s+/g, "");
    expect(source.startsWith(used)).toBe(true);
  });
});

describe("deterministic free randomizer", () => {
  const sample = "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega";
  it("is deterministic, preserves identity fields, and changes every randomized field across seeds", () => {
    const first = randomizeSettings(DEFAULT_SETTINGS, 41);
    expect(randomizeSettings({ ...DEFAULT_SETTINGS, columns: 2, rows: 3, seed: -3 }, 41)).toEqual(first);
    expect(first).toMatchObject({ page: DEFAULT_SETTINGS.page, fontId: "inter", gridColor: DEFAULT_SETTINGS.gridColor, textColor: DEFAULT_SETTINGS.textColor, view: DEFAULT_SETTINGS.view, baseline: DEFAULT_SETTINGS.baseline, layout: "free", seed: 41 });
    const variants = Array.from({ length: 40 }, (_, seed) => randomizeSettings(DEFAULT_SETTINGS, seed));
    for (const field of ["columns", "rows", "fontWeight", "fontSize", "lineHeight", "letterSpacing", "density"] as const)
      expect(new Set(variants.map((item) => item[field])).size).toBeGreaterThan(1);
    for (const field of ["top", "right", "bottom", "left"] as const)
      expect(new Set(variants.map((item) => item.margin[field])).size).toBeGreaterThan(1);
    for (const field of ["x", "y"] as const)
      expect(new Set(variants.map((item) => item.gutter[field])).size).toBeGreaterThan(1);
    expect(() => randomizeSettings(DEFAULT_SETTINGS, 1.5)).toThrow("seed");
  });
  it("uses supported weights and produces useful, non-overlapping free text for many seeds", () => {
    for (let seed = 0; seed < 100; seed++) {
      const settings = randomizeSettings(DEFAULT_SETTINGS, seed);
      expect(validateSettings(settings)).toEqual([]);
      expect([100, 200, 300, 400, 500, 600, 700, 800, 900]).toContain(settings.fontWeight);
      const result = calculateLayout(settings, sample, measure);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0]?.role).toBe("heading");
      expect(result.blocks.some((block) => block.lines.length > 0)).toBe(true);
      const used = new Set<string>();
      for (const block of result.blocks)
        for (let row = block.row; row < block.row + block.rowSpan; row++)
          for (let col = block.col; col < block.col + block.colSpan; col++) {
            expect(used.has(`${col}:${row}`)).toBe(false);
            used.add(`${col}:${row}`);
          }
    }
  });
  it("handles degenerate free grids and every registered font's weights", () => {
    for (const [columns, rows] of [[1, 1], [1, 5], [5, 1]] as const) {
      const result = calculateLayout(
        { ...DEFAULT_SETTINGS, columns, rows, layout: "free", seed: 7 },
        sample,
        measure,
      );
      expect(result.blocks[0]?.role).toBe("heading");
    }
    for (const font of FONTS)
      for (const fontWeight of font.weights)
        expect(validateSettings({ ...DEFAULT_SETTINGS, fontId: font.id, fontWeight })).toEqual([]);
  });
  it("limits the complete layout, not each block, to 10,000 text lines", () => {
    const result = calculateLayout(
      {
        ...DEFAULT_SETTINGS,
        page: { ...DEFAULT_SETTINGS.page, width: 1440, height: 16000 },
        columns: 2,
        rows: 2,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        gutter: { x: 0, y: 0 },
        fontSize: 6,
        lineHeight: 1,
        density: 1,
      },
      sample,
      measure,
    );
    expect(result.blocks.reduce((total, block) => total + block.lines.length, 0)).toBeLessThanOrEqual(10000);
    expect(result.warnings.filter((warning) => warning.includes("10,000행")).length).toBe(1);
  });
  it("samples broad free geometry and permits headings and body blocks on arbitrary cells", () => {
    const starts = new Set<string>();
    const headingStarts = new Set<string>();
    const bodyStarts = new Set<string>();
    const geometry = new Set<string>();
    let hasHeading9AndBody11 = false;
    let knownNineElevenSeed = -1;
    for (let seed = 0; seed < 500; seed++) {
      const result = calculateLayout({ ...DEFAULT_SETTINGS, columns: 4, rows: 5, layout: "free", seed }, sample, measure);
      const heading = result.blocks.find((block) => block.role === "heading");
      if (heading) {
        starts.add(`h:${heading.col}:${heading.row}`);
        headingStarts.add(`${heading.col}:${heading.row}`);
      }
      for (const body of result.blocks.filter((block) => block.role === "body")) {
        starts.add(`b:${body.col}:${body.row}`);
        bodyStarts.add(`${body.col}:${body.row}`);
      }
      if (heading?.col === 0 && heading.row === 2 && result.blocks.some((block) => block.role === "body" && block.col === 2 && block.row === 2)) {
        hasHeading9AndBody11 = true;
        if (knownNineElevenSeed === -1) knownNineElevenSeed = seed;
      }
      geometry.add(result.blocks.map((block) => `${block.role}:${block.col},${block.row},${block.colSpan},${block.rowSpan}`).join("|"));
    }
    expect(hasHeading9AndBody11).toBe(true); // currently covered by seed 314
    expect(knownNineElevenSeed).toBe(314);
    expect(headingStarts.size).toBe(20);
    expect(bodyStarts.size).toBe(20);
    expect(starts.size).toBeGreaterThan(35);
    expect(geometry.size).toBeGreaterThan(30);
  });
  it("keeps title placement independent of generated grid dimensions", () => {
    let hasLeft = false;
    let hasRight = false;
    for (let seed = 0; seed < 1000; seed++) {
      const settings = randomizeSettings(DEFAULT_SETTINGS, seed);
      if (settings.columns < 6) continue;
      const heading = calculateLayout(settings, sample, measure).blocks[0];
      hasLeft ||= heading?.col === 0;
      hasRight ||= heading?.col === settings.columns - 1;
    }
    expect(hasLeft).toBe(true);
    expect(hasRight).toBe(true);
  });
  it("places 1-based heading cell 9 and body cell 11 together for seed 314", () => {
    const result = calculateLayout(
      { ...DEFAULT_SETTINGS, columns: 4, rows: 5, layout: "free", seed: 314 },
      sample,
      measure,
    );
    expect(result.blocks.some((block) => block.role === "heading" && block.col === 0 && block.row === 2)).toBe(true);
    expect(result.blocks.some((block) => block.role === "body" && block.col === 2 && block.row === 2)).toBe(true);
  });
});

describe("staged, quality-constrained randomization", () => {
  const sample = "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega";
  it("treats a clean grid as a valid stage, not a text-placement failure", () => {
    const grid = randomizeGrid(DEFAULT_SETTINGS, 1);
    const result = calculateLayout(grid, sample, measure);
    expect(result.blocks).toEqual([]);
    expect(result.images).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
  it("rejects contradictory locks and duplicate image ratios on import", () => {
    for (const workflow of [
      { ...DEFAULT_SETTINGS.workflow, compositionLocked: true },
      { ...DEFAULT_SETTINGS.workflow, gridLocked: true, compositionLocked: true, mode: "empty" },
      { ...DEFAULT_SETTINGS.workflow, imageRatios: ["1:1", "1:1"] },
    ]) expect(() => parseSettings(JSON.stringify({ ...DEFAULT_SETTINGS, workflow }))).toThrow();
  });
  it("constrains body measure and scales heading leading even for small print type", () => {
    const grid = { ...DEFAULT_SETTINGS, workflow: { ...DEFAULT_SETTINGS.workflow, gridLocked: true } };
    for (let seed = 0; seed < 100; seed++) {
      const settings = randomizeTypography(grid, seed, "typography");
      const result = calculateLayout(settings, sample, measure);
      for (const block of result.blocks) {
        if (block.role === "body") {
          const characterWidth = measure(sample, settings.fontSize).width / sample.length;
          expect(block.width / characterWidth).toBeLessThanOrEqual(78.01);
        } else {
          expect(block.lineHeight / block.fontSize).toBeCloseTo(settings.lineHeight / settings.fontSize, 8);
        }
      }
    }
  });
  it("keeps long German words whole at the generated heading-to-body boundary", () => {
    const text = "Wer sich der Fülle von Druckerzeugnissen aller Art bei einer Sichtung gegenübersieht findet neue Möglichkeiten.";
    const base = { ...DEFAULT_SETTINGS, workflow: { ...DEFAULT_SETTINGS.workflow, gridLocked: true } };
    for (let seed = 0; seed < 100; seed++) {
      const result = calculateLayout(randomizeTypography(base, seed, "typography"), text, measure);
      const heading = result.blocks.find((block) => block.role === "heading")!;
      const body = result.blocks.find((block) => block.role === "body")!;
      expect(text.split(" ")).toContain(heading.text!.split(" ").at(-1));
      expect(text.split(" ")).toContain(body.text!.split(" ")[0]);
      const normalized = `${heading.text} ${body.text}`.replace(/\s/gu, "");
      expect((text.replace(/\s/gu, "")).repeat(100).startsWith(normalized)).toBe(true);
    }
  });
  it("migrates legacy JSON to an explicit legacy workflow", () => {
    const legacy = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
    delete legacy.workflow;
    expect(parseSettings(JSON.stringify(legacy)).workflow).toMatchObject({
      mode: "legacy", gridLocked: false, compositionLocked: false, gridSeed: 0,
    });
  });
  it("separates grid and composition seeds, and observes both locks", () => {
    const grid = randomizeGrid(DEFAULT_SETTINGS, 71);
    expect(grid.workflow).toMatchObject({ gridSeed: 71, mode: "empty", compositionLocked: false });
    expect(grid.seed).toBe(DEFAULT_SETTINGS.seed);
    const locked = { ...grid, workflow: { ...grid.workflow, gridLocked: true } };
    const typography = randomizeTypography(locked, 72, "typography");
    expect(typography).toMatchObject({ columns: grid.columns, rows: grid.rows, margin: grid.margin, gutter: grid.gutter, seed: 72 });
    expect(typography.workflow.mode).toBe("typography");
    expect(randomizeGrid(locked, 99)).toBe(locked);
    const compositionLocked = { ...typography, workflow: { ...typography.workflow, compositionLocked: true } };
    expect(randomizeTypography(compositionLocked, 73, "typography-image")).toBe(compositionLocked);
    expect(randomizeTypography(grid, 72, "typography")).toBe(grid);
  });
  it("creates usable regular grids and readable staged typography across common pages", () => {
    const pages = [
      DEFAULT_SETTINGS,
      { ...DEFAULT_SETTINGS, page: { ...DEFAULT_SETTINGS.page, width: 390, height: 844, orientation: "portrait" as const } },
      { ...DEFAULT_SETTINGS, page: { presetId: "a4", category: "ISO", mode: "print" as const, unit: "mm" as const, width: 210, height: 297, orientation: "portrait" as const } },
    ];
    for (const base of pages) for (let seed = 1; seed <= 40; seed++) {
      const grid = randomizeGrid(base, seed);
      expect(validateSettings(grid)).toEqual([]);
      const page = toPx(grid.page.width, grid.page.unit);
      expect(grid.columns).toBeGreaterThanOrEqual(2);
      expect(grid.rows).toBeGreaterThanOrEqual(2);
      expect(grid.margin.left).toBeGreaterThan(0);
      expect(grid.gutter.x).toBeGreaterThan(0);
      expect(page).toBeGreaterThan(0);
      const staged = randomizeTypography({ ...grid, workflow: { ...grid.workflow, gridLocked: true } }, seed, "typography");
      expect(staged.lineHeight).toBeGreaterThanOrEqual(staged.fontSize * 1.42 - 0.125);
      expect(staged.lineHeight).toBeLessThanOrEqual(staged.fontSize * 1.62 + 0.125);
      expect(staged.fontSize * 0.75 * 4).toBeCloseTo(Math.round(staged.fontSize * 0.75 * 4), 8);
      const layout = calculateLayout(staged, sample, measure);
      expect(layout.blocks.some((block) => block.role === "heading")).toBe(true);
      expect(layout.blocks.some((block) => block.role === "body" && block.lines.length >= 1)).toBe(true);
      const used = new Set<string>();
      for (const block of layout.blocks) for (let row = block.row; row < block.row + block.rowSpan; row++) for (let col = block.col; col < block.col + block.colSpan; col++) {
        expect(used.has(`${col}:${row}`)).toBe(false); used.add(`${col}:${row}`);
      }
    }
  });
  it("uses deterministic, aspect-correct, edge-aligned image placeholders without text collisions", () => {
    const grid = randomizeGrid(DEFAULT_SETTINGS, 311);
    const staged = randomizeTypography({ ...grid, workflow: { ...grid.workflow, gridLocked: true } }, 312, "typography-image");
    const a = calculateLayout(staged, sample, measure);
    const b = calculateLayout(staged, sample, measure);
    expect(a.images).toEqual(b.images);
    expect(a.images.length).toBeGreaterThan(0);
    const occupied = new Set<string>();
    for (const block of a.blocks) for (let row = block.row; row < block.row + block.rowSpan; row++) for (let col = block.col; col < block.col + block.colSpan; col++) occupied.add(`${col}:${row}`);
    for (const image of a.images) {
      const ratio = image.ratio.split(":").map(Number);
      expect(image.width / image.height).toBeCloseTo(ratio[0]! / ratio[1]!);
      expect(image.x).toBeGreaterThanOrEqual(image.col * (a.moduleWidth + staged.gutter.x) + staged.margin.left - 0.001);
      for (let row = image.row; row < image.row + image.rowSpan; row++) for (let col = image.col; col < image.col + image.colSpan; col++) expect(occupied.has(`${col}:${row}`)).toBe(false);
    }
  });
  it("keeps 200 staged compositions readable, varied and image-complete on normal presets", () => {
    const bases = [
      DEFAULT_SETTINGS,
      { ...DEFAULT_SETTINGS, page: { ...DEFAULT_SETTINGS.page, width: 390, height: 844, orientation: "portrait" as const } },
      { ...DEFAULT_SETTINGS, page: { presetId: "a4", category: "ISO", mode: "print" as const, unit: "mm" as const, width: 210, height: 297, orientation: "portrait" as const } },
    ];
    const starts = new Set<string>();
    for (const base of bases) for (let seed = 1; seed <= 200; seed++) {
      const grid = randomizeGrid(base, seed);
      const staged = randomizeTypography({ ...grid, workflow: { ...grid.workflow, gridLocked: true } }, seed, "typography-image");
      const layout = calculateLayout(staged, sample, measure);
      expect(layout.warnings.some((warning) => warning.includes("읽기 가능한"))).toBe(false);
      expect(layout.images.length).toBeGreaterThanOrEqual(1);
      const body = layout.blocks.find((block) => block.role === "body");
      expect(body?.lines.length).toBeGreaterThanOrEqual(3);
      expect(body?.width ?? 0).toBeGreaterThanOrEqual(staged.fontSize * 12);
      const heading = layout.blocks.find((block) => block.role === "heading");
      starts.add(`${heading?.col}:${heading?.row}`);
    }
    expect(starts.size).toBeGreaterThan(12);
  });
  it("uses a single grid axis when it can physically hold a paragraph, and warns when it cannot", () => {
    for (const geometry of [{ columns: 1, rows: 8 }, { columns: 8, rows: 1 }]) {
      const base = { ...DEFAULT_SETTINGS, ...geometry, workflow: { ...DEFAULT_SETTINGS.workflow, gridLocked: true, gridSeed: 9, mode: "empty" as const } };
      const staged = randomizeTypography(base, 18, "typography");
      const layout = calculateLayout(staged, sample, measure);
      expect(layout.blocks.some((block) => block.role === "heading")).toBe(true);
      expect(layout.blocks.some((block) => block.role === "body" && block.lines.length >= 3)).toBe(true);
    }
    const tooSmall = randomizeTypography({ ...DEFAULT_SETTINGS, columns: 1, rows: 1, workflow: { ...DEFAULT_SETTINGS.workflow, gridLocked: true } }, 18, "typography");
    expect(calculateLayout(tooSmall, sample, measure).warnings.join(" ")).toContain("읽기 가능한");
  });
  it("keeps every registered font inside the staged quality envelope", () => {
    for (const font of FONTS) {
      const grid = randomizeGrid({ ...DEFAULT_SETTINGS, fontId: font.id, fontWeight: font.weights[0]! }, 87);
      const staged = randomizeTypography({ ...grid, workflow: { ...grid.workflow, gridLocked: true } }, 88, "typography-image");
      const layout = calculateLayout(staged, sample, measure);
      expect(font.weights).toContain(staged.fontWeight);
      expect(layout.images.length).toBeGreaterThanOrEqual(1);
      expect(layout.blocks.find((block) => block.role === "body")?.lines.length).toBeGreaterThanOrEqual(3);
    }
  });
});
