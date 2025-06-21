const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');



require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const generateCard = require('./cardGenerator');

const token = process.env.TG_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const userStates = {};
const userData = {};

// Стартовое сообщение с кнопкой
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const welcomeText = `Привет! 💖
Я помогу тебе создавать индивидуальные музыкальные открытки в подарок близким или для себя 😊`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Начать создание 💌', callback_data: 'start_creation' }]
      ]
    }
  };

  bot.sendMessage(chatId, welcomeText, options);
});

// Обработка нажатий кнопок
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;
  
  await bot.answerCallbackQuery(callbackQuery.id);
  
if (data === 'start_creation') {
  await bot.sendMessage(chatId, 'Приступаем к оформлении первой страницы, пришлите желаемое фото 📸');
  userStates[chatId] = 'awaiting_first_photo';
  userData[chatId] = { photos: [] };
} else if (data === 'create_new') {
    await bot.sendMessage(chatId, 'Отправьте новое фото для открытки 📸');
    userStates[chatId] = 'awaiting_first_photo';
    userData[chatId] = { photos: [] };
     } else if (data === 'nev_cards') {
    await bot.sendMessage(chatId, 'Отправьте новое фото для открытки 📸');
    userStates[chatId] = 'awaiting_first_photo';
    userData[chatId] = { photos: [] };
  } else if (data === 'menu') {
  const menuText = 'Ваше меню 🗂';
  const menuOptions = {
    reply_markup: {
      inline_keyboard: [
         [{ text: 'Создать открытки ➕️', callback_data: 'nev_cards' }],
        [{ text: 'Создать сайт 🌐', callback_data: 'get_website' }],
       [{ text: 'Оставить отзыв 💬', url: 'https://t.me/o_t_z_i_v_25' }]
         ]}};
         

  await bot.sendMessage(chatId, menuText, menuOptions);

  delete userStates[chatId];
  delete userData[chatId];
} else if (data === 'get_website') {
  const siteId = uuidv4();
  userStates[chatId] = 'awaiting_website_photos';
  userData[chatId] = { photos: [], siteId };

  await bot.sendMessage(chatId, `Загрузите только те созданные открытки, которые хотите видеть на сайте (Обязательно от 8 до 30 штук, иначе сайт будет выглядеть некорректно)📤\n\nP.S. После напишите "Готово"`);
}

  

});

// Функция скачивания фото как буфера
async function downloadPhotoBuffer(fileId) {
  const fileLink = await bot.getFileLink(fileId);
  const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

// Основная логика обработки шагов пользователя
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Игнорировать команды вне процесса
    
    if (msg.text && msg.text.startsWith('/') && !userStates[chatId]) return;

    const state = userStates[chatId];

    if (userStates[chatId] === 'awaiting_website_photos') {
  if (msg.photo && msg.photo.length > 0) {
    const photo = msg.photo[msg.photo.length - 1];
    userData[chatId].photos.push(photo.file_id);
    await bot.sendMessage(chatId, `Фото ${userData[chatId].photos.length} принято ✅`);
    return;
  }

  if (msg.text && msg.text.toLowerCase().includes('готово')) {
    const fileIds = userData[chatId].photos;

    if (fileIds.length === 0) {
      await bot.sendMessage(chatId, 'Вы не загрузили ни одного изображения 😢');
      return;
    }

    await bot.sendMessage(chatId, 'Загрузка.... ⏳');

    // Скачиваем все изображения
    const form = new FormData();
    form.append('siteId', userData[chatId].siteId);

    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      const link = await bot.getFileLink(fileId);
      const response = await axios.get(link, { responseType: 'stream' });
      form.append('photos', response.data, { filename: `${Date.now()}-${i}.jpg` });
    }

    try {
      const uploadResponse = await axios.post(
        'http://localhost:3000/upload',
        form,
        { headers: form.getHeaders() }
      );

     const siteId = userData[chatId].siteId;
const filePath = path.join(__dirname, 'generated_sites', siteId, 'index.html');

if (fs.existsSync(filePath)) {
  await bot.sendDocument(chatId, filePath, {
    caption: `📄 Вот ваш сгенерированный HTML-файл сайта!`,
    reply_markup: {
      inline_keyboard: [
        [{ text: 'В меню 🗂', callback_data: 'menu' }]
      ]
    }
  });
} else {
  await bot.sendMessage(chatId, '⚠️ Не удалось найти HTML-файл. Попробуйте позже.');
}


    } catch (err) {
      console.error('Ошибка загрузки на сервер:', err);
      await bot.sendMessage(chatId, 'Произошла ошибка ⛔\n\nПопробуйте позже или сообщите об ошибки: @taka3003');
    }

    delete userStates[chatId];
    delete userData[chatId];
    return;
  }

  await bot.sendMessage(chatId, 'Отправьте фото или напишите «Готово» когда загрузите все 📸');
  return;
}


    if (state === 'awaiting_first_photo') {
      if (msg.photo && msg.photo.length > 0) {
        const photo = msg.photo[msg.photo.length - 1];
        userData[chatId].photos.push(photo.file_id);
        await bot.sendMessage(chatId, 'Фото принято! ✅\nТеперь введите название песни 🎧');
        userStates[chatId] = 'awaiting_song_title';
      } else {
        await bot.sendMessage(chatId, 'Пожалуйста, пришлите фото 📸');
      }
      return;
    }

    if (state === 'awaiting_song_title') {
      userData[chatId].songTitle = msg.text;
      await bot.sendMessage(chatId, 'Кто исполняет песню? 🎙');
      userStates[chatId] = 'awaiting_song_artist';
      return;
    }

    if (state === 'awaiting_song_artist') {
      userData[chatId].songArtist = msg.text;
      await bot.sendMessage(chatId, 'Последний шаг!\nПришлите понравившийся отрывок 🎶');
      userStates[chatId] = 'awaiting_song_excerpt';
      return;
    }

    if (state === 'awaiting_song_excerpt') {
      userData[chatId].songExcerpt = msg.text;

      // Скачиваем фото
      const photoFileId = userData[chatId].photos[0];
      const photoBuffer = await downloadPhotoBuffer(photoFileId);

      // Генерируем открытку в буфере
      const cardBuffer = await generateCard(
        photoBuffer,
        userData[chatId].songTitle,
        userData[chatId].songArtist,
        userData[chatId].songExcerpt
      );

      // Отправляем пользователю
      await bot.sendPhoto(chatId, cardBuffer, {
        caption: `Готово!
Так выглядит результат 🎉
Можете выбрать следующие действие ⬇️`,
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Оформить ещё открытку 🎨', callback_data: 'create_new' }],
            [{ text: 'Меню 🗂', callback_data: 'menu' }]
          ]
        }
      });

      // Очистка данных
      delete userStates[chatId];
      delete userData[chatId];

      return;
    }

  } catch (error) {
    console.error(error);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка ⛔\n\nПопробуйте позже или сообщите об ошибки: @taka3003');
  }
});