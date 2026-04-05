"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function ProfileSettings() {
  const [name, setName] = useState("Neon Auteur");
  const [email, setEmail] = useState("auteur@textmotion.ai");
  const [language, setLanguage] = useState("English (Universal)");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // Simulate API Call
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto w-full font-body fade-in">
      <header className="mb-16">
        <h1 className="font-headline text-6xl md:text-8xl font-black tracking-tighter uppercase text-on-surface leading-none mb-4">
          Account <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container to-secondary-container">Settings</span>
        </h1>
        <p className="font-headline text-primary-container tracking-widest text-sm font-bold uppercase">System Configuration // User ID: NA-8829</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-1">
          <nav className="flex flex-col">
            <Link className="flex items-center space-x-4 px-6 py-4 bg-surface-container-high text-primary-container border-l-2 border-primary-container font-headline font-bold uppercase text-xs tracking-widest" href="/?tab=profile">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              <span>Profile</span>
            </Link>
            <Link className="flex items-center space-x-4 px-6 py-4 hover:bg-white/5 text-on-surface-variant transition-all font-headline font-bold uppercase text-xs tracking-widest group" href="/?tab=security">
              <span className="material-symbols-outlined group-hover:text-primary-container transition-colors">security</span>
              <span>Security</span>
            </Link>
            <Link className="flex items-center space-x-4 px-6 py-4 hover:bg-white/5 text-on-surface-variant transition-all font-headline font-bold uppercase text-xs tracking-widest group" href="#">
              <span className="material-symbols-outlined group-hover:text-primary-container transition-colors">payments</span>
              <span>Billing</span>
            </Link>
          </nav>
        </aside>
        
        {/* Content Area */}
        <div className="lg:col-span-9 space-y-8">
          
          {/* Profile Section */}
          <section className="bg-white/5 backdrop-blur-xl border border-white/5 p-8 rounded-lg shadow-2xl relative overflow-hidden">
             {/* decorative gradient background inside card */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_100%_0%,rgba(0,245,255,0.05),transparent_70%)] pointer-events-none"></div>

            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-2 border-primary-container p-1 shadow-[0_0_15px_0_rgba(0,245,255,0.3)] overflow-hidden">
                  <img alt="Profile Avatar" className="w-full h-full object-cover rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMHCNtQxT21e9-2ObVxpACC63wFpLo0OwxPRw8hYIsNZ0B59NC54Mev7XlN38EuOonCcABabAkJ4-a4KOnkDINZEqrSYFr1hfTI5dHgb3f_Nh-nX7N56lwD33A4duzQuY7WBfMDPEh_2u4chnpQqW4mXUp-8ioKCNH0DBi7iP7rgMJQ73RZ1MuRGTiMOQbx8Qqb2nKPil7wvJWnqJve_p9QvZqe_xqWSdn2XErbzc1ai8lUPjmO3asTM2Q5lEbTudrF9VcB-ukJz1E"/>
                </div>
                <button className="absolute bottom-0 right-0 bg-primary-container text-[#003739] p-2 rounded-full shadow-lg active:scale-95 transition-transform flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="relative group/input">
                  <label className="block font-headline text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 font-bold">Full Name</label>
                  <input 
                    className="w-full bg-[#34343d] border-none text-on-surface p-4 focus:ring-0 rounded-sm focus:outline-none transition-colors" 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[#00f5ff] transition-all duration-300 group-focus-within/input:w-full"></div>
                </div>
                
                <div className="relative group/input">
                  <label className="block font-headline text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 font-bold">Email Address</label>
                  <input 
                    className="w-full bg-[#34343d] border-none text-on-surface p-4 focus:ring-0 rounded-sm focus:outline-none transition-colors" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[#00f5ff] transition-all duration-300 group-focus-within/input:w-full"></div>
                </div>
                
                <div className="relative group/input md:col-span-2">
                  <label className="block font-headline text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 font-bold">Language Preference</label>
                  <select 
                    className="w-full bg-[#34343d] border-none text-on-surface p-4 focus:ring-0 rounded-sm appearance-none cursor-pointer focus:outline-none transition-colors"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option>English (Universal)</option>
                    <option>Japanese (Cyberpunk Standard)</option>
                    <option>German (Industrial Tech)</option>
                  </select>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[#00f5ff] transition-all duration-300 group-focus-within/input:w-full"></div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-4 items-center relative z-10">
               {saved && <span className="text-[#00F5FF] text-xs font-bold font-headline uppercase tracking-widest animate-pulse">Configuration Synced</span>}
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-primary-container text-[#002021] font-headline font-black uppercase text-xs tracking-widest px-8 py-4 rounded-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_15px_0_rgba(0,245,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? "Syncing..." : "Save Changes"}
                {saving && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
              </button>
            </div>
          </section>
          
          {/* Subscription & Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white/5 backdrop-blur-xl border border-white/5 p-8 rounded-lg flex flex-col justify-between shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_100%_0%,rgba(0,245,255,0.06),transparent_70%)] pointer-events-none"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-headline font-black uppercase text-sm tracking-widest text-on-surface">Current Plan</h3>
                  <span className="px-3 py-1 bg-primary-container/10 text-primary-container border border-primary-container/30 font-headline font-bold text-[10px] tracking-[0.2em] uppercase rounded-full shadow-[0_0_15px_0_rgba(0,245,255,0.2)]">FREE</span>
                </div>
                <p className="text-on-surface-variant text-sm mb-2 font-light">You&apos;re on the free plan — unlimited local renders, WebM export, and all 11 caption effects included.</p>
                <p className="text-primary-container/60 text-[10px] uppercase tracking-widest font-bold">No credit card required · Always free</p>
              </div>
              <div className="mt-6 relative z-10">
                <span className="inline-flex items-center gap-2 text-[10px] font-bold text-primary-container/60 font-headline uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm">check_circle</span> Billing active — free tier
                </span>
              </div>
            </section>
            
            <section className="bg-white/5 backdrop-blur-xl border border-white/5 p-8 rounded-lg shadow-2xl">
              <h3 className="font-headline font-black uppercase text-sm tracking-widest text-on-surface mb-6">Usage Stats</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-headline font-bold uppercase tracking-widest mb-3">
                    <span className="text-on-surface-variant">Videos Generated</span>
                    <span className="text-primary-container">42 / 100</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#34343d] overflow-hidden rounded-full">
                    <div className="h-full bg-primary-container shadow-[0_0_15px_0_rgba(0,245,255,0.3)] transition-all duration-1000" style={{ width: '42%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-headline font-bold uppercase tracking-widest mb-3">
                    <span className="text-on-surface-variant">Storage Space</span>
                    <span className="text-[#e00363]">8.4 GB / 20 GB</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#34343d] overflow-hidden rounded-full">
                    <div className="h-full bg-[#e00363] shadow-[0_0_15px_0_rgba(224,3,99,0.4)] transition-all duration-1000" style={{ width: '42%' }}></div>
                  </div>
                </div>
              </div>
            </section>
          </div>
          
          
        </div>
      </div>
    </div>
  );
}
