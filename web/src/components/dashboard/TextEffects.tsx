import { EFFECTS } from "@/lib/effects/registry";

export default function TextEffects({ config, setConfig }: any) {
  
  // Quick Presets
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case "TikTok":
        setConfig({ ...config, text_effect: "RAPID_FIRE", speed: "150", font_family: "Space Grotesk", text_size: "100", main_color: "#FF2D78", scale: "1.0", position: "Center" });
        break;
      case "YouTubeShorts":
        setConfig({ ...config, text_effect: "HORMOZI_DOMINANCE", speed: "250", font_family: "Impact", text_size: "90", main_color: "#FFD700", scale: "1.3", position: "Center" });
        break;
      case "InstagramClean":
        setConfig({ ...config, text_effect: "SUBTITLE_TRACKING", speed: "300", font_family: "Montserrat", text_size: "60", main_color: "#00F5FF", scale: "1.0", position: "Center" });
        break;
      case "Story":
        setConfig({ ...config, text_effect: "CINEMATIC_FADE", speed: "400", font_family: "Syne", text_size: "70", main_color: "#FFFFFF", scale: "1.0", position: "Center" });
        break;
      case "Education":
        setConfig({ ...config, text_effect: "SUBTITLE_TRACKING", speed: "300", font_family: "Montserrat", text_size: "72", main_color: "#00F5FF", scale: "1.0", position: "Bottom Center" });
        break;
      case "Motivation":
        setConfig({ ...config, text_effect: "HORMOZI_DOMINANCE", speed: "210", font_family: "Impact", text_size: "105", main_color: "#FFD700", scale: "1.4", position: "Center" });
        break;
      case "BusinessAd":
        setConfig({ ...config, text_effect: "RAPID_FIRE", speed: "180", font_family: "Space Grotesk", text_size: "92", main_color: "#FF2D78", scale: "1.2", position: "Center" });
        break;
    }
  };

  return (
    <section className="space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-[#FF2D78]">auto_awesome</span>
            Viral Text Animation Styles
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Engine Core loaded <strong className="text-primary-container">{EFFECTS.length}</strong> modular styles. Selected: <strong className="text-white">{config?.text_effect}</strong>
          </p>
        </div>

        {/* Global Preset Buttons */}
        <div className="flex flex-wrap gap-2">
           <button onClick={() => applyPreset("TikTok")} className="px-3 py-1.5 bg-surface-container-highest border border-white/5 hover:border-[#FF2D78] hover:text-[#FF2D78] text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all text-on-surface-variant">TikTok Fast</button>
           <button onClick={() => applyPreset("YouTubeShorts")} className="px-3 py-1.5 bg-surface-container-highest border border-white/5 hover:border-[#FF0000] hover:text-[#FF0000] text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all text-on-surface-variant">YT Shorts Bold</button>
           <button onClick={() => applyPreset("InstagramClean")} className="px-3 py-1.5 bg-surface-container-highest border border-white/5 hover:border-[#00F5FF] hover:text-[#00F5FF] text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all text-on-surface-variant">IG Clean</button>
           <button onClick={() => applyPreset("Story")} className="px-3 py-1.5 bg-surface-container-highest border border-white/5 hover:border-white hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all text-on-surface-variant">Story Mode</button>
           <button onClick={() => applyPreset("Education")} className="px-3 py-1.5 bg-surface-container-highest border border-white/5 hover:border-[#00F5FF] hover:text-[#00F5FF] text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all text-on-surface-variant">Education</button>
           <button onClick={() => applyPreset("Motivation")} className="px-3 py-1.5 bg-surface-container-highest border border-white/5 hover:border-[#FFD700] hover:text-[#FFD700] text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all text-on-surface-variant">Motivation</button>
           <button onClick={() => applyPreset("BusinessAd")} className="px-3 py-1.5 bg-surface-container-highest border border-white/5 hover:border-[#FF2D78] hover:text-[#FF2D78] text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all text-on-surface-variant">Business Ad</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {EFFECTS.map((effect) => {
          const isSelected = config?.text_effect === effect.id;
          
          return (
            <div key={effect.id} className="group cursor-pointer" onClick={() => setConfig({ ...config, text_effect: effect.id })}>
              <div className={`h-[120px] bg-surface-container-lowest flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${isSelected ? 'border-2 border-primary-container shadow-[0_0_20px_rgba(0,245,255,0.15)] ring-1 ring-primary-container/50' : 'border border-white/5 hover:border-white/20'}`}>
                {effect.renderPreview()}
                
                {/* Selection Indicator Overlay */}
                <div className={`absolute inset-0 transition-opacity flex items-center justify-center ${isSelected ? 'bg-primary-container/5 opacity-100' : 'bg-white/5 opacity-0 group-hover:opacity-100'}`}>
                  {isSelected ? (
                    <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-primary-container rounded-sm shadow-[0_0_10px_rgba(0,245,255,0.8)]">
                      <span className="material-symbols-outlined text-on-primary-container text-xs font-black">check</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest text-center transition-colors ${isSelected ? 'text-primary-container' : 'text-on-surface-variant group-hover:text-white'}`}>
                {effect.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Customization Sub-panel */}
      <div className="glass-panel p-4 sm:p-6 border border-white/5 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 items-end bg-surface-container-low shadow-xl">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
            Font Family
          </label>
          <select 
            value={config?.font_family}
            onChange={(e) => setConfig({ ...config, font_family: e.target.value })}
            className="w-full bg-surface-container-highest border border-white/5 text-xs font-bold text-white py-2 px-3 rounded-sm outline-none focus:border-primary-container">
            <option value="Space Grotesk">Space Grotesk</option>
            <option value="Syne">Syne</option>
            <option value="Inter">Inter</option>
            <option value="Montserrat">Montserrat Black</option>
            <option value="Impact">Impact</option>
            <option value="Arial Black">Arial Black</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex justify-between">
            <span>Size</span>
            <span className="text-primary-container">{config?.text_size || "80"}</span>
          </label>
          <input
            className="w-full accent-primary-container relative top-1"
            type="range"
            min="30"
            max="200"
            step="5"
            value={config?.text_size || "80"}
            onChange={(e) => setConfig({ ...config, text_size: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex justify-between">
            <span>Pop Scale</span>
            <span className="text-primary-container">{config?.scale || "1.2"}x</span>
          </label>
          <input
            className="w-full accent-primary-container relative top-1"
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={config?.scale || "1.2"}
            onChange={(e) => setConfig({ ...config, scale: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
            Position
          </label>
          <select 
             value={config?.position || "Center"}
             onChange={(e) => setConfig({ ...config, position: e.target.value })}
             className="w-full bg-surface-container-highest border border-white/5 text-xs font-bold text-white py-2 px-3 rounded-sm outline-none focus:border-primary-container">
            <option>Top Center</option>
            <option>Center</option>
            <option>Bottom Center</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
            Pacing / Speed
          </label>
          <select 
            value={config?.speed || "250"}
            onChange={(e) => setConfig({ ...config, speed: e.target.value })}
            className="w-full bg-surface-container-highest border border-white/5 text-xs font-bold text-white py-2 px-3 rounded-sm outline-none focus:border-primary-container">
            <option value="150">Fast Break (150ms)</option>
            <option value="250">Standard (250ms)</option>
            <option value="400">Story Draw (400ms)</option>
            <option value="600">Cinematic (600ms)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
            Accent Color
          </label>
          <div className="relative group cursor-pointer w-full">
            <input 
              type="color" 
              value={config?.main_color || "#FFD700"} 
              onChange={(e) => setConfig({ ...config, main_color: e.target.value })}
              className="absolute opacity-0 w-full h-full cursor-pointer z-10" 
            />
            <div className="flex items-center justify-between p-[0.35rem] bg-surface-container-highest border border-white/5 rounded-sm group-hover:border-primary-container transition-colors w-full">
              <span className="text-[10px] font-mono ml-2">{config?.main_color || "#FFD700"}</span>
              <div className="w-6 h-6 rounded-[2px] shadow-inner border border-white/20" style={{ backgroundColor: config?.main_color || "#FFD700" }}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
