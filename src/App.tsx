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
  randomizeSettings,
  toPx,
  validateSettings,
} from "./core";
import { LANGUAGE_STORAGE_KEY, t, translateMessage, translatePreset, type Locale } from "./i18n";
import { applyPreset, getPreset, PRESETS } from "./presets";
import { exportHtmlPackage, exportSvg, serializeSettings } from "./export";
import { FONTS, getFont, loadFont, makeMeasurer, nearestWeight } from "./fonts";
import sample from "./sample.txt?raw";

const STORAGE_KEY = "grid-system.settings.v1";
// Keep settings/export geometry in CSS px; edit font sizes exclusively in pt.
const FONT_POINTS_PER_PIXEL = 72 / 96;
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
        aria-label={`${label} slider`}
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
  closeLabel,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
  closeLabel?: string;
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
        <button className="icon-button" aria-label={closeLabel ?? "Close"} onClick={close}>
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
  const [locale, setLocale] = useState<Locale>(() => {
    try { return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "ko" ? "ko" : "en"; }
    catch { return "en"; }
  });
  const [seedDraft, setSeedDraft] = useState(String(initial.settings.seed));
  const isSeedValid = seedDraft.trim() !== "" &&
    Number.isInteger(Number(seedDraft)) && Math.abs(Number(seedDraft)) <= 2147483647;
  const [ready, setReady] = useState<ReadyLayout | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [failure, setFailure] = useState("");
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState(() => translateMessage(locale, initial.message));
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
  const [linkedMargins, setLinkedMargins] = useState(() => {
    const margin = initial.settings.margin;
    return margin.top === margin.right && margin.top === margin.bottom && margin.top === margin.left;
  });
  const [linkedGutters, setLinkedGutters] = useState(() => initial.settings.gutter.x === initial.settings.gutter.y);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [viewport, setViewport] = useState({ width: 1000, height: 750 });
  const [exporting, setExporting] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const errors = useMemo(() => validateSettings(settings), [settings]);
  const hasDraftError = Object.values(invalidFields).some(Boolean);
  const font = getFont(settings.fontId);
  const tr = (key: string) => t(locale, key);
  const dimensions = pageSize(settings.page);
  const currentPreset = getPreset(settings.page.presetId);
  const matchesPreset = (preset: (typeof PRESETS)[number]) =>
    preset.mode === presetMode &&
    `${preset.name} ${translatePreset(locale, preset.name)} ${preset.width} ${preset.height} ${preset.category} ${translatePreset(locale, preset.category)}`
      .toLowerCase().includes(query.trim().toLowerCase());
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
      setFailure(translateMessage(locale, errors[0]));
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
            tr("storageUnavailable"),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setFailure(
            error instanceof Error
              ? translateMessage(locale, error.message)
              : "The font or layout could not be loaded. Try again.",
          );
        }
      }
    }, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [settings, retry, errors, locale]);

  useEffect(() => {
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, locale); } catch { /* Locale is optional browser preference. */ }
    document.documentElement.lang = locale;
    document.title = locale === "ko" ? "Grid System — 그리드에서 시작하는 레이아웃" : "Grid System — Layout experiments from a grid";
  }, [locale]);

  useEffect(() => setSeedDraft(String(settings.seed)), [settings.seed]);

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
  const isReadyForSettings = status === "ready" && !!ready && ready.settings === settings;
  const canExport = isReadyForSettings && !hasDraftError && !exporting;
  const displayWarning = useMemo(() => {
    const warnings = ready?.layout.warnings ?? [];
    const cap = warnings.find((warning) => warning.includes("10,000"));
    return translateMessage(locale, cap ?? warnings[0] ?? "");
  }, [ready, locale]);
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
    setNotice(`${translatePreset(locale, preset.name)} ${tr("presetApplied")}`);
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
        tr("downloaded"),
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `${tr("exportFailed")}: ${translateMessage(locale, error.message)}`
          : `${tr("exportFailed")}.`,
      );
    } finally {
      setExporting("");
    }
  }

  const numberProps = { invalidChanged };

  function applySeed() {
    if (!isSeedValid) return;
    const seed = Number(seedDraft);
    try {
      const base = errors.length && ready ? ready.settings : settings;
      setSettings(randomizeSettings(base, seed));
      setLinkedMargins(false);
      setLinkedGutters(false);
      setInvalidFields({});
      setSeedDraft(String(seed));
      setZoom("fit");
      setNotice(locale === "ko" ? "랜덤 레이아웃을 적용했습니다." : "Random layout applied.");
    } catch (error) {
      setNotice(translateMessage(locale, error instanceof Error ? error.message : ""));
    }
  }

  function freshSeed() {
    const values = new Int32Array(1);
    crypto.getRandomValues(values);
    const sampled = values[0] === -2147483648 ? -2147483647 : values[0];
    const next = sampled === settings.seed ? (sampled === 2147483647 ? sampled - 1 : sampled + 1) : sampled;
    setSeedDraft(String(next));
    try { setSettings(randomizeSettings(errors.length && ready ? ready.settings : settings, next)); setLinkedMargins(false); setLinkedGutters(false); setInvalidFields({}); setZoom("fit"); setNotice(locale === "ko" ? "랜덤 레이아웃을 적용했습니다." : "Random layout applied."); }
    catch (error) { setNotice(translateMessage(locale, error instanceof Error ? error.message : "")); }
  }

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
          aria-label={tr("about")}
        >
          <span className="brand-mark" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
          <span>
            Grid System<span className="version">1.1.1</span>
          </span>
        </a>
        <div className="header-presets" aria-label={tr("gridSettings")}>
          <button
            className={
              settings.columns === 4 && settings.rows === 5 ? "active" : ""
            }
            onClick={() =>
              setSettings((current) => ({ ...current, columns: 4, rows: 5 }))
            }
          >
            {locale === "ko" ? "20분할" : "20 modules"}<span aria-hidden="true">4 × 5</span>
          </button>
          <button
            className={
              settings.columns === 4 && settings.rows === 8 ? "active" : ""
            }
            onClick={() =>
              setSettings((current) => ({ ...current, columns: 4, rows: 8 }))
            }
          >
            {locale === "ko" ? "32분할" : "32 modules"}<span aria-hidden="true">4 × 8</span>
          </button>
        </div>
        <div className="random-controls">
          <button className="secondary-button random-button" data-testid="randomize-layout" onClick={freshSeed}>
            <Icon name="refresh" size={16} /><span>{tr("randomLayout")}</span>
          </button>
          <label className="seed-control">
            <span>{tr("seed")}</span>
            <input data-testid="seed-input" type="number" min={-2147483647} max={2147483647} step={1} value={seedDraft}
              aria-label={tr("seed")} aria-invalid={!isSeedValid}
              title={translateMessage(locale, "구성 seed는 -2,147,483,647~2,147,483,647 정수여야 합니다.")}
              onChange={(event) => setSeedDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applySeed(); }} />
          </label>
          <button className="secondary-button seed-apply" data-testid="apply-seed" aria-label={locale === "ko" ? "시드 적용" : "Apply seed"} onClick={applySeed} disabled={!isSeedValid}>
            <Icon name="check" size={15} /><span>{tr("apply")}</span>
          </button>
        </div>
        <div className="header-actions">
          <label className="visually-hidden" htmlFor="language-select">{tr("language")}</label>
          <select id="language-select" className="language-select" data-testid="language-select" value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={tr("language")}>
            <option value="en">English</option><option value="ko">한국어</option>
          </select>
          <button
            className="quiet-button principle-button"
            onClick={() => setDialog("about")}
          >
            <Icon name="book" />
            <span>{tr("gridPrinciples")}</span>
          </button>
          <button
            className="icon-button import-button"
            title={tr("importJson")}
            aria-label={tr("importJson")}
            onClick={() => importRef.current?.click()}
          >
            <Icon name="upload" />
          </button>
          <button
            className="primary-button"
            aria-label={tr("export")}
            onClick={() => setDialog("export")}
          >
            <Icon name="download" />
            <span>{tr("export")}</span>
          </button>
          <button
            className="icon-button mobile-settings"
            aria-label={tr("openProperties")}
            aria-expanded={mobilePanel}
            onClick={() => setMobilePanel(!mobilePanel)}
          >
            <Icon name="settings" />
          </button>
        </div>
      </header>

      <main className="editor">
        <section className="workspace" aria-label={tr("layoutPreview")}>
          <div className="workspace-toolbar">
            <div className="document-heading">
              <span className="document-dot" />
              <strong>{currentPreset ? translatePreset(locale, currentPreset.name) : tr("custom")}</strong>
              <span>
                {format(dimensions.width)} × {format(dimensions.height)} px
              </span>
            </div>
            <div className="view-switch" aria-label={tr("previewDisplay")}>
              {(
                [
                  ["overlay", tr("overlay")], ["text", tr("text")], ["grid", tr("grid")],
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
                      {ready.settings.columns * ready.settings.rows} {tr("fields")}
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
                    aria-label={locale === "ko" ? `${ready.settings.columns}열 ${ready.settings.rows}행, ${ready.font.name} 문단 레이아웃` : `${ready.settings.columns} columns × ${ready.settings.rows} rows, ${ready.font.name} paragraph layout`}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  <span className="canvas-corner" aria-hidden="true" />
                </div>
              ) : (
                <div className="loading-canvas">
                  <Icon name="grid" size={36} />
                  <p>{failure || tr("loading")}</p>
                  {failure && (
                    <button
                      className="secondary-button"
                      onClick={() => setRetry((v) => v + 1)}
                    >
                      {tr("retry")}
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
                  ? tr("invalidDraft")
                  : failure
                    ? `${failure} ${ready ? tr("lastPreview") : ""}`
                    : displayWarning}
              </span>
              {failure && !errors.length && (
                <button onClick={() => setRetry((v) => v + 1)}>
                  {tr("retry")}
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
                  {tr("fitMargins")}
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
                {settings.columns * settings.rows} {tr("modules")}
              </strong>
              <span className="module-dimensions">
                {tr("module")} {" "}
                {ready
                  ? `${format(ready.layout.moduleWidth)} × ${format(ready.layout.moduleHeight)} px`
                  : "—"}
              </span>
            </div>
            <div className="zoom-controls">
              <button
                className="icon-button"
                title={tr("fit")}
                aria-label={tr("fit")}
                onClick={() => setZoom("fit")}
              >
                <Icon name="expand" size={16} />
              </button>
              <select
                aria-label={tr("previewZoom")}
                value={zoom}
                onChange={(event) =>
                  setZoom(
                    event.target.value === "fit"
                      ? "fit"
                      : Number(event.target.value),
                  )
                }
              >
                <option value="fit">{tr("fit")} {format(scale * 100, 0)}%</option>
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
            aria-label={tr("closeProperties")}
            onClick={() => setMobilePanel(false)}
          />
        )}
        <aside className="inspector" aria-label={tr("properties")}>
          <div className="inspector-heading">
            <h1>{tr("properties")}</h1>
            <button
              className="icon-button reset-button"
              aria-label={tr("resetSettings")}
              title={tr("resetSettings")}
              onClick={() => setDialog("reset")}
            >
              <Icon name="refresh" size={16} />
            </button>
            <button
              className="icon-button mobile-panel-close"
              aria-label={tr("closeProperties")}
              onClick={() => setMobilePanel(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="inspector-scroll">
            <section className="control-section">
              <div className="section-heading">
                <h2>{tr("artboard")}</h2>
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
                      {tr(mode)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="picker-button"
                onClick={() => openPicker("presets")}
                aria-label={tr("chooseArtboard")}
              >
                <Icon name="file" size={16} />
                <span>
                  {currentPreset ? translatePreset(locale, currentPreset.name) : tr("custom")}
                  <small>
                    {settings.page.mode === "web"
                      ? "Figma Frame"
                      : translatePreset(locale, settings.page.category)}
                  </small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
              <div className="dimension-row">
                <NumberField
                  label={tr("width")}
                  value={fromPx(dimensions.width, inputUnit)}
                  onChange={(value) => setPageDimension("width", value)}
                  unit={inputUnit}
                  min={0.1}
                  step={inputUnit === "mm" ? 0.1 : 1}
                  {...numberProps}
                />
                <button
                  className="icon-button swap-button"
                  aria-label={tr("swapOrientation")}
                  title={tr("swapOrientation")}
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
                  label={tr("height")}
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
                    : tr("webHeightHint")}
                </span>
                {settings.page.mode === "print" && (
                  <select
                    aria-label={tr("lengthUnit")}
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
                <h2>{tr("gridSettings")}</h2>
                <span className="count-badge">
                  {settings.columns === 4 && [5, 8].includes(settings.rows)
                    ? `${settings.columns * settings.rows} ${tr("modules")}`
                    : tr("custom")}
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
                  aria-label={tr("linkMargins")}
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
                  {linkedMargins ? tr("linked") : tr("individual")}
                </button>
              </div>
              <div className="four-columns">
                {(
                  [
                    ["top", tr("topMargin")], ["right", tr("rightMargin")], ["bottom", tr("bottomMargin")], ["left", tr("leftMargin")],
                  ] as const
                ).map(([key, label]) => (
                  <NumberField
                    key={key}
                    label={label}
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
                  aria-label={tr("linkGutters")}
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
                  {linkedGutters ? tr("linked") : tr("individual")}
                </button>
              </div>
              <div className="two-columns">
                {(
                  [
                    ["x", tr("horizontalGutter")], ["y", tr("verticalGutter")],
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
                <span>{tr("baseline")}</span>
                <span className="subtle">{format(settings.lineHeight)} px</span>
              </label>
            </section>

            <section className="control-section">
              <div className="section-heading">
                <h2>{tr("typography")}</h2>
              </div>
              <button
                className="picker-button font-picker"
                onClick={() => openPicker("fonts")}
                aria-label={tr("chooseFont")}
              >
                <span className="font-symbol">Aa</span>
                <span>
                  {font.name}
                  <small>{locale === "en" && font.category === "한국어" ? "Korean" : font.category}</small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
              <div className="two-columns">
                <NumberField
                  label={tr("fontSize")}
                  value={settings.fontSize * FONT_POINTS_PER_PIXEL}
                  onChange={(value) => change("fontSize", value / FONT_POINTS_PER_PIXEL)}
                  unit="pt"
                  min={6 * FONT_POINTS_PER_PIXEL}
                  max={120 * FONT_POINTS_PER_PIXEL}
                  step={0.25}
                  {...numberProps}
                />
                <label className="select-field">
                  <span className="field-label">{tr("fontWeight")}</span>
                  <select
                    aria-label={tr("fontWeight")}
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
                label={tr("letterSpacing")}
                value={settings.letterSpacing}
                onChange={(value) => change("letterSpacing", value)}
                min={-2}
                max={10}
                step={0.1}
                unit="px"
                {...numberProps}
              />
              <RangeField
                label={tr("lineHeight")}
                value={settings.lineHeight}
                onChange={(value) => change("lineHeight", value)}
                min={1}
                max={160}
                step={0.5}
                unit="px"
                {...numberProps}
              />
            </section>

            <section className="control-section">
              <div className="section-heading">
                <h2>{tr("colors")}</h2>
              </div>
              {(["grid", "text"] as const).map((kind) => (
                <div className="color-row" key={kind}>
                  <label className="color-label">
                    <span>{kind === "grid" ? tr("grid") : tr("text")}</span>
                    <span
                      className="color-swatch"
                      style={{ background: settings[`${kind}Color`] }}
                    >
                      <input
                        type="color"
                        aria-label={kind === "grid" ? tr("gridColor") : tr("textColor")}
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
                    label={`${kind === "grid" ? tr("grid") : tr("text")} ${tr("opacity")}`}
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
                <h2>{tr("composition")}</h2>
              </div>
              <div className="layout-choices">
                {(
                  [
                    ["aligned", tr("aligned")], ["asymmetric", tr("asymmetric")], ["editorial", tr("editorial")], ["free", tr("free")],
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
                label={tr("paragraphFill")}
                value={Math.round(settings.density * 100)}
                onChange={(value) => change("density", value / 100)}
                min={15}
                max={100}
                step={5}
                unit="%"
                {...numberProps}
              />
              <p className="section-note">
                {tr("compositionNote")}
                <br />{tr("leadingHint")}
              </p>
            </section>
            <div className="inspector-end">
              <span
                className={`status-dot ${isReadyForSettings ? "ready" : ""}`}
              />
              <span role="status" data-testid="layout-status" data-ready={isReadyForSettings ? "true" : "false"}>
                {status === "error" ? tr("checkSettings") : !isReadyForSettings ? tr("calculating") : tr("saved")}
              </span>
              <span>{tr("localSave")}</span>
            </div>
          </div>
        </aside>
      </main>

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label={tr("settingsFile")}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 250_000)
              throw new Error(locale === "ko" ? "설정 파일은 250 KB 이하여야 합니다." : "The settings file must be 250 KB or smaller.");
            const imported = parseSettings(await file.text());
            setSettings(imported);
            setLinkedMargins(imported.margin.top === imported.margin.right && imported.margin.top === imported.margin.bottom && imported.margin.top === imported.margin.left);
            setLinkedGutters(imported.gutter.x === imported.gutter.y);
            setInputUnit(imported.page.mode === "web" ? "px" : "mm");
            setZoom("fit");
            setInvalidFields({});
            setSeedDraft(String(imported.seed));
            setNotice(tr("imported"));
          } catch (error) {
            setNotice(
              `${tr("importFailed")}: ${translateMessage(locale, error instanceof Error ? error.message : "Check that this is valid settings JSON.")}`,
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
            aria-label={tr("dismissNotice")}
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {dialog === "presets" && (
        <Dialog title={tr("artboardPresets")} close={() => setDialog(null)} closeLabel={tr("close")} wide>
          <div className="dialog-toolbar">
            <div className="mini-segment">
              {(["web", "print"] as const).map((mode) => (
                <button
                  key={mode}
                  className={presetMode === mode ? "selected" : ""}
                  onClick={() => setPresetMode(mode)}
                >
                  {mode === "web" ? tr("categoryWeb") : tr("print")}
                </button>
              ))}
            </div>
            <label className="search-input">
              <Icon name="search" size={16} />
              <input
                aria-label={tr("presetSearch")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tr("searchPreset")}
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
                  preset.category === category && matchesPreset(preset),
              );
              return (
                !!presets.length && (
                  <section className="picker-group" key={category}>
                    <h3>{translatePreset(locale, category)}</h3>
                    {presets.map((preset) => (
                      <button
                        className="picker-item"
                        key={preset.presetId}
                        onClick={() => choosePreset(preset)}
                      >
                        <span>{translatePreset(locale, preset.name)}</span>
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
            {!PRESETS.some(matchesPreset) && (
              <p className="empty-state">
                {tr("noPresets")}
              </p>
            )}
          </div>
          <p className="dialog-footnote">
            {presetMode === "web"
              ? tr("webFootnote") : tr("printFootnote")}
          </p>
        </Dialog>
      )}

      {dialog === "fonts" && (
        <Dialog title={tr("fontPicker")} close={() => setDialog(null)} closeLabel={tr("close")}>
          <div className="dialog-toolbar">
            <label className="search-input">
              <Icon name="search" size={16} />
              <input
                aria-label={tr("fontSearch")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tr("searchFont")}
              />
            </label>
          </div>
          <div className="picker-list">
            {(["Sans-serif", "Serif", "한국어"] as const).map((category) => (
              <section className="picker-group" key={category}>
                <h3>{locale === "en" && category === "한국어" ? "Korean" : category}</h3>
                {FONTS.filter(
                  (item) =>
                    item.category === category &&
                    `${item.name} ${item.category} ${item.category === "한국어" ? "Korean" : ""}`
                      .toLowerCase().includes(query.trim().toLowerCase()),
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
            {tr("fontFootnote")}
          </p>
        </Dialog>
      )}

      {dialog === "export" && (
        <Dialog
          title={tr("exportLayout")}
          closeLabel={tr("close")}
          close={() => !exporting && setDialog(null)}
        >
          <p className="dialog-description">
            {tr("exportIntro")}
          </p>
          <div className="export-summary">
            <Icon name="grid" size={22} />
            <span>
              <strong>
                {settings.columns} × {settings.rows} {tr("grid")}
              </strong>
              <small>
                {format(dimensions.width)} × {format(dimensions.height)} px ·{" "}
                {font.name}
              </small>
            </span>
            <span className="count-badge">
              {settings.view === "overlay"
                ? tr("overlay")
                : settings.view === "grid"
                  ? tr("gridOnly") : tr("textOnly")}
            </span>
          </div>
          <div className="export-options">
            {(
              [
                [
                  "svg",
                  "SVG",
                  tr("openInFigma"), tr("svgDescription"),
                ],
                [
                  "html",
                  "HTML / CSS",
                  tr("useOnWeb"), tr("htmlDescription"),
                ],
                [
                  "json",
                  locale === "ko" ? "설정 JSON" : "Settings JSON",
                  tr("editLater"), tr("jsonDescription"),
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
                  {exporting === kind ? tr("preparing") : name}
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
              {tr("importSettings")}
            </button>
          </div>
          <p className="dialog-footnote">
            {!isReadyForSettings || hasDraftError
              ? tr("exportUnavailable") : tr("exportFootnote")}
          </p>
        </Dialog>
      )}

      {dialog === "about" && (
        <Dialog
          title={tr("aboutTitle")}
          closeLabel={tr("close")}
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
              {tr("aboutLead")}
            </p>
            <p>{locale === "ko" ? "Grid System은 Josef Müller-Brockmann의 『Grid systems in graphic design』에서 출발한 레이아웃 실험 도구입니다. 책의 도판을 복제하기보다, 정렬·비례·여백·위계의 원칙을 오늘의 화면과 인쇄물에 적용합니다." : "Grid System is a layout-exploration tool inspired by Josef Müller-Brockmann’s Grid systems in graphic design. Rather than reproducing its plates, it applies principles of alignment, proportion, whitespace, and hierarchy to today’s screens and print."}</p>
            <div className="principles">
              <div>
                <h3>{tr("modulesPrinciple")}</h3>
                <p>{locale === "ko" ? "20분할은 4열 × 5행, 32분할은 4열 × 8행입니다. 여러 모듈을 합쳐 제목과 문단에 서로 다른 비중을 줍니다." : "20 modules use 4 columns × 5 rows; 32 modules use 4 columns × 8 rows. Combine modules to give headings and paragraphs different weight."}</p>
              </div>
              <div>
                <h3>{tr("rhythmPrinciple")}</h3>
                <p>{locale === "ko" ? "서체, 글자 크기와 행간을 기준으로 온전한 행을 배치합니다. 입력한 치수를 임의로 바꾸지 않고 잔여 공간을 여백으로 남깁니다." : "Complete lines are placed from the typeface, size, and line height. Remaining space stays as whitespace without changing your dimensions."}</p>
              </div>
              <div>
                <h3>{tr("whitespacePrinciple")}</h3>
                <p>{locale === "ko" ? "모든 칸을 채울 필요는 없습니다. 빈 모듈과 비대칭 구성도 내용을 읽는 순서를 만드는 요소입니다." : "Not every cell needs filling. Empty modules and asymmetric compositions also guide reading order."}</p>
              </div>
            </div>
            <p className="about-reference">{locale === "ko" ? "참고: Josef Müller-Brockmann, Grid systems in graphic design, Niggli. 본 도구는 독립적인 해석이며 공식 제휴 제품이 아닙니다. 예시 문장은 사용자가 제공한 독일어 원문을 반복합니다." : "Reference: Josef Müller-Brockmann, Grid systems in graphic design, Niggli. This is an independent interpretation, not an official affiliate product. The supplied German sample text is repeated unchanged."}</p>
            <p className="about-reference">{locale === "ko" ? "파일과 설정은 브라우저에서 처리합니다. 계정이나 업로드 서버를 사용하지 않습니다. 내보낸 SVG의 텍스트는 가져오는 프로그램과 설치된 폰트에 따라 표시가 달라질 수 있습니다." : "Files and settings are processed in your browser. No account or upload server is used. Exported SVG text can render differently depending on the importing program and installed fonts."}</p>
            <a
              className="text-link"
              href="/font-notices/README.md"
              target="_blank"
              rel="noreferrer"
            >
              {tr("fontNotices")}
            </a>
          </div>
        </Dialog>
      )}

      {dialog === "reset" && (
        <Dialog title={tr("resetTitle")} close={() => setDialog(null)} closeLabel={tr("close")}>
          <p className="dialog-description">
            {tr("resetDescription")}
          </p>
          <div className="dialog-buttons">
            <button
              className="secondary-button"
              onClick={() => setDialog(null)}
            >
              {tr("cancel")}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setSettings(structuredClone(DEFAULT_SETTINGS));
                setInputUnit("px");
                setLinkedMargins(true);
                setLinkedGutters(true);
                setInvalidFields({});
                setSeedDraft(String(DEFAULT_SETTINGS.seed));
                setZoom("fit");
                setDialog(null);
                setNotice(tr("resetComplete"));
              }}
            >
              {tr("reset")}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
