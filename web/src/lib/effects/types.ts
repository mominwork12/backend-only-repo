import type { ReactElement } from "react";

export interface EffectContext {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  words: string[];
  elapsedMs: number;
  msPerWord: number;
  config: Record<string, any>;
}

export interface TextEffect {
  id: string;
  name: string;
  renderPreview: () => ReactElement;
  renderFrame: (context: EffectContext) => void;
}
