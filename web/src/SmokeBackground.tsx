import { useEffect, useRef } from 'react'

// Animated WebGL2 smoke background — the same shader used on the app's login
// screen (adapted from a 21st.dev shader). GPU-light: a single full-screen quad.

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);
  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);
  col.r-=fbm(uv+vec2(0,T*.015)+n);
  col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);
  col=mix(col, u_color, dot(col,vec3(.21,.71,.07)));
  col=mix(vec3(.08),col,min(time*.1,1.));
  col=clamp(col,.08,1.);
  O=vec4(col,1);
}`

const vertexSrc =
  '#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}'

const VERTICES = [-1, 1, -1, -1, 1, 1, 1, -1]

class Renderer {
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private program: WebGLProgram | null = null
  private vs: WebGLShader | null = null
  private fs: WebGLShader | null = null
  private buffer: WebGLBuffer | null = null
  private uResolution: WebGLUniformLocation | null = null
  private uTime: WebGLUniformLocation | null = null
  private uColor: WebGLUniformLocation | null = null
  private color: [number, number, number] = [0.5, 0.5, 0.5]

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, fragmentSource: string) {
    this.canvas = canvas
    this.gl = gl
    this.setup(fragmentSource)
    this.init()
  }

  updateColor(c: [number, number, number]) {
    this.color = c
  }

  updateScale() {
    const dpr = Math.max(1, window.devicePixelRatio)
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  private compile(shader: WebGLShader, source: string) {
    const gl = this.gl
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`)
    }
  }

  private setup(fragmentSource: string) {
    const gl = this.gl
    this.vs = gl.createShader(gl.VERTEX_SHADER)
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!this.vs || !this.fs || !program) return
    this.compile(this.vs, vertexSrc)
    this.compile(this.fs, fragmentSource)
    this.program = program
    gl.attachShader(program, this.vs)
    gl.attachShader(program, this.fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(`Program link error: ${gl.getProgramInfoLog(program)}`)
    }
  }

  private init() {
    const { gl, program } = this
    if (!program) return
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(VERTICES), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    this.uResolution = gl.getUniformLocation(program, 'resolution')
    this.uTime = gl.getUniformLocation(program, 'time')
    this.uColor = gl.getUniformLocation(program, 'u_color')
  }

  render(now = 0) {
    const { gl, program, buffer, canvas } = this
    if (!program || !gl.isProgram(program)) return
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.uniform2f(this.uResolution, canvas.width, canvas.height)
    gl.uniform1f(this.uTime, now * 1e-3)
    gl.uniform3fv(this.uColor, this.color)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  dispose() {
    const { gl, program, vs, fs, buffer } = this
    if (buffer) gl.deleteBuffer(buffer)
    if (program) {
      if (vs) {
        gl.detachShader(program, vs)
        gl.deleteShader(vs)
      }
      if (fs) {
        gl.detachShader(program, fs)
        gl.deleteShader(fs)
      }
      gl.deleteProgram(program)
    }
    this.program = null
  }
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : null
}

interface SmokeBackgroundProps {
  smokeColor?: string
  className?: string
}

export function SmokeBackground({ smokeColor = '#d97757', className }: SmokeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2')
    if (!gl) return // no WebGL2 → leave the themed background blank

    const renderer = new Renderer(canvas, gl, fragmentShaderSource)
    const rgb = hexToRgb(smokeColor)
    if (rgb) renderer.updateColor(rgb)

    const onResize = () => renderer.updateScale()
    onResize()
    window.addEventListener('resize', onResize)

    let raf = 0
    const loop = (now: number) => {
      renderer.render(now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
      renderer.dispose()
    }
  }, [smokeColor])

  return <canvas ref={canvasRef} className={className ?? 'smoke'} />
}
