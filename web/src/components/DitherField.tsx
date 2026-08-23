// Bayer-ditheritud Perlini väli.
//
// Port autori enda dither-wave'ist (emervark.ee), häälestatud heleda paberi
// jaoks: tumedad täpid tekivad soojale paberile, mitte kuma mustale.
//
// Taust ei tohi kunagi lehte katki teha, seepärast:
//   - ilma WebGL2-ta jääb lihtsalt paber, mitte tühi või katkine kast
//   - prefers-reduced-motion joonistab ühe kaadri ja jääb seisma
//   - vaateväljast väljas ei joonistata üldse (sülearvuti aku)

import { useEffect, useRef } from 'react';

const NOISE = `
vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}
vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
vec2 fade(vec2 t){return t*t*t*(t*(t*6.-15.)+10.);}
float cn(vec2 P){vec4 Pi=floor(P.xyxy)+vec4(0.,0.,1.,1.);vec4 Pf=fract(P.xyxy)-vec4(0.,0.,1.,1.);Pi=m289(Pi);vec4 ix=Pi.xzxz,iy=Pi.yyww,fx=Pf.xzxz,fy=Pf.yyww;vec4 i=perm(perm(ix)+iy);vec4 gx=fract(i*(1./41.))*2.-1.;vec4 gy=abs(gx)-.5;vec4 tx=floor(gx+.5);gx=gx-tx;vec2 g00=vec2(gx.x,gy.x),g10=vec2(gx.y,gy.y),g01=vec2(gx.z,gy.z),g11=vec2(gx.w,gy.w);vec4 nm=tis(vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11)));g00*=nm.x;g01*=nm.y;g10*=nm.z;g11*=nm.w;float n00=dot(g00,vec2(fx.x,fy.x)),n10=dot(g10,vec2(fx.y,fy.y)),n01=dot(g01,vec2(fx.z,fy.z)),n11=dot(g11,vec2(fx.w,fy.w));vec2 fxy=fade(Pf.xy);vec2 nx=mix(vec2(n00,n01),vec2(n10,n11),fxy.x);return 2.3*mix(nx.x,nx.y,fxy.y);}
float fbm(vec2 p){float v=0.,a=1.,f=uFreq;for(int i=0;i<4;i++){v+=a*abs(cn(p));p*=f;a*=uAmp;}return v;}
float pat(vec2 p){vec2 p2=p-uT*uSpeed;return fbm(p+fbm(p2));}
const float B[64]=float[64](0.,48.,12.,60.,3.,51.,15.,63.,32.,16.,44.,28.,35.,19.,47.,31.,8.,56.,4.,52.,11.,59.,7.,55.,40.,24.,36.,20.,43.,27.,39.,23.,2.,50.,14.,62.,1.,49.,13.,61.,34.,18.,46.,30.,33.,17.,45.,29.,10.,58.,6.,54.,9.,57.,5.,53.,42.,26.,38.,22.,41.,25.,37.,21.);
float dith(vec2 fc,float v){vec2 s=floor(fc/uPixel);int x=int(mod(s.x,8.)),y=int(mod(s.y,8.));float th=B[y*8+x]/64.-.5;float st=1./(uColorNum-1.);v=clamp(v+th*st,0.,1.);return floor(v*(uColorNum-1.)+.5)/(uColorNum-1.);}
`;

const VS = '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FS = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 uRes;
uniform float uT,uSpeed,uFreq,uAmp,uColorNum,uPixel,uStr;
uniform vec3 uPaper,uInk;
${NOISE}
void main(){
  vec2 fc=uPixel*floor(gl_FragCoord.xy/uPixel);
  vec2 uv=fc/uRes; uv-=.5; uv.x*=uRes.x/uRes.y;
  float f=clamp(pat(uv)*uStr,0.,1.);
  O=vec4(mix(uPaper,uInk,dith(gl_FragCoord.xy,f)),1.);
}`;

const PAPER: [number, number, number] = [0xf6 / 255, 0xf0 / 255, 0xe4 / 255];
const INK: [number, number, number] = [0x15 / 255, 0x15 / 255, 0x15 / 255];

export interface DitherFieldProps {
  /** Kui tugevalt tint paberile tuleb. Hero ~0.3, väiksed plaadid ~0.6. */
  strength?: number;
  speed?: number;
  /** Ditheri täpi suurus pikslites. */
  pixel?: number;
  /** Mitu tooni: 2 = puhas kahevärviline, 3 = pehmem. */
  colorNum?: number;
  className?: string;
}

export function DitherField({
  strength = 0.3,
  speed = 0.03,
  pixel = 2,
  colorNum = 3,
  className,
}: DitherFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { antialias: false });
    // Ilma WebGL2-ta jääb lihtsalt paber — see on täiesti kõlblik taust.
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const U = {
      res: u('uRes'), t: u('uT'), speed: u('uSpeed'), freq: u('uFreq'),
      amp: u('uAmp'), colorNum: u('uColorNum'), pixel: u('uPixel'),
      str: u('uStr'), paper: u('uPaper'), ink: u('uInk'),
    };

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(devicePixelRatio || 1, 2);

    let width = 1;
    let height = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      height = canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      gl.viewport(0, 0, width, height);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    let visible = true;
    const intersection = new IntersectionObserver(
      (entries) => { visible = entries[0].isIntersecting; },
      { threshold: 0 },
    );
    intersection.observe(canvas);

    let start: number | null = null;
    let raf = 0;

    const draw = (ts: number) => {
      if (start === null) start = ts;
      gl.uniform2f(U.res, width, height);
      gl.uniform1f(U.t, reduce ? 0 : (ts - start) / 1000);
      gl.uniform1f(U.speed, speed);
      gl.uniform1f(U.freq, 2.0);
      gl.uniform1f(U.amp, 0.34);
      gl.uniform1f(U.colorNum, colorNum);
      gl.uniform1f(U.pixel, pixel * dpr);
      gl.uniform1f(U.str, strength);
      gl.uniform3f(U.paper, ...PAPER);
      gl.uniform3f(U.ink, ...INK);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (ts: number) => {
      if (visible) draw(ts);
      raf = requestAnimationFrame(frame);
    };

    if (reduce) requestAnimationFrame(draw);
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
    };
  }, [strength, speed, pixel, colorNum]);

  return <canvas ref={ref} className={className ?? 'dither'} aria-hidden="true" />;
}
