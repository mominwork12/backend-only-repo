import asyncio
import json
from uuid import uuid4
from typing import Dict, AsyncGenerator, Any
from schemas import Job, JobStatus, JobProgress

# In-memory storage for MVP (replaces Redis)
JOBS: Dict[str, Job] = {}
# Event queues for SSE broadcasting per job
JOB_EVENTS: Dict[str, asyncio.Queue] = {}

def create_job() -> str:
    job_id = str(uuid4())
    job = Job(id=job_id)
    JOBS[job_id] = job
    JOB_EVENTS[job_id] = asyncio.Queue()
    return job_id

def get_job(job_id: str) -> Job:
    return JOBS.get(job_id)

async def update_job_progress(job_id: str, status: JobStatus, step: str, percentage: float, message: str, result_url: str = None, error: str = None):
    if job_id not in JOBS:
        return
    
    job = JOBS[job_id]
    job.status = status
    job.progress = JobProgress(step=step, percentage=percentage, message=message)
    
    if result_url:
        job.result_url = result_url
    if error:
        job.error_message = error

    # Broadcast to SSE listeners
    if job_id in JOB_EVENTS:
        await JOB_EVENTS[job_id].put(job.model_dump())

async def sse_event_generator(job_id: str) -> AsyncGenerator[Any, None]:
    """Generates SSE formatted events from the job's queue."""
    if job_id not in JOB_EVENTS:
        yield json.dumps({'error': 'Job not found'})
        return

    # Yield current state
    current_state = JOBS[job_id]
    yield current_state.model_dump()
    
    # If job is already finished, nothing more to wait for
    if current_state.status in [JobStatus.DONE, JobStatus.ERROR, JobStatus.CANCELLED]:
        return

    queue = JOB_EVENTS[job_id]
    try:
        while True:
            # Wait for the next update from the background task
            message = await queue.get()
            yield message

            job_data = message
            if isinstance(job_data, str):
                job_data = json.loads(job_data)
            if job_data["status"] in [JobStatus.DONE, JobStatus.ERROR, JobStatus.CANCELLED]:
                break
    except asyncio.CancelledError:
        print(f"Client disconnected from SSE stream for job {job_id}")
