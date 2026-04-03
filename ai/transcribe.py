import os
import groq
from typing import List, Dict, Any

async def transcribe_audio_to_words(audio_path: str) -> List[Dict[str, Any]]:
    """
    Transcribes audio to text and extracts word-level timestamps using Groq API.
    Ensure GROQ_API_KEY is properly set in your environment.
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise Exception("GROQ_API_KEY is not set on the backend service.")

    client = groq.AsyncGroq(api_key=groq_api_key)
    
    with open(audio_path, "rb") as file:
        try:
            transcription = await client.audio.transcriptions.create(
                file=(os.path.basename(audio_path), file.read()),
                model="whisper-large-v3",
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        except Exception as e:
            error_str = str(e)
            if "500" in error_str or "internal_server_error" in error_str:
                # Groq fails with 500 on longer audio with Word boundaries requested.
                # Fallback to segment-level transcription and interpolate:
                file.seek(0)
                transcription = await client.audio.transcriptions.create(
                    file=(os.path.basename(audio_path), file.read()),
                    model="whisper-large-v3",
                    response_format="verbose_json"
                )
            elif "429" in error_str or "rate_limit_exceeded" in error_str:
                import re
                match = re.search(r"try again in (?:(\d+)m)?(?:([\d.]+)s)?", error_str)
                wait_seconds = 210
                if match:
                    mins = int(match.group(1)) if match.group(1) else 0
                    secs = float(match.group(2)) if match.group(2) else 0.0
                    wait_seconds = int(mins * 60 + secs)
                raise Exception(f"RATE_LIMIT:{wait_seconds}")
            else:
                raise Exception(f"Transcription failed: {error_str}")
    
    subtitles = []
    
    WORDS_AVAILABLE = False
    if hasattr(transcription, "words") and transcription.words:
        words = transcription.words
        WORDS_AVAILABLE = True
    elif isinstance(transcription, dict) and transcription.get("words"):
        words = transcription.get("words")
        WORDS_AVAILABLE = True
        
    if WORDS_AVAILABLE:
        for w in words:
            if isinstance(w, dict):
                subtitles.append({
                    "word": w.get("word", "").strip(),
                    "start": float(w.get("start", 0.0)),
                    "end": float(w.get("end", 0.0))
                })
            else:
                subtitles.append({
                    "word": w.word.strip(),
                    "start": float(w.start),
                    "end": float(w.end)
                })
    else:
        # Fallback Interpolation using Segments
        segments = []
        if hasattr(transcription, "segments") and transcription.segments:
            segments = transcription.segments
        elif isinstance(transcription, dict) and transcription.get("segments"):
            segments = transcription.get("segments")
            
        for seg in segments:
            text = seg.get("text", "") if isinstance(seg, dict) else getattr(seg, "text", "")
            start = float(seg.get("start", 0)) if isinstance(seg, dict) else float(getattr(seg, "start", 0))
            end = float(seg.get("end", 0)) if isinstance(seg, dict) else float(getattr(seg, "end", 0))
            
            seg_words = text.strip().split()
            if not seg_words: continue
            
            duration_per_word = (end - start) / len(seg_words)
            current_time = start
            for w in seg_words:
                subtitles.append({
                    "word": w,
                    "start": current_time,
                    "end": current_time + duration_per_word
                })
                current_time += duration_per_word
                
    return subtitles
