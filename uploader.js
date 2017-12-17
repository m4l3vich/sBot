var rp = require('request-promise')
var api = require('./api')

module.exports = {
  token: '',
  mode: '',
  photo: async function (buffer) {
    var server = await api('photos.getMessagesUploadServer', {}, this.token)
    var data = await rp({
      method: 'POST',
      uri: server.upload_url,
      formData: {
        photo: {
          value: buffer,
          options: {filename: 'photo.png', contentType: 'image/png'}
        }
      }
    })
    data = JSON.parse(data)
    var result = await api('photos.saveMessagesPhoto', {
      photo: data.photo,
      server: data.server,
      hash: data.hash
    }, this.token)
    return `photo${result[0].owner_id}_${result[0].id}`
  },
  // eslint-disable-next-line camelcase
  audio_message: async function (buffer, peer_id) {
    // eslint-disable-next-line camelcase
    if (this.mode === 'group' && !peer_id) {
      throw new Error('Unavailable in group mode')
    } else {
      var server = await api('docs.getMessagesUploadServer', {type: 'audio_message', peer_id}, this.token)
      var data = await rp({
        method: 'POST',
        uri: server.upload_url,
        formData: {
          file: {
            value: buffer,
            options: {filename: 'audiomsg.ogg', contentType: 'audio/ogg'}
          }
        }
      })
      data = JSON.parse(data)
      var result = await api('docs.save', {
        file: data.file,
        title: 'audiomsg'
      }, this.token)
      return `doc${result[0].owner_id}_${result[0].id}`
    }
  },
  graffiti: async function (buffer) {
    if (this.mode === 'group') {
      throw new Error('Unavailable in group mode')
    } else {
      var server = await api('docs.getMessagesUploadServer', {type: 'graffiti'}, this.token)
      console.log(server)
      var data = await rp({
        method: 'POST',
        uri: server.upload_url,
        formData: {
          file: {
            value: buffer,
            options: {filename: 'graffiti.png', contentType: 'image/png'}
          }
        }
      })
      data = JSON.parse(data)
      var result = await api('docs.save', {
        file: data.file,
        title: 'graffiti'
      }, this.token)
      return `doc${result[0].owner_id}_${result[0].id}`
    }
  }
}
