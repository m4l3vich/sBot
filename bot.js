var rp = require('request-promise')
var api = require('./api')
var uploader = require('./uploader')
var EventEmitter = require('pattern-emitter')
var closest = require('closest-str')

function debugLog() {
  if(process.isDebugging) {
    var args = Array.from(arguments)
    args.unshift(`[DEBUG]`)
    console.log.apply(console,args)
  }
}

class Bot extends EventEmitter {
  /**
  * Create bot instance
  * @param {Object|String} options - Options for creating bot instance (token/botname and token)
  */
  constructor (options) {
    super()
    this.upload = uploader
    if (typeof options === 'object') {
      this.options = options
      uploader.token = options.token
    } else if (typeof options === 'string') {
      this.options = {
        botname: '',
        token: options,
        debug: false
      }
      uploader.token = options
    } else {
      throw new Error('Invalid options type')
    }

    process.isDebugging = this.options.debug

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
        debugLog('Set dictionary')
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
    * Send a message
    * @param {Number|String} id - ID where to send a message
    * @param {String} text - Message text
    * @param {Array|String} attach - List of attachments
    */
    this.sendMessage = (id, text, attach) => {
      var attachment = []
      if (Array.isArray(attach)) attachment = attach
      else attachment[0] = attach

      debugLog('Sending message',id,text,attachment)
      api('messages.send', {peer_id: id, message: text, attachment: attachment.join(',')}, self.options.token)
    }

    /**
    * Start bot
    */
    this.start = async () => {
      debugLog('bot.start() executed, connecting to LongPoll server')
      var longpollParams = await api('messages.getLongPollServer', {lp_version: 2}, self.options.token)
      self.me = await getMe(self.options.token)
      uploader.mode = self.me.mode

      async function loop (ts) {
        var longpollResponse = await rp(`https://${longpollParams.server}?act=a_check&key=${longpollParams.key}&ts=${ts}&wait=25&mode=10&version=2`)
        debugLog('Got LongPoll response:', longpollResponse)
        longpollResponse = JSON.parse(longpollResponse)
        longpollResponse.updates.map(parser)
        loop(longpollResponse.ts)
      }
      debugLog('Beginning LongPoll loop')
      loop(longpollParams.ts)
    }

    this.api = (method, parameters) => {
      debugLog('Executing API method',method, parameters)
      return api(method, parameters, self.options.token)
    }

    var getMe = async (token) => {
      debugLog('Getting current user/group')
      var resp = await rp(`https://api.vk.com/method/groups.getById?access_token=${token}&v=5.69`)
      resp = JSON.parse(resp)

      if (resp.error) {
        debugLog('Set user mode')
        var user = await rp(`https://api.vk.com/method/users.get?access_token=${token}&v=5.69`)
        user = JSON.parse(user)
        user.mode = 'user'
        return user.response[0]
      } else {
        debugLog('Set group mode')
        return {id: resp.response[0].id, mode: 'group'}
      }
    }

    var parser = async (update) => {
      var next = () => {
        if (this.options.botname && messageObject.text.startsWith(this.options.botname) && update[2] & 16) {
          debugLog('Botname triggered')
          this.emit(update[5].toLowerCase(), messageObject)
        } else if (this.isDictSet && closest.request(messageObject.text).answer !== 'nomatch') {
          debugLog('Dictionary triggered')
          messageObject.answer(closest.request(messageObject.text).answer)
        } else {
          debugLog(`Emitting "${update[5].toLowerCase()}":`,messageObject)
          this.emit(update[5].toLowerCase(), messageObject)
        }
      }

      if (update[0] === 4) {
        var user
        if (update[2] & 2) {
          user = this.me
        } else {
          var u = await api('users.get', {user_ids: update[6].from || update[3]})
          user = u[0]
        }
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
          from: user,
          isOut: Boolean(update[2] & 2),
          attaches: attachments,
          /**
          * Answer to a message
          * @param {String} text - Text to answer
          * @param {Array|String} attach - List of attachments
          * @param {Boolean} forward - If true, the source message will be forwarded
          */
          answer: (text, attach, forward) => {
            debugLog('Answering with', text, attach, forward)
            var attachment = []
            if (Array.isArray(attach)) attachment = attach
            else attachment[0] = attach

            api('messages.send', {
              peer_id: update[3],
              message: text,
              attachment: attachment.join(','),
              forward_messages: forward ? update[1] : undefined
            }, this.options.token)
          },
          /**
          * Answer to a message using sticker
          * @param {Number} stickerId - ID of sticker
          */
          sticker: (stickerId) => {
            debugLog('Answering with sticker', stickerId)
            api('messages.send', {peer_id: update[3], sticker_id: stickerId}, this.options.token)
          }
        }

        if (this.useCallback) {
          debugLog('Passing messageObject to use()')
          this.useCallback(messageObject, next)
        } else if (!(update[2] & 2)) {
          next()
        }
      }
    }
  }
}


module.exports = Bot
