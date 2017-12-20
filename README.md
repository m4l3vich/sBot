# sBot
![sBot 3.0 Terbium](https://i.imgur.com/VHl5aZR.jpg)

## Установка
Установите sBot с помощью NPM:
`npm i sbot-vk --save`
_Работает на Node.js 8.x и выше_

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
b.use((message, next) => {
  // Эта функция будет выполняться для каждого входящего сообщения
  console.log(`[${message.from.first_name} ${message.from.last_name} (${message.from.id})] ${message.isOut ? '<=' : '=>'} ${message.text}`)
  // [Евгений Малевич (193158046)] => привет
  // [Малевий Евгенич (408783076)] <= Здравствуй!
  next()
})
```
В этом примере middleware - простой логгер, который выводит информацию о входящих сообщениях в консоль.

```JavaScript
b.use((message, next) => {
  if(!message.isOut && /дурак/gi.test(message.text)) {
    console.log(`${message.from.first_name} ${message.from.last_name} ругается!`)
    // Евгений Малевич ругается!
    message.answer('Сам дурак!')
  } else {
    next()
  }
})
```
Здесь middleware используется как фильтр слова "дурак" во входящих сообщениях

- **message** - Объект с обрабатываемым сообщением
- **next** - Функция, при выполнении которой обработка сообщения пойдет далее _(будет вызвано событие с этим сообщением и сообщение будет протестировано словарем)_

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

#### Отправка граффити:
```JavaScript
bot.upload.graffiti(buffer)
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

### Дополнительно
##### Строение объекта message:
```JavaScript
{
   messageId: 171,
   peerId: 193158046,
   longpollObject: {},
   text: 'hello sBot',
   from: { id: 193158046, first_name: 'Евгений', last_name: 'Малевич' },
   isOut: false,
   attaches: [ { type: 'photo', attach: '193158046_456281537' } ],
   answer: [Function: answer],
   sticker: [Function: sticker]
 }
```
- **messageId** - ID сообщения
- **peerId** - ID отправителя (может быть ID пользователя, группы или беседы)
- **longpollObject** - [Дополнительный объект, отправляемый LongPoll](https://vk.com/dev/using_longpoll_2?f=6.%20%D0%92%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F)
- **text** - Текст сообщения
- **from** - Объект пользователя-отправителя
- **isOut** - Исходящее ли сообщение?
- **attaches** - Массив с прикреплениями
- **answer** - Функция для ответа текстом и прикреплениями
- **sticker** - Функция для ответа стикером

##### Функция message.answer()
```JavaScript
message.answer(text, <attach>, <forward>)
```
- **text** - Текст отправляемого сообщения
- **attach** - Массив или строка с прикреплениями (напр. `['photo1234_5678', 'photo8765_4321']`)
- **forward** - Если true, то обрабатываемое сообщение будет переслано

##### Функция message.sticker()
```JavaScript
message.sticker(stickerId)
```
- **stickerId** - ID отправялемого стикера

*По всем вопросам обращайтесь в [VK](https://vk.com/m4l3vich) и [Telegram](https://t.me/m4l3vich)*
