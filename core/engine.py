import os
import asyncio
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from schemas import JobStatus, GenerateTextRequest
from core.jobs import update_job_progress, get_job
from ai.audio import generate_speech_and_subtitles
from ai.transcribe import transcribe_audio_to_words

from moviepy.editor import ColorClip, AudioFileClip, ImageClip, CompositeVideoClip
import proglog

OUTPUT_DIR = os.getenv("OUTPUT_DIR", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
FONT_PATH = "fonts/Montserrat-Black.ttf"
FAST_RENDER_MODE = os.getenv("FAST_RENDER_MODE", "1").strip().lower() in {"1", "true", "yes", "on"}


def get_render_profile(aspect_ratio: str, resolution: str, fps: int):
    ratio = aspect_ratio if aspect_ratio in {"9:16", "16:9", "1:1"} else "9:16"
    requested_resolution = str(resolution or "720p").lower()

    if requested_resolution not in {"1080p", "720p", "540p"}:
        requested_resolution = "720p"

    # Keep hosted rendering responsive by default.
    if FAST_RENDER_MODE and requested_resolution == "1080p":
        requested_resolution = "720p"

    if ratio == "9:16":
        dims_by_resolution = {"1080p": (1080, 1920), "720p": (720, 1280), "540p": (540, 960)}
    elif ratio == "16:9":
        dims_by_resolution = {"1080p": (1920, 1080), "720p": (1280, 720), "540p": (960, 540)}
    else:
        dims_by_resolution = {"1080p": (1080, 1080), "720p": (720, 720), "540p": (540, 540)}

    render_dims = dims_by_resolution[requested_resolution]

    try:
        target_fps = int(fps)
    except Exception:
        target_fps = 24

    target_fps = max(12, min(30, target_fps))
    if FAST_RENDER_MODE:
        target_fps = min(target_fps, 24)

    return render_dims, target_fps, requested_resolution.upper()

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

def create_word_clip(word_data, resolution):
    """
    Draws Hormozi-style text captions completely from scratch using Pillow.
    Guarantees it works natively on Windows without ImageMagick.
    """
    img = Image.new('RGBA', resolution, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font_size = 130
    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except:
        font = ImageFont.load_default()

    word = word_data['word'].upper()
    
    # Pillow bounding box calculations
    bbox = draw.textbbox((0, 0), word, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    
    x = (resolution[0] - w) / 2
    y = (resolution[1] - h) / 2
    
    # Hormozi styling: Thick stroke, high contrast
    outline_color = (15, 15, 20, 255)
    outline_width = 12
    
    # Dynamic styling (emphasize longer words with yellow)
    is_emphasized = len(word) > 4
    fill_color = (255, 230, 0, 255) if is_emphasized else (255, 255, 255, 255)
    
    # Shadow offset (Simulating a premium glow/drop shadow)
    shadow_offset = 8
    draw.text((x + shadow_offset, y + shadow_offset), word, font=font, fill=(0,0,0,150), stroke_width=outline_width, stroke_fill=(0,0,0,100))
    
    # Main bold text
    draw.text((x, y), word, font=font, fill=fill_color, stroke_width=outline_width, stroke_fill=outline_color)
    
    img_np = np.array(img)
    clip = ImageClip(img_np)
    
    # Set to precise bounds captured by Edge-TTS
    duration = word_data['end'] - word_data['start']
    dur = max(0.1, duration) # ensure at least 0.1s pop
    
    clip = clip.set_start(word_data['start']).set_end(word_data['start'] + dur)
    clip = clip.set_position('center')
    
    return clip

async def process_text_generation(job_id: str, request: GenerateTextRequest):
    loop = asyncio.get_running_loop()
    try:
        await update_job_progress(job_id, JobStatus.AUDIO_GEN, "Parsing Text", 10, "Extracting text into timing sequences...")
        
        words = request.text.strip().split()
        speed_ms = int(getattr(request.config, 'speed', '250'))
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
            
        await update_job_progress(job_id, JobStatus.TRANSCRIBING, "Extracting Timestamps", 20, f"Recovered {len(timestamps)} word boundaries...")

        # 2: Rendering Engine Thread Wrapper
        def render_video():
            video_filename = f"{job_id}.mp4"
            out_path = os.path.join(OUTPUT_DIR, video_filename)
            
            duration = current_time if current_time > 0 else 1.0
            
            # Hosted-safe render profile to avoid long stalls on free CPU.
            render_dims, render_fps, render_resolution = get_render_profile(
                request.config.aspect_ratio,
                getattr(request.config, "resolution", "720p"),
                getattr(request.config, "fps", 24),
            )

            asyncio.run_coroutine_threadsafe(
                update_job_progress(
                    job_id,
                    JobStatus.RENDERING,
                    "Preparing Render",
                    30,
                    f"Preparing frames at {render_resolution} / {render_fps} FPS...",
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
                    clip = create_word_clip(t, resolution=render_dims)
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
                    
            # Stitch them together
            final_video = CompositeVideoClip([bg] + word_clips)
            
            # Connect the Next.js visual logger to MoviePy
            logger = SSEVideoLogger(job_id, loop)
            final_video.write_videofile(
                out_path,
                fps=render_fps,
                logger=logger,
                preset='ultrafast',
                threads=2,
                bitrate='1500k',
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
        
        await update_job_progress(job_id, JobStatus.TRANSCRIBING, "Extracting Timestamps", 20, f"Recovered {len(timestamps)} word boundaries...")

        def render_video():
            video_filename = f"{job_id}.mp4"
            out_path = os.path.join(OUTPUT_DIR, video_filename)
            
            # Mount audio
            audio_clip = AudioFileClip(audio_path)
            duration = audio_clip.duration
            
            render_dims, render_fps, render_resolution = get_render_profile(
                config.aspect_ratio,
                getattr(config, "resolution", "720p"),
                getattr(config, "fps", 24),
            )

            asyncio.run_coroutine_threadsafe(
                update_job_progress(
                    job_id,
                    JobStatus.RENDERING,
                    "Preparing Render",
                    30,
                    f"Preparing frames at {render_resolution} / {render_fps} FPS...",
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
                    clip = create_word_clip(t, resolution=render_dims)
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
                    
            # Stitch them together
            final_video = CompositeVideoClip([bg] + word_clips)
            final_video = final_video.set_audio(audio_clip)
            
            # Connect the Next.js visual logger to MoviePy
            logger = SSEVideoLogger(job_id, loop)
            final_video.write_videofile(
                out_path,
                fps=render_fps,
                logger=logger,
                preset='ultrafast',
                threads=2,
                bitrate='1800k',
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
