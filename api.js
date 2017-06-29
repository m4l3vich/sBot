const request = require('request');
var FormData = require('form-data');
var params = {};
var captcha = '';
var capt_pending = false;

const api = {
  init(token, capt){
    params.token = token
    if(capt){captcha = capt}
  },
  call(method, args){
    return new Promise(function(resolve, reject){
      if(params.token && args){args['access_token'] = params.token;}
      else if(params.token){args = {access_token: params.token}}
      args['v'] = 5.62;
      request.post({url: 'https://api.vk.com/method/'+method, form: args}, function(err, resp, body){
        const ans = JSON.parse(body);
        if(ans.error && ans.error.error_code == 14){
          console.log('[API] Капча!');
          if(capt_pending){
            console.log('[API] Невозможно выполнить метод',method+': идёт решение капчи')
          }else if(captcha){
            console.log('[API] Отправка капчи на RuCaptcha...');
            capt({url: ans.error.captcha_img,sid: ans.error.captcha_sid, key: captcha},
            {name: method,args: args}).then(r => {resolve(r)})
          }
        }else if (ans.error) {
          reject('[API] Ошибка: "'+ans.error['error_msg']+'" Метод: '+method)
        }else{
          resolve(ans.response)
        }
      });
    })
  },
  upload(t, data, callback){
    if(!params.token){throw new Error('[API] Невозможно загрузить файл: отсутствует access_token')}
    else if(!Buffer.isBuffer(data)){throw new Error('[API] В параметре data должен быть указан объект типа Buffer')}
    else if(t == 'photo'){
      api.call('photos.getMessagesUploadServer',{}).then(re=>{
        request.post({url: re.upload_url, formData: {
          photo: {
            value: data,
            options: {filename: 'photo.png', contentType: 'image/png'}
          }
        }}, function(err, res, body){
          b = JSON.parse(body)
          api.call('photos.saveMessagesPhoto',{
            photo: b.photo,
            server: b.server,
            hash: b.hash
          }).then(resp => {callback('photo'+resp[0].owner_id+'_'+resp[0].id)})
        })
      });
    }else if(t == 'audio_message' || t == 'graffiti'){
      api.call('docs.getUploadServer',{type: t}).then(re=>{
        request.post({url:re.upload_url, formData: {
          file: {
            value: data,
            options: {filename: t == 'audio_message' ? 'audiomsg.ogg' : 'graffiti.png',
                      contentType: t == 'audio_message' ? 'audio/ogg' : 'image/png'}
          }
        }}, function(e,ressp,body){
          b = JSON.parse(body)
          api.call('docs.save',{
            file: b.file,
            title: t == 'audio_message' ? 'audiomsg' : 'graffiti'
          }).then(resp => {callback('doc'+resp[0].owner_id+'_'+resp[0].id)})
        });
      });
    }else{throw new Error('[API] В параметре t должна быть указана строка со значением photo, audio_message или graffiti')}
  }
}

function capt(o, method){
  if(!method.args){method.args = {}}
  if(!method){method = {}}
  return new Promise(function(resolve, reject){
    capt_pending = true;
    request(o.url, {encoding:null}, function(err, resp, body){
      request.post({
        url: 'http://rucaptcha.com/in.php',
        formData: {
          method: 'post', key: o.key,
          file: {value: body, options: {contentType: 'image/jpg', filename: 'captcha.jpg'}}
        }}, function(err, resp, body){
          try{
            var id = body.split('|')[1];
            function wait(){
              setTimeout(function(){
                request(`http://rucaptcha.com/res.php?key=${o.key}&action=get&id=${id}`, function(err, resp, body){
                  if (body.startsWith('ERROR')){
                    console.error('[API] Ошибка распознавания капчи!',body);
                  }else if (~body.indexOf('NOT_READY')){
                    wait()
                  }else{
                    console.log('[API] Капча успешно распознана!')
                    method.args['captcha_sid'] = o.sid;
                    method.args['captcha_key'] = body.split('|')[1];
                    api.call(method.name, method.args).then(resp => {resolve(resp)});
                  }
                })
              }, 5000)
            }
            wait()
          }catch(e){
            reject(e)
          }
        })
    })
  })
}
module.exports = api;
