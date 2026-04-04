import re
from typing import Dict, Any, List, Tuple


STOPWORDS = {
    "the", "and", "for", "you", "with", "this", "that", "from", "your", "have",
    "are", "not", "but", "was", "were", "they", "their", "them", "then", "than",
    "into", "about", "just", "over", "also", "will", "would", "could", "should",
    "what", "when", "where", "while", "after", "before", "been", "being", "very",
    "can", "its", "our", "out", "who", "how", "why", "all", "any", "too", "now",
    "is", "a", "an", "to", "of", "in", "on", "at", "it", "as", "or", "by", "we",
    "i", "me", "my", "us", "so", "do", "did", "if", "no", "yes"
}


def auto_correct_subtitle_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    cleaned: List[str] = []
    for line in lines:
        if not line:
            continue
        line = re.sub(r"\s+", " ", line)
        if line and line[0].isalpha():
            line = line[0].upper() + line[1:]
        cleaned.append(line)
    if not cleaned:
        single = re.sub(r"\s+", " ", text.strip())
        return single
    return "\n".join(cleaned)


def mark_keywords(timestamps: List[Dict[str, Any]], enable: bool = True, max_keywords: int = 10) -> List[Dict[str, Any]]:
    if not timestamps:
        return timestamps

    if not enable:
        for t in timestamps:
            t["highlight"] = False
        return timestamps

    freq: Dict[str, int] = {}
    for t in timestamps:
        raw = str(t.get("word", "")).strip().lower()
        token = re.sub(r"[^a-z0-9']", "", raw)
        if len(token) < 4 or token in STOPWORDS:
            continue
        freq[token] = freq.get(token, 0) + 1

    ranked = sorted(freq.items(), key=lambda kv: (-kv[1], -len(kv[0]), kv[0]))
    keywords = {word for word, _ in ranked[:max_keywords]}

    for t in timestamps:
        raw = str(t.get("word", "")).strip().lower()
        token = re.sub(r"[^a-z0-9']", "", raw)
        t["highlight"] = token in keywords if token else False
    return timestamps


def compact_timestamps_by_silence(
    timestamps: List[Dict[str, Any]],
    gap_threshold_seconds: float = 0.6,
) -> Tuple[List[Dict[str, Any]], List[Tuple[float, float]]]:
    if not timestamps:
        return timestamps, []

    sorted_words = sorted(timestamps, key=lambda t: float(t.get("start", 0.0)))
    segments: List[Tuple[float, float]] = []
    seg_start = float(sorted_words[0]["start"])
    seg_end = float(sorted_words[0]["end"])

    for w in sorted_words[1:]:
        s = float(w["start"])
        e = float(w["end"])
        gap = s - seg_end
        if gap > gap_threshold_seconds:
            segments.append((seg_start, seg_end))
            seg_start = s
            seg_end = e
        else:
            seg_end = max(seg_end, e)
    segments.append((seg_start, seg_end))

    adjusted: List[Dict[str, Any]] = []
    seg_idx = 0
    timeline_cursor = 0.0

    for seg in segments:
        seg_s, seg_e = seg
        seg_duration = max(0.0, seg_e - seg_s)
        while seg_idx < len(sorted_words):
            w = sorted_words[seg_idx]
            ws = float(w["start"])
            we = float(w["end"])
            if ws < seg_s:
                seg_idx += 1
                continue
            if ws > seg_e:
                break

            adjusted.append({
                **w,
                "start": max(0.0, timeline_cursor + (ws - seg_s)),
                "end": max(0.0, timeline_cursor + (we - seg_s)),
            })
            seg_idx += 1
        timeline_cursor += seg_duration

    return adjusted, segments
