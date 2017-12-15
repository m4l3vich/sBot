var rp = require('request-promise')
var api = require('./api')
var EventEmitter = require('events')
var closest = require('closest-str')

class Bot extends EventEmitter {
  /**
  * Create bot instance
  * @param {Object|String} options - Options for creating bot instance (token; botname and token)
  */
  constructor (options) {
    super()

    if (typeof options === 'object') {
      this.options = options
    } else if (typeof options === 'string') {
      this.options = {
        botname: '',
        token: options
      }
    } else {
      throw new Error('Invalid options type')
    }

    var self = this
    /**
    * Set callback, that will be applied to every new message
    * @param {Function} callback - Function that will be executed
    */
    this.use = (callback) => {
      if (typeof callback === 'function') {
        this.useCallback = callback
      } else {
        throw new Error('Invalid callback')
      }
    }
    /**
    * Returns current VK user
    * @return {Object} - User object (id, first_name, last_name)
    */
    this.getMe = () => self.me

    /**
    * Set dictionary for autoanswering
    * @param {Object} dict - Object in format {"key": "value"}
    * @param {Number} percent - Percentage of dictionary element match required for triggering (float, default = 1)
    */
    this.setDict = (dict, percent) => {
      if (dict) {
        self.isDictSet = true
        closest.setdict(dict)
        closest.setlow(percent || 1)
        closest.setlow('nomatch')
        closest.setmax(1)
      } else {
        throw new Error('No dictionary passed')
      }
    }

    /**
    * Start bot
    */
    this.start = async () => {
      var longpollParams = await api('messages.getLongPollServer', {lp_version: 2}, self.options.token)
      var me = await api('users.get', {}, self.options.token)
      self.me = me[0]

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

    this.api = (method, parameters) => {
      api(method, parameters, self.options.token)
    }
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
      from: update[2] & 2 ? self.me : user[0],
      isOut: Boolean(update[2] & 2),
      attaches: attachments,
      answer: (text) => {
        api('messages.send', {peer_id: update[3], message: text}, self.options.token)
      }
    }

    if (self.useCallback) {
      self.useCallback(messageObject)
    }
    if (!(update[2] & 2)) {
      if (self.options.botname && messageObject.text.startsWith(self.options.botname)) {
        self.emit(update[5].toLowerCase(), messageObject)
      } else if (self.isDictSet && closest.request(messageObject.text).answer !== 'nomatch') {
        messageObject.answer(closest.request(messageObject.text).answer)
      } else {
        self.emit(update[5].toLowerCase(), messageObject)
      }
    }
  }
}

module.exports = Bot
