import { EffectContext, TextEffect } from "./types";
import { easeOutBack, easeOutElastic, easeOutQuad, easeOutExpo } from "./easing";

// Helper for resetting / establishing base font context
const setupBaseText = (ctx: CanvasRenderingContext2D, size: number, family: string, scaleMod: number = 1.0) => {
  ctx.font = `900 ${size * scaleMod}px ${family || "Montserrat"}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
};

// Gets word data
const getWordStats = (context: EffectContext) => {
  const { words, elapsedMs, msPerWord } = context;
  const wordIndex = Math.floor(elapsedMs / msPerWord);
  const currentWord = words[Math.min(wordIndex, words.length - 1)] || "";
  const wordProgress = (elapsedMs % msPerWord) / msPerWord; 
  return { wordIndex, currentWord, wordProgress };
};

export const EFFECTS: TextEffect[] = [
  {
    id: "ALEX_HORMOZI",
    name: "Alex Hormozi Captions",
    renderPreview: () => (
      <div className="text-sm font-black text-center uppercase leading-none" style={{ fontFamily: "Impact, Arial Black, sans-serif" }}>
        <span className="text-white" style={{ textShadow: "2px 2px 0 #000, -1px -1px 0 #000" }}>YOU </span>
        <span className="text-[#FFD700] scale-110 inline-block" style={{ textShadow: "2px 2px 0 #000, -1px -1px 0 #000" }}>NEED </span>
        <span className="text-white" style={{ textShadow: "2px 2px 0 #000, -1px -1px 0 #000" }}>THIS</span>
      </div>
    ),
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config, words } = ctxData;
      const { wordIndex, wordProgress } = getWordStats(ctxData);

      const fontSize = parseInt(config.text_size) || 88;
      const chunkSize = 3;

      // Which chunk are we in?
      const chunkStart = Math.floor(wordIndex / chunkSize) * chunkSize;
      const chunkWords = words.slice(chunkStart, chunkStart + chunkSize);
      const activeLocalIndex = wordIndex % chunkSize;

      // Vertical position
      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.18;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.82;

      ctx.save();

      // --- Measure total chunk width for centering ---
      ctx.font = `900 ${fontSize}px ${config.font_family || "Impact"}`;
      const spacing = fontSize * 0.22;
      const wordWidths = chunkWords.map(w => ctx.measureText(w.toUpperCase()).width);
      const totalWidth = wordWidths.reduce((a, b) => a + b, 0) + spacing * (chunkWords.length - 1);
      let xCursor = canvasWidth / 2 - totalWidth / 2;

      chunkWords.forEach((word, idx) => {
        const isActive = idx === activeLocalIndex;
        const wWidth = wordWidths[idx];
        const wordCenterX = xCursor + wWidth / 2;

        ctx.save();
        ctx.translate(wordCenterX, originY);

        // Pop scale: active word punches in on first 30% of duration
        let scale = 1.0;
        if (isActive) {
          const popT = easeOutQuad(Math.min(1, wordProgress * 3.5));
          scale = 1.0 + 0.18 * (1 - popT); // starts bigger, snaps to 1
        }
        ctx.scale(scale, scale);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `900 ${fontSize}px ${config.font_family || "Impact"}`;

        // Heavy black stroke (Hormozi signature)
        ctx.lineWidth = fontSize * 0.14;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#000000";
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.strokeText(word.toUpperCase(), 0, 0);

        // Fill: active word = accent colour, others = white
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = isActive ? (config.main_color || "#FFD700") : "#FFFFFF";
        ctx.fillText(word.toUpperCase(), 0, 0);

        ctx.restore();
        xCursor += wWidth + spacing;
      });

      ctx.restore();
    }
  },

  {
    id: "HORMOZI_DOMINANCE",
    name: "Hormozi Dominance",
    renderPreview: () => <div className="text-xl font-bold tracking-tighter text-white animate-pulse delay-75" style={{ textShadow: "4px 4px 0px rgba(0,0,0,1)" }}><span className="text-[#FFD700]">POP!</span></div>,
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config } = ctxData;
      const { currentWord, wordProgress } = getWordStats(ctxData);
      const intensity = parseFloat(config.scale || "1.2");
      const fontSize = parseInt(config.text_size) || 80;

      // Heavy pop easing
      // It starts at `intensity` size, and immediately shrinks to 1.0 (smoothly via easeOutQuad)
      const shrinkProgress = easeOutQuad(Math.min(1, wordProgress * 4)); 
      const scale = 1 + ((intensity - 1) * (1 - shrinkProgress));
      
      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.2;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.8;
      
      // Slight "Shake" on hit (only in the first 10% of the word)
      let shakeX = 0;
      let shakeY = 0;
      if (wordProgress < 0.1) {
        shakeX = (Math.random() - 0.5) * 6;
        shakeY = (Math.random() - 0.5) * 6;
      }

      ctx.save();
      ctx.translate(canvasWidth / 2 + shakeX, originY + shakeY);
      ctx.scale(scale, scale);
      setupBaseText(ctx, fontSize, config.font_family);

      // Heavy Shadow
      ctx.shadowColor = "rgba(0,0,0,1)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 8;

      ctx.lineWidth = fontSize * 0.12;
      ctx.strokeStyle = "black";
      ctx.strokeText(currentWord.toUpperCase(), 0, 0);

      ctx.fillStyle = config.main_color || "#FFD700";
      ctx.fillText(currentWord.toUpperCase(), 0, 0);
      ctx.restore();
    }
  },
  {
    id: "HORMOZI_CLASSIC",
    name: "Classic Hormozi",
    renderPreview: () => <div className="text-sm font-black text-center leading-tight uppercase relative"><span className="text-white">TRUE</span> <span className="text-[#FFD700] scale-125 inline-block rotate-[-5deg] shadow-[0_0_10px_rgba(0,0,0,0.8)]">HORMOZI</span> <span className="text-white">STYLE</span></div>,
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config, words } = ctxData;
      const { wordIndex, wordProgress } = getWordStats(ctxData);
      
      const fontSize = parseInt(config.text_size) || 80;
      const chunkSize = 3;
      
      const chunkStart = Math.floor(wordIndex / chunkSize) * chunkSize;
      const chunkWords = words.slice(chunkStart, chunkStart + chunkSize);
      const activeLocalIndex = wordIndex % chunkSize;

      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.2;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

      ctx.save();
      ctx.translate(canvasWidth / 2, originY);
      
      // Calculate total width using base font size for centering
      ctx.font = `900 ${fontSize}px ${config.font_family || "Montserrat"}`;
      let xOffset = - (ctx.measureText(chunkWords.join(" ")).width / 2);

      chunkWords.forEach((word, idx) => {
         const isActive = idx === activeLocalIndex;
         const wordWidth = ctx.measureText(word + " ").width;
         
         ctx.save();
         
         // Base rendering
         ctx.shadowColor = "rgba(0,0,0,1)";
         ctx.shadowBlur = isActive ? 20 : 10;
         ctx.shadowOffsetX = 5;
         ctx.shadowOffsetY = 5;
         
         ctx.textAlign = "left";
         ctx.textBaseline = "middle";
         
         ctx.lineWidth = fontSize * 0.15;
         ctx.strokeStyle = "black";
         ctx.lineJoin = "round";

         if (isActive) {
            // Pop & Color
            const shrinkProgress = easeOutQuad(Math.min(1, wordProgress * 4)); 
            const scale = 1.0 + (0.2 * (1 - shrinkProgress));

            // Apply specific transform to the word center offset
            ctx.translate(xOffset + (ctx.measureText(word).width / 2), 0);
            ctx.scale(scale, scale);
            ctx.rotate(-0.05); // slight tilt
            ctx.translate(-(xOffset + (ctx.measureText(word).width / 2)), 0);

            ctx.fillStyle = config.main_color || "#FFD700"; 
         } else {
            ctx.fillStyle = "white";
         }
         
         // Draw Outline then Fill
         ctx.strokeText(word.toUpperCase(), xOffset, 0);
         ctx.fillText(word.toUpperCase(), xOffset, 0);
         
         ctx.restore();
         
         xOffset += wordWidth;
      });

      ctx.restore();
    }
  },
  {
    id: "POWER_WORD",
    name: "Power Word Emphasis",
    renderPreview: () => <div className="text-[10px] font-black"><span className="text-white">The</span> <span className="text-primary-container scale-125 inline-block shadow-[0_0_10px_cyan]">POWER</span> <span className="text-white">is here</span></div>,
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config } = ctxData;
      const { currentWord, wordProgress } = getWordStats(ctxData);
      const fontSize = parseInt(config.text_size) || 80;
      const intensity = parseFloat(config.scale || "1.3");

      const isPowerWord = currentWord.length > 4; // Arbitrary rule: >4 chars is a power word
      
      const scale = isPowerWord 
        ? 1.0 + ((intensity - 1.0) * (1 - Math.min(1, wordProgress * 3))) // Small pop
        : 1.0;

      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.2;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

      ctx.save();
      ctx.translate(canvasWidth / 2, originY);
      ctx.scale(scale, scale);
      setupBaseText(ctx, fontSize, config.font_family);

      if (isPowerWord) {
        ctx.shadowColor = config.main_color || "#00F5FF";
        ctx.shadowBlur = 40; // Glow effect!
        ctx.fillStyle = config.main_color || "#00F5FF";
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
      }

      ctx.fillText(currentWord.toUpperCase(), 0, 0);
      ctx.restore();
    }
  },
  {
    id: "RAPID_FIRE",
    name: "Rapid Fire Shorts",
    renderPreview: () => <div className="text-sm tracking-[0.2em] font-black uppercase text-white bg-secondary px-1 -skew-x-12">FAST</div>,
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config, elapsedMs, words, msPerWord } = ctxData;
      const { currentWord } = getWordStats(ctxData);
      const fontSize = parseInt(config.text_size) || 90;
      
      // Global zoom! 
      // The canvas slowly zooms towards the screen across the *entire* video duration
      const totalDuration = words.length * msPerWord;
      const globalZoom = 1.0 + (elapsedMs / totalDuration) * 0.15; // zooms from 1.0 to 1.15

      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.2;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

      ctx.save();
      // Apply the global camera zoom
      ctx.translate(canvasWidth / 2, originY);
      ctx.scale(globalZoom, globalZoom);

      setupBaseText(ctx, fontSize, config.font_family);

      // Bounding box draw
      const width = ctx.measureText(currentWord.toUpperCase()).width + 40;
      ctx.fillStyle = config.main_color || "#FFD700";
      
      // Extreme skew matrix
      ctx.transform(1, 0, -0.2, 1, 0, 0); // Skew X
      ctx.fillRect(-width/2, -(fontSize/2) - 15, width, fontSize + 30);
      
      ctx.transform(1, 0, 0.2, 1, 0, 0); // Unskew text
      ctx.fillStyle = "#000000"; // Deep black text for contrast
      ctx.fillText(currentWord.toUpperCase(), 0, 0);

      ctx.restore();
    }
  },
  {
    id: "SUBTITLE_TRACKING",
    name: "Subtitle Tracking",
    renderPreview: () => <div className="text-xs font-bold text-on-surface-variant text-center"><span className="text-primary-container">Highlight</span> <span className="text-white">Word</span></div>,
    renderFrame: (ctxData: EffectContext) => {
       const { ctx, canvasWidth, canvasHeight, config, words } = ctxData;
       const { wordIndex } = getWordStats(ctxData);
       const fontSize = parseInt(config.text_size) || 60;
       
       // Shows 7 words total context
       const start = Math.max(0, wordIndex - 3);
       const end = Math.min(words.length, wordIndex + 4);
       const contextWords = words.slice(start, end);
       
       let originY = canvasHeight / 2;
       if (config.position === "Top Center") originY = canvasHeight * 0.2;
       if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

       ctx.save();
       ctx.translate(canvasWidth / 2, originY);
       
       ctx.font = `800 ${fontSize}px ${config.font_family || "Montserrat"}`;
       // Calculate total width to center it
       let xOffset = - (ctx.measureText(contextWords.join(" ")).width / 2);

       contextWords.forEach((word, idx) => {
          const absoluteIdx = start + idx;
          const wordWidth = ctx.measureText(word + " ").width;
          
          if (absoluteIdx === wordIndex) {
            ctx.fillStyle = config.main_color || "#FFD700";
            ctx.shadowColor = config.main_color || "#FFD700";
            ctx.shadowBlur = 10;
          } else {
             // Past words are slightly dimmer than future words maybe? Actually just all white
            ctx.fillStyle = "white";
            ctx.shadowBlur = 0;
          }
          
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          // Outline
          ctx.lineWidth = 4;
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.strokeText(word, xOffset, 0);
          ctx.fillText(word, xOffset, 0);
          
          xOffset += wordWidth;
       });
       ctx.restore();
    }
  },
  {
    id: "LINE_STACK_BUILDUP",
    name: "Line Stack Buildup",
    renderPreview: () => <div className="flex flex-col text-xs font-bold leading-tight"><span className="opacity-50 line-through">Past Line</span><span className="text-white border-l-2 pl-1 border-primary-container">Next Line</span></div>,
    renderFrame: (ctxData: EffectContext) => {
       const { ctx, canvasWidth, canvasHeight, config, words } = ctxData;
       const { wordIndex, wordProgress } = getWordStats(ctxData);
       const fontSize = parseInt(config.text_size) || 50;
       const wordsPerLine = 4;
       
       const activeLineIdx = Math.floor(wordIndex / wordsPerLine);

       let originY = canvasHeight / 2;
       if (config.position === "Top Center") originY = canvasHeight * 0.2;
       if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

       ctx.save();
       setupBaseText(ctx, fontSize, config.font_family);

       // Draw Up to Active Line
       for (let line = 0; line <= activeLineIdx; line++) {
          const lineWords = words.slice(line * wordsPerLine, (line * wordsPerLine) + wordsPerLine).join(" ");
          if (!lineWords) continue;

          // How far back is this line?
          const linesOld = activeLineIdx - line;
          
          // Y offset (Older lines go up!)
          // 0 is bottom (active)
          const yOffset = -linesOld * (fontSize * 1.5) + (fontSize * 1.5);
          
          ctx.textAlign = "center";
          
          if (linesOld === 0) {
            // Animating actively
            const wordIdxInLine = wordIndex % wordsPerLine;
            // Pop the line in on first word
            const opacity = wordIdxInLine === 0 ? easeOutExpo(wordProgress) : 1;
            const slideUp = wordIdxInLine === 0 ? (20 * (1 - easeOutExpo(wordProgress))) : 0;
            
            ctx.globalAlpha = opacity;
            ctx.fillStyle = "white";
            ctx.fillText(lineWords, canvasWidth / 2, originY + yOffset + slideUp);
            
            // Draw a quick rectangle behind the active word (optional, or left border)
          } else {
             // Past Line
             ctx.globalAlpha = 0.4; // Faded
             ctx.fillStyle = "#A0A0A0";
             ctx.fillText(lineWords, canvasWidth / 2, originY + yOffset);
          }
       }

       ctx.restore();
    }
  },
  {
    id: "PUNCH_IN_ZOOM",
    name: "Punch In Zoom",
    renderPreview: () => <div className="text-xl font-black text-white hover:scale-150 transition-transform">ZOOM</div>,
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config } = ctxData;
      const { currentWord, wordIndex, wordProgress } = getWordStats(ctxData);
      const fontSize = parseInt(config.text_size) || 90;

      // Base Zoom increases every single word
      const baseScale = 1.0 + (wordIndex * 0.05); 
      // Individual punch scale
      const punchScale = baseScale + (0.15 * (1 - easeOutQuad(Math.min(1, wordProgress * 5))));

      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.2;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

      ctx.save();
      ctx.translate(canvasWidth / 2, originY);
      ctx.scale(punchScale, punchScale);
      
      setupBaseText(ctx, fontSize, config.font_family);

      ctx.shadowColor = config.main_color || "#FF2D78";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "white";
      ctx.fillText(currentWord.toUpperCase(), 0, 0);

      ctx.restore();
    }
  },
  {
    id: "GLITCH_PRO",
    name: "Glitch Emphasis Pro",
    renderPreview: () => <div className="text-lg font-black italic uppercase relative"><span className="text-cyan-400 absolute -left-0.5">GLITCH</span><span className="text-red-500 absolute -right-0.5">GLITCH</span><span className="text-white relative z-10">GLITCH</span></div>,
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config, elapsedMs } = ctxData;
      const { currentWord, wordProgress } = getWordStats(ctxData);
      const fontSize = parseInt(config.text_size) || 120;
      
      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.2;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

      ctx.save();
      ctx.translate(canvasWidth / 2, originY);
      setupBaseText(ctx, fontSize, config.font_family);
      ctx.font = `italic 900 ${fontSize}px ${config.font_family || "Syne"}`;

      // Frame Skipping & Flicker logic
      // Drop 1 in every 10 frames if wordProgress is < 0.2
      const isGlitching = wordProgress < 0.2 && Math.random() > 0.1;
      
      if (isGlitching) {
         const glitchX = (Math.random() - 0.5) * 30;
         const glitchY = (Math.random() - 0.5) * 10;
         
         ctx.globalAlpha = 0.8;
         ctx.fillStyle = "#00FFFF"; // Cyan
         ctx.fillText(currentWord.toUpperCase(), glitchX - 8, glitchY);
         
         ctx.fillStyle = "#FF00FF"; // Magenta or Red
         ctx.fillText(currentWord.toUpperCase(), glitchX + 8, -glitchY);

         // Add static noise slice
         if (Math.random() > 0.5) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(-100 + glitchX, -fontSize/2 + Math.random() * fontSize, 200, 5);
         }
      }
      
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeStyle = config.main_color || "#FFFFFF";
      ctx.strokeText(currentWord.toUpperCase(), 0, 0);
      ctx.fillText(currentWord.toUpperCase(), 0, 0);

      ctx.restore();
    }
  },
  {
    id: "TYPEWRITER",
    name: "Typewriter Modern",
    renderPreview: () => <div className="text-sm font-mono text-green-400">typing<span className="animate-pulse bg-green-400 text-transparent opacity-80">|</span></div>,
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config, words, elapsedMs } = ctxData;
      const { wordIndex } = getWordStats(ctxData);
      const fontSize = parseInt(config.text_size) || 60;
      
      // We calculate what part of the total string we should show based on total elapsedMs
      const fullText = words.slice(0, Math.max(7, words.length)).join(" "); // Keep it readable
      const totalChars = fullText.length;
      
      // Calculate chars per second (adjust 'speed' down for character speed)
      // Actually msPerWord can stand in for a total completion duration.
      const charRateMs = 50; // Every 50 ms a new char
      const charsToShow = Math.floor(elapsedMs / charRateMs);
      
      const currentString = fullText.substring(0, charsToShow);

      // Blinking Cursor logic (every 500ms)
      const showCursor = Math.floor(elapsedMs / 400) % 2 === 0;

      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.2;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

      ctx.save();
      ctx.translate(canvasWidth / 2, originY);
      
      ctx.font = `600 ${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // To center text horizontally as it expands, calculate width
      const width = ctx.measureText(currentString).width;
      
      ctx.fillStyle = config.main_color || "#00F5FF";
      ctx.shadowColor = config.main_color || "#00F5FF";
      ctx.shadowBlur = 10;
      
      ctx.fillText(currentString + (showCursor ? "|" : ""), 0, 0);
      ctx.restore();
    }
  },
  {
    id: "CINEMATIC_FADE",
    name: "Cinematic Fade Story",
    renderPreview: () => <div className="text-xs font-serif italic text-white/50 hover:text-white transition-opacity duration-1000">Once upon a time</div>,
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config } = ctxData;
      const { currentWord, wordProgress } = getWordStats(ctxData);
      const fontSize = parseInt(config.text_size) || 70;

      // Slow smooth fade in
      const alpha = Math.min(1.0, wordProgress * 4); 
      // Slow upward drift
      const yDrift = 15 - (wordProgress * 15);

      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.2;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

      ctx.save();
      ctx.translate(canvasWidth / 2, originY + yDrift);
      
      // Elegant serif or sans tracking
      ctx.font = `300 ${fontSize}px ${config.font_family || "Inter"}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.globalAlpha = alpha;
      ctx.fillStyle = config.main_color || "white";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;

      // Add letter spacing hack (Draw chars manually)
      const chars = currentWord.split("");
      const letterSpace = 10;
      const totalWidth = ctx.measureText(currentWord).width + ((chars.length - 1) * letterSpace);
      
      let xOffset = -totalWidth / 2;
      chars.forEach(char => {
         const w = ctx.measureText(char).width;
         ctx.fillText(char, xOffset + w/2, 0);
         xOffset += w + letterSpace;
      });

      ctx.restore();
    }
  },
  {
    id: "VIRAL_REEL_POP",
    name: "Viral Reel Pop",
    renderPreview: () => <div className="text-lg font-black text-[#FFD700] hover:-translate-y-2 transition-transform">POP!</div>,
    renderFrame: (ctxData: EffectContext) => {
      const { ctx, canvasWidth, canvasHeight, config } = ctxData;
      const { currentWord, wordProgress } = getWordStats(ctxData);
      const fontSize = parseInt(config.text_size) || 100;

      // Bouncy Ease In from bottom scale 0 to 1
      const scale = wordProgress < 0.4 ? easeOutElastic(wordProgress * 2.5) : 1.0;
      
      let originY = canvasHeight / 2;
      if (config.position === "Top Center") originY = canvasHeight * 0.2;
      if (config.position === "Bottom Center") originY = canvasHeight * 0.8;

      ctx.save();
      ctx.translate(canvasWidth / 2, originY);
      
      // Pivot from bottom center
      ctx.translate(0, fontSize / 2);
      ctx.scale(scale, scale);
      ctx.translate(0, -fontSize / 2);

      setupBaseText(ctx, fontSize, config.font_family);

      // Deep stroke
      ctx.lineWidth = fontSize * 0.2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.strokeText(currentWord.toUpperCase(), 0, 0);

      // Bright fill gradient simulation
      ctx.fillStyle = config.main_color || "#FFB300";
      ctx.fillText(currentWord.toUpperCase(), 0, 0);

      // White inner stroke
      ctx.lineWidth = 2;
      ctx.strokeStyle = "white";
      ctx.strokeText(currentWord.toUpperCase(), 0, 0);

      ctx.restore();
    }
  }
];
