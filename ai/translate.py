import os
import groq


LANGUAGE_LABELS = {
    "auto": "Auto-detect",
    "original": "Original",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "hi": "Hindi",
    "bn": "Bengali",
    "ar": "Arabic",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
}


async def translate_text_if_needed(text: str, source_language: str, target_language: str) -> str:
    src = (source_language or "auto").strip().lower()
    target = (target_language or "original").strip().lower()

    if target in {"", "original", "same", src}:
        return text

    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        # Graceful fallback when translation is requested but no key exists.
        return text

    client = groq.AsyncGroq(api_key=groq_api_key)
    model = os.getenv("GROQ_TRANSLATION_MODEL", "llama-3.1-8b-instant")
    src_name = LANGUAGE_LABELS.get(src, src.upper())
    target_name = LANGUAGE_LABELS.get(target, target.upper())

    try:
        completion = await client.chat.completions.create(
            model=model,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a subtitle translator. Translate naturally and keep intent. "
                        "Return only translated text without notes."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Source language: {src_name}\n"
                        f"Target language: {target_name}\n\n"
                        "Text:\n"
                        f"{text}"
                    ),
                },
            ],
        )
        translated = (completion.choices[0].message.content or "").strip()
        return translated or text
    except Exception:
        return text
