/**
 * Иконки PWA.
 *
 * Знак временный: дизайна нет, а манифест без иконок не устанавливается на
 * домашний экран. Рисуется кодом и без зависимостей — тянуть генератор
 * изображений ради трёх заглушек незачем, а класть в репозиторий картинки
 * неизвестного происхождения тем более.
 *
 * Геометрия совпадает с public/favicon.svg: та же сетка 64×64.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BACKGROUND = [15, 23, 42, 255]; // slate-900, он же theme_color манифеста
const FOREGROUND = [255, 255, 255, 255];

/** Знак «K» на сетке 64×64: стойка и два луча. Толщина в тех же единицах. */
const GRID = 64;
const STROKE = 7;
const SEGMENTS = [
  [22, 16, 22, 48],
  [22, 33, 43, 16],
  [22, 33, 43, 48],
];

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // бит на канал
  header[9] = 6; // RGBA
  // Фильтр строки — 0 на всех: картинка мелкая, экономия не стоит сложности.
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Расстояние от точки до отрезка — так рисуется линия любой толщины. */
function distanceToSegment(x, y, [ax, ay, bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

function render(size, scale) {
  const pixels = Buffer.alloc(size * size * 4);
  const unit = size / GRID;
  const center = GRID / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Координаты пикселя в сетке 64×64 с поправкой на масштаб знака.
      const gx = center + (x / unit + 0.5 - center) / scale;
      const gy = center + (y / unit + 0.5 - center) / scale;
      const inside = SEGMENTS.some((segment) => distanceToSegment(gx, gy, segment) <= STROKE / 2);
      const color = inside ? FOREGROUND : BACKGROUND;
      pixels.set(color, (y * size + x) * 4);
    }
  }

  return encodePng(size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const icons = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  // Маскируемая: система обрезает края под форму платформы, поэтому знак
  // уменьшен до безопасной зоны.
  ['icon-512-maskable.png', 512, 0.6],
];

for (const [name, size, scale] of icons) {
  writeFileSync(join(OUT_DIR, name), render(size, scale));
  console.log(`${name} ${String(size)}×${String(size)}`);
}
