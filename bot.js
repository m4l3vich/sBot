var rp = require('request-promise')
var api = require('./api')
var EventEmitter = require('events')

class Bot extends EventEmitter {
  constructor (options) {
    super()
    if (typeof options === 'object') {
      this.options = options
    } else if (typeof options === 'string') {
      this.options = {
        botname: '',
        dict: [],
        token: options
      }
    } else {
      throw new Error('Invalid options type')
    }

    var self = this
    this.use = (callback) => {
      if (typeof callback === 'function') {
        this.useCallback = callback
      } else {
        throw new Error('Invalid callback')
      }
    }
    this.start = async () => {
      var longpollParams = await api('messages.getLongPollServer', {lp_version: 2}, self.options.token)
      self.me = await api('users.get', {}, self.options.token)

      async function loop (ts) {
        var longpollResponse = await rp(`https://${longpollParams.server}?act=a_check&key=${longpollParams.key}&ts=${ts}&wait=25&mode=10&version=2`)
        longpollResponse = JSON.parse(longpollResponse)
        longpollResponse.updates.map((e) => {
          parser(e, self)
        })
        loop(longpollResponse.ts)
      }
      loop(longpollParams.ts)
    }
    this.getMe = () => self.me
  }
}

async function parser (update, self) {
  if (update[0] === 4) {
    var user = await api('users.get', {user_ids: update[6].from || update[3]})
    var attachments = []
    if (update[6]) {
      for (var i = 1; i < 11; i++) {
        if (update[6]['attach' + i]) {
          attachments.push({
            type: update[6]['attach' + i + '_type'],
            attach: update[6]['attach' + i]
          })
        } else {
          break
        }
      }
    }
    var messageObject = {
      messageId: update[1],
      peerId: update[3],
      text: update[5],
      from: user[0],
      attaches: attachments,
      answer: (text) => {
        api('messages.send', {peer_id: update[3], message: text}, self.options.token)
      }
    }

    if (self.useCallback) {
      self.useCallback(messageObject)
    }
    if (messageObject.id !== self.me.id) {
      if (self.options.botname && messageObject.text.startsWith(self.options.botname)) {
        self.emit(update[5].toLowerCase(), messageObject)
      } else if (self.options.dict) {
        // TODO dictionary autoanswer
      } else {
        self.emit(update[5].toLowerCase(), messageObject)
      }
    }
  }
}

module.exports = Bot
