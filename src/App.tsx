import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import type { FontDefinition, LayoutResult, PageUnit, Settings } from "./model";
import {
  calculateLayout,
  DEFAULT_SETTINGS,
  fromPx,
  pageSize,
  parseSettings,
  toPx,
  validateSettings,
} from "./core";
import { applyPreset, getPreset, PRESETS } from "./presets";
import { exportHtmlPackage, exportSvg, serializeSettings } from "./export";
import { FONTS, getFont, loadFont, makeMeasurer, nearestWeight } from "./fonts";
import sample from "./sample.txt?raw";

const STORAGE_KEY = "grid-system.settings.v1";
const format = (value: number, digits = 2) =>
  Number(value.toFixed(digits)).toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4" />
        <path d="M5 15v5h14v-5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m-4 4 4-4 4 4" />
        <path d="M5 15v5h14v-5" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    refresh: (
      <>
        <path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6" />
      </>
    ),
    swap: (
      <>
        <path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    grid: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M9 4v16m6-16v16M4 9h16M4 15h16" />
      </>
    ),
    book: (
      <>
        <path d="M12 5v15M3 4c4-1 6 0 9 1 3-1 5-2 9-1v15c-4-1-6 0-9 1-3-1-5-2-9-1Z" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="8" cy="7" r="2.5" fill="currentColor" />
        <circle cx="16" cy="17" r="2.5" fill="currentColor" />
      </>
    ),
    link: (
      <>
        <path d="m9 15 6-6m-5-3 2-2a4 4 0 0 1 6 6l-2 2M8 12l-2 2a4 4 0 0 0 6 6l2-2" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    expand: (
      <>
        <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h8l4 4v14H6ZM14 3v5h4M9 12h6M9 16h6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.grid}
    </svg>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
  invalidChanged,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  invalidChanged: (id: string, invalid: boolean) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(Number(value.toFixed(4))));
  const [editing, setEditing] = useState(false);
  const invalid =
    draft.trim() === "" ||
    !Number.isFinite(Number(draft)) ||
    (min !== undefined && Number(draft) < min) ||
    (max !== undefined && Number(draft) > max);
  useEffect(() => {
    if (!editing) setDraft(String(Number(value.toFixed(4))));
  }, [value, editing]);
  useEffect(() => {
    invalidChanged(id, invalid);
    return () => invalidChanged(id, false);
  }, [id, invalid, invalidChanged]);
  return (
    <label className={`number-field ${invalid ? "invalid" : ""}`}>
      <span className="field-label">{label}</span>
      <span className="input-shell">
        <input
          type="number"
          aria-label={label}
          aria-invalid={invalid}
          value={draft}
          step={step}
          min={min}
          max={max}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (next.trim() !== "" && Number.isFinite(Number(next)))
              onChange(Number(next));
          }}
        />
        {unit && <span className="input-unit">{unit}</span>}
      </span>
    </label>
  );
}

function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  invalidChanged,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  invalidChanged: (id: string, invalid: boolean) => void;
}) {
  return (
    <div className="range-field">
      <NumberField
        {...{ label, value, onChange, min, max, step, unit, invalidChanged }}
      />
      <input
        type="range"
        aria-label={`${label} 슬라이더`}
        min={min}
        max={max}
        step={step}
        value={Math.max(min, Math.min(max, value))}
        style={
          {
            "--range-progress": `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`,
          } as CSSProperties
        }
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function Dialog({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            close();
        }
      }}
    >
      <div className="dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="닫기" onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function readInitial(): { settings: Settings; message: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return {
      settings: saved
        ? parseSettings(saved)
        : structuredClone(DEFAULT_SETTINGS),
      message: "",
    };
  } catch {
    return {
      settings: structuredClone(DEFAULT_SETTINGS),
      message: "저장된 설정을 읽을 수 없어 기본 설정으로 시작했습니다.",
    };
  }
}

interface ReadyLayout {
  settings: Settings;
  layout: LayoutResult;
  font: FontDefinition;
}

export default function App() {
  const [initial] = useState(readInitial);
  const [settings, setSettings] = useState(initial.settings);
  const [ready, setReady] = useState<ReadyLayout | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [failure, setFailure] = useState("");
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState(initial.message);
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>(
    {},
  );
  const [dialog, setDialog] = useState<
    "presets" | "fonts" | "export" | "about" | "reset" | null
  >(null);
  const [query, setQuery] = useState("");
  const [presetMode, setPresetMode] = useState(settings.page.mode);
  const [inputUnit, setInputUnit] = useState<"px" | "mm">(
    settings.page.mode === "web" ? "px" : "mm",
  );
  const [typeUnit, setTypeUnit] = useState<"px" | "pt">("px");
  const [linkedMargins, setLinkedMargins] = useState(true);
  const [linkedGutters, setLinkedGutters] = useState(true);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [viewport, setViewport] = useState({ width: 1000, height: 750 });
  const [exporting, setExporting] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const errors = useMemo(() => validateSettings(settings), [settings]);
  const hasDraftError = Object.values(invalidFields).some(Boolean);
  const font = getFont(settings.fontId);
  const dimensions = pageSize(settings.page);
  const currentPreset = getPreset(settings.page.presetId);
  const invalidChanged = useCallback(
    (id: string, invalid: boolean) =>
      setInvalidFields((current) => {
        if (!!current[id] === invalid) return current;
        const next = { ...current };
        if (invalid) next[id] = true;
        else delete next[id];
        return next;
      }),
    [],
  );
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (errors.length) {
      setStatus("error");
      setFailure(errors[0]);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setFailure("");
    const timer = window.setTimeout(async () => {
      try {
        const selected = getFont(settings.fontId);
        await loadFont(selected, settings.fontWeight);
        if (cancelled) return;
        const result = calculateLayout(
          settings,
          sample,
          makeMeasurer(selected, settings.fontWeight, settings.letterSpacing),
        );
        if (cancelled) return;
        setReady({ settings, layout: result, font: selected });
        setStatus("ready");
        try {
          localStorage.setItem(STORAGE_KEY, serializeSettings(settings));
        } catch {
          setNotice(
            "브라우저 저장 공간을 사용할 수 없습니다. 설정 JSON으로 저장하세요.",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setFailure(
            error instanceof Error
              ? error.message
              : "폰트 또는 레이아웃을 불러오지 못했습니다. 다시 시도하세요.",
          );
        }
      }
    }, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [settings, retry, errors]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setViewport({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);

  const svg = useMemo(
    () => (ready ? exportSvg(ready.settings, ready.layout, ready.font) : ""),
    [ready],
  );
  const fit = ready
    ? Math.max(
        0.01,
        Math.min(
          (viewport.width - (viewport.width < 600 ? 48 : 96)) /
            ready.layout.width,
          (viewport.height - 106) / ready.layout.height,
          1.5,
        ),
      )
    : 1;
  const scale = zoom === "fit" ? fit : zoom;
  const canExport =
    status === "ready" && !!ready && !hasDraftError && !exporting;
  const openPicker = (kind: "presets" | "fonts") => {
    setQuery("");
    setPresetMode(settings.page.mode);
    setDialog(kind);
  };

  function setPageDimension(key: "width" | "height", value: number) {
    const next = {
      ...settings.page,
      [key]: fromPx(toPx(value, inputUnit), settings.page.unit),
      presetId: "custom",
      category: "Custom",
    };
    next.orientation = next.width > next.height ? "landscape" : "portrait";
    change("page", next);
  }

  function setMargin(key: keyof Settings["margin"], value: number) {
    const px = toPx(value, inputUnit);
    change(
      "margin",
      linkedMargins
        ? { top: px, right: px, bottom: px, left: px }
        : { ...settings.margin, [key]: px },
    );
  }

  function choosePreset(preset: (typeof PRESETS)[number]) {
    setSettings((current) => applyPreset(current, preset));
    setInputUnit(preset.mode === "web" ? "px" : "mm");
    setZoom("fit");
    setDialog(null);
    setNotice(
      `${preset.name} 규격을 적용했습니다. 그리드와 타이포그래피 설정은 유지됩니다.`,
    );
  }

  async function download(kind: "svg" | "html" | "json") {
    if (!canExport || !ready) return;
    setExporting(kind);
    try {
      const blob =
        kind === "svg"
          ? new Blob([exportSvg(ready.settings, ready.layout, ready.font)], {
              type: "image/svg+xml;charset=utf-8",
            })
          : kind === "json"
            ? new Blob([serializeSettings(ready.settings)], {
                type: "application/json",
              })
            : await exportHtmlPackage(ready.settings, ready.layout, ready.font);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `grid-system-${ready.settings.columns}x${ready.settings.rows}.${kind === "html" ? "zip" : kind}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setNotice(
        "다운로드를 준비했습니다. 브라우저의 다운로드 목록을 확인하세요.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `내보내기 실패: ${error.message}`
          : "내보내기에 실패했습니다. 다시 시도하세요.",
      );
    } finally {
      setExporting("");
    }
  }

  const numberProps = { invalidChanged };
  const typeFactor = typeUnit === "pt" ? 0.75 : 1;

  return (
    <div className={`app-shell ${mobilePanel ? "panel-open" : ""}`}>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setDialog("about");
          }}
          aria-label="Grid System 소개"
        >
          <span className="brand-mark" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
          <span>
            Grid System<span className="version">1.0</span>
          </span>
        </a>
        <div className="header-presets" aria-label="그리드 분할 프리셋">
          <button
            className={
              settings.columns === 4 && settings.rows === 5 ? "active" : ""
            }
            onClick={() =>
              setSettings((current) => ({ ...current, columns: 4, rows: 5 }))
            }
          >
            20분할<span>4 × 5</span>
          </button>
          <button
            className={
              settings.columns === 4 && settings.rows === 8 ? "active" : ""
            }
            onClick={() =>
              setSettings((current) => ({ ...current, columns: 4, rows: 8 }))
            }
          >
            32분할<span>4 × 8</span>
          </button>
        </div>
        <div className="header-actions">
          <button
            className="quiet-button principle-button"
            onClick={() => setDialog("about")}
          >
            <Icon name="book" />
            <span>그리드 원리</span>
          </button>
          <button
            className="icon-button import-button"
            title="설정 JSON 불러오기"
            aria-label="설정 JSON 불러오기"
            onClick={() => importRef.current?.click()}
          >
            <Icon name="upload" />
          </button>
          <button
            className="primary-button"
            aria-label="내보내기"
            onClick={() => setDialog("export")}
          >
            <Icon name="download" />
            <span>내보내기</span>
          </button>
          <button
            className="icon-button mobile-settings"
            aria-label="속성 패널 열기"
            aria-expanded={mobilePanel}
            onClick={() => setMobilePanel(!mobilePanel)}
          >
            <Icon name="settings" />
          </button>
        </div>
      </header>

      <main className="editor">
        <section className="workspace" aria-label="레이아웃 미리보기">
          <div className="workspace-toolbar">
            <div className="document-heading">
              <span className="document-dot" />
              <strong>{currentPreset?.name ?? "Custom"}</strong>
              <span>
                {format(dimensions.width)} × {format(dimensions.height)} px
              </span>
            </div>
            <div className="view-switch" aria-label="미리보기 표시">
              {(
                [
                  ["overlay", "그리드 + 텍스트"],
                  ["text", "텍스트"],
                  ["grid", "그리드"],
                ] as const
              ).map(([key, name]) => (
                <button
                  key={key}
                  className={settings.view === key ? "selected" : ""}
                  aria-pressed={settings.view === key}
                  onClick={() => change("view", key)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="canvas-viewport" ref={viewportRef}>
            <div
              className="canvas-space"
              style={
                ready
                  ? {
                      minWidth: ready.layout.width * scale + 70,
                      minHeight: ready.layout.height * scale + 88,
                    }
                  : undefined
              }
            >
              {ready ? (
                <div
                  className="artboard-wrap"
                  style={{
                    width: ready.layout.width * scale,
                    height: ready.layout.height * scale,
                  }}
                >
                  <div className="artboard-label">
                    <span>
                      {ready.settings.columns * ready.settings.rows} fields
                    </span>
                    <span>{ready.font.name}</span>
                  </div>
                  <div className="ruler ruler-horizontal" aria-hidden="true">
                    {Array.from({ length: 9 }, (_, i) => (
                      <span key={i} style={{ left: `${i * 12.5}%` }}>
                        {Math.round((ready.layout.width * i) / 8)}
                      </span>
                    ))}
                  </div>
                  <div className="ruler ruler-vertical" aria-hidden="true">
                    {Array.from({ length: 7 }, (_, i) => (
                      <span key={i} style={{ top: `${(i / 6) * 100}%` }}>
                        {Math.round((ready.layout.height * i) / 6)}
                      </span>
                    ))}
                  </div>
                  <div
                    className="artboard"
                    data-testid="artboard"
                    role="img"
                    aria-label={`${ready.settings.columns}열 ${ready.settings.rows}행, ${ready.font.name} 문단 레이아웃`}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  <span className="canvas-corner" aria-hidden="true" />
                </div>
              ) : (
                <div className="loading-canvas">
                  <Icon name="grid" size={36} />
                  <p>{failure || "그리드와 폰트를 준비하고 있습니다."}</p>
                  {failure && (
                    <button
                      className="secondary-button"
                      onClick={() => setRetry((v) => v + 1)}
                    >
                      다시 시도
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {(failure ||
            hasDraftError ||
            (ready?.layout.warnings.length ?? 0) > 0) && (
            <div
              className={`canvas-message ${failure || hasDraftError ? "error-message" : ""}`}
              role="status"
            >
              <span>
                {hasDraftError
                  ? "입력값의 범위를 확인하세요. 마지막으로 완성된 미리보기를 표시합니다."
                  : failure
                    ? `${failure} ${ready ? "마지막 유효한 미리보기를 표시합니다." : ""}`
                    : ready?.layout.warnings[0]}
              </span>
              {failure && !errors.length && (
                <button onClick={() => setRetry((v) => v + 1)}>
                  다시 시도
                </button>
              )}
              {errors.some((error) => error.includes("작업 영역")) && (
                <button
                  onClick={() => {
                    const { width, height } = dimensions;
                    setSettings((current) => ({
                      ...current,
                      margin: {
                        top: height * 0.04,
                        right: width * 0.04,
                        bottom: height * 0.04,
                        left: width * 0.04,
                      },
                      gutter: { x: width * 0.01, y: height * 0.01 },
                    }));
                  }}
                >
                  여백·간격 맞추기
                </button>
              )}
            </div>
          )}
          <footer className="workspace-footer">
            <div className="grid-summary">
              <Icon name="grid" size={16} />
              <strong>
                {settings.columns} × {settings.rows}
                <span className="equals">=</span>
                {settings.columns * settings.rows}분할
              </strong>
              <span className="module-dimensions">
                모듈{" "}
                {ready
                  ? `${format(ready.layout.moduleWidth)} × ${format(ready.layout.moduleHeight)} px`
                  : "—"}
              </span>
            </div>
            <div className="zoom-controls">
              <button
                className="icon-button"
                title="화면에 맞춤"
                aria-label="화면에 맞춤"
                onClick={() => setZoom("fit")}
              >
                <Icon name="expand" size={16} />
              </button>
              <select
                aria-label="미리보기 배율"
                value={zoom}
                onChange={(event) =>
                  setZoom(
                    event.target.value === "fit"
                      ? "fit"
                      : Number(event.target.value),
                  )
                }
              >
                <option value="fit">맞춤 {format(scale * 100, 0)}%</option>
                {[0.25, 0.5, 0.75, 1, 1.5, 2].map((value) => (
                  <option key={value} value={value}>
                    {value * 100}%
                  </option>
                ))}
              </select>
            </div>
          </footer>
        </section>

        {mobilePanel && (
          <button
            className="panel-scrim"
            aria-label="속성 패널 닫기"
            onClick={() => setMobilePanel(false)}
          />
        )}
        <aside className="inspector" aria-label="레이아웃 속성">
          <div className="inspector-heading">
            <h1>레이아웃 설정</h1>
            <button
              className="icon-button reset-button"
              aria-label="설정 초기화"
              title="설정 초기화"
              onClick={() => setDialog("reset")}
            >
              <Icon name="refresh" size={16} />
            </button>
            <button
              className="icon-button mobile-panel-close"
              aria-label="속성 패널 닫기"
              onClick={() => setMobilePanel(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="inspector-scroll">
            <section className="control-section">
              <div className="section-heading">
                <h2>작업판</h2>
                <div className="mini-segment">
                  {(["web", "print"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={settings.page.mode === mode ? "selected" : ""}
                      onClick={() => {
                        setPresetMode(mode);
                        setQuery("");
                        setDialog("presets");
                      }}
                    >
                      {mode === "web" ? "웹" : "인쇄"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="picker-button"
                onClick={() => openPicker("presets")}
                aria-label="작업판 프리셋 선택"
              >
                <Icon name="file" size={16} />
                <span>
                  {currentPreset?.name ?? "Custom"}
                  <small>
                    {settings.page.mode === "web"
                      ? "Figma Frame"
                      : settings.page.category}
                  </small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
              <div className="dimension-row">
                <NumberField
                  label="폭"
                  value={fromPx(dimensions.width, inputUnit)}
                  onChange={(value) => setPageDimension("width", value)}
                  unit={inputUnit}
                  min={0.1}
                  step={inputUnit === "mm" ? 0.1 : 1}
                  {...numberProps}
                />
                <button
                  className="icon-button swap-button"
                  aria-label="가로·세로 방향 전환"
                  title="가로·세로 방향 전환"
                  onClick={() => {
                    change("page", {
                      ...settings.page,
                      width: settings.page.height,
                      height: settings.page.width,
                      orientation:
                        settings.page.orientation === "portrait"
                          ? "landscape"
                          : "portrait",
                    });
                    setZoom("fit");
                  }}
                >
                  <Icon name="swap" size={16} />
                </button>
                <NumberField
                  label="높이"
                  value={fromPx(dimensions.height, inputUnit)}
                  onChange={(value) => setPageDimension("height", value)}
                  unit={inputUnit}
                  min={0.1}
                  step={inputUnit === "mm" ? 0.1 : 1}
                  {...numberProps}
                />
              </div>
              <div className="hint-row">
                <span>
                  {settings.page.mode === "print"
                    ? `${format(fromPx(dimensions.width, "mm"))} × ${format(fromPx(dimensions.height, "mm"))} mm${settings.page.unit === "in" ? ` / ${format(settings.page.width)} × ${format(settings.page.height)} in` : ""}`
                    : "작업판 높이는 자유롭게 늘릴 수 있습니다."}
                </span>
                {settings.page.mode === "print" && (
                  <select
                    aria-label="길이 입력 단위"
                    value={inputUnit}
                    onChange={(event) =>
                      setInputUnit(event.target.value as "px" | "mm")
                    }
                  >
                    <option value="px">px</option>
                    <option value="mm">mm</option>
                  </select>
                )}
              </div>
            </section>

            <section className="control-section">
              <div className="section-heading">
                <h2>그리드</h2>
                <span className="count-badge">
                  {settings.columns === 4 && [5, 8].includes(settings.rows)
                    ? `${settings.columns * settings.rows}분할`
                    : "Custom"}
                </span>
              </div>
              <div className="two-columns">
                <NumberField
                  label="Columns"
                  value={settings.columns}
                  onChange={(value) => change("columns", value)}
                  min={1}
                  max={32}
                  {...numberProps}
                />
                <NumberField
                  label="Rows"
                  value={settings.rows}
                  onChange={(value) => change("rows", value)}
                  min={1}
                  max={32}
                  {...numberProps}
                />
              </div>
              <div className="subsection-heading">
                <span>Margin</span>
                <button
                  className={`link-button ${linkedMargins ? "linked" : ""}`}
                  aria-label="여백 연결"
                  aria-pressed={linkedMargins}
                  onClick={() => {
                    setLinkedMargins(!linkedMargins);
                    if (!linkedMargins)
                      change("margin", {
                        top: settings.margin.top,
                        right: settings.margin.top,
                        bottom: settings.margin.top,
                        left: settings.margin.top,
                      });
                  }}
                >
                  <Icon name="link" size={13} />
                  {linkedMargins ? "연결됨" : "개별"}
                </button>
              </div>
              <div className="four-columns">
                {(
                  [
                    ["top", "위"],
                    ["right", "오른쪽"],
                    ["bottom", "아래"],
                    ["left", "왼쪽"],
                  ] as const
                ).map(([key, label]) => (
                  <NumberField
                    key={key}
                    label={`${label} 여백`}
                    value={fromPx(settings.margin[key], inputUnit)}
                    unit={inputUnit}
                    onChange={(value) => setMargin(key, value)}
                    min={0}
                    step={0.5}
                    {...numberProps}
                  />
                ))}
              </div>
              <div className="subsection-heading">
                <span>Gutter</span>
                <button
                  className={`link-button ${linkedGutters ? "linked" : ""}`}
                  aria-label="간격 연결"
                  aria-pressed={linkedGutters}
                  onClick={() => {
                    setLinkedGutters(!linkedGutters);
                    if (!linkedGutters)
                      change("gutter", {
                        x: settings.gutter.x,
                        y: settings.gutter.x,
                      });
                  }}
                >
                  <Icon name="link" size={13} />
                  {linkedGutters ? "연결됨" : "개별"}
                </button>
              </div>
              <div className="two-columns">
                {(
                  [
                    ["x", "가로 간격"],
                    ["y", "세로 간격"],
                  ] as const
                ).map(([key, label]) => (
                  <NumberField
                    key={key}
                    label={label}
                    value={fromPx(settings.gutter[key], inputUnit)}
                    unit={inputUnit}
                    onChange={(value) => {
                      const px = toPx(value, inputUnit);
                      change(
                        "gutter",
                        linkedGutters
                          ? { x: px, y: px }
                          : { ...settings.gutter, [key]: px },
                      );
                    }}
                    min={0}
                    step={0.5}
                    {...numberProps}
                  />
                ))}
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={settings.baseline}
                  onChange={(event) => change("baseline", event.target.checked)}
                />
                <span>베이스라인 가이드</span>
                <span className="subtle">{format(settings.lineHeight)} px</span>
              </label>
            </section>

            <section className="control-section">
              <div className="section-heading">
                <h2>타이포그래피</h2>
                <select
                  aria-label="타이포그래피 입력 단위"
                  className="unit-select"
                  value={typeUnit}
                  onChange={(event) =>
                    setTypeUnit(event.target.value as "px" | "pt")
                  }
                >
                  <option value="px">px</option>
                  <option value="pt">pt</option>
                </select>
              </div>
              <button
                className="picker-button font-picker"
                onClick={() => openPicker("fonts")}
                aria-label="폰트 선택"
              >
                <span className="font-symbol">Aa</span>
                <span>
                  {font.name}
                  <small>{font.category}</small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
              <div className="two-columns">
                <NumberField
                  label="글자 크기"
                  value={settings.fontSize * typeFactor}
                  onChange={(value) => change("fontSize", value / typeFactor)}
                  unit={typeUnit}
                  min={6 * typeFactor}
                  max={120 * typeFactor}
                  step={0.5}
                  {...numberProps}
                />
                <label className="select-field">
                  <span className="field-label">굵기</span>
                  <select
                    aria-label="폰트 굵기"
                    value={settings.fontWeight}
                    onChange={(event) =>
                      change("fontWeight", Number(event.target.value))
                    }
                  >
                    {font.weights.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                        {weight === 400
                          ? " Regular"
                          : weight === 700
                            ? " Bold"
                            : weight === 500
                              ? " Medium"
                              : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <RangeField
                label="자간"
                value={settings.letterSpacing}
                onChange={(value) => change("letterSpacing", value)}
                min={-2}
                max={10}
                step={0.1}
                unit="px"
                {...numberProps}
              />
              <RangeField
                label="행간"
                value={settings.lineHeight * typeFactor}
                onChange={(value) => change("lineHeight", value / typeFactor)}
                min={8 * typeFactor}
                max={160 * typeFactor}
                step={0.5}
                unit={typeUnit}
                {...numberProps}
              />
            </section>

            <section className="control-section">
              <div className="section-heading">
                <h2>색상</h2>
              </div>
              {(["grid", "text"] as const).map((kind) => (
                <div className="color-row" key={kind}>
                  <label className="color-label">
                    <span>{kind === "grid" ? "그리드" : "텍스트"}</span>
                    <span
                      className="color-swatch"
                      style={{ background: settings[`${kind}Color`] }}
                    >
                      <input
                        type="color"
                        aria-label={`${kind === "grid" ? "그리드" : "텍스트"} 색상`}
                        value={settings[`${kind}Color`]}
                        onChange={(event) =>
                          change(`${kind}Color`, event.target.value)
                        }
                      />
                    </span>
                    <span className="hex-label">
                      {settings[`${kind}Color`].toUpperCase()}
                    </span>
                  </label>
                  <NumberField
                    label={`${kind === "grid" ? "그리드" : "텍스트"} 불투명도`}
                    value={settings[`${kind}Opacity`] * 100}
                    onChange={(value) => change(`${kind}Opacity`, value / 100)}
                    unit="%"
                    min={0}
                    max={100}
                    {...numberProps}
                  />
                </div>
              ))}
            </section>

            <section className="control-section composition-section">
              <div className="section-heading">
                <h2>문단 배치</h2>
                <button
                  className="text-button"
                  onClick={() => change("seed", (settings.seed + 1) % 100000)}
                >
                  <Icon name="refresh" size={13} />
                  다른 구성
                </button>
              </div>
              <div className="layout-choices">
                {(
                  [
                    ["aligned", "정렬형"],
                    ["asymmetric", "비대칭형"],
                    ["editorial", "제목 강조형"],
                  ] as const
                ).map(([key, name]) => (
                  <button
                    key={key}
                    className={`layout-choice ${settings.layout === key ? "selected" : ""}`}
                    aria-pressed={settings.layout === key}
                    onClick={() => change("layout", key)}
                  >
                    <span className={`layout-mini ${key}`} aria-hidden="true">
                      {Array.from({ length: 6 }, (_, i) => (
                        <i key={i} />
                      ))}
                    </span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
              <RangeField
                label="문단 채우기"
                value={Math.round(settings.density * 100)}
                onChange={(value) => change("density", value / 100)}
                min={15}
                max={100}
                step={5}
                unit="%"
                {...numberProps}
              />
              <p className="section-note">
                같은 그리드, 서로 다른 가능성.
                <br />
                원문의 문장이 모듈에 맞춰 이어집니다.
              </p>
            </section>
            <div className="inspector-end">
              <span
                className={`status-dot ${status === "ready" ? "ready" : ""}`}
              />
              <span role="status" data-testid="layout-status">
                {status === "loading"
                  ? "폰트·문단 계산 중"
                  : status === "ready"
                    ? "브라우저에 자동 저장됨"
                    : "설정을 확인하세요"}
              </span>
              <span>로컬 저장</span>
            </div>
          </div>
        </aside>
      </main>

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="설정 JSON 파일"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 250_000)
              throw new Error("설정 파일은 250 KB 이하여야 합니다.");
            const imported = parseSettings(await file.text());
            setSettings(imported);
            setInputUnit(imported.page.mode === "web" ? "px" : "mm");
            setZoom("fit");
            setNotice("설정을 불러왔습니다.");
          } catch (error) {
            setNotice(
              `불러오기 실패: ${error instanceof Error ? error.message : "올바른 설정 JSON인지 확인하세요."}`,
            );
          }
          event.target.value = "";
        }}
      />

      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="알림 닫기"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {dialog === "presets" && (
        <Dialog title="작업판 프리셋" close={() => setDialog(null)} wide>
          <div className="dialog-toolbar">
            <div className="mini-segment">
              {(["web", "print"] as const).map((mode) => (
                <button
                  key={mode}
                  className={presetMode === mode ? "selected" : ""}
                  onClick={() => setPresetMode(mode)}
                >
                  {mode === "web" ? "웹 · Figma" : "인쇄"}
                </button>
              ))}
            </div>
            <label className="search-input">
              <Icon name="search" size={16} />
              <input
                aria-label="프리셋 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름 또는 규격 검색"
              />
            </label>
          </div>
          <div className="picker-list">
            {Array.from(
              new Set(
                PRESETS.filter((preset) => preset.mode === presetMode).map(
                  (preset) => preset.category,
                ),
              ),
            ).map((category) => {
              const presets = PRESETS.filter(
                (preset) =>
                  preset.mode === presetMode &&
                  preset.category === category &&
                  `${preset.name} ${preset.width} ${preset.height} ${category}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              );
              return (
                !!presets.length && (
                  <section className="picker-group" key={category}>
                    <h3>{category}</h3>
                    {presets.map((preset) => (
                      <button
                        className="picker-item"
                        key={preset.presetId}
                        onClick={() => choosePreset(preset)}
                      >
                        <span>{preset.name}</span>
                        <span className="preset-measure">
                          {preset.width} × {preset.height} {preset.unit}
                        </span>
                        {settings.page.presetId === preset.presetId && (
                          <Icon name="check" size={16} />
                        )}
                      </button>
                    ))}
                  </section>
                )
              );
            })}
            {!PRESETS.some(
              (preset) =>
                preset.mode === presetMode &&
                `${preset.name} ${preset.width} ${preset.height} ${preset.category}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            ) && (
              <p className="empty-state">
                일치하는 규격이 없습니다. 작업판의 폭과 높이를 직접 입력할 수도
                있습니다.
              </p>
            )}
          </div>
          <p className="dialog-footnote">
            {presetMode === "web"
              ? "Figma Frame 프리셋 기준. 높이는 웹페이지의 제한이 아닌 시작값입니다."
              : "ISO B와 JIS B, 국내 국절과 완성 판형을 구분합니다. 인쇄소의 재단 규격은 별도로 확인하세요."}
          </p>
        </Dialog>
      )}

      {dialog === "fonts" && (
        <Dialog title="폰트 선택" close={() => setDialog(null)}>
          <div className="dialog-toolbar">
            <label className="search-input">
              <Icon name="search" size={16} />
              <input
                aria-label="폰트 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="12종의 서체에서 찾아보세요"
              />
            </label>
          </div>
          <div className="picker-list">
            {(["Sans-serif", "Serif", "한국어"] as const).map((category) => (
              <section className="picker-group" key={category}>
                <h3>{category}</h3>
                {FONTS.filter(
                  (item) =>
                    item.category === category &&
                    item.name.toLowerCase().includes(query.toLowerCase()),
                ).map((item) => (
                  <button
                    className="picker-item font-item"
                    key={item.id}
                    onClick={() => {
                      setSettings((current) => ({
                        ...current,
                        fontId: item.id,
                        fontWeight: nearestWeight(item, current.fontWeight),
                      }));
                      setDialog(null);
                    }}
                  >
                    <span>{item.name}</span>
                    <span className="preset-measure">
                      {item.weights[0]}–{item.weights.at(-1)}
                    </span>
                    {settings.fontId === item.id && (
                      <Icon name="check" size={16} />
                    )}
                  </button>
                ))}
              </section>
            ))}
          </div>
          <p className="dialog-footnote">
            서체 선택 후 실제 글자 폭으로 문단을 다시 배치합니다. 원문은 그대로
            유지됩니다.
          </p>
        </Dialog>
      )}

      {dialog === "export" && (
        <Dialog
          title="레이아웃 내보내기"
          close={() => !exporting && setDialog(null)}
        >
          <p className="dialog-description">
            지금의 그리드를 다음 작업으로 가져가세요.
          </p>
          <div className="export-summary">
            <Icon name="grid" size={22} />
            <span>
              <strong>
                {settings.columns} × {settings.rows} 그리드
              </strong>
              <small>
                {format(dimensions.width)} × {format(dimensions.height)} px ·{" "}
                {font.name}
              </small>
            </span>
            <span className="count-badge">
              {settings.view === "overlay"
                ? "그리드 + 텍스트"
                : settings.view === "grid"
                  ? "그리드만"
                  : "텍스트만"}
            </span>
          </div>
          <div className="export-options">
            {(
              [
                [
                  "svg",
                  "SVG",
                  "Figma에서 열기",
                  "편집 가능한 벡터와 텍스트. 같은 폰트가 필요합니다.",
                ],
                [
                  "html",
                  "HTML / CSS",
                  "웹 개발에 사용하기",
                  "반응형 스타일, 폰트, 출처 고지를 담은 ZIP.",
                ],
                [
                  "json",
                  "설정 JSON",
                  "나중에 이어서 편집하기",
                  "모든 수치와 구성 정보를 저장하고 다시 불러옵니다.",
                ],
              ] as const
            ).map(([kind, name, title, description]) => (
              <button
                key={kind}
                className="export-option"
                disabled={!canExport}
                onClick={() => download(kind)}
              >
                <span className="export-format">
                  {exporting === kind ? "준비 중" : name}
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <Icon name="download" size={18} />
              </button>
            ))}
          </div>
          <div className="dialog-import">
            <button
              className="quiet-button"
              onClick={() => {
                setDialog(null);
                importRef.current?.click();
              }}
            >
              <Icon name="upload" size={15} />
              설정 JSON 불러오기
            </button>
          </div>
          <p className="dialog-footnote">
            {status !== "ready" || hasDraftError
              ? "유효한 설정과 폰트 준비가 완료되면 내보낼 수 있습니다."
              : "현재 보기 모드가 출력에 적용됩니다. SVG는 Figma의 네이티브 Layout Guide와는 별개입니다."}
          </p>
        </Dialog>
      )}

      {dialog === "about" && (
        <Dialog
          title="질서 안에서 발견하는 가능성"
          close={() => setDialog(null)}
          wide
        >
          <div className="about-content">
            <div className="about-graphic" aria-hidden="true">
              {Array.from({ length: 20 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
            <p className="about-lead">
              그리드는 답이 아니라,
              <br />더 좋은 질문을 위한 시작점입니다.
            </p>
            <p>
              Grid System은 Josef Müller-Brockmann의 『Grid systems in graphic
              design』에서 출발한 레이아웃 실험 도구입니다. 책의 도판을
              복제하기보다, 정렬·비례·여백·위계의 원칙을 오늘의 화면과 인쇄물에
              적용합니다.
            </p>
            <div className="principles">
              <div>
                <h3>모듈과 결합</h3>
                <p>
                  20분할은 4열 × 5행, 32분할은 4열 × 8행입니다. 여러 모듈을 합쳐
                  제목과 문단에 서로 다른 비중을 줍니다.
                </p>
              </div>
              <div>
                <h3>행과 리듬</h3>
                <p>
                  서체, 글자 크기와 행간을 기준으로 온전한 행을 배치합니다.
                  입력한 치수를 임의로 바꾸지 않고 잔여 공간을 여백으로
                  남깁니다.
                </p>
              </div>
              <div>
                <h3>의도적인 여백</h3>
                <p>
                  모든 칸을 채울 필요는 없습니다. 빈 모듈과 비대칭 구성도 내용을
                  읽는 순서를 만드는 요소입니다.
                </p>
              </div>
            </div>
            <p className="about-reference">
              참고: Josef Müller-Brockmann, Grid systems in graphic design,
              Niggli. 본 도구는 독립적인 해석이며 공식 제휴 제품이 아닙니다.
              예시 문장은 사용자가 제공한 독일어 원문을 반복합니다.
            </p>
            <p className="about-reference">
              파일과 설정은 브라우저에서 처리합니다. 계정이나 업로드 서버를
              사용하지 않습니다. 내보낸 SVG의 텍스트는 가져오는 프로그램과
              설치된 폰트에 따라 표시가 달라질 수 있습니다.
            </p>
            <a
              className="text-link"
              href="/font-notices/README.md"
              target="_blank"
              rel="noreferrer"
            >
              폰트 출처와 사용 안내
            </a>
          </div>
        </Dialog>
      )}

      {dialog === "reset" && (
        <Dialog title="기본 설정으로 돌아갈까요?" close={() => setDialog(null)}>
          <p className="dialog-description">
            1440 × 1024 작업판, 20분할, Inter로 돌아갑니다. 현재 설정을
            보관하려면 먼저 JSON으로 내보내세요.
          </p>
          <div className="dialog-buttons">
            <button
              className="secondary-button"
              onClick={() => setDialog(null)}
            >
              취소
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setSettings(structuredClone(DEFAULT_SETTINGS));
                setInputUnit("px");
                setTypeUnit("px");
                setLinkedMargins(true);
                setLinkedGutters(true);
                setZoom("fit");
                setDialog(null);
                setNotice("기본 설정으로 초기화했습니다.");
              }}
            >
              초기화
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
