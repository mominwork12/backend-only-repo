import os
import asyncio
import re
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from schemas import JobStatus, GenerateTextRequest
from core.jobs import update_job_progress, get_job
from core.caption_utils import (
    auto_correct_subtitle_text,
    compact_timestamps_by_silence,
    mark_keywords,
)
from ai.audio import generate_speech_and_subtitles
from ai.transcribe import transcribe_audio_to_words
from ai.translate import translate_text_if_needed

from moviepy.editor import (
    ColorClip,
    AudioFileClip,
    ImageClip,
    CompositeVideoClip,
    concatenate_audioclips,
)
import proglog

OUTPUT_DIR = os.getenv("OUTPUT_DIR", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
FONT_PATH = "fonts/Montserrat-Black.ttf"
ARABIC_FONT_PATH = "fonts/arial.ttf"
FAST_RENDER_MODE = os.getenv("FAST_RENDER_MODE", "1").strip().lower() in {"1", "true", "yes", "on"}
ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]")
RTL_RE = re.compile(r"[\u0590-\u05FF\u0600-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]")
RESOLUTION_LEVEL = {"540p": 1, "720p": 2, "1080p": 3, "1440p": 4, "2160p": 5}
LEVEL_TO_RESOLUTION = {v: k for k, v in RESOLUTION_LEVEL.items()}

try:
    import arabic_reshaper  # type: ignore
    from bidi.algorithm import get_display  # type: ignore
except Exception:  # pragma: no cover - optional dependency fallback
    arabic_reshaper = None
    get_display = None


def has_arabic_text(text: str) -> bool:
    return bool(ARABIC_RE.search(text or ""))


def has_rtl_text(text: str) -> bool:
    return bool(RTL_RE.search(text or ""))


def prepare_display_text(raw_text: str) -> str:
    text = str(raw_text or "").strip()
    if not text:
        return ""

    # Preserve non-Latin scripts (Arabic/Hebrew/etc.) and apply shaping for Arabic.
    if has_rtl_text(text):
        if has_arabic_text(text) and arabic_reshaper and get_display:
            try:
                reshaped = arabic_reshaper.reshape(text)
                return get_display(reshaped)
            except Exception:
                return text
        return text

    return text.upper()


def load_caption_font_for_text(text: str, size: int):
    font_candidates = []

    if has_arabic_text(text):
        font_candidates.extend(
            [
                ARABIC_FONT_PATH,
                "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
                "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/segoeui.ttf",
            ]
        )

    font_candidates.extend(
        [
            FONT_PATH,
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ]
    )

    seen = set()
    for candidate in font_candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            continue

    return ImageFont.load_default()


def get_render_profile(
    aspect_ratio: str,
    resolution: str,
    fps: int,
    estimated_duration: float = 12.0,
    word_count: int = 0,
):
    ratio = aspect_ratio if aspect_ratio in {"9:16", "16:9", "1:1"} else "9:16"
    requested_resolution = str(resolution or "720p").lower()

    supported_resolutions = {"2160p", "1440p", "1080p", "720p", "540p"}
    if requested_resolution not in supported_resolutions:
        requested_resolution = "720p"

    try:
        target_fps = int(fps)
    except Exception:
        target_fps = 24

    target_fps = max(12, min(60, target_fps))

    tuning_notes = []
    if FAST_RENDER_MODE:
        max_resolution = "1080p"
        max_fps = 30

        # Long scripts/audio are auto-optimized to avoid Render free-tier stalls.
        if estimated_duration >= 25 or word_count >= 120:
            max_resolution = "720p"
            max_fps = 24
        if estimated_duration >= 50 or word_count >= 220:
            max_resolution = "540p"
            max_fps = 20

        requested_level = RESOLUTION_LEVEL.get(requested_resolution, RESOLUTION_LEVEL["720p"])
        allowed_level = RESOLUTION_LEVEL.get(max_resolution, RESOLUTION_LEVEL["720p"])
        capped_level = min(requested_level, allowed_level)
        capped_resolution = LEVEL_TO_RESOLUTION[capped_level]

        if capped_resolution != requested_resolution:
            tuning_notes.append(f"resolution auto-tuned to {capped_resolution.upper()}")
            requested_resolution = capped_resolution

        if target_fps > max_fps:
            tuning_notes.append(f"fps auto-tuned to {max_fps}")
            target_fps = max_fps

    # Keep hosted rendering responsive by default.
    if ratio == "9:16":
        dims_by_resolution = {
            "2160p": (2160, 3840),
            "1440p": (1440, 2560),
            "1080p": (1080, 1920),
            "720p": (720, 1280),
            "540p": (540, 960),
        }
    elif ratio == "16:9":
        dims_by_resolution = {
            "2160p": (3840, 2160),
            "1440p": (2560, 1440),
            "1080p": (1920, 1080),
            "720p": (1280, 720),
            "540p": (960, 540),
        }
    else:
        dims_by_resolution = {
            "2160p": (2160, 2160),
            "1440p": (1440, 1440),
            "1080p": (1080, 1080),
            "720p": (720, 720),
            "540p": (540, 540),
        }

    render_dims = dims_by_resolution[requested_resolution]
    note = "; ".join(tuning_notes)
    return render_dims, target_fps, requested_resolution.upper(), note


def get_caption_style(config):
    base_size = 130
    try:
        configured_size = int(getattr(config, "text_size", "80"))
        base_size = max(48, min(180, configured_size))
    except Exception:
        pass

    main_color = getattr(config, "main_color", "#FFD700")
    preset = str(getattr(config, "accessibility_preset", "default")).strip().lower()
    style = {
        "font_size": base_size,
        "outline_width": 12,
        "main_color": main_color,
    }

    if preset == "high_contrast":
        style["main_color"] = "#FFFF00"
        style["outline_width"] = 14
    elif preset == "dyslexia_friendly":
        style["font_size"] = max(style["font_size"], 110)
        style["main_color"] = "#FFFFFF"
    elif preset == "larger_text":
        style["font_size"] = max(style["font_size"], 140)
    elif preset == "safe_colors":
        style["main_color"] = "#00F5FF"

    if FAST_RENDER_MODE:
        style["outline_width"] = max(6, style["outline_width"] - 4)

    return style


def should_apply_watermark(config) -> bool:
    tier = str(getattr(config, "plan_tier", "free")).strip().lower()
    watermark_enabled = bool(getattr(config, "watermark_enabled", True))
    if tier in {"pro", "business", "enterprise"}:
        return watermark_enabled
    return True


def create_watermark_overlay(resolution, duration, config):
    width, height = resolution
    text = str(getattr(config, "watermark_text", "TextMotionAI")).strip() or "TextMotionAI"
    font_size = max(18, min(54, int(min(width, height) * 0.04)))

    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except Exception:
        font = ImageFont.load_default()

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    pad_x = max(16, int(width * 0.02))
    pad_y = max(16, int(height * 0.02))
    x = width - text_w - pad_x
    y = height - text_h - pad_y

    # Gentle badge background for readability.
    rect_pad_x = 16
    rect_pad_y = 8
    draw.rounded_rectangle(
        [x - rect_pad_x, y - rect_pad_y, x + text_w + rect_pad_x, y + text_h + rect_pad_y],
        radius=8,
        fill=(0, 0, 0, 110),
    )
    draw.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, 180))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 220))

    return ImageClip(np.array(img)).set_duration(duration).set_position((0, 0))


class SSEVideoLogger(proglog.ProgressBarLogger):
    """
    Hooks directly into MoviePy's rendering engine and pushes live 0-100% 
    frames rendered updates back to our Next.js dashboard via SSE.
    """
    def __init__(self, job_id, loop, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.job_id = job_id
        self.loop = loop
        
    def bars_callback(self, bar, attr, value, old_value=None):
        job = get_job(self.job_id)
        if job and job.status == JobStatus.CANCELLED:
            raise Exception("Generation Cancelled by User")

        if bar == 't':
            total = self.bars[bar]['total']
            perc = int((value / total) * 100) if total else 0
            # Reserve 0-40 for prep, use 40-95 for actual frame encode progress.
            render_stage_perc = min(95, 40 + int(perc * 0.55))
            # Route sync logger back to the async loop
            asyncio.run_coroutine_threadsafe(
                update_job_progress(self.job_id, JobStatus.RENDERING, "Compositing Video", render_stage_perc, f"Rendering video frame {value}/{total}..."),
                self.loop
            )

def create_word_clip(word_data, resolution, config):
    """
    Draws Hormozi-style text captions completely from scratch using Pillow.
    Guarantees it works natively on Windows without ImageMagick.
    """
    style = get_caption_style(config)
    font_size = style["font_size"]
    raw_word = str(word_data.get("word", ""))
    word = prepare_display_text(raw_word)
    font = load_caption_font_for_text(word, font_size)
    outline_width = style["outline_width"]
    shadow_offset = 0 if FAST_RENDER_MODE else 8

    # Measure using final stroke width so glyph edges are never clipped.
    measure_img = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    measure_draw = ImageDraw.Draw(measure_img)
    left, top, right, bottom = measure_draw.textbbox(
        (0, 0),
        word,
        font=font,
        stroke_width=outline_width,
    )
    text_w = right - left
    text_h = bottom - top

    pad = 26 if not FAST_RENDER_MODE else 14
    # Extra bottom room avoids descender/stroke cut on words like "FEEL", Arabic letters, etc.
    extra_bottom = max(6, outline_width)
    img_w = max(16, text_w + pad * 2 + shadow_offset)
    img_h = max(16, text_h + pad * 2 + shadow_offset + extra_bottom)
    img = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    x = pad - left
    y = pad - top
    
    # Hormozi styling: Thick stroke, high contrast
    outline_color = (15, 15, 20, 255)
    
    # Dynamic styling (emphasize longer words with yellow)
    is_emphasized = bool(word_data.get("highlight")) or len(word) > 6
    accent = style["main_color"].lstrip("#")
    try:
        accent_color = tuple(int(accent[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        accent_color = (255, 230, 0)
    fill_color = (*accent_color, 255) if is_emphasized else (255, 255, 255, 255)
    
    # Shadow offset (Simulating a premium glow/drop shadow)
    if shadow_offset > 0:
        draw.text((x + shadow_offset, y + shadow_offset), word, font=font, fill=(0,0,0,150), stroke_width=outline_width, stroke_fill=(0,0,0,100))
    
    # Main bold text
    draw.text((x, y), word, font=font, fill=fill_color, stroke_width=outline_width, stroke_fill=outline_color)
    
    img_np = np.array(img)
    clip = ImageClip(img_np)
    
    # Set to precise bounds captured by Edge-TTS
    duration = word_data['end'] - word_data['start']
    dur = max(0.1, duration) # ensure at least 0.1s pop
    
    clip = clip.set_start(word_data['start']).set_end(word_data['start'] + dur)
    clip = clip.set_position(("center", "center"))
    
    return clip

async def process_text_generation(job_id: str, request: GenerateTextRequest):
    loop = asyncio.get_running_loop()
    try:
        await update_job_progress(job_id, JobStatus.AUDIO_GEN, "Parsing Text", 10, "Extracting text into timing sequences...")

        working_text = request.text
        if getattr(request.config, "target_language", "original") not in {"original", "", None}:
            await update_job_progress(job_id, JobStatus.AUDIO_GEN, "Translating", 14, "Translating subtitles...")
            working_text = await translate_text_if_needed(
                working_text,
                getattr(request.config, "source_language", "auto"),
                getattr(request.config, "target_language", "original"),
            )

        if getattr(request.config, "auto_subtitle_correction", True):
            working_text = auto_correct_subtitle_text(working_text)

        words = working_text.strip().split()
        if not words:
            # Translation/correction can occasionally collapse text; fall back to original prompt.
            words = str(request.text or "").strip().split()

        if not words:
            await update_job_progress(
                job_id,
                JobStatus.ERROR,
                "No Text",
                0,
                "No valid caption text found after processing.",
                error="No valid caption text found after processing.",
            )
            return

        speed_ms = int(getattr(request.config, 'speed', '250'))
        speed_ms = max(120, min(1200, speed_ms))
        if FAST_RENDER_MODE and len(words) > 80 and speed_ms > 180:
            speed_ms = 180
        speed_sec = speed_ms / 1000.0
        
        timestamps = []
        current_time = 0.0
        for w in words:
            timestamps.append({
                "word": w,
                "start": current_time,
                "end": current_time + speed_sec
            })
            current_time += speed_sec

        timestamps = mark_keywords(
            timestamps,
            enable=bool(getattr(request.config, "keyword_highlighting", True)),
        )

        await update_job_progress(job_id, JobStatus.TRANSCRIBING, "Extracting Timestamps", 20, f"Recovered {len(timestamps)} word boundaries...")

        # 2: Rendering Engine Thread Wrapper
        def render_video():
            video_filename = f"{job_id}.mp4"
            out_path = os.path.join(OUTPUT_DIR, video_filename)
            
            duration = current_time if current_time > 0 else 1.0
            
            # Hosted-safe render profile to avoid long stalls on free CPU.
            render_dims, render_fps, render_resolution, tuning_note = get_render_profile(
                request.config.aspect_ratio,
                getattr(request.config, "resolution", "720p"),
                getattr(request.config, "fps", 24),
                estimated_duration=duration,
                word_count=len(timestamps),
            )
            profile_message = f"Preparing frames at {render_resolution} / {render_fps} FPS..."
            if tuning_note:
                profile_message = f"{profile_message} ({tuning_note})"

            asyncio.run_coroutine_threadsafe(
                update_job_progress(
                    job_id,
                    JobStatus.RENDERING,
                    "Preparing Render",
                    30,
                    profile_message,
                ),
                loop,
            )
            
            # MoviePy base background template 
            bg = ColorClip(size=render_dims, color=(30, 30, 42)).set_duration(duration)
            
            word_clips = []
            total_words = len(timestamps)
            for idx, t in enumerate(timestamps):
                # Sanity fallback check
                if t['start'] < duration and t['end'] <= duration:
                    clip = create_word_clip(t, resolution=render_dims, config=request.config)
                    word_clips.append(clip)
                if total_words and (((idx + 1) % 8 == 0) or (idx + 1 == total_words)):
                    prep_perc = 30 + int(((idx + 1) / total_words) * 10)
                    asyncio.run_coroutine_threadsafe(
                        update_job_progress(
                            job_id,
                            JobStatus.RENDERING,
                            "Preparing Frames",
                            prep_perc,
                            f"Preparing caption frames {idx + 1}/{total_words}...",
                        ),
                        loop,
                    )

            if not word_clips and words:
                fallback_end = min(duration, 0.9)
                fallback_clip = create_word_clip(
                    {"word": words[0], "start": 0.0, "end": fallback_end, "highlight": False},
                    resolution=render_dims,
                    config=request.config,
                )
                word_clips.append(fallback_clip)
                    
            # Stitch them together
            layers = [bg] + word_clips
            if should_apply_watermark(request.config):
                layers.append(create_watermark_overlay(render_dims, duration, request.config))
            final_video = CompositeVideoClip(layers)
            
            # Connect the Next.js visual logger to MoviePy
            logger = SSEVideoLogger(job_id, loop)
            final_video.write_videofile(
                out_path,
                fps=render_fps,
                logger=logger,
                preset='ultrafast',
                threads=2,
                bitrate='1000k' if FAST_RENDER_MODE else '1500k',
            )
            
            return f"/api/v1/outputs/{video_filename}"
        
        # Async execution of blocking MoviePy
        await update_job_progress(job_id, JobStatus.RENDERING, "Compositing Video", 25, "Booting render engine...")
        video_url = await loop.run_in_executor(None, render_video)
        
        await update_job_progress(job_id, JobStatus.DONE, "Complete Phase", 100, "Your cinematic video is ready!", result_url=video_url)

    except Exception as e:
        import traceback
        traceback.print_exc()
        await update_job_progress(job_id, JobStatus.ERROR, "Render Failed", 0, str(e), error=str(e))

async def process_audio_generation(job_id: str, audio_path: str, config):
    loop = asyncio.get_running_loop()
    try:
        await update_job_progress(job_id, JobStatus.TRANSCRIBING, "Extracting Timestamps", 10, "Transcribing Audio via Groq AI...")
        timestamps = await transcribe_audio_to_words(audio_path)
        if not timestamps:
            await update_job_progress(
                job_id,
                JobStatus.ERROR,
                "No Speech",
                0,
                "No spoken words detected in audio.",
                error="No spoken words detected in audio.",
            )
            return

        target_language = getattr(config, "target_language", "original")
        if target_language not in {"original", "", None} and timestamps:
            await update_job_progress(job_id, JobStatus.TRANSCRIBING, "Translating", 14, "Translating captions...")
            source_text = " ".join(str(item.get("word", "")).strip() for item in timestamps).strip()
            translated_text = await translate_text_if_needed(
                source_text,
                getattr(config, "source_language", "auto"),
                target_language,
            )
            if getattr(config, "auto_subtitle_correction", True):
                translated_text = auto_correct_subtitle_text(translated_text)

            translated_words = [w for w in translated_text.split() if w]
            if translated_words:
                total_duration = max(float(timestamps[-1].get("end", 0.0)), 0.1)
                step = total_duration / max(len(translated_words), 1)
                rebuilt = []
                cursor = 0.0
                for word in translated_words:
                    start = cursor
                    end = min(total_duration, cursor + step)
                    rebuilt.append({"word": word, "start": start, "end": end})
                    cursor = end
                timestamps = rebuilt

        timestamps = mark_keywords(
            timestamps,
            enable=bool(getattr(config, "keyword_highlighting", True)),
        )

        await update_job_progress(job_id, JobStatus.TRANSCRIBING, "Extracting Timestamps", 20, f"Recovered {len(timestamps)} word boundaries...")

        def render_video():
            video_filename = f"{job_id}.mp4"
            out_path = os.path.join(OUTPUT_DIR, video_filename)
            
            # Mount audio
            audio_clip = AudioFileClip(audio_path)
            local_timestamps = list(timestamps)

            if bool(getattr(config, "smart_silence_removal", False)) and local_timestamps:
                threshold_ms = int(getattr(config, "silence_gap_threshold_ms", 600))
                threshold_seconds = max(0.2, min(3.0, threshold_ms / 1000.0))
                compacted_timestamps, keep_segments = compact_timestamps_by_silence(
                    local_timestamps,
                    gap_threshold_seconds=threshold_seconds,
                )
                if keep_segments:
                    clipped_audio = []
                    for seg_start, seg_end in keep_segments:
                        if seg_end - seg_start > 0.02:
                            clipped_audio.append(audio_clip.subclip(seg_start, seg_end))
                    if clipped_audio:
                        audio_clip = concatenate_audioclips(clipped_audio)
                        local_timestamps = compacted_timestamps

            duration = audio_clip.duration
            
            render_dims, render_fps, render_resolution, tuning_note = get_render_profile(
                config.aspect_ratio,
                getattr(config, "resolution", "720p"),
                getattr(config, "fps", 24),
                estimated_duration=duration,
                word_count=len(local_timestamps),
            )
            profile_message = f"Preparing frames at {render_resolution} / {render_fps} FPS..."
            if tuning_note:
                profile_message = f"{profile_message} ({tuning_note})"

            asyncio.run_coroutine_threadsafe(
                update_job_progress(
                    job_id,
                    JobStatus.RENDERING,
                    "Preparing Render",
                    30,
                    profile_message,
                ),
                loop,
            )
            
            # MoviePy base background template 
            bg = ColorClip(size=render_dims, color=(30, 30, 42)).set_duration(duration)
            
            word_clips = []
            total_words = len(local_timestamps)
            for idx, t in enumerate(local_timestamps):
                # Sanity fallback check
                if t['start'] < duration and t['end'] <= duration:
                    clip = create_word_clip(t, resolution=render_dims, config=config)
                    word_clips.append(clip)
                if total_words and (((idx + 1) % 8 == 0) or (idx + 1 == total_words)):
                    prep_perc = 30 + int(((idx + 1) / total_words) * 10)
                    asyncio.run_coroutine_threadsafe(
                        update_job_progress(
                            job_id,
                            JobStatus.RENDERING,
                            "Preparing Frames",
                            prep_perc,
                            f"Preparing caption frames {idx + 1}/{total_words}...",
                        ),
                        loop,
                    )

            if not word_clips and local_timestamps:
                fallback_word = str(local_timestamps[0].get("word", "CAPTION")).strip() or "CAPTION"
                fallback_end = min(duration, 0.9)
                fallback_clip = create_word_clip(
                    {"word": fallback_word, "start": 0.0, "end": fallback_end, "highlight": False},
                    resolution=render_dims,
                    config=config,
                )
                word_clips.append(fallback_clip)
                    
            # Stitch them together
            layers = [bg] + word_clips
            if should_apply_watermark(config):
                layers.append(create_watermark_overlay(render_dims, duration, config))
            final_video = CompositeVideoClip(layers)
            final_video = final_video.set_audio(audio_clip)
            
            # Connect the Next.js visual logger to MoviePy
            logger = SSEVideoLogger(job_id, loop)
            final_video.write_videofile(
                out_path,
                fps=render_fps,
                logger=logger,
                preset='ultrafast',
                threads=2,
                bitrate='1200k' if FAST_RENDER_MODE else '1800k',
                audio_codec='aac',
            )
            
            return f"/api/v1/outputs/{video_filename}"
        
        # Async execution of blocking MoviePy
        await update_job_progress(job_id, JobStatus.RENDERING, "Compositing Video", 25, "Booting render engine...")
        video_url = await loop.run_in_executor(None, render_video)
        
        await update_job_progress(job_id, JobStatus.DONE, "Complete Phase", 100, "Your cinematic video is ready!", result_url=video_url)

    except Exception as e:
        import traceback
        traceback.print_exc()
        await update_job_progress(job_id, JobStatus.ERROR, "Render Failed", 0, str(e), error=str(e))
