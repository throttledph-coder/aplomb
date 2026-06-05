// Generate a branded app icon (dark rounded square + white diamond) as PNG,
// with no image dependency — pure zlib + a tiny PNG encoder.
// Outputs build/icon.png (256) and prints a 32px tray PNG as base64.
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'latin1')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

// Distance from point (px,py) to segment (ax,ay)-(bx,by).
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy || 1
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cxp = ax + t * dx
  const cyp = ay + t * dy
  return Math.hypot(px - cxp, py - cyp)
}

// Render RGBA pixels for size N — a bold coral "A" monogram on a rounded
// warm-charcoal square. Reads cleanly down to 16px.
function render(N) {
  const buf = Buffer.alloc(N * N * 4)
  const r = N * 0.18 // corner radius
  const CORAL = [217, 119, 87, 255]
  const CHARCOAL = [38, 38, 36, 255]
  const set = (x, y, rgba) => {
    const i = (y * N + x) * 4
    buf[i] = rgba[0]
    buf[i + 1] = rgba[1]
    buf[i + 2] = rgba[2]
    buf[i + 3] = rgba[3]
  }
  const inRounded = (x, y) => {
    const dx = Math.max(r - x, x - (N - 1 - r), 0)
    const dy = Math.max(r - y, y - (N - 1 - r), 0)
    return dx * dx + dy * dy <= r * r
  }

  // "A" geometry: apex top-center, legs to bottom corners, plus a crossbar.
  const apexX = N * 0.5
  const apexY = N * 0.22
  const leftX = N * 0.27
  const rightX = N * 0.73
  const botY = N * 0.78
  const stroke = N * 0.085 // half-thickness
  const barY = N * 0.6
  const barHalf = stroke * 0.85

  const isInk = (x, y) => {
    if (segDist(x, y, apexX, apexY, leftX, botY) <= stroke) return true // left leg
    if (segDist(x, y, apexX, apexY, rightX, botY) <= stroke) return true // right leg
    // crossbar between the legs
    if (Math.abs(y - barY) <= barHalf && x >= N * 0.36 && x <= N * 0.64) return true
    return false
  }

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!inRounded(x, y)) {
        set(x, y, [0, 0, 0, 0]) // transparent outside
        continue
      }
      set(x, y, isInk(x, y) ? CORAL : CHARCOAL)
    }
  }
  return buf
}

function encodePng(N) {
  const raw = render(N)
  // add filter byte (0) per scanline
  const stride = N * 4
  const filtered = Buffer.alloc((stride + 1) * N)
  for (let y = 0; y < N; y++) {
    filtered[y * (stride + 1)] = 0
    raw.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(filtered)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(N, 0)
  ihdr.writeUInt32BE(N, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const buildDir = path.join(__dirname, '..', 'build')
fs.mkdirSync(buildDir, { recursive: true })
fs.writeFileSync(path.join(buildDir, 'icon.png'), encodePng(256))
const tray = encodePng(32)
fs.writeFileSync(path.join(buildDir, 'tray.png'), tray)
console.log('TRAY_BASE64=' + tray.toString('base64'))
console.log('wrote build/icon.png (256) + build/tray.png (32)')
