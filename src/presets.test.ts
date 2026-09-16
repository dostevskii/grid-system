import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./core";
import { applyPreset, getPreset, PRESETS } from "./presets";

describe("presets", () => {
  it("has each Korean raw-stock dimension under its own distinct id", () => {
    expect(getPreset("korean-guk-16")).toMatchObject({
      width: 159,
      height: 234,
      unit: "mm",
    });
    expect(getPreset("korean-gukpan")).toMatchObject({
      width: 148,
      height: 210,
      category: "국내 완성 판형",
    });
    expect(getPreset("web-desktop-1440")).toMatchObject({
      width: 1440,
      height: 1024,
      unit: "px",
    });
  });
  it("preserves grid and typography while applying a page preset", () => {
    const preset = getPreset("us-letter")!;
    const applied = applyPreset(
      { ...DEFAULT_SETTINGS, columns: 6, fontSize: 18 },
      preset,
    );
    expect(applied.columns).toBe(6);
    expect(applied.fontSize).toBe(18);
    expect(applied.page).toEqual(preset);
  });
  it("keeps all ids unique", () =>
    expect(new Set(PRESETS.map((preset) => preset.presetId)).size).toBe(
      PRESETS.length,
    ));
  it("matches every published ISO A, ISO B and JIS B dimension", () => {
    const expected = {
      "iso-a": [
        [841, 1189],
        [594, 841],
        [420, 594],
        [297, 420],
        [210, 297],
        [148, 210],
        [105, 148],
        [74, 105],
        [52, 74],
        [37, 52],
        [26, 37],
      ],
      "iso-b": [
        [1000, 1414],
        [707, 1000],
        [500, 707],
        [353, 500],
        [250, 353],
        [176, 250],
        [125, 176],
        [88, 125],
        [62, 88],
        [44, 62],
        [31, 44],
      ],
      "jis-b": [
        [1030, 1456],
        [728, 1030],
        [515, 728],
        [364, 515],
        [257, 364],
        [182, 257],
        [128, 182],
        [91, 128],
        [64, 91],
        [45, 64],
        [32, 45],
      ],
    } as const;
    for (const [prefix, dimensions] of Object.entries(expected))
      dimensions.forEach(([width, height], index) =>
        expect(getPreset(`${prefix}-${index}`)).toMatchObject({
          width,
          height,
          unit: "mm",
        }),
      );
  });
  it("keeps Korean stock and completed-format families distinct at every size", () => {
    expect([
      "636x939",
      "468x636",
      "318x468",
      "234x318",
      "159x234",
      "117x159",
    ]).toEqual(
      [
        "korean-guk-jeonji",
        "korean-guk-2",
        "korean-guk-4",
        "korean-guk-8",
        "korean-guk-16",
        "korean-guk-32",
      ].map((id) => {
        const p = getPreset(id)!;
        return `${p.width}x${p.height}`;
      }),
    );
    expect(["210x297", "148x210", "152x225"]).toEqual(
      ["korean-gukbaepan", "korean-gukpan", "korean-singukpan"].map((id) => {
        const p = getPreset(id)!;
        return `${p.width}x${p.height}`;
      }),
    );
  });
});
