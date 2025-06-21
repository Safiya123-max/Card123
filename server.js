const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN || '8176164331:AAHo6t3dka7-joe0DPi_hBMiDHJ35i6obfA';
const bot = new TelegramBot(token, { polling: true });

bot.on('callback_query', async (query) => {
  const callbackId = query.id;

  try {
    await bot.answerCallbackQuery(callbackId);
    await bot.sendMessage(query.from.id, `Ты нажал кнопку: ${query.data}`);
  } catch (err) {
    console.error('Ошибка ответа на callback_query:', err.message);
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Папка для хранения готовых сайтов
const GENERATED_DIR = path.join(__dirname, 'generated_sites');
const SITE_TEMPLATE_DIR = path.join(__dirname, 'site');

if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR);

// 👇 ВСТАВЬ ЭТУ СТРОКУ — разрешает доступ к файлам в /site
app.use('/site', express.static(SITE_TEMPLATE_DIR));

// Настройки загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = path.join(GENERATED_DIR, req.body.siteId);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

const axios = require('axios');

app.post('/upload', upload.array('photos', 30), async (req, res) => {

  const imgBB_API_KEY = process.env.IMGBB_API_KEY; // ключ из .env
  console.log('IMGBB_API_KEY:', imgBB_API_KEY);
  console.log('Получено файлов:', req.files.length);

  try {
    const uploadedUrls = [];

    // Загружаем каждое фото на imgBB
    for (const file of req.files) {
      const imageBase64 = fs.readFileSync(file.path, { encoding: 'base64' });

   const FormData = require('form-data');

const formData = new FormData();
formData.append('key', imgBB_API_KEY);
formData.append('image', imageBase64);
formData.append('name', file.filename);

const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
  headers: formData.getHeaders()
});


      uploadedUrls.push(response.data.data.url);

      // Удаляем локальный временный файл после загрузки
      fs.unlinkSync(file.path);
    }

    // Формируем HTML карточек с внешними ссылками
    const cardsHTML = uploadedUrls.map(url => `<li><img src="${url}" class="card" alt="card"></li>`).join('\n');

    // Читаем шаблон, CSS и JS из папки site
    const template = fs.readFileSync(path.join(SITE_TEMPLATE_DIR, 'template.html'), 'utf8');
    const css = fs.readFileSync(path.join(SITE_TEMPLATE_DIR, 'style.css'), 'utf8');
    const js = fs.readFileSync(path.join(SITE_TEMPLATE_DIR, 'main.js'), 'utf8');

    // Подставляем карточки, CSS и JS в шаблон
    let finalHTML = template.replace('<!--CARDS_HERE-->', cardsHTML);
    finalHTML = finalHTML.replace('<!--INLINE_CSS-->', `<style>${css}</style>`);
    finalHTML = finalHTML.replace('<!--INLINE_JS-->', `<script>${js}</script>`);

    // Генерируем уникальный siteId если его нет
    const siteId = req.body.siteId || uuidv4();
    const siteFolder = path.join(GENERATED_DIR, siteId);

    if (!fs.existsSync(siteFolder)) fs.mkdirSync(siteFolder, { recursive: true });

    // Сохраняем index.html и копируем style.css и main.js для удобства (если нужно)
    fs.writeFileSync(path.join(siteFolder, 'index.html'), finalHTML);
    fs.writeFileSync(path.join(siteFolder, 'style.css'), css);
    fs.writeFileSync(path.join(siteFolder, 'main.js'), js);

    const bgSourcePath = path.join(SITE_TEMPLATE_DIR, 'foto.jpeg');
const bgDestPath = path.join(siteFolder, 'foto.jpeg');
if (fs.existsSync(bgSourcePath)) {
  fs.copyFileSync(bgSourcePath, bgDestPath);
}


    // Отправляем ссылку клиенту
    const url = `${req.protocol}://${req.get('host')}/generated_sites/${siteId}/index.html`;
    res.json({ url });

  } catch (err) {
    console.error('Ошибка загрузки на imgBB:', err);
    res.status(500).json({ error: 'Ошибка загрузки изображений' });
  }
});



app.listen(PORT, () => {
  console.log(`🌐 Сервер запущен: http://localhost:${PORT}`);
});