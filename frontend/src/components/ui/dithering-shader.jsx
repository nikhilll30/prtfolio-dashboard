import { useEffect, useRef } from 'react';

const declarePI = `
#define TWO_PI 6.28318530718
`;

const proceduralHash11 = `
float hash11(float p) {
  p = fract(p * 0.3183099) + 0.1;
  p *= p + 19.19;
  return fract(p * p);
}
`;

const proceduralHash21 = `
float hash21(vec2 p) {
  p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}
`;

const simplexNoise = `
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
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
`;

const vertexShaderSource = `#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

void main() {
  gl_Position = a_position;
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec4 u_colorBack;
uniform vec4 u_colorFront;
uniform float u_shape;
uniform float u_type;
uniform float u_pxSize;

out vec4 fragColor;

${simplexNoise}
${declarePI}
${proceduralHash11}
${proceduralHash21}

float getSimplexNoise(vec2 uv, float t) {
  float noise = .5 * snoise(uv - vec2(0., .3 * t));
  noise += .5 * snoise(2. * uv + vec2(0., .32 * t));
  return noise;
}

const int bayer2x2[4] = int[4](0, 2, 3, 1);
const int bayer4x4[16] = int[16](
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5
);
const int bayer8x8[64] = int[64](
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 uv, int size) {
  ivec2 pos = ivec2(mod(uv, float(size)));
  int index = pos.y * size + pos.x;

  if (size == 2) return float(bayer2x2[index]) / 4.0;
  if (size == 4) return float(bayer4x4[index]) / 16.0;
  if (size == 8) return float(bayer8x8[index]) / 64.0;
  return 0.0;
}

void main() {
  float t = .5 * u_time;
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv -= .5;

  vec2 pxSizeUv = gl_FragCoord.xy - .5 * u_resolution;
  pxSizeUv /= u_pxSize;
  vec2 pixelizedUv = floor(pxSizeUv) * u_pxSize / u_resolution.xy;

  vec2 shapeUv = pixelizedUv;
  vec2 ditheringUv = pxSizeUv;
  vec2 ditheringNoiseUv = uv * u_resolution;

  float shape = 0.;
  if (u_shape < 1.5) {
    shapeUv *= .001;
    shape = 0.5 + 0.5 * getSimplexNoise(shapeUv, t);
    shape = smoothstep(0.3, 0.9, shape);
  } else if (u_shape < 2.5) {
    shapeUv *= .003;
    for (float i = 1.0; i < 6.0; i++) {
      shapeUv.x += 0.6 / i * cos(i * 2.5 * shapeUv.y + t);
      shapeUv.y += 0.6 / i * cos(i * 1.5 * shapeUv.x + t);
    }
    shape = .15 / abs(sin(t - shapeUv.y - shapeUv.x));
    shape = smoothstep(0.02, 1., shape);
  } else if (u_shape < 3.5) {
    shapeUv *= .05;
    float stripeIdx = floor(2. * shapeUv.x / TWO_PI);
    float randomValue = hash11(stripeIdx * 10.);
    randomValue = sign(randomValue - .5) * pow(.1 + abs(randomValue), .4);
    shape = sin(shapeUv.x) * cos(shapeUv.y - 5. * randomValue * t);
    shape = pow(abs(shape), 6.);
  } else if (u_shape < 4.5) {
    shapeUv *= 4.;
    float wave = cos(.5 * shapeUv.x - 2. * t)
      * sin(1.5 * shapeUv.x + t)
      * (.75 + .25 * cos(3. * t));
    shape = 1. - smoothstep(-1., 1., shapeUv.y + wave);
  } else if (u_shape < 5.5) {
    float dist = length(shapeUv);
    shape = sin(pow(dist, 1.7) * 7. - 3. * t) * .5 + .5;
  } else if (u_shape < 6.5) {
    float distanceFromCenter = length(shapeUv);
    float angle = 6. * atan(shapeUv.y, shapeUv.x) + 4. * t;
    float twist = 1.2;
    float offset = pow(distanceFromCenter, -twist) + angle / TWO_PI;
    float mid = smoothstep(0., 1., pow(distanceFromCenter, twist));
    shape = mix(0., fract(offset), mid);
  } else {
    shapeUv *= 2.;
    float depth = 1. - pow(length(shapeUv), 2.);
    vec3 position = vec3(shapeUv, sqrt(max(depth, 0.)));
    vec3 lightPosition = normalize(vec3(cos(1.5 * t), .8, sin(1.25 * t)));
    shape = (.5 + .5 * dot(lightPosition, position)) * step(0., depth);
  }

  int ditheringType = int(floor(u_type));
  float dithering = 0.0;

  switch (ditheringType) {
    case 1:
      dithering = step(hash21(ditheringNoiseUv), shape);
      break;
    case 2:
      dithering = getBayerValue(ditheringUv, 2);
      break;
    case 3:
      dithering = getBayerValue(ditheringUv, 4);
      break;
    default:
      dithering = getBayerValue(ditheringUv, 8);
      break;
  }

  dithering -= .5;
  float result = step(.5, shape + dithering);
  vec3 foreground = u_colorFront.rgb * u_colorFront.a;
  vec3 background = u_colorBack.rgb * u_colorBack.a;
  float opacity = u_colorFront.a * result;
  vec3 color = foreground * result + background * (1. - opacity);
  opacity += u_colorBack.a * (1. - opacity);

  fragColor = vec4(color, opacity);
}
`;

const DitheringShapes = {
  simplex: 1,
  warp: 2,
  dots: 3,
  wave: 4,
  ripple: 5,
  swirl: 6,
  sphere: 7,
};

const DitheringTypes = {
  random: 1,
  '2x2': 2,
  '4x4': 3,
  '8x8': 4,
};

function hexToRgba(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0, 1];

  return [
    Number.parseInt(result[1], 16) / 255,
    Number.parseInt(result[2], 16) / 255,
    Number.parseInt(result[3], 16) / 255,
    1,
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

export default function DitheringShader({
  colorBack = '#0a0c0d',
  colorFront = '#ff6339',
  shape = 'sphere',
  type = 'random',
  pxSize = 2,
  speed = 1.5,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    let gl;
    try {
      gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    } catch {
      return undefined;
    }
    if (!gl || typeof gl.createShader !== 'function') return undefined;

    const program = createProgram(gl);
    if (!program) return undefined;

    const positions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      time: gl.getUniformLocation(program, 'u_time'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      colorBack: gl.getUniformLocation(program, 'u_colorBack'),
      colorFront: gl.getUniformLocation(program, 'u_colorFront'),
      shape: gl.getUniformLocation(program, 'u_shape'),
      type: gl.getUniformLocation(program, 'u_type'),
      pxSize: gl.getUniformLocation(program, 'u_pxSize'),
    };

    let frameId;
    let width = 1;
    let height = 1;
    const startedAt = performance.now();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animationSpeed = reducedMotion ? 0 : speed;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(bounds.width * pixelRatio));
      height = Math.max(1, Math.round(bounds.height * pixelRatio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const render = (now = startedAt) => {
      resize();
      gl.useProgram(program);
      gl.uniform1f(uniforms.time, ((now - startedAt) / 1000) * animationSpeed);
      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform4fv(uniforms.colorBack, hexToRgba(colorBack));
      gl.uniform4fv(uniforms.colorFront, hexToRgba(colorFront));
      gl.uniform1f(uniforms.shape, DitheringShapes[shape] ?? DitheringShapes.sphere);
      gl.uniform1f(uniforms.type, DitheringTypes[type] ?? DitheringTypes.random);
      gl.uniform1f(uniforms.pxSize, Math.max(1, pxSize));
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (animationSpeed !== 0) frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      gl.deleteBuffer(positions);
      gl.deleteProgram(program);
    };
  }, [colorBack, colorFront, shape, type, pxSize, speed]);

  return (
    <div ref={containerRef} className={className} style={style} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
