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
            # Route sync logger back to the async loop
            asyncio.run_coroutine_threadsafe(
                update_job_progress(self.job_id, JobStatus.RENDERING, "Compositing Video", perc, f"Rendering video frame {value}/{total}..."),
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
            
        await update_job_progress(job_id, JobStatus.TRANSCRIBING, "Extracting Timestamps", 100, f"Recovered {len(timestamps)} word boundaries...")

        # 2: Rendering Engine Thread Wrapper
        def render_video():
            video_filename = f"{job_id}.mp4"
            out_path = os.path.join(OUTPUT_DIR, video_filename)
            
            duration = current_time if current_time > 0 else 1.0
            
            # Resolutions based on UI Configs
            res = (1080, 1920) if request.config.aspect_ratio == "9:16" else (1920, 1080)
            if request.config.aspect_ratio == "1:1": res = (1080, 1080)
            
            # MoviePy base background template 
            bg = ColorClip(size=res, color=(30, 30, 42)).set_duration(duration)
            
            word_clips = []
            for t in timestamps:
                # Sanity fallback check
                if t['start'] < duration and t['end'] <= duration:
                    clip = create_word_clip(t, resolution=res)
                    word_clips.append(clip)
                    
            # Stitch them together
            final_video = CompositeVideoClip([bg] + word_clips)
            
            # Connect the Next.js visual logger to MoviePy
            logger = SSEVideoLogger(job_id, loop)
            final_video.write_videofile(out_path, fps=request.config.fps, logger=logger, preset='ultrafast')
            
            return f"/api/v1/outputs/{video_filename}"
        
        # Async execution of blocking MoviePy
        await update_job_progress(job_id, JobStatus.RENDERING, "Compositing Video", 0, "Booting Hormozi render engine...")
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
        
        await update_job_progress(job_id, JobStatus.TRANSCRIBING, "Extracting Timestamps", 100, f"Recovered {len(timestamps)} word boundaries...")

        def render_video():
            video_filename = f"{job_id}.mp4"
            out_path = os.path.join(OUTPUT_DIR, video_filename)
            
            # Mount audio
            audio_clip = AudioFileClip(audio_path)
            duration = audio_clip.duration
            
            # Resolutions based on UI Configs
            res = (1080, 1920) if config.aspect_ratio == "9:16" else (1920, 1080)
            if config.aspect_ratio == "1:1": res = (1080, 1080)
            
            # MoviePy base background template 
            bg = ColorClip(size=res, color=(30, 30, 42)).set_duration(duration)
            
            word_clips = []
            for t in timestamps:
                # Sanity fallback check
                if t['start'] < duration and t['end'] <= duration:
                    clip = create_word_clip(t, resolution=res)
                    word_clips.append(clip)
                    
            # Stitch them together
            final_video = CompositeVideoClip([bg] + word_clips)
            final_video = final_video.set_audio(audio_clip)
            
            # Connect the Next.js visual logger to MoviePy
            logger = SSEVideoLogger(job_id, loop)
            final_video.write_videofile(out_path, fps=config.fps, logger=logger, preset='ultrafast')
            
            return f"/api/v1/outputs/{video_filename}"
        
        # Async execution of blocking MoviePy
        await update_job_progress(job_id, JobStatus.RENDERING, "Compositing Video", 0, "Booting Hormozi render engine...")
        video_url = await loop.run_in_executor(None, render_video)
        
        await update_job_progress(job_id, JobStatus.DONE, "Complete Phase", 100, "Your cinematic video is ready!", result_url=video_url)

    except Exception as e:
        import traceback
        traceback.print_exc()
        await update_job_progress(job_id, JobStatus.ERROR, "Render Failed", 0, str(e), error=str(e))
