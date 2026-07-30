import { useEffect, useRef } from 'react';

const vertexShaderSource = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;
varying vec2 vUv;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_grain;
uniform vec3 u_colors[3];

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
    -0.577350269189626,
    0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(
    permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x
      + vec3(0.0, i1.x, 1.0)
  );
  vec3 m = max(
    0.5 - vec3(
      dot(x0, x0),
      dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)
    ),
    0.0
  );
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float ratio = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 point = uv * vec2(ratio, 1.0);
  float time = u_time * 0.2;

  float noiseOne = snoise(point * 0.5 + time);
  float noiseTwo = snoise(point * 0.9 - time * 0.5 + noiseOne);
  float light = pow(abs(noiseTwo), 2.5) * 0.5;

  vec3 color = vec3(0.02, 0.01, 0.01);
  color += u_colors[0] * smoothstep(0.1, 1.0, noiseOne) * 0.5;
  color += u_colors[1] * light;
  color += u_colors[2] * smoothstep(0.35, 1.0, -noiseOne) * light * 0.12;

  float filmGrain = fract(
    sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time
  );
  color += (filmGrain - 0.5) * u_grain * 0.5;

  float distanceFromCenter = length(uv - 0.5);
  color *= smoothstep(1.2, 0.2, distanceFromCenter);

  gl_FragColor = vec4(color, 1.0);
}
`;

const DEFAULT_COLORS = ['#ff6339', '#62d9e8', '#c7f36b'];

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  if (!/^[\da-f]{6}$/i.test(normalized)) return [1, 1, 1];

  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  ];
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export default function Auralis({
  colors = DEFAULT_COLORS,
  speed = 0.3,
  grain = 0.3,
  height = '100%',
  className = '',
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    let gl;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    } catch {
      return undefined;
    }
    if (!gl || typeof gl.createShader !== 'function') return undefined;

    const program = createProgram(gl);
    if (!program) return undefined;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      colors: gl.getUniformLocation(program, 'u_colors'),
    };

    const colorValues = new Float32Array(
      [...colors, ...DEFAULT_COLORS]
        .slice(0, 3)
        .flatMap(hexToRgb),
    );
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animationSpeed = reducedMotion ? 0 : speed;
    const startedAt = performance.now();
    let frameId;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(container.clientWidth * pixelRatio));
      const heightInPixels = Math.max(1, Math.round(container.clientHeight * pixelRatio));

      if (canvas.width !== width || canvas.height !== heightInPixels) {
        canvas.width = width;
        canvas.height = heightInPixels;
        gl.viewport(0, 0, width, heightInPixels);
      }
    };

    const render = (now = startedAt) => {
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, ((now - startedAt) / 1000) * animationSpeed);
      gl.uniform1f(uniforms.grain, Math.max(0, grain));
      gl.uniform3fv(uniforms.colors, colorValues);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (animationSpeed !== 0) frameId = window.requestAnimationFrame(render);
    };

    const handleResize = () => {
      resize();
      if (animationSpeed === 0) render();
    };

    resize();
    frameId = window.requestAnimationFrame(render);

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(handleResize);
    resizeObserver?.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      if (frameId) window.cancelAnimationFrame(frameId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [colors, speed, grain]);

  return (
    <div
      ref={containerRef}
      className={`auralis ${className}`.trim()}
      style={{ height }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="auralis__canvas" />
    </div>
  );
}
