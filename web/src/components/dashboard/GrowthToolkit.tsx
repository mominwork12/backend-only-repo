"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SavedProject = {
  id: string;
  name: string;
  prompt: string;
  config: Record<string, string | number | boolean>;
  createdAt: number;
};

type BrandKit = {
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  outroText: string;
  watermarkText: string;
};

type WorkspaceComment = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
};

const CTA_TEMPLATES = [
  "Follow for more daily growth tips.",
  "Comment 'START' and I will share the full strategy.",
  "Save this and test it in your next video.",
  "Click the link and build your first caption workflow now.",
  "Want more? DM me 'CAPTION' for the full playbook.",
];

const BROLL_HINTS: Array<{ keyword: string; suggestion: string }> = [
  { keyword: "money", suggestion: "Close-up of cashflow chart + laptop typing scene." },
  { keyword: "business", suggestion: "Team whiteboard planning shot with sticky notes." },
  { keyword: "marketing", suggestion: "Phone analytics dashboard scroll with engagement spikes." },
  { keyword: "motivation", suggestion: "Runner sunrise clip + determined face close-up." },
  { keyword: "learn", suggestion: "Notebook writing + tutorial playback on monitor." },
  { keyword: "ai", suggestion: "Keyboard macro typing + futuristic UI overlays." },
  { keyword: "product", suggestion: "Hands-on product demo shot with smooth pan." },
  { keyword: "sales", suggestion: "Handshake clip + CRM pipeline board transition." },
];

const DEFAULT_BRAND_KIT: BrandKit = {
  logoUrl: "",
  primaryColor: "#00F5FF",
  accentColor: "#FF2D78",
  fontFamily: "Space Grotesk",
  outroText: "Follow for more.",
  watermarkText: "@textmotionai",
};

function extractKeywords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3);
  return Array.from(new Set(tokens)).slice(0, 8);
}

function buildHooks(source: string): string[] {
  const keywords = extractKeywords(source);
  const seed = keywords[0] || "content";
  const second = keywords[1] || "growth";
  return [
    `Stop scrolling: this ${seed} trick changes everything.`,
    `I wasted months until I learned this ${second} rule.`,
    `If you want results fast, do this before your next post.`,
    `Nobody tells creators this about ${seed}.`,
    `Steal this 15-second framework to boost retention today.`,
  ];
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export default function GrowthToolkit({
  prompt,
  setPrompt,
  config,
  setConfig,
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  config: any;
  setConfig: any;
}) {
  const [hookIdeas, setHookIdeas] = useState<string[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [workspaceComments, setWorkspaceComments] = useState<WorkspaceComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("free");
  const [usedCredits, setUsedCredits] = useState(0);

  useEffect(() => {
    setBrandKit(readJson<BrandKit>("tm_brand_kit", DEFAULT_BRAND_KIT));
    setSavedProjects(readJson<SavedProject[]>("tm_saved_projects", []));
    setWorkspaceComments(readJson<WorkspaceComment[]>("tm_workspace_comments", []));
    setSelectedPlan(readJson<"free" | "pro">("tm_plan", "free"));
    setUsedCredits(readJson<number>("tm_used_credits", 0));
  }, []);

  useEffect(() => writeJson("tm_brand_kit", brandKit), [brandKit]);
  useEffect(() => writeJson("tm_saved_projects", savedProjects), [savedProjects]);
  useEffect(() => writeJson("tm_workspace_comments", workspaceComments), [workspaceComments]);
  useEffect(() => writeJson("tm_plan", selectedPlan), [selectedPlan]);
  useEffect(() => writeJson("tm_used_credits", usedCredits), [usedCredits]);

  const promptWordCount = useMemo(
    () => prompt.split(/\s+/).filter((word) => word.trim().length > 0).length,
    [prompt]
  );

  const estimatedSeconds = useMemo(() => {
    const speed = Number(config.speed || 250);
    return (promptWordCount * speed) / 1000;
  }, [promptWordCount, config.speed]);

  const estimatedCredits = useMemo(() => {
    const fps = Number(config.fps || 30);
    const resolution = String(config.resolution || "1080p");
    const resolutionMultiplier =
      resolution === "2160p" ? 2.2 : resolution === "1440p" ? 1.6 : resolution === "1080p" ? 1.2 : 1;
    const fpsMultiplier = fps >= 60 ? 1.35 : fps >= 48 ? 1.2 : 1;
    return Math.max(1, Math.ceil((estimatedSeconds / 12) * resolutionMultiplier * fpsMultiplier));
  }, [config.fps, config.resolution, estimatedSeconds]);

  const brollSuggestions = useMemo(() => {
    const keywords = extractKeywords(prompt);
    const hits = BROLL_HINTS.filter((item) =>
      keywords.some((word) => word.includes(item.keyword) || item.keyword.includes(word))
    );
    if (hits.length) return hits.slice(0, 5).map((item) => item.suggestion);
    return [
      "Opening medium shot with subtle zoom for the first 3 seconds.",
      "Cutaway to hands-on action footage aligned to key keywords.",
      "Pattern interrupt clip every 4-6 seconds to keep retention high.",
    ];
  }, [prompt]);

  const saveCurrentProject = () => {
    const titleSeed = prompt.split(/\s+/).slice(0, 4).join(" ").trim() || "Untitled";
    const next: SavedProject = {
      id: `${Date.now()}`,
      name: `${titleSeed}...`,
      prompt,
      config,
      createdAt: Date.now(),
    };
    setSavedProjects((prev) => [next, ...prev].slice(0, 25));
  };

  const applyBrandKit = () => {
    setConfig({
      ...config,
      main_color: brandKit.primaryColor,
      font_family: brandKit.fontFamily,
    });
    if (brandKit.outroText.trim() && !prompt.includes(brandKit.outroText.trim())) {
      setPrompt(`${prompt.trim()}\n${brandKit.outroText.trim()}`);
    }
  };

  const applyPlan = (plan: "free" | "pro") => {
    setSelectedPlan(plan);
    setConfig({
      ...config,
      watermark_enabled: plan === "free",
    });
  };

  const addWorkspaceComment = () => {
    const text = newComment.trim();
    if (!text) return;
    const next: WorkspaceComment = {
      id: `${Date.now()}`,
      author: "Owner",
      text,
      createdAt: Date.now(),
    };
    setWorkspaceComments((prev) => [next, ...prev].slice(0, 40));
    setNewComment("");
  };

  return (
    <section className="glass-panel p-4 sm:p-6 border border-white/5 rounded-lg bg-surface-container-low shadow-xl space-y-6">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container">rocket_launch</span>
          Growth + Monetization Toolkit
        </h2>
        <p className="text-sm text-on-surface-variant">
          Before/After, Hook Generator, Brand Kit, B-roll, CTA, History, Team, Usage meter, SEO paths, and plan controls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-white/10 rounded-sm p-4 bg-surface-container-lowest space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-container">Hook Generator (AI)</div>
          <button
            onClick={() => setHookIdeas(buildHooks(prompt))}
            className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-primary-container/50 text-primary-container hover:bg-primary-container hover:text-on-primary-container rounded-sm transition-all"
          >
            Generate 5 Hooks
          </button>
          <div className="space-y-2">
            {hookIdeas.map((hook, index) => (
              <button
                key={`${hook}-${index}`}
                onClick={() => setPrompt(`${hook}\n${prompt}`)}
                className="w-full text-left text-xs border border-white/10 hover:border-primary-container/50 hover:text-white text-on-surface-variant rounded-sm px-3 py-2 transition-all"
              >
                {index + 1}. {hook}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-white/10 rounded-sm p-4 bg-surface-container-lowest space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-container">Auto B-Roll Suggestions</div>
          <div className="space-y-2">
            {brollSuggestions.map((suggestion, index) => (
              <div key={`${suggestion}-${index}`} className="text-xs text-on-surface-variant border border-white/10 rounded-sm px-3 py-2">
                {suggestion}
              </div>
            ))}
          </div>
        </div>

        <div className="border border-white/10 rounded-sm p-4 bg-surface-container-lowest space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-container">One-Click Brand Kit</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={brandKit.logoUrl}
              onChange={(e) => setBrandKit((prev) => ({ ...prev, logoUrl: e.target.value }))}
              className="bg-surface-container-highest border border-white/10 rounded-sm px-3 py-2 text-xs text-white"
              placeholder="Logo URL"
            />
            <input
              value={brandKit.fontFamily}
              onChange={(e) => setBrandKit((prev) => ({ ...prev, fontFamily: e.target.value }))}
              className="bg-surface-container-highest border border-white/10 rounded-sm px-3 py-2 text-xs text-white"
              placeholder="Default Font"
            />
            <input
              type="color"
              value={brandKit.primaryColor}
              onChange={(e) => setBrandKit((prev) => ({ ...prev, primaryColor: e.target.value }))}
              className="h-10 bg-surface-container-highest border border-white/10 rounded-sm"
            />
            <input
              value={brandKit.outroText}
              onChange={(e) => setBrandKit((prev) => ({ ...prev, outroText: e.target.value }))}
              className="bg-surface-container-highest border border-white/10 rounded-sm px-3 py-2 text-xs text-white"
              placeholder="Default Outro"
            />
          </div>
          <button
            onClick={applyBrandKit}
            className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-primary-container/50 text-primary-container hover:bg-primary-container hover:text-on-primary-container rounded-sm transition-all"
          >
            Apply Brand Kit
          </button>
        </div>

        <div className="border border-white/10 rounded-sm p-4 bg-surface-container-lowest space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-container">Auto CTA End Card</div>
          <div className="space-y-2">
            {CTA_TEMPLATES.map((template, index) => (
              <button
                key={`${template}-${index}`}
                onClick={() => setPrompt(`${prompt.trim()}\n${template}`)}
                className="w-full text-left text-xs border border-white/10 hover:border-secondary/60 hover:text-white text-on-surface-variant rounded-sm px-3 py-2 transition-all"
              >
                {template}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-white/10 rounded-sm p-4 bg-surface-container-lowest space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-container">Project Save + History</div>
          <button
            onClick={saveCurrentProject}
            className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-primary-container/50 text-primary-container hover:bg-primary-container hover:text-on-primary-container rounded-sm transition-all"
          >
            Save Current Project
          </button>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {savedProjects.map((project) => (
              <div key={project.id} className="border border-white/10 rounded-sm p-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-white font-semibold">{project.name}</div>
                  <div className="text-[10px] text-on-surface-variant">{new Date(project.createdAt).toLocaleString()}</div>
                </div>
                <button
                  onClick={() => {
                    setPrompt(project.prompt);
                    setConfig(project.config);
                  }}
                  className="text-[10px] uppercase tracking-widest border border-white/15 hover:border-primary-container/60 hover:text-primary-container px-2 py-1 rounded-sm transition-all"
                >
                  Reopen
                </button>
              </div>
            ))}
            {!savedProjects.length && <p className="text-xs text-on-surface-variant">No saved projects yet.</p>}
          </div>
        </div>

        <div className="border border-white/10 rounded-sm p-4 bg-surface-container-lowest space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-container">Usage Meter + Cost Estimator</div>
          <div className="text-xs text-on-surface-variant">Estimated length: {estimatedSeconds.toFixed(1)}s</div>
          <div className="text-xs text-on-surface-variant">Estimated credits: {estimatedCredits}</div>
          <div className="text-xs text-on-surface-variant">Used credits: {usedCredits} / 1000</div>
          <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-primary-container to-secondary transition-all"
              style={{ width: `${Math.min(100, (usedCredits / 1000) * 100)}%` }}
            />
          </div>
          <button
            onClick={() => setUsedCredits((prev) => prev + estimatedCredits)}
            className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-secondary/50 text-secondary hover:bg-secondary hover:text-on-secondary rounded-sm transition-all"
          >
            Add This Render To Usage
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-white/10 rounded-sm p-4 bg-surface-container-lowest space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-container">Team Workspace (Agency Mode)</div>
          <p className="text-xs text-on-surface-variant">Shared comments, roles, and collaboration notes.</p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {workspaceComments.map((comment) => (
              <div key={comment.id} className="border border-white/10 rounded-sm p-2">
                <div className="text-[10px] text-primary-container">{comment.author}</div>
                <div className="text-xs text-white">{comment.text}</div>
              </div>
            ))}
            {!workspaceComments.length && <div className="text-xs text-on-surface-variant">No team comments yet.</div>}
          </div>
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-surface-container-highest border border-white/10 rounded-sm px-3 py-2 text-xs text-white"
              placeholder="Add agency note..."
            />
            <button
              onClick={addWorkspaceComment}
              className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-primary-container/50 text-primary-container hover:bg-primary-container hover:text-on-primary-container rounded-sm transition-all"
            >
              Add
            </button>
          </div>
        </div>

        <div className="border border-white/10 rounded-sm p-4 bg-surface-container-lowest space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-container">Watermark + No-Watermark Plans</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => applyPlan("free")}
              className={`p-3 border rounded-sm text-left transition-all ${
                selectedPlan === "free"
                  ? "border-primary-container text-primary-container bg-primary-container/10"
                  : "border-white/10 text-on-surface-variant"
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-widest">Free</div>
              <div className="text-[11px] mt-1">Watermark Enabled</div>
            </button>
            <button
              onClick={() => applyPlan("pro")}
              className={`p-3 border rounded-sm text-left transition-all ${
                selectedPlan === "pro"
                  ? "border-secondary text-secondary bg-secondary/10"
                  : "border-white/10 text-on-surface-variant"
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-widest">Pro</div>
              <div className="text-[11px] mt-1">No Watermark</div>
            </button>
          </div>
          <div className="text-xs text-on-surface-variant">
            Active plan: <span className="text-white font-semibold">{selectedPlan.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="border border-white/10 rounded-sm p-4 bg-surface-container-lowest space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-primary-container">SEO Landing Pages</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link className="border border-white/10 px-3 py-1.5 rounded-sm hover:border-primary-container hover:text-primary-container transition-all" href="/reels-captions">/reels-captions</Link>
          <Link className="border border-white/10 px-3 py-1.5 rounded-sm hover:border-primary-container hover:text-primary-container transition-all" href="/youtube-shorts-captions">/youtube-shorts-captions</Link>
          <Link className="border border-white/10 px-3 py-1.5 rounded-sm hover:border-primary-container hover:text-primary-container transition-all" href="/education-captions">/education-captions</Link>
          <Link className="border border-white/10 px-3 py-1.5 rounded-sm hover:border-primary-container hover:text-primary-container transition-all" href="/motivation-captions">/motivation-captions</Link>
          <Link className="border border-white/10 px-3 py-1.5 rounded-sm hover:border-primary-container hover:text-primary-container transition-all" href="/business-ads-captions">/business-ads-captions</Link>
        </div>
      </div>
    </section>
  );
}
