"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Hero from "@/components/dashboard/Hero";
import InputSettings from "@/components/dashboard/InputSettings";
import TextEffects from "@/components/dashboard/TextEffects";
import PreviewPanel from "@/components/dashboard/PreviewPanel";
import ExportPanel from "@/components/dashboard/ExportPanel";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import SecuritySettings from "@/components/dashboard/SecuritySettings";
import GrowthToolkit from "@/components/dashboard/GrowthToolkit";
import { EFFECTS } from "@/lib/effects/registry";

// New Defaults optimized for pure client-side HTML5 rendering features
type ConfigState = Record<string, string | number | boolean>;
const DEFAULT_EFFECT_ID = "HORMOZI_DOMINANCE";
const DEFAULT_CONFIG: ConfigState = { 
  aspect_ratio: "9:16", 
  fps: 30, 
  resolution: "1080p", 
  text_effect: DEFAULT_EFFECT_ID,
  font_family: "Space Grotesk",
  text_size: "80",
  main_color: "#FFD700", // Yellow for Hormozi
  position: "Center",
  speed: "180", // Ms per word
  auto_subtitle_correction: true,
  source_language: "auto",
  target_language: "original",
  accessibility_preset: "default",
  keyword_highlighting: true,
  smart_silence_removal: true,
  silence_gap_threshold_ms: 500,
  batch_processing: false,
};
const VALID_EFFECT_IDS = new Set(EFFECTS.map((effect) => effect.id));

function normalizeConfig(nextConfig: unknown): ConfigState {
  const merged: ConfigState = {
    ...DEFAULT_CONFIG,
    ...(typeof nextConfig === "object" && nextConfig !== null ? (nextConfig as ConfigState) : {}),
  };
  if (!VALID_EFFECT_IDS.has(String(merged.text_effect || ""))) {
    merged.text_effect = DEFAULT_EFFECT_ID;
  }
  return merged;
}

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value);

async function isUrlReachable(url: string) {
  if (!isRemoteUrl(url)) return true;
  try {
    const headRes = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (headRes.ok) return true;
    if (headRes.status !== 405) return false;
    const fallbackRes = await fetch(url, { cache: "no-store" });
    return fallbackRes.ok;
  } catch {
    return false;
  }
}

function DashboardContent() {
  const STORAGE_VIDEO_URL_KEY = "textmotion:lastVideoUrl";
  const STORAGE_BATCH_URLS_KEY = "textmotion:lastBatchVideoUrls";
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "generate";

  const [prompt, setPrompt] = useState("THE FUTURE IS MOTION.\nCreate bold viral captions.\nRender quickly for social posts.");
  const [inputType, setInputType] = useState<"text" | "audio">("text");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [config, setConfigState] = useState<ConfigState>(() => normalizeConfig(DEFAULT_CONFIG));
  const setConfig = (next: ConfigState | ((prev: ConfigState) => ConfigState)) => {
    setConfigState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      return normalizeConfig(resolved);
    });
  };
  
  // Changed states for Canvas Render Engine
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0); // 0 to 100 integer
  const [videoUrl, setVideoUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(STORAGE_VIDEO_URL_KEY) || "";
  });
  const [batchVideoUrls, setBatchVideoUrls] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const storedBatchUrlsRaw = window.localStorage.getItem(STORAGE_BATCH_URLS_KEY);
    if (!storedBatchUrlsRaw) return [];
    try {
      const parsed = JSON.parse(storedBatchUrlsRaw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === "string");
      }
    } catch {
      // Ignore malformed storage and continue with fresh state.
    }
    return [];
  });
  const hasCheckedStoredUrlsRef = useRef(false);

  useEffect(() => {
    if (hasCheckedStoredUrlsRef.current) return;
    hasCheckedStoredUrlsRef.current = true;

    let cancelled = false;

    const clearExpiredOutputUrls = async () => {
      const allUrls = [videoUrl, ...batchVideoUrls].filter((item) => typeof item === "string" && item.length > 0);
      if (!allUrls.length) return;

      const uniqueUrls = Array.from(new Set(allUrls));
      const checks = await Promise.all(
        uniqueUrls.map(async (url) => {
          const ok = await isUrlReachable(url);
          return { url, ok };
        })
      );

      if (cancelled) return;

      const reachableUrls = new Set(checks.filter((entry) => entry.ok).map((entry) => entry.url));
      const filteredBatch = batchVideoUrls.filter((url) => reachableUrls.has(url));
      const nextVideoUrl = reachableUrls.has(videoUrl) ? videoUrl : (filteredBatch[0] || "");

      if (filteredBatch.length !== batchVideoUrls.length) {
        setBatchVideoUrls(filteredBatch);
      }
      if (nextVideoUrl !== videoUrl) {
        setVideoUrl(nextVideoUrl);
      }
    };

    clearExpiredOutputUrls();
    return () => {
      cancelled = true;
    };
  }, [videoUrl, batchVideoUrls]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (videoUrl) {
      window.localStorage.setItem(STORAGE_VIDEO_URL_KEY, videoUrl);
    } else {
      window.localStorage.removeItem(STORAGE_VIDEO_URL_KEY);
    }
  }, [videoUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (batchVideoUrls.length) {
      window.localStorage.setItem(STORAGE_BATCH_URLS_KEY, JSON.stringify(batchVideoUrls));
    } else {
      window.localStorage.removeItem(STORAGE_BATCH_URLS_KEY);
    }
  }, [batchVideoUrls]);

  const handleGenerateComplete = (blobUrl: string) => {
    setBatchVideoUrls([]);
    setVideoUrl(blobUrl);
    setIsGenerating(false);
    setGenerateProgress(100);
    // Move to Export tab when complete
    router.push("/?tab=export");
  };

  const handleBatchComplete = (videoUrls: string[]) => {
    setBatchVideoUrls(videoUrls);
    setVideoUrl(videoUrls[0] || "");
    setIsGenerating(false);
    setGenerateProgress(100);
    router.push("/?tab=export");
  };

  return (
    <main className="pt-24 md:pt-16 pb-16 md:pb-24 min-h-screen relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,245,255,0.03),transparent_50%)] pointer-events-none"></div>
      
      {tab === 'generate' && <Hero />}
      
      <div className="max-w-7xl mx-auto px-3 sm:px-6 mt-8 md:mt-12 space-y-8 md:space-y-12 relative z-10 transition-all">
        
        {/* Render the selected view */}
        {tab === 'generate' && (
          <InputSettings 
            prompt={prompt} 
            setPrompt={setPrompt} 
            inputType={inputType}
            setInputType={setInputType}
            audioFile={audioFile}
            setAudioFile={setAudioFile}
            config={config} 
            setConfig={setConfig} 
          />
        )}

        {tab === 'effects' && (
          <TextEffects 
             config={config}
             setConfig={setConfig}
          />
        )}

        {tab === 'growth' && (
          <GrowthToolkit
            prompt={prompt}
            setPrompt={setPrompt}
            config={config}
            setConfig={setConfig}
          />
        )}

        {tab === 'export' && (
          <ExportPanel
             isGenerating={isGenerating}
             videoUrl={videoUrl}
             batchVideoUrls={batchVideoUrls}
             jobProgress={{ percentage: generateProgress, message: "Canvas Render Output" }}
          />
        )}
        
        {tab === 'profile' && (
          <ProfileSettings />
        )}

        {tab === 'security' && (
          <SecuritySettings />
        )}
        
        <div className={tab === "generate" || tab === "effects" ? undefined : "hidden"}>
          <PreviewPanel
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            videoUrl={videoUrl}
            onGenerateComplete={handleGenerateComplete}
            onGenerateProgress={setGenerateProgress}
            generateProgress={generateProgress}
            config={config}
            prompt={prompt}
            inputType={inputType}
            audioFile={audioFile}
            onBatchComplete={handleBatchComplete}
          />
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-primary-container font-mono uppercase tracking-widest animate-pulse">Initializing Engine...</div>}>
       <DashboardContent />
    </Suspense>
  )
}
