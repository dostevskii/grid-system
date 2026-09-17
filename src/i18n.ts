export type Locale = "en" | "ko";

export const LANGUAGE_STORAGE_KEY = "grid-system.language";

const en: Record<string, string> = {
  randomWorkflow: "Build a layout in two stages", buildGrid: "Choose your grid", composeContent: "Compose on the grid",
  randomGrid: "Random grid", randomTypography: "Random typography", randomTypographyImage: "Random type + image",
  lockGrid: "Lock grid", unlockGrid: "Unlock grid", lockComposition: "Lock composition", unlockComposition: "Unlock composition",
  gridSeed: "Grid seed", typeSeed: "Type seed", applyGridSeed: "Apply grid seed", applyTypeSeed: "Apply typography seed",
  gridStageHint: "Explore, then lock a grid you like.", gridLockedHint: "Grid locked. Artboard, modules and spacing stay fixed.",
  lockGridFirst: "Lock your grid to begin.", typeStageHint: "Try a composition, then lock it to keep it.",
  compositionLockedHint: "Composition locked. Ready to export.", unlockGridNotice: "Grid and composition unlocked. Your current layout is kept.",
  emptyGrid: "Like this grid? Lock it above, then add typography or image boxes.",
  emptyGridLocked: "Your grid is locked. Choose Random typography or Random type + image above.",
  emptyComposition: "A clean grid, ready for content.", modeTypography: "Seeded typography on your chosen grid.", modeTypeImage: "Seeded typography and image boxes on your chosen grid.",
  imageRatios: "Image box ratios", imageRatio: "Image ratio", imageRatiosHint: "Ratios used by Random type + image. Boxes only, no photos. Keep at least one selected.",
  content: "Content",
  about: "About Grid System", close: "Close", retry: "Try again",
  randomLayout: "Random layout", seed: "Seed", apply: "Apply",
  gridPrinciples: "Grid principles", importJson: "Import settings JSON", export: "Export",
  openProperties: "Open properties", layoutPreview: "Layout preview", previewDisplay: "Preview display",
  overlay: "Grid + content", text: "Text", grid: "Grid", fields: "modules",
  loading: "Preparing grid and font.", invalidDraft: "Check the input range. The last completed preview is shown.",
  lastPreview: "The last valid preview is shown.", fitMargins: "Fit margins and gutters",
  modules: "modules", module: "Module", fit: "Fit", previewZoom: "Preview zoom",
  closeProperties: "Close properties", properties: "Layout settings", resetSettings: "Reset settings",
  artboard: "Artboard", web: "Web", print: "Print", chooseArtboard: "Choose artboard preset",
  custom: "Custom", width: "Width", height: "Height", swapOrientation: "Swap orientation",
  lengthUnit: "Length input unit", webHeightHint: "The artboard height can grow freely.",
  gridSettings: "Grid", linked: "Linked", individual: "Individual", linkMargins: "Link margins", linkGutters: "Link gutters",
  topMargin: "Top margin", rightMargin: "Right margin", bottomMargin: "Bottom margin", leftMargin: "Left margin",
  horizontalGutter: "Horizontal gutter", verticalGutter: "Vertical gutter", baseline: "Baseline guide",
  typography: "Typography", typeUnit: "Typography input unit", chooseFont: "Choose font",
  fontSize: "Font size", fontWeight: "Font weight", letterSpacing: "Letter spacing", lineHeight: "Line height",
  colors: "Colors", textColor: "Text color", gridColor: "Grid color", opacity: "opacity",
  composition: "Paragraph composition", aligned: "Aligned", asymmetric: "Asymmetric", editorial: "Editorial", free: "Freeform",
  paragraphFill: "Paragraph fill", leadingHint: "Line height may intentionally be smaller than a glyph, allowing overlap.",
  compositionNote: "One grid, different possibilities. The source text continues through the modules.",
  calculating: "Calculating font and paragraphs", saved: "Saved locally in this browser", checkSettings: "Check your settings", localSave: "Local save",
  settingsFile: "Settings JSON file", dismissNotice: "Dismiss notice", artboardPresets: "Artboard presets", presetSearch: "Search presets", searchPreset: "Search by name or size",
  noPresets: "No matching size. You can enter the artboard width and height directly.",
  webFootnote: "Based on Figma Frame presets. Height is a starting value, not a webpage limit.",
  printFootnote: "ISO B, JIS B, Korean paper sizes, and finished sizes are listed separately. Confirm trim specifications with your printer.",
  fontPicker: "Font picker", fontSearch: "Search fonts", searchFont: "Search the 12 typefaces",
  fontFootnote: "After selecting a typeface, paragraphs are reflowed using its actual glyph widths. The source text remains unchanged.",
  exportLayout: "Export layout", exportIntro: "Take this grid into your next project.", gridOnly: "Grid only", textOnly: "Content only",
  openInFigma: "Open in Figma", svgDescription: "Editable vectors and text. The same font is required.",
  useOnWeb: "Use on the web", htmlDescription: "A ZIP with responsive styles, fonts, and source notices.",
  editLater: "Continue editing later", jsonDescription: "Saves every value and composition detail for re-import.", preparing: "Preparing",
  exportUnavailable: "Export becomes available after valid settings and the font are ready.", exportFootnote: "The current preview mode is included. SVG is separate from Figma's native Layout Guide.",
  importSettings: "Import settings JSON", aboutTitle: "Possibility found within order", aboutLead: "A grid is not an answer; it is a starting point for better questions.",
  modulesPrinciple: "Modules and combinations", rhythmPrinciple: "Rows and rhythm", whitespacePrinciple: "Intentional whitespace", fontNotices: "Font sources and usage notes",
  resetTitle: "Return to the default settings?", resetDescription: "Return to a 1440 × 1024 artboard, 20 modules, and Inter. Export JSON first to keep the current settings.", cancel: "Cancel", reset: "Reset",
  imported: "Settings imported.", importFailed: "Import failed", downloaded: "Your download is ready. Check the browser downloads list.", exportFailed: "Export failed",
  presetApplied: "preset applied. Grid and typography settings were kept.", resetComplete: "Reset to default settings.", storageUnavailable: "Browser storage is unavailable. Save the settings as JSON.",
  language: "Language", english: "English", korean: "한국어", regular: "Regular", bold: "Bold", medium: "Medium",
  categoryWeb: "Web · Figma", categoryKoreanPaper: "Korean paper sizes", categoryKoreanFinished: "Korean finished sizes", categoryUS: "US", categoryCustom: "Custom"
};
const ko: Record<string, string> = {
  randomWorkflow: "두 단계로 레이아웃 만들기", buildGrid: "그리드 선택", composeContent: "그리드 위에 구성",
  randomGrid: "랜덤 그리드", randomTypography: "랜덤 타이포", randomTypographyImage: "랜덤 타이포 + 이미지",
  lockGrid: "그리드 잠금", unlockGrid: "그리드 잠금 해제", lockComposition: "구성 잠금", unlockComposition: "구성 잠금 해제",
  gridSeed: "그리드 시드", typeSeed: "타이포 시드", applyGridSeed: "그리드 시드 적용", applyTypeSeed: "타이포 시드 적용",
  gridStageHint: "마음에 드는 그리드를 찾아 잠그세요.", gridLockedHint: "잠금됨. 작업판·분할·여백·거터가 유지됩니다.",
  lockGridFirst: "그리드를 잠근 후 시작하세요.", typeStageHint: "구성을 탐색하고, 마음에 들면 잠그세요.",
  compositionLockedHint: "잠금됨. 이 구성을 내보낼 수 있습니다.", unlockGridNotice: "그리드와 구성의 잠금을 해제했습니다. 현재 배치는 유지됩니다.",
  emptyGrid: "마음에 드는 그리드인가요? 위에서 잠근 다음 타이포나 이미지 박스를 얹어 보세요.",
  emptyGridLocked: "그리드가 잠겼습니다. 위에서 랜덤 타이포 또는 랜덤 타이포 + 이미지를 선택하세요.",
  emptyComposition: "콘텐츠를 얹기 전의 빈 그리드입니다.", modeTypography: "선택한 그리드 위에 시드로 배치한 타이포입니다.", modeTypeImage: "선택한 그리드 위에 시드로 배치한 타이포와 이미지 박스입니다.",
  imageRatios: "이미지 박스 비율", imageRatio: "이미지 비율", imageRatiosHint: "랜덤 타이포 + 이미지에 사용할 비율입니다. 사진 대신 박스를 표시합니다. 최소 하나를 선택하세요.",
  content: "콘텐츠",
  about: "Grid System 소개", close: "닫기", retry: "다시 시도", randomLayout: "랜덤 레이아웃", seed: "시드", apply: "적용",
  gridPrinciples: "그리드 원리", importJson: "설정 JSON 불러오기", export: "내보내기", openProperties: "속성 패널 열기", layoutPreview: "레이아웃 미리보기", previewDisplay: "미리보기 표시", overlay: "그리드 + 콘텐츠", text: "텍스트", grid: "그리드", fields: "분할", loading: "그리드와 폰트를 준비하고 있습니다.", invalidDraft: "입력값의 범위를 확인하세요. 마지막으로 완성된 미리보기를 표시합니다.", lastPreview: "마지막 유효한 미리보기를 표시합니다.", fitMargins: "여백·간격 맞추기", modules: "분할", module: "모듈", fit: "맞춤", previewZoom: "미리보기 배율", closeProperties: "속성 패널 닫기", properties: "레이아웃 설정", resetSettings: "설정 초기화", artboard: "작업판", web: "웹", print: "인쇄", chooseArtboard: "작업판 프리셋 선택", custom: "사용자 지정", width: "폭", height: "높이", swapOrientation: "가로·세로 방향 전환", lengthUnit: "길이 입력 단위", webHeightHint: "작업판 높이는 자유롭게 늘릴 수 있습니다.", gridSettings: "그리드", linked: "연결됨", individual: "개별", linkMargins: "여백 연결", linkGutters: "간격 연결", topMargin: "위 여백", rightMargin: "오른쪽 여백", bottomMargin: "아래 여백", leftMargin: "왼쪽 여백", horizontalGutter: "가로 간격", verticalGutter: "세로 간격", baseline: "베이스라인 가이드", typography: "타이포그래피", typeUnit: "타이포그래피 입력 단위", chooseFont: "폰트 선택", fontSize: "글자 크기", fontWeight: "폰트 굵기", letterSpacing: "자간", lineHeight: "행간", colors: "색상", textColor: "텍스트 색상", gridColor: "그리드 색상", opacity: "불투명도", composition: "문단 배치", aligned: "정렬형", asymmetric: "비대칭형", editorial: "제목 강조형", free: "자유 배치", paragraphFill: "문단 채우기", leadingHint: "행간은 의도적으로 글리프보다 작게 설정할 수 있어 줄이 겹칠 수 있습니다.", compositionNote: "같은 그리드, 서로 다른 가능성. 원문의 문장이 모듈에 맞춰 이어집니다.", calculating: "폰트·문단 계산 중", saved: "브라우저에 자동 저장됨", checkSettings: "설정을 확인하세요", localSave: "로컬 저장", settingsFile: "설정 JSON 파일", dismissNotice: "알림 닫기", artboardPresets: "작업판 프리셋", presetSearch: "프리셋 검색", searchPreset: "이름 또는 규격 검색", noPresets: "일치하는 규격이 없습니다. 작업판의 폭과 높이를 직접 입력할 수도 있습니다.", webFootnote: "Figma Frame 프리셋 기준. 높이는 웹페이지의 제한이 아닌 시작값입니다.", printFootnote: "ISO B와 JIS B, 국내 국절과 완성 판형을 구분합니다. 인쇄소의 재단 규격은 별도로 확인하세요.", fontPicker: "폰트 선택", fontSearch: "폰트 검색", searchFont: "12종의 서체에서 찾아보세요", fontFootnote: "서체 선택 후 실제 글자 폭으로 문단을 다시 배치합니다. 원문은 그대로 유지됩니다.", exportLayout: "레이아웃 내보내기", exportIntro: "지금의 그리드를 다음 작업으로 가져가세요.", gridOnly: "그리드만", textOnly: "콘텐츠만", openInFigma: "Figma에서 열기", svgDescription: "편집 가능한 벡터와 텍스트. 같은 폰트가 필요합니다.", useOnWeb: "웹 개발에 사용하기", htmlDescription: "반응형 스타일, 폰트, 출처 고지를 담은 ZIP.", editLater: "나중에 이어서 편집하기", jsonDescription: "모든 수치와 구성 정보를 저장하고 다시 불러옵니다.", preparing: "준비 중", exportUnavailable: "유효한 설정과 폰트 준비가 완료되면 내보낼 수 있습니다.", exportFootnote: "현재 보기 모드가 출력에 적용됩니다. SVG는 Figma의 네이티브 Layout Guide와는 별개입니다.", importSettings: "설정 JSON 불러오기", aboutTitle: "질서 안에서 발견하는 가능성", aboutLead: "그리드는 답이 아니라, 더 좋은 질문을 위한 시작점입니다.", modulesPrinciple: "모듈과 결합", rhythmPrinciple: "행과 리듬", whitespacePrinciple: "의도적인 여백", fontNotices: "폰트 출처와 사용 안내", resetTitle: "기본 설정으로 돌아갈까요?", resetDescription: "1440 × 1024 작업판, 20분할, Inter로 돌아갑니다. 현재 설정을 보관하려면 먼저 JSON으로 내보내세요.", cancel: "취소", reset: "초기화", imported: "설정을 불러왔습니다.", importFailed: "불러오기 실패", downloaded: "다운로드를 준비했습니다. 브라우저의 다운로드 목록을 확인하세요.", exportFailed: "내보내기 실패", presetApplied: "규격을 적용했습니다. 그리드와 타이포그래피 설정은 유지됩니다.", resetComplete: "기본 설정으로 초기화했습니다.", storageUnavailable: "브라우저 저장 공간을 사용할 수 없습니다. 설정 JSON으로 저장하세요.", language: "언어", english: "English", korean: "한국어", regular: "Regular", bold: "Bold", medium: "Medium", categoryWeb: "웹 · Figma", categoryKoreanPaper: "국내 국절 (원지)", categoryKoreanFinished: "국내 완성 판형", categoryUS: "미국", categoryCustom: "사용자 지정"
};

export function t(locale: Locale, key: string): string { return (locale === "ko" ? ko : en)[key] ?? key; }

export function translatePreset(locale: Locale, value: string): string {
  if (locale === "ko") return value;
  if (value.startsWith("웹 · Figma ")) return `Web · Figma ${value.slice("웹 · Figma ".length)}`;
  if (value === "웹") return "Web";
  const map: Record<string, string> = { "국전지 · 원지 기준": "Korean full sheet · raw stock", "국2절 · 원지 기준": "Korean 2-cut · raw stock", "국4절 · 원지 기준": "Korean 4-cut · raw stock", "국8절 · 원지 기준": "Korean 8-cut · raw stock", "국16절 · 원지 기준": "Korean 16-cut · raw stock", "국32절 · 원지 기준": "Korean 32-cut · raw stock", "국배판 · 완성 판형": "Korean large format · finished", "국판 · 완성 판형": "Korean standard format · finished", "신국판 · 완성 판형": "Korean new standard · finished", "국내 국절 (원지)": "Korean paper sizes", "국내 완성 판형": "Korean finished sizes", "미국": "US" };
  return map[value] ?? value;
}

export function translateMessage(locale: Locale, message: string): string {
  if (locale === "ko" || !message) return message;
  const phrases: Record<string, string> = {
    "현재 설정이 올바르지 않습니다.": "Check the current settings before generating a layout.",
    "단계별 생성 상태를 확인하세요.": "Check the generation stages, locks, seeds, and image ratios.",
    "현재 그리드는 읽기 가능한 제목과 3행 문단을 함께 담기에는 너무 작습니다.": "This grid cannot fit a readable heading and three body lines. Increase the artboard or reduce the margins, gutters, or type size.",
    "현재 그리드에서는 읽기 가능한 본문과 이미지 상자를 동시에 배치할 수 없습니다.": "This grid cannot fit readable text and image boxes together. Try typography only or adjust the grid.",
    "저장된 설정을 읽을 수 없어 기본 설정으로 시작했습니다.": "Saved settings could not be read, so the default settings were loaded.",
    "폰트 또는 레이아웃을 불러오지 못했습니다. 다시 시도하세요.": "The font or layout could not be loaded. Try again.",
    "설정 파일은 250 KB 이하여야 합니다.": "The settings file must be 250 KB or smaller.",
    "설정은 객체여야 합니다.": "Settings must be an object.",
    "지원하지 않는 설정 버전입니다.": "This settings version is not supported.",
    "작업판 정보가 올바르지 않습니다.": "Artboard information is invalid.",
    "작업판 메타데이터와 폭·높이를 확인하세요.": "Check the artboard metadata, width, and height.",
    "작업판은 0보다 크고 16,000px 이하여야 합니다.": "The artboard must be greater than 0 and no larger than 16,000px.",
    "열·행은 1~32 정수이고 전체 모듈은 1,000개 이하여야 합니다.": "Columns and rows must be integers from 1 to 32, with at most 1,000 modules total.",
    "여백의 모든 값은 0 이상의 유한수여야 합니다.": "Every margin value must be a finite number greater than or equal to 0.",
    "간격의 모든 값은 0 이상의 유한수여야 합니다.": "Every gutter value must be a finite number greater than or equal to 0.",
    "등록되지 않은 폰트입니다.": "The font is not registered.",
    "선택한 폰트가 지원하는 글자 굵기를 선택하세요.": "Choose a font weight supported by the selected font.",
    "글자 크기는 4.5~90pt 범위여야 합니다.": "Font size must be between 4.5 and 90pt.",
    "행간은 1~160px 범위여야 합니다.": "Line height must be between 1 and 160px.",
    "자간은 -2~10px 범위여야 합니다.": "Letter spacing must be between -2 and 10px.",
    "색상은 #RRGGBB 형식이어야 합니다.": "Colors must use the #RRGGBB format.",
    "불투명도는 0에서 1 사이여야 합니다.": "Opacity must be between 0 and 1.",
    "알 수 없는 배치 방식입니다.": "Unknown composition style.",
    "문단 밀도는 15~100% 범위여야 합니다.": "Paragraph density must be between 15 and 100%.",
    "구성 seed는 안전한 정수여야 합니다.": "Composition seed must be a safe integer.",
    "구성 seed는 -2,147,483,647~2,147,483,647 정수여야 합니다.": "Composition seed must be an integer from -2,147,483,647 to 2,147,483,647.",
    "보기 모드 또는 베이스라인 값을 확인하세요.": "Check the preview mode and baseline value.",
    "여백과 간격 때문에 사용할 수 있는 작업 영역이 없습니다.": "Margins and gutters leave no usable artboard area.",
    "안전하지 않은 모듈 배치가 감지되었습니다.": "An unsafe module placement was detected.",
    "샘플 원문이 비어 있어 문단을 배치할 수 없습니다.": "The sample text is empty, so paragraphs cannot be placed.",
    "행간이 실제 글리프 높이보다 작아 줄이 겹칠 수 있습니다.": "Line height is smaller than the actual glyph height, so lines may overlap.",
    "전체 텍스트 행 수를 성능 보호를 위해 10,000행으로 제한했습니다.": "Total text lines were limited to 10,000 to protect performance.",
    "현재 설정으로는 온전한 텍스트 행을 배치할 수 없습니다.": "The current settings cannot place a complete text line.",
  };
  let result = message
    .replace(/설정 JSON을 불러올 수 없습니다:/g, "Could not import settings JSON:")
    .replace(/알 수 없는 오류/g, "Unknown error")
    .replace(/필수 설정 '([^']+)'이 없습니다\./g, "Required setting '$1' is missing.")
    .replace(/(\d+)번 영역의 행간이 실제 글리프 높이보다 작습니다\./g, "Area $1 has line height smaller than the actual glyph height.")
    .replace(/(\d+)번 영역은 온전한 글리프를 담기에는 너무 작습니다\./g, "Area $1 is too small to contain a complete glyph.")
    .replace(/(\d+)번 영역은 한 글리프도 온전히 담을 수 없습니다\./g, "Area $1 cannot contain even one complete glyph.")
    .replace(/자산을 가져오지 못했습니다: ?/g, "Could not fetch asset: ")
    .replace(/폰트 파일을 가져오지 못했습니다: ?/g, "Could not fetch font file: ")
    .replace(/(.+?) 폰트를 불러오지 못했습니다\. 연결을 확인하고 다시 시도하세요\./g, "$1 font could not be loaded. Check your connection and try again.");
  for (const [source, translated] of Object.entries(phrases)) result = result.replaceAll(source, translated);
  return result;
}
