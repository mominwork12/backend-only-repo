export default function InputSettings({ prompt, setPrompt, inputType, setInputType, audioFile, setAudioFile, config, setConfig }: any) {
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

        <div className="relative group flex-grow flex flex-col">
          {inputType === 'text' ? (
            <>
              <textarea
                data-testid="script-textarea"
                maxLength={5000}
                className="w-full flex-grow min-h-[240px] sm:min-h-[300px] bg-surface-container-lowest border border-white/5 rounded-sm text-on-surface font-body p-4 sm:p-5 text-base sm:text-lg leading-relaxed focus:outline-none focus:border-primary-container/50 resize-none placeholder:text-surface-variant transition-colors shadow-inner"
                placeholder="Type your story here... The engine will send it to the backend for Edge-TTS synthesis."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              ></textarea>
              {prompt.length >= 4500 && (
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
              <div className="mt-3 flex flex-wrap items-center gap-3 sm:absolute sm:bottom-4 sm:right-4 sm:mt-0">
                 <div className={`text-[10px] font-mono bg-surface-container-lowest border px-2 py-1 rounded ${
                   prompt.length >= 5000 ? 'text-red-400 border-red-500/40' :
                   prompt.length >= 4500 ? 'text-yellow-400 border-yellow-500/40' :
                   'text-on-surface-variant border-white/10'
                 }`}>
                    Words: {prompt.split(/\s+/).filter((w: string) => w.length > 0).length} | Chars: {prompt.length}/5000
                 </div>
              </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest p-3 border border-white/5 rounded-sm">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Canvas Resolution</label>
              <div className="text-sm font-bold text-white">{config.resolution || "1080p HD"}</div>
            </div>
            <div className="bg-surface-container-lowest p-3 border border-white/5 rounded-sm">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Render FPS</label>
              <div className="text-sm font-bold text-white">{config.fps || 30} FPS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
