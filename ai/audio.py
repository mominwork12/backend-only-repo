import os
import edge_tts
from typing import List, Dict, Any

async def generate_speech_and_subtitles(text: str, voice: str, output_path: str) -> List[Dict[str, Any]]:
    """
    Generates speech from text using Edge-TTS natively.
    Extracts the exact millisecond word timestamps during streaming.
    Returns: A list of dicts: {"word": str, "start": float, "end": float}
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    communicate = edge_tts.Communicate(text, voice)
    subtitles = []
    
    with open(output_path, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # Edge-TTS audio_offset is in 100-nanosecond units (1 sec = 10_000_000 units)
                start_sec = chunk["offset"] / 10_000_000.0
                duration_sec = chunk["duration"] / 10_000_000.0
                end_sec = start_sec + duration_sec
                
                subtitles.append({
                    "word": chunk["text"],
                    "start": start_sec,
                    "end": end_sec
                })
                
    return subtitles
