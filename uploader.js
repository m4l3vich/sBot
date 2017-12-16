var rp = require('request-promise')
var api = require('./api')

module.exports = {
  token: '',
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
  audio_message: async function (buffer) {
    var server = await api('docs.getUploadServer', {type: 'audio_message'}, this.token)
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
  },
  graffiti: async function (buffer) {
    var server = await api('docs.getUploadServer', {type: 'graffiti'}, this.token)
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
