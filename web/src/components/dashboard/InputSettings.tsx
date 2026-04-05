import { useEffect, useMemo, useState } from "react";

const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto Detect" },
  { value: "original", label: "Original" },
  { value: "en", label: "English" },
  { value: "bn", label: "Bengali" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
];

const ACCESSIBILITY_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "high_contrast", label: "High Contrast" },
  { value: "dyslexia_friendly", label: "Dyslexia Friendly" },
  { value: "larger_text", label: "Larger Text" },
  { value: "safe_colors", label: "Safe Colors" },
];

const TEMPLATES = [
  {
    id: "reels",
    label: "Reels",
    script: "Hook fast.\nKeep each line short.\nDrive retention in first 3 seconds.",
  },
  {
    id: "shorts",
    label: "YouTube Shorts",
    script: "Start with one strong claim.\nDeliver 3 quick insights.\nEnd with a clear action.",
  },
  {
    id: "education",
    label: "Education",
    script: "Today we learn one key concept.\nStep one is understanding the core idea.\nStep two is applying it with one practical example.",
  },
  {
    id: "motivation",
    label: "Motivation",
    script: "Small daily wins compound.\nDiscipline beats mood.\nDo the work even when it feels slow.",
  },
  {
    id: "business_ads",
    label: "Business Ads",
    script: "Problem: your conversions are stuck.\nSolution: high-retention captions built for social feeds.\nCall to action: start your first render now.",
  },
];

function toSubtitleLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizeLine(line: string): string {
  const compact = line.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.charAt(0).toUpperCase() + compact.slice(1);
}

export default function InputSettings({ prompt, setPrompt, inputType, setInputType, audioFile, setAudioFile, config, setConfig }: any) {
  const [subtitleLines, setSubtitleLines] = useState<string[]>([]);
  const isBatchMode = Boolean(config?.batch_processing);

  useEffect(() => {
    if (inputType !== "text") return;
    const parsed = toSubtitleLines(prompt);
    setSubtitleLines(parsed.length ? parsed : [""]);
  }, [prompt, inputType]);

  const promptWordCount = useMemo(
    () => prompt.split(/\s+/).filter((w: string) => w.length > 0).length,
    [prompt]
  );

  const batchCount = useMemo(
    () =>
      prompt
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0).length,
    [prompt]
  );

  const updateSubtitleLine = (index: number, value: string) => {
    const next = [...subtitleLines];
    next[index] = value;
    setSubtitleLines(next);
    setPrompt(next.join("\n"));
  };

  const addSubtitleLine = () => {
    const next = [...subtitleLines, ""];
    setSubtitleLines(next);
    setPrompt(next.join("\n"));
  };

  const autoCorrectLines = () => {
    const corrected = subtitleLines.map(normalizeLine).filter((line) => line.length > 0);
    const safeLines = corrected.length ? corrected : [""];
    setSubtitleLines(safeLines);
    setPrompt(safeLines.join("\n"));
  };

  const applyTemplate = (script: string) => {
    setPrompt(script);
    setConfig({
      ...config,
      batch_processing: false,
      auto_subtitle_correction: true,
      keyword_highlighting: true,
    });
  };

  return (
    <div className="asymmetric-grid animate-in slide-in-from-bottom-4 duration-500">
      {/* Left: Input Card */}
      <div className="glass-panel p-4 sm:p-8 border border-white/5 rounded-lg flex flex-col gap-6 bg-surface-container-low shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center border-b border-white/5 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
             <div className="flex items-center gap-3">
               <span className="material-symbols-outlined text-primary-container">edit_document</span>
               <h3 className="text-xl font-display font-bold text-white tracking-tight">Source Material</h3>
             </div>
             
             {/* Mode Switcher */}
             <div className="flex p-1 bg-surface-container-lowest border border-white/10 rounded-sm w-fit">
               <button 
                 onClick={() => setInputType('text')}
                 className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-sm transition-all ${inputType === 'text' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-white'}`}>
                 Script / Text
               </button>
               <button 
                 onClick={() => setInputType('audio')}
                 className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-sm transition-all ${inputType === 'audio' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-white'}`}>
                 Audio Upload
               </button>
             </div>
          </div>
        </div>

        {inputType === "text" && (
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Template Library by Use Case
            </div>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.script)}
                  className="px-3 py-1.5 bg-surface-container-highest border border-white/10 hover:border-primary-container hover:text-primary-container text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all text-on-surface-variant"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative group flex-grow flex flex-col">
          {inputType === 'text' ? (
            <>
              <textarea
                data-testid="script-textarea"
                maxLength={5000}
                className="w-full flex-grow min-h-[240px] sm:min-h-[300px] bg-surface-container-lowest border border-white/5 rounded-sm text-on-surface font-body p-4 sm:p-5 text-base sm:text-lg leading-relaxed focus:outline-none focus:border-primary-container/50 resize-none placeholder:text-surface-variant transition-colors shadow-inner"
                placeholder={isBatchMode ? "Batch mode enabled: add one script per line." : "Type your story here... The engine will send it to the backend for synthesis."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              ></textarea>
              {prompt.length >= 4500 && (
                <div
                  data-testid="char-limit-warning-clean"
                  role="alert"
                  className={`mt-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm border ${
                    prompt.length >= 5000
                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                      : "bg-yellow-500/10 border-yellow-500/40 text-yellow-400"
                  }`}
                >
                  {prompt.length >= 5000
                    ? `Character limit reached (${prompt.length}/5000).`
                    : `Approaching character limit ${prompt.length}/5000.`}
                </div>
              )}
              {false && (
                <div
                  data-testid="char-limit-warning"
                  role="alert"
                  className={`mt-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm border ${
                    prompt.length >= 5000
                      ? 'bg-red-500/10 border-red-500/40 text-red-400'
                      : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                  }`}
                >
                  {prompt.length >= 5000
                    ? `⛔ Character limit reached (${prompt.length}/5000). No additional input will be accepted.`
                    : `⚠ Approaching character limit — ${prompt.length}/5000 characters used.`}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                 <div className={`text-[10px] font-mono bg-surface-container-lowest border px-2 py-1 rounded ${
                   prompt.length >= 5000 ? 'text-red-400 border-red-500/40' :
                   prompt.length >= 4500 ? 'text-yellow-400 border-yellow-500/40' :
                   'text-on-surface-variant border-white/10'
                 }`}>
                    Words: {promptWordCount} | Chars: {prompt.length}/5000
                 </div>
                 {isBatchMode && (
                   <div className="text-[10px] font-mono bg-surface-container-lowest border border-primary-container/40 text-primary-container px-2 py-1 rounded">
                     Batch Scripts: {batchCount}
                   </div>
                 )}
              </div>
              {!isBatchMode && (
                <div className="mt-5 border border-white/10 rounded-sm bg-surface-container-lowest p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary-container">
                      Auto Subtitle Correction
                    </div>
                    <button
                      onClick={autoCorrectLines}
                      className="px-2.5 py-1 border border-primary-container/50 text-primary-container hover:bg-primary-container hover:text-on-primary-container text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all"
                    >
                      Apply AI Correction
                    </button>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Edit captions line-by-line before export.
                  </p>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {subtitleLines.map((line, index) => (
                      <input
                        key={`subtitle-line-${index}`}
                        value={line}
                        onChange={(e) => updateSubtitleLine(index, e.target.value)}
                        className="w-full bg-surface-container-highest border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-container/60"
                        placeholder={`Caption line ${index + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={addSubtitleLine}
                    className="px-2.5 py-1 border border-white/20 text-on-surface-variant hover:text-white hover:border-white/40 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all"
                  >
                    Add Line
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full flex-grow min-h-[240px] sm:min-h-[300px] bg-surface-container-lowest border border-dashed border-white/20 rounded-sm flex flex-col items-center justify-center p-4 sm:p-8 transition-colors hover:border-primary-container/50 relative">
               <input 
                 type="file" 
                 accept="audio/mp3,audio/wav,audio/m4a" 
                 onChange={(e) => { if(e.target.files && e.target.files.length > 0) setAudioFile(e.target.files[0]) }}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
               <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4">cloud_upload</span>
               {audioFile ? (
                 <div className="text-center z-10 flex flex-col items-center">
                    <h4 className="text-lg font-bold text-white mb-2 pointer-events-none">{audioFile.name}</h4>
                    <p className="text-xs text-on-surface-variant font-mono pointer-events-none">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button 
                       onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAudioFile(null); }}
                       className="mt-4 px-3 py-1.5 bg-surface-container-high border border-white/10 hover:border-red-500/50 hover:text-red-400 text-xs font-bold uppercase tracking-widest rounded-sm transition-colors cursor-pointer pointer-events-auto shadow-md"
                    >
                       Remove Audio
                    </button>
                 </div>
               ) : (
                 <div className="text-center z-10 pointer-events-none">
                    <h4 className="text-lg font-bold text-white mb-2">Drop your audio file here</h4>
                    <p className="text-sm text-on-surface-variant">Supports MP3, WAV, M4A up to 25MB</p>
                    <p className="text-xs text-primary-container mt-4 uppercase tracking-widest font-bold">Or click to browse</p>
                 </div>
               )}
            </div>
          )}
        </div>

      </div>

      {/* Right: Settings Card */}
      <div className="glass-panel p-4 sm:p-8 border border-white/5 rounded-lg flex flex-col gap-8 h-fit bg-surface-container-low shadow-xl">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-container flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">tune</span>
          Video Specifications
        </h3>
        
        <div className="space-y-8">
          {/* Format */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-3">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setConfig({...config, aspect_ratio: "9:16"})}
                className={`flex flex-col items-center justify-center py-4 border rounded-sm transition-all ${config.aspect_ratio === "9:16" ? 'bg-primary-container/10 border-primary-container text-primary-container shadow-[0_0_10px_rgba(0,245,255,0.1)]' : 'bg-surface-container-lowest border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white'}`}>
                <span className="material-symbols-outlined text-2xl">phone_iphone</span>
                <span className="text-[10px] mt-2 font-bold tracking-widest">9:16 (Shorts)</span>
              </button>
              <button 
                onClick={() => setConfig({...config, aspect_ratio: "16:9"})}
                className={`flex flex-col items-center justify-center py-4 border rounded-sm transition-all ${config.aspect_ratio === "16:9" ? 'bg-primary-container/10 border-primary-container text-primary-container shadow-[0_0_10px_rgba(0,245,255,0.1)]' : 'bg-surface-container-lowest border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white'}`}>
                <span className="material-symbols-outlined text-2xl">desktop_windows</span>
                <span className="text-[10px] mt-2 font-bold tracking-widest">16:9 (YouTube)</span>
              </button>
              <button 
                onClick={() => setConfig({...config, aspect_ratio: "1:1"})}
                className={`flex flex-col items-center justify-center py-4 border rounded-sm transition-all ${config.aspect_ratio === "1:1" ? 'bg-primary-container/10 border-primary-container text-primary-container shadow-[0_0_10px_rgba(0,245,255,0.1)]' : 'bg-surface-container-lowest border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white'}`}>
                <span className="material-symbols-outlined text-2xl">square</span>
                <span className="text-[10px] mt-2 font-bold tracking-widest">1:1 (Post)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest p-3 border border-white/5 rounded-sm space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Canvas Resolution
              </label>
              <select
                value={config.resolution || "1080p"}
                onChange={(e) => setConfig({ ...config, resolution: e.target.value })}
                className="w-full bg-surface-container-highest border border-white/5 text-xs font-bold text-white py-2 px-3 rounded-sm outline-none focus:border-primary-container"
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="1440p">1440p</option>
                <option value="2160p">2160p (4K)</option>
              </select>
            </div>
            <div className="bg-surface-container-lowest p-3 border border-white/5 rounded-sm space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Render FPS
              </label>
              <select
                value={String(config.fps || 30)}
                onChange={(e) => setConfig({ ...config, fps: Number(e.target.value) })}
                className="w-full bg-surface-container-highest border border-white/5 text-xs font-bold text-white py-2 px-3 rounded-sm outline-none focus:border-primary-container"
              >
                <option value="24">24 FPS</option>
                <option value="30">30 FPS</option>
                <option value="48">48 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
          </div>

          <div className="border border-white/10 rounded-sm p-3 space-y-3 bg-surface-container-lowest">
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary-container">Caption Intelligence</div>

            <label className="flex items-center justify-between gap-3 text-[11px] text-on-surface-variant">
              <span>Auto Subtitle Correction</span>
              <input
                type="checkbox"
                checked={Boolean(config.auto_subtitle_correction)}
                onChange={(e) => setConfig({ ...config, auto_subtitle_correction: e.target.checked })}
                className="accent-primary-container"
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-[11px] text-on-surface-variant">
              <span>Keyword Highlighting</span>
              <input
                type="checkbox"
                checked={Boolean(config.keyword_highlighting)}
                onChange={(e) => setConfig({ ...config, keyword_highlighting: e.target.checked })}
                className="accent-primary-container"
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-[11px] text-on-surface-variant">
              <span>Batch Processing</span>
              <input
                type="checkbox"
                checked={Boolean(config.batch_processing)}
                onChange={(e) => setConfig({ ...config, batch_processing: e.target.checked })}
                className="accent-primary-container"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Source Language
              </label>
              <select
                value={config.source_language || "auto"}
                onChange={(e) => setConfig({ ...config, source_language: e.target.value })}
                className="w-full bg-surface-container-highest border border-white/5 text-xs font-bold text-white py-2 px-3 rounded-sm outline-none focus:border-primary-container"
              >
                {LANGUAGE_OPTIONS.filter((item) => item.value !== "original").map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Target Language
              </label>
              <select
                value={config.target_language || "original"}
                onChange={(e) => setConfig({ ...config, target_language: e.target.value })}
                className="w-full bg-surface-container-highest border border-white/5 text-xs font-bold text-white py-2 px-3 rounded-sm outline-none focus:border-primary-container"
              >
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
              Accessibility Presets
            </label>
            <select
              value={config.accessibility_preset || "default"}
              onChange={(e) => setConfig({ ...config, accessibility_preset: e.target.value })}
              className="w-full bg-surface-container-highest border border-white/5 text-xs font-bold text-white py-2 px-3 rounded-sm outline-none focus:border-primary-container"
            >
              {ACCESSIBILITY_OPTIONS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {inputType === "audio" && (
            <div className="border border-white/10 rounded-sm p-3 space-y-3 bg-surface-container-lowest">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary-container">
                Smart Silence / Dead-Air Removal
              </div>
              <label className="flex items-center justify-between gap-3 text-[11px] text-on-surface-variant">
                <span>Enable Smart Silence Removal</span>
                <input
                  type="checkbox"
                  checked={Boolean(config.smart_silence_removal)}
                  onChange={(e) => setConfig({ ...config, smart_silence_removal: e.target.checked })}
                  className="accent-primary-container"
                />
              </label>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center justify-between">
                  <span>Silence Threshold</span>
                  <span className="text-primary-container">{config.silence_gap_threshold_ms || 600}ms</span>
                </label>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={config.silence_gap_threshold_ms || 600}
                  onChange={(e) => setConfig({ ...config, silence_gap_threshold_ms: Number(e.target.value) })}
                  className="w-full accent-primary-container"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
