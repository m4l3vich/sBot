# sBot
![sBot 3.0 Terbium](https://i.imgur.com/VHl5aZR.jpg)

## Установка
Установите sBot с помощью NPM:
`npm i sbot-vk --save`

## Примеры использования

### Инициализация бота
```JavaScript
var Bot = require('sbot-vk')

var b = new Bot('access_token')
// или
var b = new Bot({
  botname: 'Бот', // На что будет "отзываться" бот, необязательно
  token: 'access_token' // Токен ВКонтакте, можно получить, например, на https://vkhost.github.io/
})
b.start() // Запуск бота
```

### Использование словаря
```JavaScript
b.setDict({ // Установить "словарь" для автоответчика и процент совпадения строки
  'привет': 'Здравствуй!'
}, 0.65)
```
Если процент <1, то срабатывать автоответчик будет при неполном совпадении строки    
Например, бот будет отвечать на "пирвет" ровно также, как и на "привет", если установлен процент совпадения 0.65

### Использование middleware
```JavaScript
b.use((message) => {
  // Эта функция будет выполняться для каждого входящего сообщения
  console.log(`[${message.from.first_name} ${message.from.last_name} (${message.from.id})] ${message.isOut ? '<=' : '=>'} ${message.text}`)
  // [Евгений Малевич (193158046)] => привет
  // [Малевий Евгенич (408783076)] <= Здравствуй!
})
```
В этом примере middleware - простой логгер, который выводит информацию о входящих сообщениях в консоль.

### Отправка медиа (прикрепления)
```JavaScript
b.on('отправь фото', (message) => {
  var photo = await b.upload.photo(Buffer)
  // Buffer - файл фотографии
  // Получить из файла можно через fs.readFileSync()
  message.answer('Пожалуйста:', photo)
})
```
В данном примере бот отправляет в ответ фотографию.

#### Отправка фото:
```JavaScript
bot.upload.photo(buffer)
```
- **buffer** - [Буфер](https://nodejs.org/api/buffer.html), содержащий фотографию

#### Отправка голосовых сообщений:
```JavaScript
bot.upload.audio_message(buffer, [peer_id])
```
- **buffer** - [Буфер](https://nodejs.org/api/buffer.html), содержащий голосовое сообщение   
- **peer_id** - ID, на который затем будет отправлено голосовое сообщение **ТОЛЬКО ДЛЯ ГРУПП**

#### Отправка голосовых сообщений:
```JavaScript
bot.upload.graffiti(buffer, [peer_id])
```
- **buffer** - [Буфер](https://nodejs.org/api/buffer.html), содержащий граффити   
**НЕ РАБОТАЕТ В ГРУППАХ**

### Использование бота в группе
sBot может работать в группе без дополнительных настроек:
```JavaScript
var Bot = require('sbot-vk')
var b = new Bot('group_token') // Указываем токен группы

b.start().then(() => {
  console.log(b.getMe())
  // {id: 140670418, mode: 'group'}
})
```
*При работе от пользователя, значение bot.getMe().mode будет 'user'*

### Использование событий
##### Простой пример с использованием bot.getMe()
```JavaScript
b.on('как тебя зовут', message => {
  message.answer(`Меня зовут ${b.getMe().first_name} ${b.getMe().last_name}`)
})
```

##### Использование регулярных выражений в событиях (здесь - для получения аргументов команды)
```JavaScript
b.on(/^sqrt (.+)$/, (message) => {
  var number = message.text.match(/^sqrt (.+)$/)
  // number = ['sqrt 144', '144']
  if (isNaN(number)) {
    message.answer(`Вы должны передать число в аргументе.`)
  } else {
    message.answer(`Квадратный корень из числа ${number[1]}: ${Math.sqrt(parseInt(number[1]))}`)
  }
})
```


##### Использование метода bot.sendMessage() для отправки сообщения другому пользователю
```JavaScript
b.on(/^передай \[id(.+)\|(.+)] (.+)$/, message => {
  var str = message.text.match(/^передай \[id(.+)\|(.+)] (.+)$/)
  // str = ['передай [id1|Павел Дуров] что он дурак', '1', 'Павел Дуров', 'что он дурак']
  b.sendMessage(str[1], `Кто-то передал вам: ${str[3]}`)
  message.answer('Готово!')
})
```

*По всем вопросам обращайтесь в [VK](https://vk.com/m4l3vich) и [Telegram](https://t.me/m4l3vich)*
