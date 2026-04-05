import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#080810] w-full py-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 gap-8">
        <div className="flex flex-col items-center md:items-start">
          <div className="text-lg font-bold text-white font-display tracking-tighter mb-2">
            TextMotion AI
          </div>
          <p className="font-body text-xs uppercase tracking-widest text-slate-600">
            © 2024 TextMotion AI. Designed for Auteurs.
          </p>
        </div>
        <div className="flex gap-8 font-body text-xs uppercase tracking-widest">
          <Link
            href="#"
            className="text-slate-600 hover:text-[#FF2D78] transition-colors opacity-80 hover:opacity-100"
          >
            Pricing
          </Link>
          <Link
            href="#"
            className="text-slate-600 hover:text-[#FF2D78] transition-colors opacity-80 hover:opacity-100"
          >
            Docs
          </Link>
          <Link
            href="#"
            className="text-slate-600 hover:text-[#FF2D78] transition-colors opacity-80 hover:opacity-100"
          >
            API
          </Link>
          <Link
            href="#"
            className="text-slate-600 hover:text-[#FF2D78] transition-colors opacity-80 hover:opacity-100"
          >
            Contact
          </Link>
        </div>
        <div className="flex gap-4">
          <Link
            href="#"
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-primary-container border border-white/5 rounded-full"
          >
            <span className="material-symbols-outlined text-sm">public</span>
          </Link>
          <Link
            href="#"
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-primary-container border border-white/5 rounded-full"
          >
            <span className="material-symbols-outlined text-sm">forum</span>
          </Link>
          <Link
            href="#"
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-primary-container border border-white/5 rounded-full"
          >
            <span className="material-symbols-outlined text-sm">video_library</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
