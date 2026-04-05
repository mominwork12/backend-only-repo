"use client";

import { useEffect, useRef } from "react";

export default function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vsSource = `
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
    `;

    const fsSource = `
        precision highp float;
        uniform float uTime;
        uniform vec2 uResolution;

        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
            
            float d = length(uv);
            vec3 finalColor = vec3(0.0);
            
            for (float i = 0.0; i < 4.0; i++) {
                uv = fract(uv * 1.5) - 0.5;
                d = length(uv) * exp(-length(uv));
                
                vec3 col = vec3(0.0, 0.86, 1.0) * (0.5 + 0.5 * cos(uTime + i * 0.4 + vec3(0,2,4)));
                
                d = sin(d * 8.0 + uTime) / 8.0;
                d = abs(d);
                d = pow(0.01 / d, 1.2);
                
                finalColor += col * d;
            }
            
            gl_FragColor = vec4(finalColor * 0.4, 1.0);
        }
    `;

    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "aVertexPosition"
    );
    const timeUniformLocation = gl.getUniformLocation(program, "uTime");
    const resolutionUniformLocation = gl.getUniformLocation(
      program,
      "uResolution"
    );

    let animationFrameId: number;

    function render(time: number) {
      time *= 0.001;

      const cvs = canvasRef.current;
      if (!cvs) return;

      if (cvs.width !== cvs.clientWidth || cvs.height !== cvs.clientHeight) {
        cvs.width = cvs.clientWidth;
        cvs.height = cvs.clientHeight;
        gl!.viewport(0, 0, cvs.width, cvs.height);
      }

      gl!.useProgram(program);
      gl!.enableVertexAttribArray(positionAttributeLocation);
      gl!.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl!.FLOAT,
        false,
        0,
        0
      );

      gl!.uniform1f(timeUniformLocation, time);
      gl!.uniform2f(resolutionUniformLocation, cvs.width, cvs.height);

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="shader-canvas" />;
}
