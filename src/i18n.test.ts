import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings, validateSettings } from "./core";
import { translateMessage, translatePreset } from "./i18n";
import { PRESETS } from "./presets";

describe("English and Korean interface messages", () => {
  it("reports font-size limits in points in both UI languages", () => {
    const [message] = validateSettings({ ...DEFAULT_SETTINGS, fontSize: 5 });
    expect(translateMessage("ko", message!)).toBe("글자 크기는 4.5~90pt 범위여야 합니다.");
    expect(translateMessage("en", message!)).toBe("Font size must be between 4.5 and 90pt.");
  });

  it("translates every validation message, including joined JSON import errors", () => {
    const invalid = [
      null, {},
      { ...DEFAULT_SETTINGS, page: null },
      { ...DEFAULT_SETTINGS, page: { ...DEFAULT_SETTINGS.page, width: 0 } },
      {
        ...DEFAULT_SETTINGS,
        columns: 0, rows: 0,
        margin: { top: -1 }, gutter: { x: -1 },
        fontId: "missing", fontWeight: 101, fontSize: 0,
        lineHeight: 0, letterSpacing: 50,
        gridColor: "bad", textColor: "bad",
        gridOpacity: -1, textOpacity: -1,
        layout: "bad", density: 0, seed: 0.1, view: "bad", baseline: "bad",
      },
      { ...DEFAULT_SETTINGS, margin: { top: 9999, right: 9999, bottom: 9999, left: 9999 } },
    ];
    for (const value of invalid) {
      for (const message of validateSettings(value)) {
        expect(translateMessage("en", message)).not.toMatch(/[가-힣]/);
        expect(translateMessage("ko", message)).toBe(message);
      }
      try { parseSettings(JSON.stringify(value)); }
      catch (error) {
        expect(translateMessage("en", (error as Error).message)).not.toMatch(/[가-힣]/);
      }
    }
  });

  it("translates runtime warnings and download failures without changing asset paths", () => {
    const messages = [
      "행간이 실제 글리프 높이보다 작아 줄이 겹칠 수 있습니다.",
      "2번 영역의 행간이 실제 글리프 높이보다 작습니다.",
      "3번 영역은 온전한 글리프를 담기에는 너무 작습니다.",
      "4번 영역은 한 글리프도 온전히 담을 수 없습니다.",
      "전체 텍스트 행 수를 성능 보호를 위해 10,000행으로 제한했습니다.",
      "Inter 폰트를 불러오지 못했습니다. 연결을 확인하고 다시 시도하세요.",
      "자산을 가져오지 못했습니다: /font-notices/Inter.txt",
      "폰트 파일을 가져오지 못했습니다: /fonts/inter.woff2",
    ];
    for (const message of messages)
      expect(translateMessage("en", message)).not.toMatch(/[가-힣]/);
    expect(translateMessage("en", messages[7]!)).toContain("/fonts/inter.woff2");
  });

  it("translates all built-in preset names and categories", () => {
    for (const preset of PRESETS)
      for (const value of [preset.name, preset.category]) {
        expect(translatePreset("en", value)).not.toMatch(/[가-힣]/);
        expect(translatePreset("ko", value)).toBe(value);
      }
  });
});
