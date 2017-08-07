process.stdout.setEncoding('utf8');
const greet = [
  '╔═════════════════════════════╗',
  '║   sBot v2.3.0 Europium DEV  ║',
  '║    Made by m4l3vich, 2017   ║',
  '╚═════════════════════════════╝',
  ''
];
class events extends require('events') {}

const ievent = new events(); // Internal events
const lpevent = new events(); // LongPoll events
const msgevent = new events(); // Message events
const amsgevent = new events(); // All messages events

var fs = require('fs');
var colors = require('colors');
var r = require('request');
var api = require('./api');
var moment = require('moment');
var closest = require('closest-str');
var sentids = [];

var VK = {
  cnotified: false,
  unotified: false,
  call: function(method, args){
    if(!VK.cnotified){
      console.log('Внимание: Метод bot.VK.call() устарел и будет удалён в версии 2.4.0. Пожалуйста, используйте bot.api.call()'.inverse)
      VK.cnotified = true
    }
    return api.call(method, args)
  },
  upload: function(t, data, callback){
    if(!VK.unotified){
      console.log('Внимание: Метод bot.VK.upload() устарел и будет удалён в версии 2.4.0. Пожалуйста, используйте bot.api.upload()'.inverse)
      VK. unotified = true
    }
    return api.upload(t, data, callback)
  }
};
console.log(greet.join('\n').green);
if(!process.version.startsWith('v6')){
  console.log(['[warning] Внимание! Вы используете Node.js версии, отличной от 6.x.x',
               '[warning] Сейчас sBot гарантированно работает на Node.js версии 6.x',
               '[warning] При возникновении проблем напишите в https://github.com/m4l3vich/sBot/issues'].join('\n').red)
};
global.use = function(msg, botname, next){
  next(true)
}

var dict = {
  import(obj){
    closest.setdict(obj);
  },
  add(req, ans){
    var newdict = closest.__dict;
    newdict[Object.keys(closestStr.__dict).length] = {answer: ans, query: req};
    closest.setdict(newdict);
  },
  check(request){
    if(global.dictmode == 0){
      var res = closest.request(request)

      if(res.query == null && res.answer == 'false') return false
      else return res.answer
    }else if(global.dictmode == 1){
      var res = request.split(' ').map(e=>closest.request(e)).filter(e=>e.query != null && e.answer != 'false')

      if(res.length == 0) return false
      else return res[0].answer
    }
  }
};

const bot = {
  lpevent, msgevent, amsgevent, dict, VK, api, colors,
  status(newstatus){
    api.call('status.set', {text: newstatus})
  },
  authid(){return global.authid},
  botname(){return global.botname},
  version: {
    codenum: greet[1].match(/v\d.\d.\d\s\S\w*/g),
    num: greet[1].match(/v\d.\d.\d/g)
  },
  getArgs(text, isConv){
    try{
      if(isConv){
        return text.split(' ').slice(2)
      }
      else{
        return text.split(' ').slice(1)
      }
    }catch(e){
      return [text];
    }
  },
  getAnswer(peer){return '[id'+peer.s.id+'|'+peer.s.fname+'], ';},
  init(opts){
    if(opts.rucaptcha){o = opts.rucaptcha}else{o = null}
    api.init(opts.token, o)
    closest.setlow(opts.dictmatch || 1)
    global.dictmode = opts.dictmode || 0
    closest.setlow('false');
    global.botname = opts.botname.map(e => e.toLowerCase());
    //Authorize user
    console.log(`[${il.ts()} | init]`.green,`Получение информации об аккаунте...`);
    api.call('users.get', {}).then(res =>{
      authid = res[0].id
      console.log(`[${il.ts()} | init]`.green,`Успешно авторизовано как ${colors.green(res[0].first_name+' '+res[0].last_name+' (ID: '+res[0].id+')')}`);
    });
      //Set status
      api.call('status.set', {text: opts.status ? opts.status : 'sBot '+bot.version.codenum, group_id: 0});
      //Load cache
      console.log(`[${il.ts()} | init]`.green,`Загрузка кэша пользователей...`);
      fs.access('cache.json', fs.constants.F_OK, function(err){
        if(err){
          fs.writeFile('cache.json', '{\n}', function(err){
            if(err){console.log(`[${il.ts()} | init]`.red,`Ошибка при создании файла кэша`)}
            else{console.log(`[${il.ts()} | init]`.green,`Создан файл кэша`)}})
        }else{
          fs.readFile('cache.json', 'utf-8', function(err, file){
            try{global.cache = JSON.parse(file);
              console.log(`[${il.ts()} | init]`.green,`Загружено ${colors.green(Object.keys(global.cache).length+' пользователей')} из кэша`);
            }catch(e){
              console.log(`[${il.ts()} | init] Файл кэша поврежден, идёт перезапись...`.red);
              fs.writeFile('cache.json', '{\n}', function(err){if(err){console.log('[init]'.red,' Ошибка при перезаписи файла кэша')}
              else{console.log('[init]'.green,'Файл кэша успешно перезаписан')}})
            }
          });
        }
      });
      //Initialize LongPoll connection
      api.call('messages.getLongPollServer', {use_ssl: 1}).then(res => {
        console.log(`[${il.ts()} | init]`.green,`Запуск цикла LongPoll...`);il.longpollLoop(res);});
        //Online loop
        console.log(`[${il.ts()} | init]`.green,`Запуск цикла установки онлайна...`);
        api.call('account.setOnline', {});
        setInterval(function(){api.call('account.setOnline')}, 270000);
      },
      sendmsg(type, id, msg, attach, sid, callback){
        if (type == 'conv') {id = id + 2000000000}
        if (attach) {obj = {peer_id: id, message: msg, attachment: attach}}
        else if(sid) {obj = {peer_id: id, sticker_id: sid}}
        else {obj = {peer_id: id, message: msg}}
        api.call('messages.send', obj)
        .then(res => {
          if(res.error){
            switch(res.error.error_code){
              case 902:
                console.log(`[${il.ts()} | msg] Ошибка при отправке: Запрещено настройками приватности`.red);break;
              case 900:
                console.log(`[${il.ts()} | msg] Ошибка при отправке: Добавлен в чёрный список`.red);break;
              default:
                console.log(`[${il.ts()} | msg] Ошибка при отправке: ${error.msg}`.red);break;
            }
          }
          else{
            console.log(`[${il.ts()} | msg =>] ${sid ? '(Стикер #'+sid+')' : il.msgmask(id, msg)}`.cyan);
            sentids.push(res)
            if(callback) callback()
          }
        })
      },
      use(callback){
        global.use = callback;
      }
    };
    module.exports = bot;
    const il = {
      msgmask(id,msg){return id+': '+msg;},
      ts(){return moment().format('DD.MM.YY HH:mm:ss')},
      lpmask(obj){
        if(obj.type == 'conv'){return `[${obj.name} | ${obj.id}] ${obj.s.fname} ${obj.s.lname}: ${obj.msg.full}`}
        else{return `[${obj.s.fname} ${obj.s.lname}, ${obj.id}]: ${obj.msg.full}`}
      },
      parselp(answer, callback){
        function pu(userid){
          return new Promise(function(resolve, reject){ // Parses user id and saves it to cache, or returns value from cache
            if(global.cache[userid]){
              resolve({id: userid, fname: global.cache[userid][0], lname: global.cache[userid][1]});
            }else{
              api.call('users.get', {user_ids: userid}).then(res => {
                global.cache[userid] = [res[0].first_name, res[0].last_name];
                console.log(`[${il.ts} | cache] Пользователь ${userid} кэширован`);
                fs.writeFile('cache.json', JSON.stringify(global.cache, null, 2), null);
                resolve({id: userid, fname: res[0].first_name, lname: res[0].last_name});
              })
            }
          })
        }
        answer.forEach(function(ans){
          if(ans[7] && ans[7]['source_act']){
            function truncate(id, nc){
              return new Promise(function(resolve, reject){
                if(nc){
                  Promise.all([api.call('users.get', {user_ids: id, name_case: nc}), pu(id)])
                    .then(res => {resolve({t: `${res[0][0].first_name} ${res[0][0].last_name}`,f: res[1]})})
                }else{pu(id).then(usr => {resolve({t: `${usr.fname.charAt(0)}. ${usr.lname}`, f: usr})})}
              })
            }
            switch(ans[7]['source_act']){
              case 'chat_create':       // Someone created chat
                truncate(ans[7].from)
                .then(name => {
                  console.log(`[${il.ts()} | lpevent]`.inverse, `${name.t} создал беседу "${ans[7]['source_text']}"`.green)
                  lpevent.emit('chat_create', {name: ans[7]['source_text'], admin: name.f, peer_id: ans[3]});
                })
                break;
              case 'chat_title_update': // Someone updated chat name
                truncate(ans[7].from)
                .then(name => {
                  console.log(`[${il.ts()} | lpevent]`.inverse, `${name.t} изменил название беседы с "${ans[7]['source_old_text']}" на "${ans[7]['source_text']}"`.green)
                  lpevent.emit('chat_title_update', {oldname: ans[7]['source_old_text'], newname: ans[7]['source_text'], user: name.f, peer_id: ans[3]-2000000000});
                })
                break;
              case 'chat_photo_update': // Someone updated chat photo
                truncate(ans[7].from)
                .then(name => {
                  console.log(`[${il.ts()} | lpevent]`.inverse, `${name.t} изменил фото в беседе с id ${ans[3]-2000000000}`.green)
                  lpevent.emit('chat_photo_update', {photo: ans[7]['attach1'], user: name.f, peer_id: ans[3]-2000000000});
                })
                break;
              case 'chat_invite_user':  // Someone invited user into chat
                Promise.all([truncate(ans[7].from), truncate(ans[7].source_mid, 'gen')])
                .then(n =>{
                  console.log(`[${il.ts()} | lpevent]`.inverse, `${n[0].t} пригласил ${n[1].t} в беседу с id ${ans[3]-2000000000}`.green)
                  lpevent.emit('chat_invite_user', {inviter: n[0].f, invited: n[1].f, peer_id: ans[3]-2000000000});
                })
                break;
              case 'chat_kick_user':    // Someone kicked user from chat
                Promise.all([truncate(ans[7].from), truncate(ans[7].source_mid, 'gen')])
                .then(n =>{
                  console.log(`[${il.ts()} | lpevent]`.inverse, `${n[0].t} исключил ${n[1].t} из беседы с id ${ans[3]-2000000000}`.green)
                  lpevent.emit('chat_kick_user', {kicker: n[0].f, kicked: n[1].f, peer_id: ans[3]-2000000000});
                })
                break;
              default:
                break;
            }
          }else{
            switch(ans[0]){ // Parse LongPoll's updates array
              case 7:  // Read incoming messages
                lpevent.emit('read', {peer_id: ans[1], local_id: ans[2]})
                break;
              case 8:  // Friend goes online
                lpevent.emit('online', {user_id: ans[1]})
                break;
              case 9:  // Friend goes offline
                lpevent.emit('offline', {user_id: ans[1], flags: ans[2]})
                break;
              case 61: // User started writing
                lpevent.emit('userwrite', {user_id: ans[1]})
                break;
              case 62: // User started writing in chat
                lpevent.emit('chatwrite', {user_id: ans[1], chat_id: ans[2]})
                break;
              case 4:  // Incoming message
                var isConv = false;
                var convName = '', msg = '', userid = 0, fwd = [];
                if(ans[7] && ans[7].from){userid = ans[7]['from'];ans[3] -= 2000000000;isConv = true}
                else{userid = ans[3]}

                if(ans[7] && ans[7].fwd){fwd = ans[7].fwd.split(',').map(e => e.split('_')[1])}
                if(isConv){convName = ans[5]}

                if(!sentids.includes(ans[1])){
                  pu(userid).then(result => {
                    resobj = {
                      type: isConv ? 'conv' : 'user',
                      id: ans[3],
                      msgid: ans[1],
                      msg: {
                        full: ans[6],
                        args: bot.getArgs(ans[6], isConv)
                      },
                      s: result,
                      answer: function(msg, options, stickerid){
                        bot.sendmsg(isConv ? 'conv' : 'user', ans[3], msg || null, options || null, stickerid || null)
                      }
                    };
                    if(isConv){resobj['name'] = convName}
                    console.log(`[${il.ts()} | msg <=] ${il.lpmask(resobj)}`.yellow);il.parse(resobj);
                  })
                }else{
                  sentids.splice(sentids.indexOf(ans[1]), 1)
                }
                break;
              default:
                break;
            }
          }
        })
      },
  longpollLoop(info){
    r.post({
      url: 'https://'+info.server,
      headers: {'content-type' : 'application/x-www-form-urlencoded'},
      form: {act: 'a_check', key: info.key, ts: info.ts, wait: 25, mode: 2, version: 1}
    }, function(err, resp, body){
      try{answer = JSON.parse(body);} catch(e){console.log(err)}
      if(answer){
        if(answer.updates && answer.updates.length == 0){il.longpollLoop({key: info.key, server: info.server, ts: answer.ts})}
        else if(answer.failed == 1){il.longpollLoop({key: info.key, server: info.server, ts: answer.ts})}
        else if(answer.failed == 2 || answer.failed == 3){
          api.call('messages.getLongPollServer', {use_ssl: 1}).then(res => {
            console.log(`${colors.green('['+il.ts()+'| init]')} Цикл LongPoll перезапущен с новым ключом`);il.longpollLoop(res);
          });
        }else{
          il.parselp(answer.updates);
          il.longpollLoop({key: info.key, server: info.server, ts: answer.ts})
        }
      }else{
        il.longpollLoop({key: info.key, server: info.server, ts: answer.ts})
      }
    })
  },
  parse(msgobj){
    cmd = msgobj.msg.full.split(' ');
    function a(){return global.botname.includes(cmd[0].replace(/[^a-zа-я]/gi, '').trim().toLowerCase())}
    global.use(msgobj.msg.full, a(), function(allow){
      if(allow === true){
        if(global.botname !== false){
          if(msgobj.type == 'conv') {
            if(a() && dict.check(cmd.slice(1).join(' '))) {
              bot.sendmsg('conv', msgobj.id, bot.getAnswer(msgobj)+dict.check(cmd.slice(1).join(' ')));
            }else if(a()){
              msgevent.emit(cmd[1].toLowerCase(), msgobj);
            }
          }else{
            if(dict.check(msgobj.msg.full)){
              bot.sendmsg('user', msgobj.id, dict.check(msgobj.msg.full))
            }else{
              msgevent.emit(cmd[0].toLowerCase(), msgobj);
            }
          }
        }
        amsgevent.emit(msgobj.msg.full.toLowerCase(), msgobj);
      }else if(allow instanceof Error && allow.message){
        console.log(`[${il.ts()} | filter ~>] ${allow.message}`.red)
        if(msgobj.type == 'conv'){
          bot.sendmsg('conv', msgobj.id, bot.getAnswer(msgobj)+allow.message);
        }else{
          bot.sendmsg('user', msgobj.id, allow.message)
        }
      }
    })
  }
  };
