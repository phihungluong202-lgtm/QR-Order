/**
 * Pure TypeScript QR Code Generator
 * ISO/IEC 18004:2015 — Byte mode, ECC levels L/M/Q/H, Versions 1–10
 * No external dependencies.
 */

export type QrEcc = "L" | "M" | "Q" | "H";

// ─── GF(256) field ────────────────────────────────────────────────────────────

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // primitive poly x^8+x^4+x^3+x^2+1
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

// ─── Reed-Solomon ─────────────────────────────────────────────────────────────

/** Build generator polynomial g(x) = Π(x + α^i) for i=0..nec-1 */
function buildGen(nec: number): number[] {
  const g = [1];
  for (let i = 0; i < nec; i++) {
    const c = GF_EXP[i];
    // Multiply g by (x + c): result[j] = c × old[j-1] ⊕ old[j]
    g.push(gfMul(c, g[g.length - 1]));
    for (let j = g.length - 2; j > 0; j--) {
      g[j] = gfMul(c, g[j - 1]) ^ g[j];
    }
    // g[0] unchanged (leading coefficient stays 1)
  }
  return g;
}

/** Compute RS error correction codewords for data bytes */
function rsEncode(data: number[], nec: number): number[] {
  const gen = buildGen(nec);
  const work = [...data, ...new Array(nec).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const c = work[i];
    if (c !== 0) {
      for (let j = 0; j < gen.length; j++) {
        work[i + j] ^= gfMul(c, gen[j]);
      }
    }
  }
  return work.slice(data.length);
}

// ─── Version / capacity tables ────────────────────────────────────────────────

const ECC_IDX: Record<QrEcc, number> = { L: 0, M: 1, Q: 2, H: 3 };

/** Data capacity in bytes [version-1][eccLevel] */
const DATA_CAP = [
  [19, 16, 13, 9],
  [34, 28, 22, 16],
  [55, 44, 34, 26],
  [80, 64, 48, 36],
  [108, 86, 62, 46],
  [136, 108, 76, 60],
  [156, 124, 88, 66],
  [194, 154, 110, 86],
  [232, 182, 132, 100],
  [274, 216, 154, 122],
] as const;

/**
 * Block structure: [ecPerBlock, [g1Blocks, g1Data], [g2Blocks, g2Data]]
 * [version-1][eccLevel]
 */
type BS = [number, [number, number], [number, number]];
const BLOCK_SPEC: BS[][] = [
  [[7,[1,19],[0,0]],[10,[1,16],[0,0]],[13,[1,13],[0,0]],[17,[1,9],[0,0]]],
  [[10,[1,34],[0,0]],[16,[1,28],[0,0]],[22,[1,22],[0,0]],[28,[1,16],[0,0]]],
  [[15,[1,55],[0,0]],[26,[1,44],[0,0]],[18,[2,17],[0,0]],[22,[2,13],[0,0]]],
  [[20,[1,80],[0,0]],[18,[2,32],[0,0]],[26,[2,24],[0,0]],[16,[4,9],[0,0]]],
  [[26,[1,108],[0,0]],[24,[2,43],[0,0]],[18,[2,15],[2,16]],[22,[2,11],[2,12]]],
  [[18,[2,68],[0,0]],[16,[4,27],[0,0]],[24,[4,19],[0,0]],[28,[4,15],[0,0]]],
  [[20,[2,78],[0,0]],[18,[4,31],[0,0]],[18,[2,14],[4,15]],[26,[4,13],[1,14]]],
  [[24,[2,97],[0,0]],[22,[2,38],[2,39]],[22,[4,18],[2,19]],[26,[4,14],[2,15]]],
  [[30,[2,116],[0,0]],[22,[3,36],[2,37]],[20,[4,16],[4,17]],[24,[4,12],[4,13]]],
  [[18,[2,68],[2,69]],[26,[4,43],[1,44]],[24,[6,19],[2,20]],[28,[6,15],[2,16]]],
];

/** Alignment pattern center coordinates per version (index = version-1) */
const ALIGN_CENTERS: readonly (readonly number[])[] = [
  [], [6,18], [6,22], [6,26], [6,30], [6,34],
  [6,22,38], [6,24,42], [6,26,46], [6,28,50],
];

// ─── Format information ───────────────────────────────────────────────────────

/** Pre-computed format info words [eccLevel][maskPattern] (15 bits, XOR 0x5412) */
function formatInfo(eccLevel: QrEcc, mask: number): number {
  const data = (ECC_IDX[eccLevel] ^ (ECC_IDX[eccLevel] === 1 ? 0 : 0)) << 3 | mask;
  // ECC indicator bits: M=00, L=01, H=10, Q=11
  const eccBits: Record<QrEcc, number> = { M: 0b00, L: 0b01, H: 0b10, Q: 0b11 };
  const raw = (eccBits[eccLevel] << 3) | mask;

  // BCH encode (15,5) with generator 10100110111
  let rem = raw;
  for (let i = 4; i >= 0; i--) {
    if ((rem >> (i + 10)) & 1) rem ^= 0x537 << i;
  }
  return ((raw << 10) | rem) ^ 0x5412;
}

// ─── QR matrix builder ────────────────────────────────────────────────────────

interface QrMatrix {
  size: number;
  modules: Uint8Array; // 0=light, 1=dark
  isFunc: Uint8Array;  // non-zero = function pattern (not masked)
}

function makeMatrix(version: number): QrMatrix {
  const size = version * 4 + 17;
  return {
    size,
    modules: new Uint8Array(size * size),
    isFunc: new Uint8Array(size * size),
  };
}

function setModule(m: QrMatrix, r: number, c: number, dark: boolean, func = false) {
  const idx = r * m.size + c;
  m.modules[idx] = dark ? 1 : 0;
  if (func) m.isFunc[idx] = 1;
}

function getModule(m: QrMatrix, r: number, c: number): boolean {
  return m.modules[r * m.size + c] === 1;
}

function drawFinderPattern(m: QrMatrix, r: number, c: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const row = r + dy, col = c + dx;
      if (row < 0 || row >= m.size || col < 0 || col >= m.size) continue;
      const dark =
        (0 <= dy && dy <= 6 && (dx === 0 || dx === 6)) ||
        (0 <= dx && dx <= 6 && (dy === 0 || dy === 6)) ||
        (2 <= dy && dy <= 4 && 2 <= dx && dx <= 4);
      setModule(m, row, col, dark, true);
    }
  }
}

function drawAlignmentPattern(m: QrMatrix, r: number, c: number) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const dark =
        dy === -2 || dy === 2 || dx === -2 || dx === 2 ||
        (dy === 0 && dx === 0);
      setModule(m, r + dy, c + dx, dark, true);
    }
  }
}

function drawFunctionPatterns(m: QrMatrix, version: number) {
  const sz = m.size;

  // Finder patterns + separators
  drawFinderPattern(m, 0, 0);
  drawFinderPattern(m, 0, sz - 7);
  drawFinderPattern(m, sz - 7, 0);

  // Timing patterns
  for (let i = 8; i < sz - 8; i++) {
    setModule(m, 6, i, i % 2 === 0, true);
    setModule(m, i, 6, i % 2 === 0, true);
  }

  // Dark module
  setModule(m, sz - 8, 8, true, true);

  // Alignment patterns
  const centers = ALIGN_CENTERS[version - 1];
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      const r = centers[i], c = centers[j];
      // Skip if overlaps finder
      if ((r === 6 && c === 6) || (r === 6 && j === centers.length - 1) || (i === centers.length - 1 && c === 6)) continue;
      drawAlignmentPattern(m, r, c);
    }
  }
}

function reserveFormatInfo(m: QrMatrix) {
  const sz = m.size;
  // Top-left format info
  for (let i = 0; i < 6; i++) setModule(m, i, 8, false, true);
  setModule(m, 7, 8, false, true);
  setModule(m, 8, 8, false, true);
  setModule(m, 8, 7, false, true);
  for (let i = 0; i < 6; i++) setModule(m, 8, i, false, true);
  // Top-right + bottom-left
  for (let i = 0; i < 8; i++) setModule(m, 8, sz - 1 - i, false, true);
  for (let i = 0; i < 7; i++) setModule(m, sz - 7 + i, 8, false, true);
}

function writeFormatInfo(m: QrMatrix, eccLevel: QrEcc, mask: number) {
  const sz = m.size;
  const bits = formatInfo(eccLevel, mask);

  for (let i = 0; i < 15; i++) {
    const bit = (bits >> i) & 1;
    if (i < 6) {
      setModule(m, i, 8, bit === 1, true);
      setModule(m, 8, sz - 1 - i, bit === 1, true);
    } else if (i < 8) {
      setModule(m, i + 1, 8, bit === 1, true);
      setModule(m, 8, sz - 1 - i, bit === 1, true);
    } else {
      setModule(m, 8, 15 - i - (i >= 9 ? 1 : 0), bit === 1, true);
      setModule(m, sz - 7 + (i - 8), 8, bit === 1, true);
    }
  }
}

// ─── Data encoding ────────────────────────────────────────────────────────────

function encodeData(text: string, version: number, eccLevel: QrEcc): number[] {
  const ei = ECC_IDX[eccLevel];
  const [ecPerBlock, [g1n, g1d], [g2n, g2d]] = BLOCK_SPEC[version - 1][ei];
  const totalData = g1n * g1d + g2n * g2d;
  const totalBlocks = g1n + g2n;

  const bytes = new TextEncoder().encode(text);

  // Bit stream
  const bits: number[] = [];
  function appendBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  }

  // Mode indicator (byte = 0100)
  appendBits(4, 4);
  // Character count
  const ccBits = version <= 9 ? 8 : version <= 26 ? 16 : 16;
  appendBits(bytes.length, ccBits);
  // Data
  for (const b of bytes) appendBits(b, 8);
  // Terminator
  const maxBits = totalData * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  // Byte-align
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (bits.length < maxBits) {
    appendBits(padBytes[pi++ % 2], 8);
  }

  // Convert bits to bytes
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] ?? 0);
    data.push(b);
  }

  // Split into blocks and add ECC
  const blocks: number[][] = [];
  const eccBlocks: number[][] = [];
  let offset = 0;

  for (let b = 0; b < totalBlocks; b++) {
    const size = b < g1n ? g1d : g2d;
    const block = data.slice(offset, offset + size);
    blocks.push(block);
    eccBlocks.push(rsEncode(block, ecPerBlock));
    offset += size;
  }

  // Interleave data
  const result: number[] = [];
  const maxLen = Math.max(g1d, g2d);
  for (let i = 0; i < maxLen; i++) {
    for (const b of blocks) {
      if (i < b.length) result.push(b[i]);
    }
  }
  // Interleave ECC
  for (let i = 0; i < ecPerBlock; i++) {
    for (const e of eccBlocks) result.push(e[i]);
  }

  return result;
}

// ─── Place data in matrix ─────────────────────────────────────────────────────

function placeData(m: QrMatrix, codewords: number[]) {
  const sz = m.size;
  let bitIdx = 0;
  let up = true;

  for (let right = sz - 1; right >= 1; right -= 2) {
    if (right === 6) right--; // skip vertical timing
    for (let vert = 0; vert < sz; vert++) {
      const r = up ? sz - 1 - vert : vert;
      for (let lr = 0; lr < 2; lr++) {
        const c = right - lr;
        if (m.isFunc[r * sz + c]) continue;
        const bit = bitIdx < codewords.length * 8
          ? (codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1
          : 0;
        m.modules[r * sz + c] = bit;
        bitIdx++;
      }
    }
    up = !up;
  }
}

// ─── Masking ──────────────────────────────────────────────────────────────────

function maskFn(pattern: number, r: number, c: number): boolean {
  switch (pattern) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return (r * c) % 2 + (r * c) % 3 === 0;
    case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
    case 7: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
    default: return false;
  }
}

function applyMask(m: QrMatrix, pattern: number) {
  const sz = m.size;
  for (let r = 0; r < sz; r++) {
    for (let c = 0; c < sz; c++) {
      const idx = r * sz + c;
      if (!m.isFunc[idx] && maskFn(pattern, r, c)) {
        m.modules[idx] ^= 1;
      }
    }
  }
}

function penaltyScore(m: QrMatrix): number {
  const sz = m.size;
  let score = 0;

  // Rule 1: 5+ same-color in a row/column
  for (let r = 0; r < sz; r++) {
    for (let isRow of [true, false]) {
      let run = 1, prev = -1;
      for (let i = 0; i < sz; i++) {
        const v = isRow ? m.modules[r * sz + i] : m.modules[i * sz + r];
        if (v === prev) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score++;
        } else {
          run = 1;
          prev = v;
        }
      }
    }
  }

  // Rule 2: 2×2 blocks
  for (let r = 0; r < sz - 1; r++) {
    for (let c = 0; c < sz - 1; c++) {
      const v = m.modules[r * sz + c];
      if (v === m.modules[r * sz + c + 1] &&
          v === m.modules[(r+1) * sz + c] &&
          v === m.modules[(r+1) * sz + c + 1]) {
        score += 3;
      }
    }
  }

  // Rule 3: Finder-like pattern in rows/columns
  const pat1 = [1,0,1,1,1,0,1,0,0,0,0];
  const pat2 = [0,0,0,0,1,0,1,1,1,0,1];
  for (let r = 0; r < sz; r++) {
    for (let c = 0; c <= sz - 11; c++) {
      let m1 = true, m2 = true, m3 = true, m4 = true;
      for (let k = 0; k < 11; k++) {
        const row = m.modules[r * sz + c + k];
        const col = m.modules[(c + k) * sz + r];
        if (row !== pat1[k]) m1 = false;
        if (row !== pat2[k]) m2 = false;
        if (col !== pat1[k]) m3 = false;
        if (col !== pat2[k]) m4 = false;
      }
      if (m1) score += 40;
      if (m2) score += 40;
      if (m3) score += 40;
      if (m4) score += 40;
    }
  }

  // Rule 4: Proportion of dark modules
  let dark = 0;
  for (let i = 0; i < sz * sz; i++) dark += m.modules[i];
  const pct = (dark / (sz * sz)) * 100;
  const lower = Math.abs(Math.floor(pct / 5) * 5 - 50) / 5;
  const upper = Math.abs(Math.ceil(pct / 5) * 5 - 50) / 5;
  score += Math.min(lower, upper) * 10;

  return score;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Generate a QR code and return the module matrix (true = dark).
 */
export function generateQr(
  text: string,
  eccLevel: QrEcc = "M",
): boolean[][] {
  const ei = ECC_IDX[eccLevel];
  const byteLen = new TextEncoder().encode(text).length;

  // Find minimum version
  let version = 1;
  while (version <= 10 && DATA_CAP[version - 1][ei] < byteLen) version++;
  if (version > 10) throw new Error(`Text too long for QR version 1–10 (${byteLen} bytes)`);

  const m = makeMatrix(version);
  drawFunctionPatterns(m, version);
  reserveFormatInfo(m);

  const codewords = encodeData(text, version, eccLevel);
  placeData(m, codewords);

  // Try all 8 masks, pick lowest penalty
  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(m, mask);
    writeFormatInfo(m, eccLevel, mask);
    const s = penaltyScore(m);
    if (s < bestScore) { bestScore = s; bestMask = mask; }
    applyMask(m, mask); // undo
  }

  // Apply best mask + format info
  applyMask(m, bestMask);
  writeFormatInfo(m, eccLevel, bestMask);

  // Convert to 2D boolean array
  const sz = m.size;
  const result: boolean[][] = [];
  for (let r = 0; r < sz; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < sz; c++) {
      row.push(m.modules[r * sz + c] === 1);
    }
    result.push(row);
  }
  return result;
}

// ─── SVG output ───────────────────────────────────────────────────────────────

export interface QrSvgOptions {
  /** Pixel size of each module */
  moduleSize?: number;
  /** Quiet zone (in modules) */
  margin?: number;
  /** Foreground color */
  dark?: string;
  /** Background color */
  light?: string;
}

/**
 * Render a QR matrix as an inline SVG string.
 */
export function qrToSvg(
  matrix: boolean[][],
  { moduleSize = 10, margin = 4, dark = "#000000", light = "#ffffff" }: QrSvgOptions = {},
): string {
  const n = matrix.length;
  const total = (n + margin * 2) * moduleSize;

  const rects: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = (c + margin) * moduleSize;
        const y = (r + margin) * moduleSize;
        rects.push(`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${dark}"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}">
  <rect width="${total}" height="${total}" fill="${light}"/>
  ${rects.join("\n  ")}
</svg>`;
}

// ─── Canvas PNG download ───────────────────────────────────────────────────────

/**
 * Render a QR matrix onto a canvas and return a PNG data URL.
 * Browser-only (requires HTMLCanvasElement).
 */
export function qrToCanvas(
  matrix: boolean[][],
  opts: QrSvgOptions & { scale?: number } = {},
): HTMLCanvasElement {
  const { moduleSize = 10, margin = 4, dark = "#000000", light = "#ffffff", scale = 1 } = opts;
  const n = matrix.length;
  const total = (n + margin * 2) * moduleSize;
  const px = total * scale;

  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  ctx.fillStyle = light;
  ctx.fillRect(0, 0, total, total);
  ctx.fillStyle = dark;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          (c + margin) * moduleSize,
          (r + margin) * moduleSize,
          moduleSize,
          moduleSize,
        );
      }
    }
  }

  return canvas;
}

/**
 * Download a QR code as PNG file.
 */
export function downloadQrPng(
  matrix: boolean[][],
  filename = "qr-code.png",
  opts: QrSvgOptions & { scale?: number } = {},
) {
  const canvas = qrToCanvas(matrix, { scale: 4, ...opts });
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
