// Mathematical easing primitives

export const linear = (t: number) => t;

// Smooth decel
export const easeOutQuad = (t: number) => t * (2 - t);

// Smooth snap into place
export const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

// Slight overshoot pop (Hormozi style)
export const easeOutBack = (t: number, overshoot = 1.70158) => {
  return --t * t * ((overshoot + 1) * t + overshoot) + 1;
};

// Elastic bounce (TikTok / Viral pop)
export const easeOutElastic = (t: number) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
