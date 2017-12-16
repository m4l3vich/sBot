# sBot

### Установка
Установите sBot с помощью NPM:
`npm i sbot-vk --save`

### Использование
```JavaScript
var Bot = require('sbot-vk')

var b = new Bot('access_token')
// или
var b = new Bot({
  botname: 'Бот', // На что будет "отзываться" бот, необязательно
  token: 'access_token' // Токен ВКонтакте, можно получить, например, на https://vkhost.github.io/
})

b.setDict({ // Установить "словарь" для автоответчика и процент совпадения строки
  'привет': 'Здравствуй!'
}, 0.65)
// Если процент <1, то срабатывать автоответчик будет при неполном совпадении строки
// Например, бот будет отвечать на "пирвет" ровно также, как и на "привет", если установлен процент совпадения 0.65

b.on('как тебя зовут', message => { // Использование событий и метода bot.getMe()
  message.answer(`Меня зовут ${b.getMe().first_name} ${b.getMe().last_name}`)
})

b.on(/^sqrt (.+)$/, (message) => { // Получение аргументов команды с помощью RegExp
  var number = message.text.match(/^sqrt (.+)$/)
  // number = ['sqrt 144', '144']
  if (isNaN(number)) {
    message.answer(`Вы должны передать число в аргументе.`)
  } else {
    message.answer(`Квадратный корень из числа ${number[1]}: ${Math.sqrt(parseInt(number[1]))}`)
  }
})

b.on(/^передай \[id(.+)\|(.+)] (.+)$/, message => { // Использование метода bot.sendMessage для отправки сообщения другому пользователю
  var str = message.text.match(/^передай \[id(.+)\|(.+)] (.+)$/)
  // str = ['передай [id1|Павел Дуров] что он дурак', '1', 'Павел Дуров', 'что он дурак']
  b.sendMessage(str[1], `Кто-то передал вам: ${str[3]}`)
  message.answer('Готово!')
})
```

*Огромное спасибо @RedFoxCode за модуль closest-str <3*
