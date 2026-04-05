"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [is2FaActive, setIs2FaActive] = useState(true);
  const [savingPwd, setSavingPwd] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpdatePassword = () => {
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    setErrorMsg("");
    setSavingPwd(true);
    setTimeout(() => {
      setSavingPwd(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto w-full font-body fade-in">
      <header className="mb-16">
        <h1 className="font-headline text-6xl md:text-8xl font-black tracking-tighter uppercase text-on-surface leading-none mb-4">
          Security <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container to-secondary-container">Config</span>
        </h1>
        <div className="flex items-center space-x-4">
          <div className="px-3 py-1 bg-surface-container-low border border-white/5 flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">User ID:</span>
            <span className="text-xs font-mono text-primary-container">NA-8829</span>
          </div>
          <div className="px-3 py-1 bg-surface-container-low border border-white/5 flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest text-on-surface font-bold">System: Operational</span>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-1">
          <nav className="flex flex-col">
            <Link className="flex items-center space-x-4 px-6 py-4 hover:bg-white/5 text-on-surface-variant transition-all font-headline font-bold uppercase text-xs tracking-widest group" href="/?tab=profile">
              <span className="material-symbols-outlined group-hover:text-primary-container transition-colors" style={{ fontVariationSettings: "'FILL' 0" }}>person</span>
              <span>Profile</span>
            </Link>
            <Link className="flex items-center space-x-4 px-6 py-4 bg-surface-container-high text-primary-container border-l-2 border-primary-container font-headline font-bold uppercase text-xs tracking-widest" href="/?tab=security">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Password Management Card */}
            <section className="bg-white/5 backdrop-blur-xl border border-white/5 p-8 rounded-lg group transition-all duration-300 hover:bg-white/[0.06] shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_100%_0%,rgba(0,245,255,0.03),transparent_70%)] pointer-events-none"></div>
              
              <div className="flex items-center space-x-3 mb-8 relative z-10">
                <span className="material-symbols-outlined text-secondary-container">key</span>
                <h2 className="text-lg font-headline font-bold uppercase tracking-widest text-white">Password Management</h2>
              </div>
              
              <div className="space-y-6 relative z-10">
                <div className="space-y-1.5 focus-within:text-primary-container transition-colors">
                  <label className="text-[10px] uppercase tracking-[0.1em] font-bold ml-1 text-inherit transition-colors">Current Password</label>
                  <input 
                    className="w-full bg-[#13131b]/50 border border-[#34343d] focus:ring-0 text-white placeholder:text-gray-600 h-12 px-4 transition-all focus:bg-[#34343d] focus:border-primary-container outline-none" 
                    placeholder="••••••••••••" 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 focus-within:text-primary-container transition-colors">
                  <label className="text-[10px] uppercase tracking-[0.1em] font-bold ml-1 text-inherit transition-colors">New Password</label>
                  <input 
                    className="w-full bg-[#13131b]/50 border border-[#34343d] focus:ring-0 text-white placeholder:text-gray-600 h-12 px-4 transition-all focus:bg-[#34343d] focus:border-primary-container outline-none" 
                    placeholder="••••••••••••" 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 focus-within:text-primary-container transition-colors">
                  <label className="text-[10px] uppercase tracking-[0.1em] font-bold ml-1 text-inherit transition-colors">Confirm New Password</label>
                  <input 
                    data-testid="confirm-password-input"
                    className="w-full bg-[#13131b]/50 border border-[#34343d] focus:ring-0 text-white placeholder:text-gray-600 h-12 px-4 transition-all focus:bg-[#34343d] focus:border-primary-container outline-none" 
                    placeholder="••••••••••••" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {errorMsg && <p data-testid="password-error-msg" role="alert" className="text-red-400 text-xs mt-1 ml-1">{errorMsg}</p>}
                </div>
                <button 
                  data-testid="update-password-btn"
                  onClick={handleUpdatePassword}
                  disabled={savingPwd || (!currentPassword) || (!newPassword)}
                  className="w-full mt-4 h-12 bg-white/5 border border-white/10 hover:border-primary-container hover:bg-primary-container hover:text-on-primary-container text-primary-container font-bold uppercase tracking-widest text-xs transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingPwd ? "Updating..." : "Update Password"}
                  {savingPwd && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
                </button>
              </div>
            </section>
            
            {/* 2FA Card */}
            <section className="bg-white/5 backdrop-blur-xl border border-white/5 p-8 rounded-lg group transition-all duration-300 hover:bg-white/[0.06] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_100%_0%,rgba(0,245,255,0.03),transparent_70%)] pointer-events-none"></div>
               
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex items-center space-x-3">
                  <span className="material-symbols-outlined text-primary-container">vibration</span>
                  <h2 className="text-lg font-headline font-bold uppercase tracking-widest text-white">Two-Factor Auth</h2>
                </div>
                <div className={`flex items-center px-2 py-0.5 border ${is2FaActive ? "bg-primary-container/10 border-primary-container/30 text-primary-container" : "bg-gray-500/10 border-gray-500/30 text-gray-400"}`}>
                  <span className="text-[10px] font-bold tracking-widest">{is2FaActive ? "ACTIVE" : "INACTIVE"}</span>
                </div>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-8 relative z-10">
                Add an extra layer of security to your account by requiring a verification code from your mobile device every time you sign in.
              </p>
              
              <div className="flex items-center justify-between p-4 bg-[#13131b]/50 mb-8 rounded-sm border border-[#34343d] relative z-10">
                <div>
                  <span className="text-xs font-bold text-white block mb-0.5">Authenticator App</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Google Auth / Authy</span>
                </div>
                {/* Standard tailwind styled toggle switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={is2FaActive}
                    onChange={(e) => setIs2FaActive(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>
              
              <button className="w-full h-12 bg-primary-container/10 border border-primary-container/30 text-primary-container font-bold uppercase tracking-widest text-xs transition-all duration-300 hover:bg-primary-container hover:text-[#002021] shadow-[0_0_15px_rgba(0,245,255,0.2)] relative z-10">
                Configure Authenticator App
              </button>
            </section>
            

            {/* Active Sessions Card */}
            <section data-testid="active-sessions" className="bg-white/5 backdrop-blur-xl border border-white/5 p-8 rounded-lg group transition-all duration-300 hover:bg-white/[0.06] shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="flex items-center space-x-3">
                   <span className="material-symbols-outlined text-primary-container">devices</span>
                   <h2 className="text-lg font-headline font-bold uppercase tracking-widest text-white">Active Sessions</h2>
                 </div>
               </div>
               <p className="text-on-surface-variant text-sm leading-relaxed mb-4 relative z-10">
                 Manage devices currently signed into your account.
               </p>
               <div className="flex items-center justify-between p-4 bg-[#13131b]/50 rounded-sm border border-[#34343d]">
                 <div><span className="text-xs font-bold text-white block">Current Session</span><span className="text-[10px] text-primary-container">Windows PC - Chrome</span></div>
                 <button data-testid="revoke-session-btn" className="text-xs text-red-400 font-bold uppercase tracking-widest hover:underline">Revoke</button>
               </div>
            </section>

            {/* API Keys Card */}
            <section data-testid="api-keys" className="bg-white/5 backdrop-blur-xl border border-white/5 p-8 rounded-lg group transition-all duration-300 hover:bg-white/[0.06] shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="flex items-center space-x-3">
                   <span className="material-symbols-outlined text-primary-container">api</span>
                   <h2 className="text-lg font-headline font-bold uppercase tracking-widest text-white">API Keys</h2>
                 </div>
               </div>
               <p className="text-on-surface-variant text-sm leading-relaxed mb-4 relative z-10">
                 Generate and manage your API keys for external access.
               </p>
               <div className="flex items-center justify-between p-4 bg-[#13131b]/50 rounded-sm border border-[#34343d]">
                 <div><span className="text-xs font-bold text-white block">Default Key</span><span data-testid="api-key-value" className="text-[10px] text-gray-500 font-mono">sk-18274...9201</span></div>
                 <button data-testid="revoke-api-key-btn" className="text-xs text-primary-container font-bold uppercase tracking-widest hover:underline">Revoke</button>
               </div>
            </section>
            
          </div>
        </div>
      </div>
    </div>
  );
}
