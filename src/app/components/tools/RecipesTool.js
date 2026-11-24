'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  Workflow,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Play,
  BookmarkPlus,
  Sparkles,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import ProgressSteps from '../ProgressSteps';
import { toast } from '../../../context/ToastContext';
import { downloadFile, formatBytes } from '../../../lib/utils';
import {
  PRESET_RECIPES,
  RECIPE_STEP_CATALOG,
  createStepFromCatalog,
  runPdfRecipe,
  getSavedRecipes,
  saveRecipe,
  deleteRecipe,
  subscribeSavedRecipes,
  RECIPES_STORAGE_KEY,
} from '../../../lib/pdfRecipes';

const EMPTY_SAVED = [];
let cachedRawRecipes;
let cachedParsedRecipes = EMPTY_SAVED;

function getSavedSnapshot() {
  if (typeof window === 'undefined') return EMPTY_SAVED;
  const raw = localStorage.getItem(RECIPES_STORAGE_KEY);
  if (raw === cachedRawRecipes) return cachedParsedRecipes;
  cachedRawRecipes = raw;
  cachedParsedRecipes = getSavedRecipes();
  return cachedParsedRecipes;
}

function getSavedServerSnapshot() {
  return EMPTY_SAVED;
}

export default function RecipesTool() {
  const [files, setFiles] = useState([]);
  const [steps, setSteps] = useState(() => PRESET_RECIPES[0].steps.map((s) => ({ ...s, config: { ...s.config } })));
  const [activePresetName, setActivePresetName] = useState(PRESET_RECIPES[0].name);
  const [newStepType, setNewStepType] = useState('watermark');
  const [customName, setCustomName] = useState('');
  const [showPasswords, setShowPasswords] = useState({});

  // Pipeline execution state
  const [isRunning, setIsRunning] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [activeStepLabel, setActiveStepLabel] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('recipe_output.pdf');
  const [stepSummary, setStepSummary] = useState([]);

  const savedRecipes = useSyncExternalStore(
    subscribeSavedRecipes,
    getSavedSnapshot,
    getSavedServerSnapshot
  );

  const handleLoadRecipe = (recipe) => {
    setSteps(recipe.steps.map((s) => ({ ...s, config: { ...(s.config || {}) } })));
    setActivePresetName(recipe.name);
    toast.info(`Loaded recipe: ${recipe.name}`);
  };

  const handleAddStep = (typeToAdd = newStepType) => {
    try {
      const next = createStepFromCatalog(typeToAdd);
      setSteps((prev) => [...prev, next]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMoveStep = (index, delta) => {
    setSteps((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const handleRemoveStep = (index) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateConfig = (index, key, value) => {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index ? { ...step, config: { ...(step.config || {}), [key]: value } } : step
      )
    );
  };

  const handleSaveCustomRecipe = () => {
    const trimmed = customName.trim();
    if (!trimmed) {
      toast.error('Enter a recipe name before saving.');
      return;
    }
    if (steps.length === 0) {
      toast.error('Add at least one step to save this recipe.');
      return;
    }
    try {
      saveRecipe({
        name: trimmed,
        description: steps.map((s) => s.label).join(' → '),
        steps,
      });
      setCustomName('');
      toast.success(`Saved recipe "${trimmed}" locally.`);
    } catch (err) {
      toast.error(err.message || 'Could not save recipe.');
    }
  };

  const handleDeleteSaved = (recipe) => {
    deleteRecipe(recipe.id);
    toast.info(`Deleted recipe "${recipe.name}".`);
  };

  const handleRunPipeline = async () => {
    if (files.length === 0) {
      toast.error('Upload at least one PDF file first.');
      return;
    }
    if (steps.length === 0) {
      toast.error('Add at least one transformation step.');
      return;
    }

    const emptyProtect = steps.find((s) => s.type === 'protect' && !String(s.config?.userPassword || '').trim());
    if (emptyProtect) {
      toast.error('Enter a password for the Encrypt PDF (AES-256) step before running.');
      return;
    }

    setIsRunning(true);
    setModalOpen(true);
    setIsComplete(false);
    setErrorMessage('');
    setResultBlob(null);
    setStepSummary([]);
    setActiveStepIdx(0);
    setActiveStepLabel('Starting local pipeline...');

    try {
      const result = await runPdfRecipe(files, steps, {
        onStepProgress: ({ index, total, step }) => {
          setActiveStepIdx(index);
          setActiveStepLabel(`Step ${index + 1} of ${total}: ${step.label}`);
        },
      });

      setActiveStepIdx(steps.length);
      setActiveStepLabel('Pipeline complete!');
      setResultBlob(result.blob);
      setResultName(result.outputFilename);
      setStepSummary(result.stepResults);
      setIsComplete(true);
    } catch (err) {
      console.error('PDF recipe failed:', err);
      setErrorMessage(err?.message || 'Recipe execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const totalInputSize = files.reduce((acc, f) => acc + (f?.size || 0), 0);

  const leftPane = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Loaded Files Strip */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
            Input PDFs ({files.length})
          </strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Total {formatBytes(totalInputSize)}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {files.map((f, idx) => (
            <span
              key={`${f.name}_${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.28rem 0.6rem',
                borderRadius: '6px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                fontSize: '0.78rem',
                color: 'var(--text-main)',
              }}
            >
              <FileText size={13} style={{ color: 'var(--primary-color)' }} />
              {f.name}
            </span>
          ))}
        </div>
      </div>

      {/* Live Pipeline Progress */}
      {(isRunning || stepSummary.length > 0) && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <ProgressSteps
            steps={steps.map((s) => s.label)}
            current={activeStepIdx}
            label={activeStepLabel}
          />
          {stepSummary.length > 0 && (
            <ul style={{ margin: '0.75rem 0 0 1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {stepSummary.map((item, i) => (
                <li key={i}>
                  <strong style={{ color: 'var(--text-main)' }}>{item.label}:</strong> {item.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Visual Step Pipeline Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Pipeline Steps — {activePresetName}
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {steps.length} step{steps.length === 1 ? '' : 's'}
          </span>
        </div>

        {steps.map((step, idx) => (
          <div
            key={step.id}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(255, 71, 87, 0.16)',
                    color: 'var(--primary-color)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {idx + 1}
                </span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{step.label}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.25rem 0.4rem' }}
                  disabled={idx === 0}
                  onClick={() => handleMoveStep(idx, -1)}
                  aria-label={`Move ${step.label} up`}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.25rem 0.4rem' }}
                  disabled={idx === steps.length - 1}
                  onClick={() => handleMoveStep(idx, 1)}
                  aria-label={`Move ${step.label} down`}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.25rem 0.4rem', color: 'var(--error-color)' }}
                  onClick={() => handleRemoveStep(idx)}
                  aria-label={`Remove ${step.label}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Step-specific inline parameters */}
            {step.type === 'bates' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.65rem' }}>
                <input
                  type="text"
                  className="options-input"
                  value={step.config.prefix || ''}
                  onChange={(e) => handleUpdateConfig(idx, 'prefix', e.target.value)}
                  placeholder="Prefix (EXH-)"
                  aria-label="Bates prefix"
                />
                <input
                  type="number"
                  className="options-input"
                  min={0}
                  value={step.config.startNumber ?? 1}
                  onChange={(e) => handleUpdateConfig(idx, 'startNumber', Number(e.target.value) || 1)}
                  placeholder="Start #"
                  aria-label="Bates start number"
                />
                <input
                  type="number"
                  className="options-input"
                  min={1}
                  max={10}
                  value={step.config.digits ?? 6}
                  onChange={(e) => handleUpdateConfig(idx, 'digits', Number(e.target.value) || 6)}
                  placeholder="Digits"
                  aria-label="Bates zero padding digits"
                />
              </div>
            )}

            {step.type === 'watermark' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="options-input"
                  style={{ flex: '1 1 160px' }}
                  value={step.config.text || ''}
                  onChange={(e) => handleUpdateConfig(idx, 'text', e.target.value)}
                  placeholder="Watermark text"
                  aria-label="Watermark text"
                />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(step.config.tileMode)}
                    onChange={(e) => handleUpdateConfig(idx, 'tileMode', e.target.checked)}
                  />
                  Diagonal Tile
                </label>
              </div>
            )}

            {step.type === 'crop' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem', marginTop: '0.65rem' }}>
                {['top', 'right', 'bottom', 'left'].map((side) => (
                  <label key={side} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {side.toUpperCase()} (pt)
                    <input
                      type="number"
                      className="options-input"
                      min={0}
                      max={200}
                      value={step.config[side] ?? 18}
                      onChange={(e) => handleUpdateConfig(idx, side, Math.max(0, Number(e.target.value) || 0))}
                    />
                  </label>
                ))}
              </div>
            )}

            {step.type === 'page-numbers' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.5rem', marginTop: '0.65rem' }}>
                <input
                  type="text"
                  className="options-input"
                  value={step.config.format || 'Page {n} of {total}'}
                  onChange={(e) => handleUpdateConfig(idx, 'format', e.target.value)}
                  aria-label="Page number format"
                />
                <select
                  className="options-input"
                  value={step.config.position || 'bottom-center'}
                  onChange={(e) => handleUpdateConfig(idx, 'position', e.target.value)}
                  aria-label="Page number position"
                >
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>
            )}

            {step.type === 'protect' && (
              <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.65rem', alignItems: 'center' }}>
                <input
                  type={showPasswords[step.id] ? 'text' : 'password'}
                  className="options-input"
                  style={{ flex: 1 }}
                  value={step.config.userPassword || ''}
                  onChange={(e) => handleUpdateConfig(idx, 'userPassword', e.target.value)}
                  placeholder="Required AES-256 open password"
                  aria-label="AES-256 user password"
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.55rem' }}
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                  }
                  aria-label={showPasswords[step.id] ? 'Hide password' : 'Show password'}
                >
                  {showPasswords[step.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Workspace
        title="PDF Recipes & Multi-Step Pipelines"
        icon={Workflow}
        files={files}
        onFilesSelected={(selected) => setFiles((prev) => [...prev, ...selected])}
        onClear={() => {
          setFiles([]);
          setStepSummary([]);
        }}
        multiple={true}
        leftPane={leftPane}
      >
        {/* Preset Selector */}
        <div className="options-group">
          <label className="options-label">Preset Workflows</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {PRESET_RECIPES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="btn-secondary"
                onClick={() => handleLoadRecipe(preset)}
                style={{
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0.55rem 0.7rem',
                  gap: '0.2rem',
                  borderColor:
                    activePresetName === preset.name ? 'var(--primary-color)' : undefined,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sparkles size={13} style={{ color: 'var(--primary-color)' }} />
                  {preset.name}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Saved Custom Recipes */}
        {savedRecipes.length > 0 && (
          <div className="options-group">
            <label className="options-label">Your Saved Recipes</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {savedRecipes.map((recipe) => (
                <div key={recipe.id} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                    onClick={() => handleLoadRecipe(recipe)}
                  >
                    {recipe.name} ({recipe.steps.length})
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0.45rem', color: 'var(--error-color)' }}
                    onClick={() => handleDeleteSaved(recipe)}
                    aria-label={`Delete ${recipe.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Append Step */}
        <div className="options-group">
          <label className="options-label">Add Pipeline Step</label>
          <div style={{ display: 'flex', gap: '0.45rem' }}>
            <select
              className="options-input"
              value={newStepType}
              onChange={(e) => setNewStepType(e.target.value)}
              style={{ flex: 1 }}
              aria-label="Choose recipe step type"
            >
              {RECIPE_STEP_CATALOG.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleAddStep()}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Save Recipe Locally */}
        <div className="options-group">
          <label className="options-label">Save Custom Recipe Locally</label>
          <div style={{ display: 'flex', gap: '0.45rem' }}>
            <input
              type="text"
              className="options-input"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Board Packet Prep"
              style={{ flex: 1 }}
              aria-label="Custom recipe name"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSaveCustomRecipe}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <BookmarkPlus size={14} /> Save
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={isRunning || files.length === 0 || steps.length === 0}
          onClick={handleRunPipeline}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Play size={16} />
          Run {steps.length}-Step Pipeline
        </button>
      </Workspace>

      {files.length === 0 && (
        <section
          aria-label="Available Preset Recipes"
          style={{ maxWidth: '880px', margin: '0 auto 2rem auto', width: '100%' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            {PRESET_RECIPES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadRecipe(preset)}
                style={{
                  textAlign: 'left',
                  padding: '0.9rem 1rem',
                  borderRadius: '10px',
                  background: 'var(--bg-card)',
                  border:
                    activePresetName === preset.name
                      ? '1px solid var(--primary-color)'
                      : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.3rem' }}>
                  <Sparkles size={14} style={{ color: 'var(--primary-color)' }} />
                  {preset.name}
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <ProgressModal
        isOpen={modalOpen}
        title="Running PDF Recipe Pipeline"
        description={activeStepLabel || 'Executing steps locally in browser memory...'}
        isComplete={isComplete}
        errorMessage={errorMessage}
        resultBlob={resultBlob}
        resultFileName={resultName}
        currentToolId="recipes"
        inputSize={totalInputSize}
        downloadLabel="Download Processed PDF"
        onDownload={() => resultBlob && downloadFile(resultBlob, resultName)}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
