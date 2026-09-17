import { useEffect, useState } from "react";
import type { Settings } from "./model";
import { t, type Locale } from "./i18n";

type CompositionMode = "typography" | "typography-image";
interface Props {
  settings: Settings;
  locale: Locale;
  ready: boolean;
  randomGrid: (seed: number) => void;
  randomTypography: (seed: number, mode: CompositionMode) => void;
  toggleGridLock: () => void;
  toggleCompositionLock: () => void;
}

function nextSeed(previous: number) {
  const values = new Int32Array(1);
  crypto.getRandomValues(values);
  const value = Math.max(-2147483647, values[0]);
  return value === previous ? (value === 2147483647 ? value - 1 : value + 1) : value;
}
const validSeed = (draft: string) => draft.trim() !== "" &&
  Number.isInteger(Number(draft)) && Math.abs(Number(draft)) <= 2147483647;

function LockIcon({ locked }: { locked: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d={locked ? "M8 10V7a4 4 0 0 1 8 0v3" : "M8 10V7a4 4 0 0 1 8 0"} />
    <path d="M12 14v3" />
  </svg>;
}

function SeedField({ label, value, setValue, apply, disabled, grid, applyLabel }: {
  label: string; value: string; setValue: (value: string) => void;
  apply: () => void; disabled: boolean; grid?: boolean; applyLabel: string;
}) {
  const valid = validSeed(value);
  return <div className="workflow-seed">
    <label className="seed-control">
      <span>{label}</span>
      <input data-testid={grid ? "grid-seed-input" : "seed-input"} type="number"
        min={-2147483647} max={2147483647} step={1} value={value}
        aria-label={label} aria-invalid={!valid} disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && valid && !disabled) apply(); }} />
    </label>
    <button className="seed-apply icon-button" data-testid={grid ? "apply-grid-seed" : "apply-seed"}
      aria-label={applyLabel} title={applyLabel} onClick={apply} disabled={disabled || !valid}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
    </button>
  </div>;
}

/** Inherits the editor's white/gray surfaces, Inter UI and restrained red accent.
 * Desktop: [1 Grid / seed / lock] [2 Typography + boxes / seed / lock].
 * Mobile: the same stages stack; a locked stage remains visible and reversible.
 * The sequence is the hierarchy, with left-aligned actions and no new visual world.
 */
export default function WorkflowBar({ settings, locale, ready, randomGrid, randomTypography, toggleGridLock, toggleCompositionLock }: Props) {
  const tr = (key: string) => t(locale, key);
  const { gridLocked, compositionLocked, gridSeed, mode } = settings.workflow;
  const [gridDraft, setGridDraft] = useState(String(gridSeed));
  const [typeDraft, setTypeDraft] = useState(String(settings.seed));
  useEffect(() => setGridDraft(String(gridSeed)), [gridSeed]);
  useEffect(() => setTypeDraft(String(settings.seed)), [settings.seed]);
  const typeDisabled = !gridLocked || compositionLocked;
  const typeMode = mode === "typography-image" ? mode : "typography";
  const makeGrid = (seed: number) => { setGridDraft(String(seed)); randomGrid(seed); };
  const makeType = (seed: number, selectedMode: CompositionMode) => { setTypeDraft(String(seed)); randomTypography(seed, selectedMode); };
  return <section className="workflow-bar" aria-label={tr("randomWorkflow")}>
    <div className={`workflow-stage ${gridLocked ? "is-locked" : "is-current"}`}>
      <div className="workflow-heading">
        <h2><span className="stage-number">1</span>{tr("buildGrid")}</h2>
        <p>{tr(gridLocked ? "gridLockedHint" : "gridStageHint")}</p>
      </div>
      <div className="workflow-controls">
        <button className="secondary-button" data-testid="randomize-grid" disabled={gridLocked} onClick={() => makeGrid(nextSeed(gridSeed))}>{tr("randomGrid")}</button>
        <button className={`secondary-button lock-button ${gridLocked ? "is-locked" : ""}`} data-testid="toggle-grid-lock" aria-pressed={gridLocked} aria-label={tr(gridLocked ? "unlockGrid" : "lockGrid")}
          disabled={!gridLocked && !ready} onClick={toggleGridLock}>
          <LockIcon locked={gridLocked} />{tr(gridLocked ? "unlockGrid" : "lockGrid")}
        </button>
        <SeedField grid label={tr("gridSeed")} value={gridDraft} setValue={setGridDraft}
          apply={() => makeGrid(Number(gridDraft))} disabled={gridLocked} applyLabel={tr("applyGridSeed")} />
      </div>
    </div>
    <div className={`workflow-stage ${compositionLocked ? "is-locked" : gridLocked ? "is-current" : "is-waiting"}`}>
      <div className="workflow-heading">
        <h2><span className="stage-number">2</span>{tr("composeContent")}</h2>
        <p aria-live="polite">{tr(compositionLocked ? "compositionLockedHint" : gridLocked ? "typeStageHint" : "lockGridFirst")}</p>
      </div>
      <div className="workflow-controls">
        <div className="type-actions">
          <button className="secondary-button" data-testid="randomize-typography" disabled={typeDisabled} onClick={() => makeType(nextSeed(settings.seed), "typography")}>{tr("randomTypography")}</button>
          <button className="secondary-button" data-testid="randomize-typography-image" disabled={typeDisabled} onClick={() => makeType(nextSeed(settings.seed), "typography-image")}>{tr("randomTypographyImage")}</button>
        </div>
        <button className={`secondary-button lock-button ${compositionLocked ? "is-locked" : ""}`} data-testid="toggle-composition-lock" aria-pressed={compositionLocked} aria-label={tr(compositionLocked ? "unlockComposition" : "lockComposition")}
          disabled={!compositionLocked && (!ready || !gridLocked || mode === "empty")} onClick={toggleCompositionLock}>
          <LockIcon locked={compositionLocked} />{tr(compositionLocked ? "unlockComposition" : "lockComposition")}
        </button>
        <SeedField label={tr("typeSeed")} value={typeDraft} setValue={setTypeDraft}
          apply={() => makeType(Number(typeDraft), typeMode)} disabled={typeDisabled} applyLabel={tr("applyTypeSeed")} />
      </div>
    </div>
  </section>;
}
