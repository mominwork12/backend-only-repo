"use client";
import { useEffect, useRef, useState } from "react";
import { EFFECTS } from "@/lib/effects/registry";

const LOCAL_BACKEND_URL = "http://localhost:8000";

function getBackendBaseUrl(): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return LOCAL_BACKEND_URL;
    }
  }

  return null;
}

function resolveResultUrl(baseUrl: string, resultUrl: string): string {
  if (resultUrl.startsWith("http://") || resultUrl.startsWith("https://")) {
    return resultUrl;
  }
  return `${baseUrl}${resultUrl}`;
}

function parseSsePayload(raw: string): any {
  const first = JSON.parse(raw);
  if (typeof first === "string") {
    return JSON.parse(first);
  }
  return first;
}

export default function PreviewPanel({ 
  isGenerating, 
  setIsGenerating, 
  onGenerateComplete, 
  onBatchComplete,
  onGenerateProgress,
  generateProgress, 
  config, 
  prompt,
  inputType,
  audioFile
}: any) {
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState("Idle");
  const [lastBackendUpdateAt, setLastBackendUpdateAt] = useState<number | null>(null);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [batchJobs, setBatchJobs] = useState<any[]>([]);
  const [failedReason, setFailedReason] = useState("");
  const [lastRequestMode, setLastRequestMode] = useState<"text" | "audio" | "batch" | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [loopRepeatCount, setLoopRepeatCount] = useState(1);
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(0);
  const [previewMode, setPreviewMode] = useState<"styled" | "raw">("styled");
  const lastBatchTextsRef = useRef<string[]>([]);
  const batchStateRef = useRef<Record<string, { status: string; progress: number; message: string; result_url?: string; error_message?: string }>>({});
  const batchTransientFailuresRef = useRef<Record<string, number>>({});
  const outputProbeRef = useRef<Record<string, { lastSize: number; stableProbes: number }>>({});

  const formatEta = (seconds: number | null) => {
    if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins <= 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getBatchTexts = () =>
    prompt
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

  const buildLoopedText = (baseText: string) => {
    const cleaned = (baseText || "").trim();
    if (!cleaned) return cleaned;
    if (inputType !== "text") return cleaned;

    const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
    const localMsPerWord = parseInt(config?.speed || "250", 10) || 250;
    const baseDuration = (words.length * localMsPerWord) / 1000;
    const durationRepeats =
      targetDurationSeconds > 0 && baseDuration > 0
        ? Math.ceil(targetDurationSeconds / baseDuration)
        : 1;
    const repeats = Math.max(1, Math.max(loopRepeatCount, durationRepeats));
    const safeRepeats = Math.min(repeats, 12);

    return Array.from({ length: safeRepeats }, () => cleaned).join(" ");
  };

  const probeOutputFile = async (baseUrl: string, jobId: string): Promise<{ exists: boolean; size: number }> => {
    try {
      const res = await fetch(`${baseUrl}/api/v1/outputs/${jobId}.mp4`, {
        method: "HEAD",
        cache: "no-store",
      });
      if (!res.ok) return { exists: false, size: -1 };

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (contentType && !contentType.includes("video")) return { exists: false, size: -1 };

      const contentLengthRaw = res.headers.get("content-length");
      if (contentLengthRaw) {
        const contentLength = parseInt(contentLengthRaw, 10);
        if (Number.isFinite(contentLength) && contentLength < 16000) {
          return { exists: false, size: contentLength };
        }
        if (Number.isFinite(contentLength)) return { exists: true, size: contentLength };
      }

      return { exists: true, size: -1 };
    } catch {
      return { exists: false, size: -1 };
    }
  };

  const canRecoverOutput = async (
    baseUrl: string,
    jobId: string,
    requiredStableProbes = 2,
    minBytes = 120000
  ) => {
    const probe = await probeOutputFile(baseUrl, jobId);
    const prev = outputProbeRef.current[jobId] || { lastSize: -1, stableProbes: 0 };

    if (!probe.exists || probe.size < minBytes || probe.size < 0) {
      outputProbeRef.current[jobId] = { lastSize: -1, stableProbes: 0 };
      return false;
    }

    const nextStable = prev.lastSize === probe.size ? prev.stableProbes + 1 : 1;
    outputProbeRef.current[jobId] = { lastSize: probe.size, stableProbes: nextStable };
    return nextStable >= requiredStableProbes;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldownTime > 0) {
      timer = setTimeout(() => setCooldownTime(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldownTime]);

  // Get Canvas Target Dimensions
  let baseWidth = 1080;
  let baseHeight = 1920;
  if (config.aspect_ratio === "16:9") {
    baseWidth = 1920;
    baseHeight = 1080;
  }
  if (config.aspect_ratio === "1:1") {
    baseWidth = 1080;
    baseHeight = 1080;
  }

  const resolutionScaleBySetting: Record<string, number> = {
    "540p": 0.5,
    "720p": 2 / 3,
    "1080p": 1,
    "1440p": 4 / 3,
    "2160p": 2,
  };
  const previewScale = resolutionScaleBySetting[String(config?.resolution || "1080p")] || 1;
  const renderWidth = Math.round(baseWidth * previewScale);
  const renderHeight = Math.round(baseHeight * previewScale);
  const previewCanvasScale = Math.min(1, previewScale);
  const cvWidth = Math.round(baseWidth * previewCanvasScale);
  const cvHeight = Math.round(baseHeight * previewCanvasScale);

  const effectivePrompt = buildLoopedText(prompt || "TYPE A PROMPT");
  const words = effectivePrompt ? effectivePrompt.trim().split(/\s+/) : ["TYPE", "A", "PROMPT"];
  const msPerWord = parseInt(config.speed) || 250;
  const totalDuration = words.length * msPerWord;
  const estimatedDurationSeconds = totalDuration / 1000;
  const backendBaseUrl = getBackendBaseUrl();

  const ensureBackendConfigured = () => {
    if (backendBaseUrl) return true;
    alert(
      "Backend API is not configured for production. Please set NEXT_PUBLIC_API_BASE_URL in frontend environment variables."
    );
    return false;
  };

  const startTextRender = async () => {
    if (!ensureBackendConfigured()) return;
    const baseUrl = backendBaseUrl as string;

    setIsGenerating(true);
    onGenerateProgress(0);
    setJobMessage("Submitting text job...");
    setLastBackendUpdateAt(Date.now());
    setEtaSeconds(null);
    setBatchJobs([]);
    setFailedReason("");
    setLastRequestMode("text");
    lastBatchTextsRef.current = [];
    startTimeRef.current = performance.now(); 

    const renderText = buildLoopedText(prompt || "TYPE A PROMPT");

    try {
      const res = await fetch(`${baseUrl}/api/v1/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: renderText,
          voice: "en-US-ChristopherNeural",
          config: config
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Backend returned ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      
      if (!data.job_id) throw new Error("No job ID returned");
      setCurrentJobId(data.job_id);
      setJobMessage("Job accepted. Waiting for backend updates...");
      monitorJob(data.job_id, baseUrl);
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
      setFailedReason("Failed to start text generation.");
      alert("Failed to start text generation. Please check backend URL and backend service health.");
    }
  };

  const startAudioRender = async () => {
    if (!ensureBackendConfigured()) return;
    const baseUrl = backendBaseUrl as string;

    if (!audioFile) {
      alert("Please upload an audio file first.");
      return;
    }
    
    setIsGenerating(true);
    onGenerateProgress(0);
    setJobMessage("Uploading audio and starting job...");
    setLastBackendUpdateAt(Date.now());
    setEtaSeconds(null);
    setBatchJobs([]);
    setFailedReason("");
    setLastRequestMode("audio");
    lastBatchTextsRef.current = [];
    startTimeRef.current = performance.now(); 

    try {
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("config", JSON.stringify(config));
      
      const res = await fetch(`${baseUrl}/api/v1/generate/audio`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Backend returned ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      
      if (!data.job_id) throw new Error("No job ID returned");
      setCurrentJobId(data.job_id);
      setJobMessage("Audio job accepted. Waiting for backend updates...");
      monitorJob(data.job_id, baseUrl);
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
      setFailedReason("Failed to start audio generation.");
      alert("Failed to start audio generation. Please check backend URL and backend service health.");
    }
  };

  const startBatchRender = async (overrideTexts?: string[]) => {
    if (!ensureBackendConfigured()) return;
    const baseUrl = backendBaseUrl as string;
    const rawTexts = overrideTexts && overrideTexts.length > 0 ? overrideTexts : getBatchTexts();
    const texts = rawTexts.map((item: string) => buildLoopedText(item));

    if (!texts.length) {
      alert("Please add at least one script line for batch processing.");
      return;
    }

    setIsGenerating(true);
    onGenerateProgress(0);
    setJobMessage(`Submitting batch (${texts.length})...`);
    setLastBackendUpdateAt(Date.now());
    setEtaSeconds(null);
    setFailedReason("");
    setLastRequestMode("batch");
    setBatchJobs([]);
    lastBatchTextsRef.current = rawTexts;
    startTimeRef.current = performance.now();

    try {
      const res = await fetch(`${baseUrl}/api/v1/generate/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts,
          voice: "en-US-ChristopherNeural",
          config: config,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Backend returned ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      if (!jobs.length) {
        throw new Error("Batch job creation failed.");
      }

      setBatchJobs(jobs.map((job: any) => ({ ...job, progress: 0 })));
      setJobMessage(`Batch accepted. Monitoring ${jobs.length} jobs...`);
      monitorBatchJobs(
        jobs.map((job: any) => String(job.job_id)),
        baseUrl
      );
    } catch (e: any) {
      console.error(e);
      setIsGenerating(false);
      setFailedReason(e?.message || "Failed to start batch generation.");
      alert("Failed to start batch generation. Please check backend URL and backend service health.");
    }
  };

  const monitorBatchJobs = async (jobIds: string[], baseUrl: string) => {
    const BATCH_MAX_POLLS = 210;
    const TRANSIENT_CHECK_EVERY = 5;
    const TRANSIENT_FAIL_THRESHOLD = 90;

    const total = jobIds.length;
    batchStateRef.current = {};
    batchTransientFailuresRef.current = {};
    jobIds.forEach((id) => {
      batchStateRef.current[id] = { status: "pending", progress: 0, message: "pending" };
      batchTransientFailuresRef.current[id] = 0;
    });

    for (let attempt = 0; attempt < BATCH_MAX_POLLS; attempt += 1) {
      const snapshots = await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const res = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`, { cache: "no-store" });
            if (!res.ok) return { id: jobId, status: "transient_error", progress: { percentage: 0 }, error_message: `Status check failed (${res.status})` };
            return await res.json();
          } catch {
            return { id: jobId, status: "transient_error", progress: { percentage: 0 }, error_message: "Status check failed" };
          }
        })
      );

      const mapped: any[] = [];
      for (const item of snapshots as any[]) {
        const current = batchStateRef.current[item.id] || { status: "pending", progress: 0, message: "pending" };
        if (item.status === "transient_error") {
          const failureCount = (batchTransientFailuresRef.current[item.id] || 0) + 1;
          batchTransientFailuresRef.current[item.id] = failureCount;

          if (failureCount % TRANSIENT_CHECK_EVERY === 0) {
            const recoverable = await canRecoverOutput(baseUrl, item.id);
            if (recoverable) {
              const recovered = {
                id: item.id,
                status: "done",
                progress: 100,
                message: "Recovered from output file",
                result_url: `/api/v1/outputs/${item.id}.mp4`,
                error_message: "",
              };
              batchStateRef.current[item.id] = {
                status: recovered.status,
                progress: recovered.progress,
                message: recovered.message,
                result_url: recovered.result_url,
                error_message: recovered.error_message,
              };
              mapped.push(recovered);
              continue;
            }
          }

          if (failureCount >= TRANSIENT_FAIL_THRESHOLD) {
            const failed = {
              id: item.id,
              status: "error",
              progress: current.progress,
              message: "Lost backend status connection",
              result_url: current.result_url,
              error_message: "Lost backend status connection for too long. Please retry this job.",
            };
            batchStateRef.current[item.id] = {
              status: failed.status,
              progress: failed.progress,
              message: failed.message,
              result_url: failed.result_url,
              error_message: failed.error_message,
            };
            mapped.push(failed);
            continue;
          }

          mapped.push({
            id: item.id,
            status: current.status,
            progress: current.progress,
            message: "Reconnecting status...",
            result_url: current.result_url,
            error_message: current.error_message || "",
            transient: true,
          });
          continue;
        }

        batchTransientFailuresRef.current[item.id] = 0;
        const next = {
          id: item.id,
          status: item.status || current.status || "pending",
          progress: Number(item.progress?.percentage ?? current.progress ?? 0),
          message: item.progress?.message || item.status || current.message || "pending",
          result_url: item.result_url || current.result_url,
          error_message: item.error_message || current.error_message || "",
        };
        batchStateRef.current[item.id] = {
          status: next.status,
          progress: next.progress,
          message: next.message,
          result_url: next.result_url,
          error_message: next.error_message,
        };
        mapped.push(next);
      }
      setBatchJobs(mapped);

      const doneCount = mapped.filter((job: any) => job.status === "done").length;
      const terminalCount = mapped.filter((job: any) => ["done", "error", "cancelled"].includes(job.status)).length;
      const avgProgress = mapped.reduce((sum: number, job: any) => sum + Math.max(0, Math.min(100, job.progress || 0)), 0) / total;
      onGenerateProgress(Math.max(1, Math.round(avgProgress)));
      setLastBackendUpdateAt(Date.now());
      const transientCount = mapped.filter((job: any) => Boolean(job.transient)).length;
      if (transientCount > 0) {
        setJobMessage(`Batch reconnecting status... (${transientCount} jobs)`);
      } else {
        setJobMessage(`Batch progress: ${doneCount}/${total} completed`);
      }

      if (terminalCount === total) {
        const successUrls = mapped
          .filter((job: any) => job.status === "done" && job.result_url)
          .map((job: any) => resolveResultUrl(baseUrl, job.result_url));
        const failed = mapped.filter((job: any) => job.status !== "done");
        if (failed.length) {
          setFailedReason(`${failed.length} batch jobs failed.`);
        } else {
          setFailedReason("");
        }

        setIsGenerating(false);
        if (successUrls.length > 0) {
          if (onBatchComplete) {
            onBatchComplete(successUrls);
          } else {
            onGenerateComplete(successUrls[0]);
          }
        } else {
          alert("Batch generation finished with errors and no output videos.");
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setIsGenerating(false);
    setFailedReason("Batch generation timed out.");
    alert("Batch generation timed out. Please retry.");
  };

  const cancelGeneration = async () => {
    if (!currentJobId || !backendBaseUrl) {
      if (batchJobs.length > 0) {
        setIsGenerating(false);
        setJobMessage("Stopped monitoring batch jobs.");
        setFailedReason("Batch monitoring stopped. Use retry recovery to resume checks.");
      }
      return;
    }
    try {
      await fetch(`${backendBaseUrl}/api/v1/jobs/${currentJobId}/cancel`, { method: "POST" });
    } catch(e) {
      console.error("Cancel failed", e);
    }
    setIsGenerating(false);
    setCurrentJobId(null);
    setJobMessage("Generation cancelled.");
  };

  const retryLastRequest = async () => {
    if (isGenerating || !lastRequestMode) return;
    setIsRetrying(true);
    try {
      if (lastRequestMode === "batch") {
        await startBatchRender(lastBatchTextsRef.current.length ? lastBatchTextsRef.current : undefined);
      } else if (lastRequestMode === "audio") {
        await startAudioRender();
      } else {
        await startTextRender();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleJobUpdate = (data: any, baseUrl: string) => {
    if (data.progress?.message) {
      setJobMessage(data.progress.message);
    } else if (data.status) {
      setJobMessage(`Status: ${data.status}`);
    }

    if (data.progress && data.progress.percentage !== undefined) {
      onGenerateProgress(data.progress.percentage);
      setLastBackendUpdateAt(Date.now());
    }

    if (data.status === "done") {
      setIsGenerating(false);
      setCurrentJobId(null);
      setJobMessage("Video generation complete.");
      setFailedReason("");
      if (data.result_url) {
        onGenerateComplete(resolveResultUrl(baseUrl, data.result_url));
      } else {
        alert("Video finished but no output URL was returned.");
      }
      return true;
    }

    if (data.status === "cancelled") {
      setIsGenerating(false);
      setCurrentJobId(null);
      setJobMessage("Generation cancelled.");
      setFailedReason("Generation cancelled.");
      return true;
    }

    if (data.status === "error") {
      setIsGenerating(false);
      setCurrentJobId(null);
      const errorMsg = data.error_message || "";
      setJobMessage("Generation failed.");
      setFailedReason(errorMsg || "Generation failed.");
      if (errorMsg.includes("RATE_LIMIT:")) {
        const seconds = parseInt(errorMsg.split(":")[1] || "210");
        setCooldownTime(seconds);
        alert(`Groq API Rate Limit Exceeded. Please wait ${seconds} seconds before trying again.`);
      } else if (!errorMsg.includes("Cancelled by User")) {
        alert("Error generating video: " + errorMsg);
      }
      return true;
    }

    return false;
  };

  const pollJobStatus = async (jobId: string, baseUrl: string) => {
    // Reliable fallback when SSE stream drops (common on free hosting tiers).
    setJobMessage("Connection unstable. Continuing with direct status checks...");
    const POLL_INTERVAL_MS = 1500;
    const MAX_POLLS = 1200; // ~30 minutes at 1.5s interval
    const MAX_STAGNANT_POLLS = 320; // ~8 minutes with no observable progress
    const MIN_RECOVERY_ATTEMPT = 24; // ~30s before trusting fallback recovery
    const MAX_CONSECUTIVE_FETCH_ERRORS = 120; // ~3 minutes of network/status failures
    const FINAL_RECOVERY_ATTEMPTS = 6;
    let lastProgress = -1;
    let lastStatus = "";
    let stagnantPolls = 0;
    let slowWarningShown = false;
    let consecutiveFetchErrors = 0;
    let consecutive404 = 0;

    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      try {
        const res = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`, { cache: "no-store" });
        if (res.status === 404) {
          consecutive404 += 1;
          consecutiveFetchErrors += 1;
          setJobMessage("Status endpoint warming up. Retrying...");
          if (attempt > 0 && attempt % 10 === 0) {
            const recoverable = await canRecoverOutput(baseUrl, jobId);
            if (recoverable && attempt >= MIN_RECOVERY_ATTEMPT) {
              setIsGenerating(false);
              setCurrentJobId(null);
              setJobMessage("Recovered output from storage.");
              setFailedReason("");
              onGenerateProgress(100);
              onGenerateComplete(resolveResultUrl(baseUrl, `/api/v1/outputs/${jobId}.mp4`));
              return;
            }
          }
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          continue;
        }
        if (res.ok) {
          consecutiveFetchErrors = 0;
          consecutive404 = 0;
          const data = await res.json();
          const isTerminal = handleJobUpdate(data, baseUrl);
          if (isTerminal) return;

          const progress = Number(data?.progress?.percentage ?? 0);
          const status = String(data?.status || "");
          const progressed = progress > lastProgress;
          const statusChanged = status !== lastStatus;

          if (progressed || statusChanged) {
            lastProgress = Math.max(lastProgress, progress);
            lastStatus = status;
            stagnantPolls = 0;
            slowWarningShown = false;
          } else {
            stagnantPolls += 1;
          }

          // Safety net: some providers lose status updates even after output is ready.
          if (attempt > 0 && attempt % 8 === 0) {
            const recoverable = await canRecoverOutput(baseUrl, jobId);
            if (recoverable && attempt >= MIN_RECOVERY_ATTEMPT) {
              setIsGenerating(false);
              setCurrentJobId(null);
              setJobMessage("Recovered output from storage.");
              setFailedReason("");
              onGenerateProgress(100);
              onGenerateComplete(`${baseUrl}/api/v1/outputs/${jobId}.mp4`);
              return;
            }
          }

          if (stagnantPolls >= MAX_STAGNANT_POLLS) {
            const recoverable = await canRecoverOutput(baseUrl, jobId);
            if (recoverable) {
              setIsGenerating(false);
              setCurrentJobId(null);
              setJobMessage("Recovered output from storage.");
              setFailedReason("");
              onGenerateProgress(100);
              onGenerateComplete(resolveResultUrl(baseUrl, `/api/v1/outputs/${jobId}.mp4`));
              return;
            }
            if (!slowWarningShown) {
              setJobMessage("Render is taking longer than expected. Still checking in the background...");
              slowWarningShown = true;
            }
          }
        } else {
          consecutiveFetchErrors += 1;
          setJobMessage(`Status check failed (${res.status}). Retrying...`);
        }
      } catch (e) {
        consecutiveFetchErrors += 1;
        console.error("Polling failed:", e);
      }

      if (consecutiveFetchErrors >= MAX_CONSECUTIVE_FETCH_ERRORS) {
        const recoverable = await canRecoverOutput(baseUrl, jobId, 1);
        if (recoverable) {
          setIsGenerating(false);
          setCurrentJobId(null);
          setJobMessage("Recovered output after connection issues.");
          setFailedReason("");
          onGenerateProgress(100);
          onGenerateComplete(resolveResultUrl(baseUrl, `/api/v1/outputs/${jobId}.mp4`));
          return;
        }
        setIsGenerating(false);
        setCurrentJobId(null);
        setJobMessage("Lost connection to backend status service.");
        setFailedReason(
          consecutive404 >= MAX_CONSECUTIVE_FETCH_ERRORS / 2
            ? "Backend status endpoint is unavailable. Please verify backend service health."
            : "Network connection to backend was unstable for too long."
        );
        alert("Lost connection to backend status service. Please verify backend is running, then click Retry Recovery.");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    for (let i = 0; i < FINAL_RECOVERY_ATTEMPTS; i += 1) {
      const recoverable = await canRecoverOutput(baseUrl, jobId, 1);
      if (recoverable) {
        setIsGenerating(false);
        setCurrentJobId(null);
        setJobMessage("Recovered output from storage.");
        setFailedReason("");
        onGenerateProgress(100);
        onGenerateComplete(resolveResultUrl(baseUrl, `/api/v1/outputs/${jobId}.mp4`));
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setIsGenerating(false);
    setCurrentJobId(null);
    setJobMessage("Generation is still pending after extended monitoring.");
    setFailedReason("Render monitoring timed out before backend confirmed completion.");
    alert("Render monitoring timed out. Please click Retry Recovery to resume status checks without changing your script.");
  };

  const monitorJob = (jobId: string, baseUrl: string) => {
    const evtSource = new EventSource(`${baseUrl}/api/v1/jobs/${jobId}/stream`);
    let completedViaStream = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    const resetWatchdog = () => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (completedViaStream) return;
        evtSource.close();
        pollJobStatus(jobId, baseUrl);
      }, 15000);
    };

    resetWatchdog();

    evtSource.onmessage = (event) => {
      try {
        resetWatchdog();
        const data = parseSsePayload(event.data);
        const isTerminal = handleJobUpdate(data, baseUrl);
        if (isTerminal) {
          completedViaStream = true;
          if (watchdog) clearTimeout(watchdog);
          evtSource.close();
        }
      } catch (e) {
        console.error("Invalid SSE payload:", e);
      }
    };

    evtSource.onerror = (err) => {
      if (completedViaStream) return;
      if (watchdog) clearTimeout(watchdog);
      evtSource.close();
      setJobMessage("Live connection dropped. Switching to direct checks...");
      console.error("EventSource failed, switching to polling:", err);
      pollJobStatus(jobId, baseUrl);
    };
  };

  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      const stale = !lastBackendUpdateAt || Date.now() - lastBackendUpdateAt > 6000;
      if (stale) {
        onGenerateProgress((prev: number) => {
          const safePrev = Number.isFinite(prev) ? prev : generateProgress;
          return Math.min(92, safePrev + 1);
        });
        if (!jobMessage || jobMessage === "Idle") {
          setJobMessage("Waiting for backend progress update...");
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isGenerating, lastBackendUpdateAt, onGenerateProgress, generateProgress, jobMessage]);

  useEffect(() => {
    if (!isGenerating) {
      setEtaSeconds(null);
      return;
    }
    if (!startTimeRef.current || generateProgress <= 0) return;

    const elapsedSeconds = (performance.now() - startTimeRef.current) / 1000;
    if (elapsedSeconds <= 0) return;
    const rate = generateProgress / elapsedSeconds;
    if (rate <= 0) return;

    const remaining = Math.max(0, (100 - generateProgress) / rate);
    setEtaSeconds(remaining);
  }, [isGenerating, generateProgress]);

  // Main Render Loop (Purely Visual Simulator now)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = (timestamp: number) => {
      let elapsedMs = 0;
      if (isGenerating && startTimeRef.current) {
        elapsedMs = timestamp - startTimeRef.current;
        // Keep looping visual simulation while waiting for backend
      } else {
        elapsedMs = timestamp % totalDuration;
      }

      // Base Canvas Clean (acts as background)
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, cvWidth, cvHeight);
      
      if (previewMode === "raw") {
        const wordIndex = Math.floor(elapsedMs / msPerWord);
        const currentWord = words[Math.min(wordIndex, words.length - 1)] || "";
        const fontSize = parseInt(config.text_size) || 80;
        let originY = cvHeight / 2;
        if (config.position === "Top Center") originY = cvHeight * 0.2;
        if (config.position === "Bottom Center") originY = cvHeight * 0.8;
        ctx.font = `900 ${fontSize}px ${config.font_family || "Space Grotesk"}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = Math.max(2, fontSize * 0.08);
        ctx.strokeStyle = "black";
        ctx.fillStyle = "white";
        ctx.strokeText(currentWord.toUpperCase(), cvWidth / 2, originY);
        ctx.fillText(currentWord.toUpperCase(), cvWidth / 2, originY);
      } else {
        // Look up effect with a stable fallback
        const activeEffect =
          EFFECTS.find((e) => e.id === config.text_effect) ||
          EFFECTS.find((e) => e.id === "HORMOZI_DOMINANCE") ||
          EFFECTS[0];
        
        // Dispatch cleanly to the plugin
        activeEffect.renderFrame({
           ctx, 
           canvasWidth: cvWidth, 
           canvasHeight: cvHeight, 
           words, 
           elapsedMs, 
           msPerWord, 
           config
        });
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [prompt, config, isGenerating, words, msPerWord, totalDuration, cvWidth, cvHeight, onGenerateProgress, previewMode]);

  return (
    <div className="asymmetric-grid !grid-cols-1 lg:!grid-cols-[1fr_400px] animate-in slide-in-from-bottom-8 duration-700 gap-4 md:gap-8">
      
      {/* Live Preview / Render Target */}
      <div className="glass-panel border border-white/5 rounded-lg overflow-hidden flex flex-col h-full bg-surface-container-low shadow-xl">
        <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-secondary animate-pulse shadow-[0_0_10px_rgba(255,45,120,0.8)]' : 'bg-primary-container shadow-[0_0_10px_rgba(0,245,255,0.8)]'}`}></div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">visibility</span>
              {isGenerating ? "Natively Recording Frame Data..." : "Live Modular Effects Simulator"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-container-highest border border-white/10 rounded-sm p-0.5">
              <button
                onClick={() => setPreviewMode("styled")}
                className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all ${
                  previewMode === "styled"
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:text-white"
                }`}
              >
                Styled
              </button>
              <button
                onClick={() => setPreviewMode("raw")}
                className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all ${
                  previewMode === "raw"
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:text-white"
                }`}
              >
                Raw
              </button>
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono text-on-surface-variant border border-white/10 px-2 py-0.5 rounded-sm whitespace-nowrap">
               {renderWidth} x {renderHeight} @ {config?.fps || 24}FPS
            </div>
          </div>
        </div>

        <div className="flex-grow bg-[#050508] relative flex items-center justify-center p-3 sm:p-8 min-h-[320px] sm:min-h-[500px]">
          <canvas
             ref={canvasRef}
             width={cvWidth}
             height={cvHeight}
             className="relative bg-surface-container-lowest border border-white/10 shadow-2xl object-contain max-h-[600px] rounded-sm transition-all duration-300"
             style={{ 
               width: config?.aspect_ratio === "16:9" ? "100%" : "auto", 
               height: config?.aspect_ratio === "16:9" ? "auto" : "100%"
             }}
          />
        </div>
      </div>

      {/* Generate & Engine Status */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="glass-panel p-4 border border-white/5 rounded-lg bg-surface-container-low space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary-container">
            Repeat + Duration Controls
          </div>
          {inputType === "text" ? (
            <>
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Repeat Count
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 5, 10].map((count) => (
                    <button
                      key={`repeat-${count}`}
                      onClick={() => setLoopRepeatCount(count)}
                      className={`px-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all ${
                        loopRepeatCount === count
                          ? "bg-primary-container/10 border-primary-container text-primary-container"
                          : "bg-surface-container-highest border-white/10 text-on-surface-variant hover:text-white hover:border-white/25"
                      }`}
                    >
                      {count}x
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Target Duration
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 10, 20, 30].map((seconds) => (
                    <button
                      key={`duration-${seconds}`}
                      onClick={() => setTargetDurationSeconds(seconds)}
                      className={`px-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all ${
                        targetDurationSeconds === seconds
                          ? "bg-secondary/15 border-secondary text-secondary"
                          : "bg-surface-container-highest border-white/10 text-on-surface-variant hover:text-white hover:border-white/25"
                      }`}
                    >
                      {seconds === 0 ? "Auto" : `${seconds}s`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-[11px] font-mono text-on-surface-variant border border-white/10 bg-surface-container-lowest rounded-sm px-3 py-2">
                Estimated output length: <span className="text-white">{words.length} words</span> /{" "}
                <span className="text-primary-container">{estimatedDurationSeconds.toFixed(1)}s</span>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-on-surface-variant">
              Repeat mode applies to text scripts. Switch to Script/Text mode to use looping.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button 
            data-testid="render-video-btn"
            onClick={() => (config?.batch_processing && inputType === "text" ? startBatchRender() : startTextRender())}
            disabled={isGenerating || !prompt}
            className={`w-full py-3.5 sm:py-4 font-black text-base sm:text-lg uppercase tracking-[0.15em] sm:tracking-widest transition-all flex items-center justify-center gap-3 rounded-lg border ${isGenerating ? 'bg-surface-container-highest border-white/5 text-surface cursor-not-allowed' : 'bg-primary-container/10 border-primary-container text-primary-container hover:bg-primary-container hover:text-on-primary-container hover:shadow-[0_0_30px_0_rgba(0,245,255,0.4)] scale-100 active:scale-95'}`}>
            <span className={`material-symbols-outlined text-2xl ${isGenerating ? 'animate-spin' : ''}`}>
               {isGenerating ? "sync" : "text_fields"}
            </span>
            {isGenerating
              ? (config?.batch_processing && inputType === "text" ? "PROCESSING BATCH..." : "PROCESSING...")
              : (config?.batch_processing && inputType === "text" ? "GENERATE BATCH" : "GENERATE CAPTION")}
          </button>

          <button 
            data-testid="audio-render-video-btn"
            onClick={startAudioRender}
            disabled={isGenerating || !audioFile || cooldownTime > 0}
            className={`w-full py-3.5 sm:py-4 font-black text-base sm:text-lg uppercase tracking-[0.15em] sm:tracking-widest transition-all flex items-center justify-center gap-3 rounded-lg border ${(!audioFile || isGenerating || cooldownTime > 0) ? 'bg-surface-container-highest border-white/5 text-surface cursor-not-allowed' : 'bg-secondary/10 border-secondary text-secondary hover:bg-secondary hover:text-on-secondary hover:shadow-[0_0_30px_0_rgba(255,45,120,0.4)] scale-100 active:scale-95'}`}>
            <span className={`material-symbols-outlined text-2xl ${isGenerating ? 'animate-spin' : ''}`}>
               {cooldownTime > 0 ? "hourglass_empty" : isGenerating ? "sync" : "audio_file"}
            </span>
            {cooldownTime > 0 
               ? `RATE LIMIT: WAIT ${cooldownTime}S`
               : isGenerating 
                  ? "UPLOADING AUDIO..." 
                  : "AUDIO TO CAPTION"}
          </button>

          {isGenerating && (
             <button 
               onClick={cancelGeneration}
               className="w-full py-3 font-bold text-sm tracking-widest transition-all flex items-center justify-center gap-2 rounded-lg border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white"
             >
               <span className="material-symbols-outlined text-lg">cancel</span>
               CANCEL OPERATION
             </button>
          )}

          {!isGenerating && failedReason && (
             <button
               onClick={retryLastRequest}
               disabled={isRetrying}
               className={`w-full py-3 font-bold text-sm tracking-widest transition-all flex items-center justify-center gap-2 rounded-lg border ${isRetrying ? "border-white/10 text-surface cursor-not-allowed" : "border-primary-container/40 text-primary-container bg-primary-container/10 hover:bg-primary-container hover:text-on-primary-container"}`}
             >
               <span className={`material-symbols-outlined text-lg ${isRetrying ? "animate-spin" : ""}`}>
                 {isRetrying ? "sync" : "refresh"}
               </span>
               {isRetrying ? "RETRYING..." : "RETRY RECOVERY"}
             </button>
          )}
        </div>

        <div className="glass-panel p-4 sm:p-6 border border-white/5 rounded-lg space-y-5 sm:space-y-6 flex-grow flex flex-col bg-surface-container-low shadow-xl">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
             <span className="material-symbols-outlined text-sm">videocam</span>
             Modular Render Engine
          </h3>
          
          <div className="space-y-4 flex-grow relative">
            <div className={`p-4 border border-white/10 rounded bg-surface-container-lowest transition-all ${isGenerating ? 'border-primary-container/50' : ''}`}>
               <div className="text-[10px] font-mono font-bold text-on-surface-variant mb-3 flex items-center justify-between">
                 <span>{isGenerating ? 'Backend Pipeline Processing' : 'Timeline Length Estimator'}</span>
                 <span className="text-white">{(totalDuration / 1000).toFixed(1)}s</span>
               </div>
               
               <div className="h-2 w-full bg-[#13131b] overflow-hidden rounded-full border border-white/10 shadow-inner">
                 <div 
                   className="h-full bg-gradient-to-r from-[#00F5FF] to-[#FF2D78] transition-all duration-[30ms] ease-linear"
                   style={{ width: `${generateProgress}%` }}>
                 </div>
               </div>
               <div className="mt-3 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono">
                 <span className="text-on-surface-variant truncate max-w-[170px] sm:max-w-[260px]">{jobMessage}</span>
                 <span className="text-primary-container">{Math.round(generateProgress)}%</span>
               </div>
               <div className="mt-2 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono">
                 <span className="text-on-surface-variant">ETA</span>
                 <span className="text-white">{formatEta(etaSeconds)}</span>
               </div>
            </div>

            {failedReason && (
              <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-sm p-2">
                {failedReason}
              </div>
            )}

            {batchJobs.length > 0 && (
              <div className="border border-white/10 rounded-sm bg-surface-container-lowest p-2 max-h-40 overflow-y-auto">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary-container mb-2">
                  Batch Processing
                </div>
                <div className="space-y-1">
                  {batchJobs.map((job: any, index: number) => (
                    <div key={`${job.id || index}-${index}`} className="text-[10px] font-mono flex items-center justify-between gap-2">
                      <span className="text-on-surface-variant">Job {index + 1}</span>
                      <span className="text-white">{job.status}</span>
                      <span className="text-primary-container">{Math.round(job.progress || 0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-on-surface-variant leading-relaxed font-mono mt-1 opacity-70">
              This panel uses a decoupled, pluggable architecture importing complex TypeMatrix abstractions into a 60hz loop.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
