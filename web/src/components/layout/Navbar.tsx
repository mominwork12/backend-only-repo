"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  SignInButton,
  SignUpButton,
  useAuth,
} from "@clerk/nextjs";

function NavbarLinks() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "generate";

  return (
    <>
      <Link
        href="/?tab=generate"
        className={`px-3 py-1.5 text-sm rounded-full transition-all whitespace-nowrap ${
          tab === "generate"
            ? "text-[#00F5FF] border border-[#00F5FF]/40 bg-[#00F5FF]/10 shadow-[0_0_14px_rgba(0,245,255,0.16)]"
            : "text-slate-300 border border-transparent hover:border-white/20 hover:bg-white/5 hover:text-white"
        }`}
      >
        Generate
      </Link>
      <Link
        href="/?tab=effects"
        className={`px-3 py-1.5 text-sm rounded-full transition-all whitespace-nowrap ${
          tab === "effects"
            ? "text-[#00F5FF] border border-[#00F5FF]/40 bg-[#00F5FF]/10 shadow-[0_0_14px_rgba(0,245,255,0.16)]"
            : "text-slate-300 border border-transparent hover:border-white/20 hover:bg-white/5 hover:text-white"
        }`}
      >
        Text Effects
      </Link>
      <Link
        href="/?tab=export"
        className={`px-3 py-1.5 text-sm rounded-full transition-all whitespace-nowrap ${
          tab === "export"
            ? "text-[#00F5FF] border border-[#00F5FF]/40 bg-[#00F5FF]/10 shadow-[0_0_14px_rgba(0,245,255,0.16)]"
            : "text-slate-300 border border-transparent hover:border-white/20 hover:bg-white/5 hover:text-white"
        }`}
      >
        Export
      </Link>
      <Link
        href="/?tab=growth"
        className={`px-3 py-1.5 text-sm rounded-full transition-all whitespace-nowrap ${
          tab === "growth"
            ? "text-[#00F5FF] border border-[#00F5FF]/40 bg-[#00F5FF]/10 shadow-[0_0_14px_rgba(0,245,255,0.16)]"
            : "text-slate-300 border border-transparent hover:border-white/20 hover:bg-white/5 hover:text-white"
        }`}
      >
        Growth Kit
      </Link>
    </>
  );
}

export default function Navbar() {
  const { isSignedIn } = useAuth();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[linear-gradient(120deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_35%,rgba(0,245,255,0.08)_100%)] backdrop-blur-2xl shadow-[0_10px_32px_rgba(0,0,0,0.34),0_0_30px_rgba(0,245,255,0.07)]">
      <div className="flex justify-between items-center px-3 sm:px-5 md:px-8 h-16 w-full max-w-[1440px] mx-auto">
        <Link href="/?tab=generate" className="text-lg sm:text-2xl font-bold tracking-tighter text-white flex items-center gap-2 font-display min-w-0">
          <span
            className="material-symbols-outlined text-[#00F5FF] text-[20px] sm:text-[24px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            movie_filter
          </span>
          <span className="truncate">TextMotion AI</span>
        </Link>
        <div className="hidden md:flex gap-8 items-center font-display tracking-tight">
          <Suspense fallback={<div className="text-slate-300">Loading...</div>}>
             <NavbarLinks />
          </Suspense>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 md:gap-6">
          {!isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <button className="px-2.5 sm:px-3 py-2 border border-white/25 bg-white/5 text-white text-[10px] sm:text-xs font-bold tracking-wide uppercase rounded-md hover:border-[#00F5FF] hover:text-[#00F5FF] hover:bg-[#00F5FF]/10 transition-all">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-2.5 sm:px-3 py-2 border border-[#00F5FF]/70 bg-[#00F5FF]/10 text-[#00F5FF] text-[10px] sm:text-xs font-bold tracking-wide uppercase rounded-md hover:bg-[#00F5FF] hover:text-[#0b0b13] transition-all shadow-[0_0_14px_rgba(0,245,255,0.16)]">
                  Sign Up
                </button>
              </SignUpButton>
            </>
          ) : null}
          <button className="hidden sm:inline-flex px-3 md:px-4 py-2 border border-[#00F5FF]/70 bg-[#00F5FF]/10 text-[#00F5FF] text-xs md:text-sm font-bold tracking-tight rounded-md hover:shadow-[0_0_16px_0_rgba(0,245,255,0.3)] hover:bg-[#00F5FF]/15 transition-all scale-95 active:scale-90">
            Free Now
          </button>
        </div>
      </div>
      <div className="md:hidden px-3 sm:px-5 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <Suspense fallback={<div className="text-slate-300 text-xs">Loading...</div>}>
            <NavbarLinks />
          </Suspense>
        </div>
      </div>
      <div className="bg-gradient-to-r from-transparent via-[#00F5FF]/40 to-transparent h-px w-full"></div>
    </nav>
  );
}
