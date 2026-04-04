from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class JobStatus(str, Enum):
    PENDING = "pending"
    AUDIO_GEN = "audio_generation"
    TRANSCRIBING = "transcribing"
    RENDERING = "rendering"
    DONE = "done"
    ERROR = "error"
    CANCELLED = "cancelled"

class JobProgress(BaseModel):
    step: str
    percentage: float
    message: str

class Job(BaseModel):
    id: str
    status: JobStatus = JobStatus.PENDING
    progress: JobProgress = Field(default_factory=lambda: JobProgress(step="Initializing", percentage=0.0, message="Job created"))
    result_url: Optional[str] = None
    error_message: Optional[str] = None

class GenerationConfig(BaseModel):
    aspect_ratio: str = "9:16"
    fps: int = 20
    resolution: str = "540p"
    style: str = "tiktok"
    speed: str = "250"
    text_effect: str = "HORMOZI BOLD POP"
    font_family: str = "Space Grotesk"
    text_size: str = "80"
    main_color: str = "#FFD700"
    position: str = "Center"
    auto_subtitle_correction: bool = True
    source_language: str = "auto"
    target_language: str = "original"
    accessibility_preset: str = "default"
    keyword_highlighting: bool = True
    smart_silence_removal: bool = True
    silence_gap_threshold_ms: int = 500
    batch_processing: bool = False

class GenerateTextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice: str = "en-US-ChristopherNeural" # Default edge-tts voice
    config: GenerationConfig = Field(default_factory=GenerationConfig)


class GenerateBatchRequest(BaseModel):
    texts: List[str] = Field(default_factory=list)
    voice: str = "en-US-ChristopherNeural"
    config: GenerationConfig = Field(default_factory=GenerationConfig)
