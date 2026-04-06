import { useRef, useState } from 'react';
import Link from 'next/link';

type ExportPanelProps = {
  isGenerating: boolean;
  videoUrl: string;
  batchVideoUrls: string[];
  jobProgress?: {
    percentage?: number;
    message?: string;
  };
};

export default function ExportPanel({ isGenerating, videoUrl, batchVideoUrls, jobProgress }: ExportPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [beforeAfterSplit, setBeforeAfterSplit] = useState(50);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const inferFilename = (url: string, fallbackName: string) => {
    try {
      const parsed = new URL(url, typeof window !== "undefined" ? window.location.href : "http://localhost");
      const segment = parsed.pathname.split("/").filter(Boolean).pop() || "";
      if (segment.includes(".")) return segment;
      return fallbackName;
    } catch {
      return fallbackName;
    }
  };

  const downloadVideo = async (url: string, fallbackName: string) => {
    const maxAttempts = 8;

    setIsDownloading(true);
    setDownloadStatus("Preparing download...");

    try {
      let blob: Blob | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        setDownloadStatus(`Downloading... (attempt ${attempt}/${maxAttempts})`);
        const res = await fetch(url, { cache: "no-store" });
        const contentType = (res.headers.get("content-type") || "").toLowerCase();

        if (!res.ok) {
          if ([429, 500, 502, 503, 504].includes(res.status) && attempt < maxAttempts) {
            setDownloadStatus("Backend is waking up. Retrying...");
            await sleep(Math.min(1200 * attempt, 7000));
            continue;
          }
          throw new Error(`HTTP_${res.status}`);
        }

        if (contentType.includes("application/json")) {
          throw new Error("JSON_ERROR_RESPONSE");
        }

        if (contentType.includes("text/html")) {
          const html = (await res.text()).toLowerCase();
          const isRenderWarmup =
            html.includes("application loading") ||
            html.includes("incoming http request detected");
          if (isRenderWarmup && attempt < maxAttempts) {
            setDownloadStatus("Render service is starting. Retrying...");
            await sleep(Math.min(1200 * attempt, 7000));
            continue;
          }
          throw new Error("HTML_ERROR_RESPONSE");
        }

        const candidate = await res.blob();
        if (!candidate.size) {
          if (attempt < maxAttempts) {
            setDownloadStatus("Output is not ready yet. Retrying...");
            await sleep(Math.min(1200 * attempt, 7000));
            continue;
          }
          throw new Error("EMPTY_FILE");
        }

        blob = candidate;
        break;
      }

      if (!blob) {
        throw new Error("DOWNLOAD_UNAVAILABLE");
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = inferFilename(url, fallbackName);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloadStatus("Download started");
    } catch {
      alert("The backend is still waking up or the file is unavailable. Please wait 20-60 seconds and try again.");
      setDownloadStatus("");
    } finally {
      setIsDownloading(false);
    }
  };

  const refreshVideoPreview = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.pause();
      video.currentTime = 0;
      video.load();
      await video.play();
    } catch {
      // Ignore autoplay restrictions and keep controls available.
    }
  };

  return (
    <div className="asymmetric-grid !grid-cols-1 max-w-4xl mx-auto animate-in fade-in duration-700">
      
      {isGenerating ? (
        <div data-testid="active-session-state" className="glass-panel p-6 sm:p-16 border border-white/5 rounded-lg flex flex-col items-center justify-center text-center bg-surface-container-low shadow-xl">
          <span className="material-symbols-outlined text-6xl text-primary-container mb-6 animate-spin">refresh</span>
          <h2 className="text-2xl font-display font-light text-white mb-2 tracking-wide">
            Active Render Session
          </h2>
          <p className="text-on-surface-variant max-w-md mx-auto text-sm leading-relaxed mb-8">
            Your video is currently rendering. Please wait...
          </p>
          <div className="w-full max-w-md h-2 bg-surface-container-highest rounded-full overflow-hidden mb-4 border border-white/5">
            <div 
              className="bg-primary-container h-full transition-all duration-[30ms] ease-linear shadow-[0_0_10px_rgba(0,245,255,0.4)]" 
              style={{width: `${jobProgress?.percentage || 0}%`}}>
            </div>
          </div>
          <p className="text-xs text-primary-container font-mono">{jobProgress?.percentage || 0}% Complete</p>
        </div>
      ) : !videoUrl ? (
        <div data-testid="empty-state" className="glass-panel p-6 sm:p-16 border border-white/5 rounded-lg flex flex-col items-center justify-center text-center bg-surface-container-low shadow-xl">
          <span className="material-symbols-outlined text-6xl text-surface-variant mb-6">dynamic_form</span>
          <h2 className="text-2xl font-display font-light text-white mb-2 tracking-wide">
            No Active Render Session
          </h2>
          <p className="text-on-surface-variant max-w-md mx-auto text-sm leading-relaxed mb-8">
            Return to the Generation dashboard and compile your text storyboard to produce an HTML5 Canvas WebM format object. 
          </p>
          <Link href="/?tab=generate" className="py-3 px-8 border border-primary-container text-[12px] font-bold uppercase tracking-widest text-primary-container hover:bg-primary-container hover:text-on-primary-container transition-all rounded-sm shadow-[0_0_15px_rgba(0,245,255,0.1)]">
            Initialize Engine
          </Link>
        </div>
      ) : (
        <div className="glass-panel border border-white/5 rounded-lg overflow-hidden bg-surface-container-low flex flex-col md:flex-row shadow-xl">
          {/* Player Left */}
          <div className="w-full md:w-1/2 bg-[#050508] p-4 sm:p-8 flex items-center justify-center border-r border-white/5 relative">
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 pr-4">
               <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] uppercase tracking-widest font-black border border-green-500/50 rounded-sm">Canvas Render Success</span>
               <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] uppercase tracking-widest font-black border border-blue-500/50 rounded-sm">Autoplay Loop Mode</span>
            </div>
            <div className="w-full max-w-[420px] space-y-3">
              <div className="relative rounded shadow-2xl ring-1 ring-white/10 overflow-hidden bg-black aspect-[9/16] max-h-[500px] mx-auto">
                <video
                  src={videoUrl}
                  autoPlay={true}
                  loop={true}
                  playsInline={true}
                  muted
                  className="absolute inset-0 h-full w-full object-contain bg-black"
                />
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${beforeAfterSplit}%` }}
                >
                  <video
                    src={videoUrl}
                    autoPlay={true}
                    loop={true}
                    playsInline={true}
                    muted
                    className="h-full w-full object-contain bg-black grayscale contrast-75 brightness-75"
                  />
                  <div className="absolute left-2 top-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-white/40 bg-black/70 text-white rounded-sm">
                    Before
                  </div>
                </div>
                <div className="absolute right-2 top-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-primary-container/50 bg-primary-container/15 text-primary-container rounded-sm">
                  After
                </div>
                <div
                  className="absolute inset-y-0 w-[2px] bg-white/80"
                  style={{ left: `${beforeAfterSplit}%` }}
                />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                  Before / After Slider
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={beforeAfterSplit}
                  onChange={(e) => setBeforeAfterSplit(Number(e.target.value))}
                  className="w-full accent-primary-container"
                />
              </div>
              <video 
                data-testid="rendered-video-player"
                ref={videoRef}
                src={videoUrl} 
                autoPlay={true} 
                loop={true} 
                playsInline={true}
                controls 
                className="max-h-[280px] w-full rounded shadow-xl ring-1 ring-white/10"
              />
            </div>
          </div>

          {/* Details Right */}
          <div className="w-full md:w-1/2 p-4 sm:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-primary-container mb-6 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[14px]">token</span>
                 Output Artifact
              </h2>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase block mb-1">Status</label>
                    <div className="text-white text-lg font-bold">100% {jobProgress?.message || "Rendered via HTML5 Canvas"}</div>
                 </div>
                 
                 <div>
                    <label className="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase block mb-1">Format</label>
                    <div className="text-white font-mono text-sm">VP9 / WEBM (Browser Native)</div>
                 </div>

                 <div>
                    <label className="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase block mb-1">Size / Bandwidth</label>
                    <div className="text-white font-mono text-sm">Dynamically Encoded</div>
                 </div>
              </div>
            </div>

            <div className="space-y-4 mt-12">
              <button 
                data-testid="download-webm-btn"
                onClick={() => downloadVideo(videoUrl, `textmotion_${Date.now()}.mp4`)}
                disabled={isDownloading}
                className="w-full bg-primary-container text-on-primary-container py-4 flex items-center justify-center gap-3 font-bold uppercase tracking-widest hover:brightness-110 shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-all rounded-sm">
                <span className="material-symbols-outlined">download</span>
                {isDownloading ? "Preparing..." : "Download Video"}
              </button>
              {downloadStatus ? (
                <p className="text-[10px] text-on-surface-variant tracking-wide">{downloadStatus}</p>
              ) : null}
              <button 
                data-testid="copy-blob-btn"
                onClick={() => navigator.clipboard.writeText(videoUrl)}
                className="w-full border border-white/10 py-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-white/5 transition-all rounded-sm">
                <span className="material-symbols-outlined text-[14px]">link</span>
                Copy Local Resource Blob
              </button>
              <button
                data-testid="refresh-video-btn"
                onClick={refreshVideoPreview}
                className="w-full border border-white/10 py-2.5 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-white/5 transition-all rounded-sm"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                Refresh
              </button>

              {Array.isArray(batchVideoUrls) && batchVideoUrls.length > 1 && (
                <div className="border border-white/10 rounded-sm p-3 bg-surface-container-lowest text-left">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary-container mb-2">
                    Batch Processing Results
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {batchVideoUrls.map((url: string, index: number) => (
                      <button
                        key={`${url}-${index}`}
                        onClick={() => downloadVideo(url, `textmotion_batch_${index + 1}.mp4`)}
                        className="block w-full text-left text-[11px] text-on-surface-variant hover:text-primary-container transition-colors truncate"
                      >
                        Download Batch Video {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
