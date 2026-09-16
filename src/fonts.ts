import type {
  FontAsset,
  FontDefinition,
  MeasureText,
  TextMetricsResult,
} from "./model";

type FontRecord = FontDefinition & { cssPath?: string };

const steps = (from: number, to: number) =>
  Array.from(
    { length: Math.floor((to - from) / 100) + 1 },
    (_, index) => from + index * 100,
  );

const google = (
  id: string,
  name: string,
  category: FontDefinition["category"],
  weights: number[],
): FontRecord => ({
  id,
  name,
  family: name,
  category,
  weights,
  // This asset is a local stylesheet containing the official WOFF2 faces and
  // their unicode-ranges. It is intentionally a CSS asset, not an external CDN.
  assets: [
    {
      path: `/fonts/google/${id}/${id}.css`,
      weight: `${weights[0]} ${weights.at(-1)}`,
    },
  ],
  notices: [`/font-notices/${id}-OFL-1.1.txt`],
  source: `https://github.com/google/fonts/tree/main/ofl/${id === "libre-baskerville" ? "librebaskerville" : id === "eb-garamond" ? "ebgaramond" : id}`,
  version: "Google Fonts CSS2 snapshot, 2026-09-16",
  cssPath: `/fonts/google/${id}/${id}.css`,
});

const variable = (
  definition: Omit<FontRecord, "assets">,
  path: string,
  range: string,
): FontRecord => ({
  ...definition,
  assets: [{ path, weight: range }],
});

export const FONTS: FontDefinition[] = [
  google("libre-baskerville", "Libre Baskerville", "Serif", [400, 700]),
  google("eb-garamond", "EB Garamond", "Serif", steps(400, 800)),
  google("cormorant", "Cormorant", "Serif", steps(300, 700)),
  google("inter", "Inter", "Sans-serif", steps(100, 900)),
  google("montserrat", "Montserrat", "Sans-serif", steps(100, 900)),
  google("lato", "Lato", "Sans-serif", [100, 300, 400, 700, 900]),
  google("oswald", "Oswald", "Sans-serif", steps(200, 700)),
  google("outfit", "Outfit", "Sans-serif", steps(100, 900)),
  variable(
    {
      id: "pretendard",
      name: "Pretendard",
      family: "Pretendard Variable",
      category: "한국어",
      weights: steps(100, 900),
      notices: ["/font-notices/Pretendard-OFL-1.1.txt"],
      source: "https://github.com/orioncactus/pretendard",
      version: "1.3.9",
    },
    "/fonts/pretendard/PretendardVariable.woff2",
    "45 920",
  ),
  variable(
    {
      id: "wanted-sans",
      name: "Wanted Sans",
      family: "Wanted Sans Variable",
      category: "한국어",
      weights: steps(400, 1000),
      notices: ["/font-notices/WantedSans-OFL-1.1.txt"],
      source: "https://github.com/wanteddev/wanted-sans",
      version: "1.0.3",
    },
    "/fonts/wanted-sans/WantedSansVariable.woff2",
    "400 1000",
  ),
  {
    id: "yeolrin-myeongjo",
    name: "열린명조",
    family: "Yeolrin Myeongjo",
    category: "한국어",
    weights: [300, 500, 700],
    assets: [
      { path: "/fonts/yeolrin/YeolrinMyeongjo-Light.woff2", weight: "300" },
      { path: "/fonts/yeolrin/YeolrinMyeongjo-Medium.woff2", weight: "500" },
      { path: "/fonts/yeolrin/YeolrinMyeongjo-Bold.woff2", weight: "700" },
    ],
    notices: ["/font-notices/Yeolrin-NOTICE.md"],
    source: "https://github.com/hyunbinseo/yeolrin",
    version: "1.0.0",
  },
  {
    id: "yeolrin-gothic",
    name: "열린고딕",
    family: "Yeolrin Gothic",
    category: "한국어",
    weights: [300, 500, 700],
    assets: [
      { path: "/fonts/yeolrin/YeolrinGothic-Light.woff2", weight: "300" },
      { path: "/fonts/yeolrin/YeolrinGothic-Medium.woff2", weight: "500" },
      { path: "/fonts/yeolrin/YeolrinGothic-Bold.woff2", weight: "700" },
    ],
    notices: ["/font-notices/Yeolrin-NOTICE.md"],
    source: "https://github.com/hyunbinseo/yeolrin",
    version: "1.0.0",
  },
];

const recordFor = (font: FontDefinition): FontRecord => font as FontRecord;
const cssEscapedFamily = (family: string) =>
  `"${family.replaceAll('"', '\\"')}"`;

export function getFont(id: string): FontDefinition {
  return (
    FONTS.find((font) => font.id === id) ??
    FONTS.find((font) => font.id === "inter")!
  );
}

export function nearestWeight(font: FontDefinition, weight: number): number {
  return [...font.weights].sort(
    (a, b) => Math.abs(a - weight) - Math.abs(b - weight) || a - b,
  )[0]!;
}

/** A stable rendering stack. Yeolrin needs Inter for German umlauts absent
 * from its source files; exports must use this same stack. */
export function fontStack(font: FontDefinition): string {
  const fallback = font.id === "yeolrin-myeongjo" ? "serif" : "sans-serif";
  return font.id.startsWith("yeolrin-")
    ? `${cssEscapedFamily(font.family)}, "Inter", ${fallback}`
    : `${cssEscapedFamily(font.family)}, ${fallback}`;
}

function assetCss(asset: FontAsset, family: string, relative: boolean): string {
  const source = relative
    ? asset.path.replace(/^\/fonts\//, "./fonts/")
    : asset.path;
  return `@font-face { font-family: ${cssEscapedFamily(family)}; font-style: ${asset.style ?? "normal"}; font-weight: ${asset.weight}; font-display: swap; src: url(${JSON.stringify(source)}) format('woff2');${asset.unicodeRange ? ` unicode-range: ${asset.unicodeRange};` : ""} }`;
}

/** CSS used by the app and HTML/CSS export. Google records point to a local
 * subset stylesheet; all other records generate direct, portable @font-face. */
export function fontFaceCss(
  font: FontDefinition,
  weight?: number,
  relative = false,
): string {
  const record = recordFor(font);
  if (record.cssPath) {
    const path = relative
      ? record.cssPath.replace(/^\/fonts\//, "./fonts/")
      : record.cssPath;
    return `@import url(${JSON.stringify(path)});`;
  }
  const selectedWeight =
    weight === undefined ? undefined : nearestWeight(font, weight);
  return font.assets
    .filter(
      (asset) =>
        selectedWeight === undefined ||
        asset.weight.includes(" ") ||
        Number(asset.weight) === selectedWeight,
    )
    .map((asset) => assetCss(asset, font.family, relative))
    .join("\n");
}

const installed = new Map<string, Promise<void>>();
function styleId(font: FontDefinition) {
  return `grid-system-font-${font.id}`;
}

function withTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after 15 seconds.`)),
      15_000,
    );
  });
  return Promise.race([operation, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

function installFaces(font: FontDefinition): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const prior = installed.get(font.id);
  if (prior) return prior;
  const id = styleId(font);
  const record = recordFor(font);
  const ready = new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    if (record.cssPath) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = record.cssPath;
      link.onload = () => resolve();
      link.onerror = () =>
        reject(new Error(`${font.name} stylesheet could not be loaded.`));
      document.head.append(link);
    } else {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = fontFaceCss(font);
      document.head.append(style);
      resolve();
    }
  });
  installed.set(font.id, ready);
  void ready.catch(() => {
    if (installed.get(font.id) === ready) {
      installed.delete(font.id);
      document.getElementById(id)?.remove();
    }
  });
  return ready;
}

/** Resolves only after the selected real face is available to the Canvas text
 * measurement API. No synthetic weight is requested. */
export async function loadFont(
  font: FontDefinition,
  weight: number,
): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const selectedWeight = nearestWeight(font, weight);
  try {
    await withTimeout(installFaces(font), `${font.name} stylesheet`);
    const descriptor = `${selectedWeight} 16px ${cssEscapedFamily(font.family)}`;
    // Yeolrin's cmap lacks German umlauts; use the same explicit fallback
    // for Canvas measurement, preview, and both exports.
    if (font.id.startsWith("yeolrin-")) await loadFont(getFont("inter"), 400);
    await withTimeout(
      document.fonts.load(descriptor, "Hamburgefontsiv äöüß «»"),
      `${font.name} ${selectedWeight}`,
    );
    await withTimeout(document.fonts.ready, `${font.name} font set`);
    if (!document.fonts.check(descriptor, "Hamburgefontsiv äöüß «»")) {
      throw new Error("The selected face is not ready.");
    }
  } catch {
    // Timeouts and failed font binaries also need fresh faces, not only
    // stylesheet onerror. A retry must never reuse a rejected FontFace.
    installed.delete(font.id);
    document.getElementById(styleId(font))?.remove();
    throw new Error(`${font.name} 폰트를 불러오지 못했습니다. 연결을 확인하고 다시 시도하세요.`);
  }
}

export function makeMeasurer(
  font: FontDefinition,
  weight: number,
  letterSpacing: number,
): MeasureText {
  const canvas =
    typeof document === "undefined"
      ? undefined
      : document.createElement("canvas");
  const context = canvas?.getContext("2d");
  const selectedWeight = nearestWeight(font, weight);
  return (text: string, size: number): TextMetricsResult => {
    if (!context)
      return {
        width:
          text.length * size * 0.5 +
          Math.max(0, text.length - 1) * letterSpacing,
        ascent: size * 0.8,
        descent: size * 0.2,
      };
    context.font = `${selectedWeight} ${size}px ${fontStack(font)}`;
    context.fontKerning = "normal";
    const measured = context.measureText(text);
    return {
      width:
        measured.width +
        Math.max(0, Array.from(text).length - 1) * letterSpacing,
      ascent: measured.actualBoundingBoxAscent || size * 0.8,
      descent: measured.actualBoundingBoxDescent || size * 0.2,
    };
  };
}
