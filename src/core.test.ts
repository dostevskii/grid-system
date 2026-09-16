import { describe, expect, it } from "vitest";
import {
  calculateLayout,
  DEFAULT_SETTINGS,
  fromPx,
  parseSettings,
  toPx,
  validateSettings,
} from "./core";

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
  it("rejects an empty source and stops safely for insufficient line height", () => {
    expect(() => calculateLayout(DEFAULT_SETTINGS, "   \n\t", measure)).toThrow(
      "샘플 원문",
    );
    const result = calculateLayout(
      { ...DEFAULT_SETTINGS, lineHeight: 8 },
      "Alpha Beta",
      measure,
    );
    expect(result.blocks).toEqual([]);
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
