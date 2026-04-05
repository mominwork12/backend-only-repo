import ShaderCanvas from "@/components/ui/ShaderCanvas";

export default function Hero() {
  return (
    <section className="relative min-h-[614px] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
      {/* Shader Background Layer */}
      <div className="absolute inset-0 z-0">
        <ShaderCanvas />
        {/* Dark Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080810]/60 via-[#080810]/40 to-[#080810] pointer-events-none"></div>
      </div>
      <div className="relative z-10 max-w-4xl">
        <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-white tracking-tighter leading-none mb-6 text-shadow-neon">
          Turn Words Into{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container to-secondary">
            Cinematic Video
          </span>
        </h1>
        <p className="font-body text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 text-shadow-neon">
          Paste text or upload audio — we do the rest. High-fidelity motion
          graphics powered by professional AI engines.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-primary-container text-on-primary-container px-8 py-4 font-bold text-lg flex items-center justify-center gap-2 hover:shadow-[0_0_20px_0_rgba(0,245,255,0.4)] transition-all">
            <span className="material-symbols-outlined">edit_note</span>
            Start with Text
          </button>
          <button className="border border-outline-variant bg-black/20 backdrop-blur-md text-white px-8 py-4 font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined">mic</span>
            Upload Audio
          </button>
        </div>
      </div>
    </section>
  );
}
