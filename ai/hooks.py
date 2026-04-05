import os
import re
from typing import List

import groq


def _extract_keywords(prompt: str) -> List[str]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9'-]{2,}", prompt.lower())
    stop = {
        "this",
        "that",
        "with",
        "from",
        "your",
        "have",
        "about",
        "into",
        "will",
        "just",
        "what",
        "when",
        "where",
        "which",
        "while",
        "their",
        "there",
        "they",
        "them",
        "then",
        "than",
        "were",
        "been",
        "being",
        "because",
        "should",
        "could",
        "would",
    }
    ranked = []
    seen = set()
    for word in words:
        if len(word) < 4 or word in stop:
            continue
        if word in seen:
            continue
        seen.add(word)
        ranked.append(word)
    return ranked[:5]


def _fallback_hooks(prompt: str, niche: str) -> List[str]:
    keywords = _extract_keywords(prompt)
    lead = keywords[0] if keywords else "this"
    second = keywords[1] if len(keywords) > 1 else "strategy"
    return [
        f"Stop scrolling: {lead} is killing your results.",
        f"I tested {second} for 7 days, here is what changed.",
        f"Do this before posting your next {niche} video.",
        f"Most creators miss this {lead} trick.",
        f"Save this: 3 steps to improve {second} today.",
    ]


async def generate_viral_hooks(prompt: str, niche: str = "general") -> List[str]:
    cleaned_prompt = (prompt or "").strip()
    cleaned_niche = (niche or "general").strip() or "general"
    if not cleaned_prompt:
        cleaned_prompt = "short-form content growth"

    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        return _fallback_hooks(cleaned_prompt, cleaned_niche)

    client = groq.AsyncGroq(api_key=groq_api_key)
    model = os.getenv("GROQ_HOOK_MODEL", "llama-3.1-8b-instant")

    try:
        completion = await client.chat.completions.create(
            model=model,
            temperature=0.9,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a short-form viral hook generator. "
                        "Return exactly 5 concise hooks, each on a new line, no numbering."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Niche: {cleaned_niche}\n"
                        "Create 5 viral opening hooks for this script context:\n"
                        f"{cleaned_prompt}"
                    ),
                },
            ],
        )
        content = (completion.choices[0].message.content or "").strip()
        hooks = [line.strip("- ").strip() for line in content.splitlines() if line.strip()]
        if len(hooks) >= 5:
            return hooks[:5]
    except Exception:
        pass

    return _fallback_hooks(cleaned_prompt, cleaned_niche)
