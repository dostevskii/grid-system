import type { Preset, Settings } from "./model";

const iso = (
  series: "ISO A" | "ISO B" | "JIS B",
  values: readonly (readonly [number, number])[],
) =>
  values.map(
    ([width, height], index): Preset => ({
      presetId: `${series.toLowerCase().replaceAll(" ", "-")}-${index}`,
      name: `${series === "ISO A" ? "A" : "B"}${index}`,
      category: series,
      mode: "print",
      unit: "mm",
      width,
      height,
      orientation: "portrait",
    }),
  );

export const PRESETS: Preset[] = [
  ...iso("ISO A", [
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
  ]),
  ...iso("ISO B", [
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
  ]),
  ...iso("JIS B", [
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
  ]),
  ...[
    ["korean-guk-jeonji", "국전지 · 원지 기준", 636, 939],
    ["korean-guk-2", "국2절 · 원지 기준", 468, 636],
    ["korean-guk-4", "국4절 · 원지 기준", 318, 468],
    ["korean-guk-8", "국8절 · 원지 기준", 234, 318],
    ["korean-guk-16", "국16절 · 원지 기준", 159, 234],
    ["korean-guk-32", "국32절 · 원지 기준", 117, 159],
  ].map(([presetId, name, width, height]) => ({
    presetId: String(presetId),
    name: String(name),
    width: Number(width),
    height: Number(height),
    category: "국내 국절 (원지)",
    mode: "print" as const,
    unit: "mm" as const,
    orientation: "portrait" as const,
    source: "광주디자인진흥원 활자활짝 인쇄가이드",
  })),
  ...[
    ["korean-gukbaepan", "국배판 · 완성 판형", 210, 297],
    ["korean-gukpan", "국판 · 완성 판형", 148, 210],
    ["korean-singukpan", "신국판 · 완성 판형", 152, 225],
  ].map(([presetId, name, width, height]) => ({
    presetId: String(presetId),
    name: String(name),
    width: Number(width),
    height: Number(height),
    category: "국내 완성 판형",
    mode: "print" as const,
    unit: "mm" as const,
    orientation: "portrait" as const,
    source: "북토리 출판 템플릿",
  })),
  ...[
    ["us-letter", "Letter", 8.5, 11],
    ["us-legal", "Legal", 8.5, 14],
    ["us-tabloid", "Tabloid", 11, 17],
    ["us-ledger", "Ledger", 17, 11],
    ["us-statement", "Statement / Half Letter", 5.5, 8.5],
    ["us-executive", "Executive", 7.25, 10.5],
  ].map(([presetId, name, width, height]) => ({
    presetId: String(presetId),
    name: String(name),
    width: Number(width),
    height: Number(height),
    category: "미국",
    mode: "print" as const,
    unit: "in" as const,
    orientation:
      Number(width) > Number(height)
        ? ("landscape" as const)
        : ("portrait" as const),
  })),
  ...[
    ["figma-iphone-17", "iPhone 17", 402, 874, "Phone"],
    ["figma-iphone-13-14", "iPhone 13 & 14", 390, 844, "Phone"],
    ["figma-android-compact", "Android Compact", 412, 917, "Phone"],
    ["figma-ipad-mini-83", "iPad mini 8.3″", 744, 1133, "Tablet"],
    ["figma-ipad-pro-11", "iPad Pro 11″", 834, 1194, "Tablet"],
    ["figma-ipad-pro-129", "iPad Pro 12.9″", 1024, 1366, "Tablet"],
    ["figma-android-expanded", "Android Expanded", 1280, 800, "Tablet"],
    ["figma-macbook-air", "MacBook Air", 1280, 832, "Desktop"],
    ["figma-macbook-pro-14", "MacBook Pro 14″", 1512, 982, "Desktop"],
    ["figma-macbook-pro-16", "MacBook Pro 16″", 1728, 1117, "Desktop"],
    ["web-desktop-1440", "Desktop", 1440, 1024, "Desktop"],
    ["figma-tv", "TV", 1280, 720, "Desktop"],
  ].map(([presetId, name, width, height, group]) => ({
    presetId: String(presetId),
    name: String(name),
    width: Number(width),
    height: Number(height),
    category: `웹 · Figma ${String(group)}`,
    mode: "web" as const,
    unit: "px" as const,
    orientation:
      Number(width) > Number(height)
        ? ("landscape" as const)
        : ("portrait" as const),
    source: "Figma Frame presets (2026-09-16)",
  })),
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.presetId === id);
}

export function applyPreset(settings: Settings, preset: Preset): Settings {
  return { ...settings, page: { ...preset } };
}
