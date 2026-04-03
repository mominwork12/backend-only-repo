import json
import os
import shutil
from fastapi import FastAPI, BackgroundTasks, Request, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from fastapi.staticfiles import StaticFiles

from schemas import GenerateTextRequest, GenerationConfig, JobStatus
from core.jobs import create_job, sse_event_generator, get_job, update_job_progress
from core.engine import process_text_generation, process_audio_generation

app = FastAPI(title="TextMotion AI Backend")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "outputs")

# Allow frontend origins from env (comma-separated), fallback to permissive for local/dev.
cors_origins_env = os.getenv("CORS_ALLOW_ORIGINS", "*")
allow_origins = ["*"] if cors_origins_env.strip() == "*" else [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(OUTPUT_DIR, exist_ok=True)
app.mount("/api/v1/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "TextMotion AI Engine Running"}

@app.post("/api/v1/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_video(request: GenerateTextRequest, background_tasks: BackgroundTasks):
    """
    Receives text/config payload, creates a job, and delegates heavy work 
    to a background task to prevent HTTP timeout.
    """
    job_id = create_job()
    
    # Enqueue the actual generation in the background
    background_tasks.add_task(process_text_generation, job_id, request)
    
    # Return immediately to the client with the job ID
    return {"job_id": job_id, "status": "pending"}

@app.post("/api/v1/generate/audio", status_code=status.HTTP_202_ACCEPTED)
async def generate_video_from_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    config: str = Form(...)
):
    """
    Receives an audio file and JSON config, saves it locally,
    and runs the audio-to-caption generation process.
    """
    job_id = create_job()
    
    # MIME Validation
    if not file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file format. Please upload an audio file."
        )
    
    # Save the uploaded file locally
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    audio_extension = os.path.splitext(file.filename)[1]
    audio_path = os.path.join(OUTPUT_DIR, f"{job_id}_uploaded{audio_extension}")
    
    with open(audio_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Parse config
    try:
        config_dict = json.loads(config)
        gen_config = GenerationConfig(**config_dict)
    except Exception:
        gen_config = GenerationConfig()
        
    # Enqueue the background task
    background_tasks.add_task(process_audio_generation, job_id, audio_path, gen_config)
    
    return {"job_id": job_id, "status": "pending"}

@app.post("/api/v1/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in [JobStatus.DONE, JobStatus.ERROR, JobStatus.CANCELLED]:
        import asyncio
        loop = asyncio.get_event_loop()
        loop.create_task(update_job_progress(job_id, JobStatus.CANCELLED, "Cancelled", 0, "Cancelled by user.", error="Generation Cancelled by User"))
    return {"message": "Job cancellation requested"}
@app.get("/api/v1/jobs/{job_id}/stream")
async def stream_job_status(request: Request, job_id: str):
    """
    Subscribes the client to a Server-Sent Events (SSE) stream 
    tied specifically to their background job.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return EventSourceResponse(sse_event_generator(job_id))
