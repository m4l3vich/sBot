# sBot
![sBot 3.4 Dysprosium](https://i.imgur.com/VJhzfZV.jpg)

## Установка
Установите sBot с помощью NPM:
`npm i sbot-vk --save`
_Работает на Node.js 8.x и выше_

## Примеры использования

### Инициализация бота
```js
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
```js
b.setDict({ // Установить "словарь" для автоответчика и процент совпадения строки
  'привет': 'Здравствуй!'
}, 0.65)
```
Если процент <1, то срабатывать автоответчик будет при неполном совпадении строки    
Например, бот будет отвечать на "пирвет" ровно также, как и на "привет", если установлен процент совпадения 0.65

### Использование middleware
```js
b.use((message, next) => {
  // Эта функция будет выполняться для каждого входящего сообщения
  console.log(`[${message.from.first_name} ${message.from.last_name} (${message.from.id})] ${message.isOut ? '<=' : '=>'} ${message.text}`)
  // [Евгений Малевич (193158046)] => привет
  // [Малевий Евгенич (408783076)] <= Здравствуй!
  next()
})
```
В этом примере middleware - простой логгер, который выводит информацию о входящих сообщениях в консоль.

```js
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

```js
b.use(callback)
```

- **callback** - Функция для обработки каждого сообщения, передает аргументы:

- **message** - Обрабатываемое сообщение, object
- **next** - Функция, при выполнении которой обработка сообщения пойдет далее _(будет вызвано событие с этим сообщением и сообщение будет протестировано словарем)_

### Вызов методов VKAPI
```js
b.api(method, [parameters])
```
- **method** - Название метода, string
- **parameters** - Параметры метода, object
Возвращает Promise с объектом, содержащим ответ от VKAPI

### Отправка медиа (прикрепления)
```js
b.on('отправь фото', (message) => {
  var photo = await b.upload.photo(Buffer)
  // Buffer - файл фотографии
  // Получить из файла можно через fs.readFileSync()
  message.answer('Пожалуйста:', photo)
})
```
В данном примере бот отправляет в ответ фотографию.

#### Отправка фото:
```js
bot.upload.photo(buffer)
```
- **buffer** - Фотография, [buffer](https://nodejs.org/api/buffer.html)
Возвращает Promise со строкой, содержащим готовое к отправке прикрепление (в формате `photo1234_5678`)

#### Отправка голосовых сообщений:
```js
bot.upload.audio_message(buffer, [peer_id])
```
- **buffer** - Голосовое сообщение, [buffer](https://nodejs.org/api/buffer.html)
- **peer_id** - ID, на который затем будет отправлено голосовое сообщение, number **ТОЛЬКО ДЛЯ ГРУПП**
Возвращает Promise со строкой, содержащим готовое к отправке прикрепление (в формате `doc1234_5678`)

#### Отправка граффити:
```js
bot.upload.graffiti(buffer)
```
- **buffer** - Граффити, [buffer](https://nodejs.org/api/buffer.html)
**НЕ РАБОТАЕТ В ГРУППАХ**
Возвращает Promise со строкой, содержащим готовое к отправке прикрепление (в формате `doc8765_4321`)

### Использование бота в группе
sBot может работать в группе без дополнительных настроек:
```js
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
```js
b.on('как тебя зовут', message => {
  message.answer(`Меня зовут ${b.getMe().first_name} ${b.getMe().last_name}`)
})
```

##### Использование регулярных выражений в событиях (здесь - для получения аргументов команды)
```js
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
```js
b.on(/^передай \[id(.+)\|(.+)] (.+)$/, message => {
  var str = message.text.match(/^передай \[id(.+)\|(.+)] (.+)$/)
  // str = ['передай [id1|Павел Дуров] что он дурак', '1', 'Павел Дуров', 'что он дурак']
  b.sendMessage(str[1], `Кто-то передал вам: ${str[3]}`)
  message.answer('Готово!')
})
```

```js
b.on(message, callback)
```
- **message** - Текст сообщения, которое необходимо обработать, string или regexp
- **callback** - Функция для обработки сообщения

### Дополнительно
##### Строение объекта message:
```js
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
- **messageId** - ID сообщения, number
- **peerId** - ID отправителя (может быть ID пользователя, группы или беседы), number
- **longpollObject** - [Дополнительный объект, отправляемый LongPoll](https://vk.com/dev/using_longpoll_2?f=6.%20%D0%92%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F), object
- **text** - Текст сообщения, string
- **from** - Информация об отправителе сообщения, object
- **isOut** - True, если сообщение было исходящим, boolean
- **attaches** - Прикрепления, array
- **answer** - Функция для ответа текстом и прикреплениями
- **sticker** - Функция для ответа стикером

##### Функция message.answer()
```js
message.answer(text, [attach], [forward])
```
- **text** - Текст отправляемого сообщения, string
- **attach** - Массив или строка с прикреплениями (напр. `['photo1234_5678', 'photo8765_4321']`)
- **forward** - Если true, то обрабатываемое сообщение будет переслано, boolean

##### Функция message.sticker()
```js
message.sticker(stickerId)
```
- **stickerId** - ID отправялемого стикера

*По всем вопросам обращайтесь в [VK](https://vk.com/m4l3vich) и [Telegram](https://t.me/m4l3vich)*
