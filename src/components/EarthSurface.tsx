import {useEffect, useRef, useState} from 'react';
import {observatoryImagery} from '../data/observatory';

type Props = {lat: number; lon: number; onReady: (ready: boolean) => void};
const vertexSource = `
attribute vec2 position;
varying vec2 disk;
void main() { disk = position; gl_Position = vec4(position, 0.0, 1.0); }
`;
const fragmentSource = `
precision highp float;
varying vec2 disk;
uniform sampler2D surface;
uniform vec2 camera;
void main() {
  float r2 = dot(disk, disk);
  if (r2 > 1.0) discard;
  float z = sqrt(1.0 - r2);
  float latitude = asin(clamp(disk.y * cos(camera.x) + z * sin(camera.x), -1.0, 1.0));
  float longitude = atan(disk.x, z * cos(camera.x) - disk.y * sin(camera.x)) + camera.y;
  vec2 uv = vec2(fract(0.5 + longitude / 6.28318530718), 0.5 - latitude / 3.14159265359);
  vec3 colour = texture2D(surface, uv).rgb;
  // Illustrative lighting, independent of the temperature data and actual solar time.
  vec3 normal = vec3(disk, z);
  float light = 0.13 + 1.05 * max(dot(normal, normalize(vec3(-0.55, 0.4, 1.0))), 0.0);
  vec3 atmosphere = vec3(0.10, 0.34, 0.65) * pow(1.0 - z, 3.0) * 0.65;
  gl_FragColor = vec4(colour * light + atmosphere, 1.0);
}
`;

/** A textured orthographic globe. Its camera uses the same coordinates as the SVG overlay. */
export default function EarthSurface({lat, lon, onReady}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const camera = useRef({lat, lon});
  const draw = useRef<() => void>(() => {});
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let gl: WebGLRenderingContext | null;
    try { gl = element.getContext('webgl', {alpha: true, antialias: false, depth: false, powerPreference: 'low-power'}); }
    catch { gl = null; }
    if (!gl) { onReady(false); return; }
    const context = gl;
    let disposed = false;
    let invalidated = false;
    const shaders: WebGLShader[] = [];
    const program = context.createProgram();
    const buffer = context.createBuffer();
    const texture = context.createTexture();
    const image = new Image();
    function cleanup() {
      disposed = true;
      image.onload = null; image.onerror = null;
      draw.current = () => {};
      // Context loss already releases these objects. After restoration their handles
      // belong to the previous context generation and cannot be deleted again.
      if (!invalidated && !context.isContextLost()) {
        context.deleteTexture(texture); context.deleteBuffer(buffer);
        context.deleteProgram(program); shaders.forEach(shader => context.deleteShader(shader));
      }
    }
    function shader(type: number, source: string) {
      const result = context.createShader(type);
      if (!result) throw Error('Shader unavailable');
      shaders.push(result); context.shaderSource(result, source); context.compileShader(result);
      if (!context.getShaderParameter(result, context.COMPILE_STATUS)) throw Error('Shader compilation failed');
      return result;
    }
    try {
      if (!program || !buffer || !texture) throw Error('Surface unavailable');
      context.attachShader(program, shader(context.VERTEX_SHADER, vertexSource));
      context.attachShader(program, shader(context.FRAGMENT_SHADER, fragmentSource));
      context.linkProgram(program);
      if (!context.getProgramParameter(program, context.LINK_STATUS)) throw Error('Surface linking failed');
      context.useProgram(program);
      context.bindBuffer(context.ARRAY_BUFFER, buffer);
      context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), context.STATIC_DRAW);
      const position = context.getAttribLocation(program, 'position');
      context.enableVertexAttribArray(position); context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
      const cameraUniform = context.getUniformLocation(program, 'camera');
      context.bindTexture(context.TEXTURE_2D, texture);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
      context.uniform1i(context.getUniformLocation(program, 'surface'), 0);
      image.onload = () => {
        if (disposed || context.isContextLost()) return;
        try {
          context.bindTexture(context.TEXTURE_2D, texture);
          context.texImage2D(context.TEXTURE_2D, 0, context.RGB, context.RGB, context.UNSIGNED_BYTE, image);
          if (context.getError() !== context.NO_ERROR) throw Error('Surface upload failed');
          draw.current = () => {
            if (disposed || context.isContextLost()) return;
            context.viewport(0, 0, element!.width, element!.height);
            context.uniform2f(cameraUniform, camera.current.lat * Math.PI / 180, camera.current.lon * Math.PI / 180);
            context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
          };
          draw.current(); onReady(true);
        } catch { onReady(false); }
      };
      image.onerror = () => { if (!disposed) onReady(false); };
      image.src = observatoryImagery.texture;
    } catch { onReady(false); }
    const lost = (event: Event) => {event.preventDefault(); invalidated = true; draw.current = () => {}; onReady(false);};
    const restored = () => setRevision(value => value + 1);
    element.addEventListener('webglcontextlost', lost);
    element.addEventListener('webglcontextrestored', restored);
    return () => {
      element.removeEventListener('webglcontextlost', lost);
      element.removeEventListener('webglcontextrestored', restored);
      cleanup();
      // Strict Mode replays effects while the canvas is still connected.
      if (!element.isConnected) context.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [revision, onReady]);
  useEffect(() => {camera.current = {lat, lon}; draw.current();}, [lat, lon]);
  return <canvas ref={canvas} width="768" height="768" className="earth-globe__surface" aria-hidden="true"/>;
}
