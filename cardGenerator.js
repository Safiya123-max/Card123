function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

const PImage = require('pureimage');
const path = require('path');
const fs = require('fs');
const { WritableStreamBuffer } = require('stream-buffers');

const WIDTH = 1080;
const HEIGHT = 1350;

const FONT_PATH = path.join(__dirname, 'fonts', 'BebasNeueCyrillic.ttf');
PImage.registerFont(FONT_PATH, 'BebasNeueCyrillic').loadSync();

const PLAYER_IMAGE = path.join(__dirname, 'assets', 'player.png');
const SPOTIFY_LOGO = path.join(__dirname, 'assets', 'spotify_logo.png');

const quoteColors = [
  '#43aa4e',
  '#dfbb00',
  '#b16ac7',
  '#3d8fc9',
  '#d566a2',
  '#c63838',
  '#949494',
];

let colorIndex = 0;
function getNextColor() {
  const color = quoteColors[colorIndex];
  colorIndex = (colorIndex + 1) % quoteColors.length;
  return color;
}

function drawText(ctx, text, x, y, fontSize, color, align = 'left') {
  ctx.font = `${fontSize}pt 'BebasNeueCyrillic'`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

async function generateCard(photoBuffer, song, artist, excerpt) {
  const img = PImage.make(WIDTH, HEIGHT);
  const ctx = img.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 1. Фото
  const photoW = 851;
const photoH = 646;
const photoX = (WIDTH - photoW) / 2;
const photoY = 40;

const photoStream = require('stream').Readable.from(photoBuffer);
const userPhoto = await PImage.decodeJPEGFromStream(photoStream);

ctx.save();
drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 50);
ctx.clip();

// CROP (обрезка по центру)
const scale = Math.max(photoW / userPhoto.width, photoH / userPhoto.height);
const sx = (userPhoto.width * scale - photoW) / 2 / scale;
const sy = (userPhoto.height * scale - photoH) / 2 / scale;

ctx.drawImage(
  userPhoto,
  sx, sy,
  photoW / scale, photoH / scale,
  photoX, photoY,
  photoW, photoH
);
ctx.restore();

  // 2. Название песни
  const titleY = photoY + photoH + 60;
drawText(ctx, song, photoX, titleY, 50, '#000000');

  // 3. Артист
  const artistY = titleY + 50;
drawText(ctx, artist, photoX, artistY, 40, '#000000');

  // 4. Плеер
const playerImage = await PImage.decodePNGFromStream(fs.createReadStream(PLAYER_IMAGE));
const playerH = playerImage.height;
const playerW = photoW;
const playerY = artistY + 20;

ctx.drawImage(playerImage, photoX, playerY, playerW, playerH);

  // 5. Цветной блок с текстом
const blockY = playerY + playerH + 30;
  const blockW = photoW;
  const blockH = 340;
  const blockColor = getNextColor();

  ctx.save();
  drawRoundedRect(ctx, photoX, blockY, blockW, blockH, 50);
  ctx.fillStyle = blockColor;
  ctx.fill();
  ctx.restore();



  // 6. Отрывок текста
  drawMultilineText(ctx, excerpt, photoX + 40, blockY + 90, blockW - 140, 45, '#ffffff', 70, 180);
  function drawMultilineText(ctx, text, x, y, maxWidth, fontSize, color, lineHeight = 50) {
  ctx.font = `${fontSize}pt 'BebasNeueCyrillic'`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';

  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY); // последняя строка
}



  // 7. Логотип Spotify
  const spotifyImage = await PImage.decodePNGFromStream(fs.createReadStream(SPOTIFY_LOGO));
  const logoW = 150;
const logoH = 52;
ctx.drawImage(
  spotifyImage,
  photoX + 45,
  blockY + blockH - logoH - 30,
  logoW,
  logoH
);

  // Возврат
  const streamBuffer = new WritableStreamBuffer();
  await PImage.encodePNGToStream(img, streamBuffer);
  return streamBuffer.getContents();
}

module.exports = generateCard;