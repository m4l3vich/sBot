process.stdout.setEncoding('utf8');
const greet = [
  '╔══════════════════════════╗',
  '║  sBot v2.1.0 Promethium  ║',
  '║  Made by m4l3vich, 2017  ║',
  '╚══════════════════════════╝',
  ''
];
class events extends require('events') {}

const ievent = new events(); // Internal events
const lpevent = new events(); // LongPoll events
const msgevent = new events(); // Message events

const fs = require('fs');
const colors = require('colors');
const r = require('request');
const VK = require('./api');
var cache = {}, authid = '', sentid = '', botname = [], processed = [];
console.log(greet.join('\n').green);
if(process.version.startsWith('v7')){
  console.log(['[init] Внимание! Node.js версии 7.х.х не поддерживается!',
  '[init] Рекомендуется использовать версию 6.9 или 6.10!'].join('\n').red)
}

var dict = {
  c:{},
  import(requestObj){
    for(i in requestObj){
      this.add(i.toLowerCase(), requestObj[i]);
    }
  },
  add(request, answer){
    this.c[request.toLowerCase()] = answer
  },
  check(request){
    if(request){request = request.toLowerCase()}
    if(this.c[request.toLowerCase()]){return this.c[request]}
    else{return false}
  }
};
var cmds = {
  c:{},
  add(request, func){
    this.c[request] = func
  },
  check(request, peer){
    if(request){request = request.toLowerCase()}
    if(this.c[request.toLowerCase()]){this.c[request](peer)}
    else{return false}
  }
};

const bot = {
  lpevent, msgevent, dict, cmds, VK, authid, botname, colors,
  getVer(){return greet[1]},
  getArgs(text, isConv){
    try{
      if(isConv){
        return text.split(' ').splice(0,1).splice(0,1)
      }
      else{
        return text.split(' ').splice(0,1)
      }
    }catch(e){
      return [text];
    }
  },
  getAnswer(peer){return '[id'+peer.s.id+'|'+peer.s.fname+'], ';},
  init(name, token, captcha){
    if(captcha){o = captcha}else{o = null}
    VK.init(token, o)
    botname = name;
    //Authorize user
    console.log('[init]'.green,' Получение информации об аккаунте...');
    VK.call('users.get', {}, function(res){
      userinfo = [res[0].id, res[0].first_name, res[0].last_name];
      console.log('[init]'.green,' Авторизация успешна, ID:',userinfo[0]);});
      //Set status
      VK.call('status.set', {text: greet[1], group_id: 0});
      //Load cache and initialize cache watcher
      console.log('[init]'.green,' Загрузка кэша пользователей...');
      fs.access('cache.json', fs.constants.F_OK, function(err){
        if(err){
          fs.writeFile('cache.json', '{\n}', function(err){if(err){console.log('[init]'.red,' Ошибка при создании файла кэша')}
          else{console.log('[init]'.green,' Создан файл кэша')}})
        }else{
          fs.readFile('cache.json', 'utf-8', function(err, file){
            try{cache = JSON.parse(file);
              console.log('[init]'.green,' Загружено',Object.keys(cache).length,'пользователей из кэша');
            }catch(e){
              console.log('[init] Файл кэша поврежден, идёт перезапись...'.red);
              fs.writeFile('cache.json', '{\n}', function(err){if(err){console.log('[init]'.red,' Ошибка при перезаписи файла кэша')}
              else{console.log('[init]'.green,'Файл кэша успешно перезаписан')}})
            }
          });
        }
      });
      //Initialize LongPoll connection
      VK.call('messages.getLongPollServer', {use_ssl: 1}, function(res){
        console.log('[init]'.green,' Запущен цикл LongPoll');il.longpollLoop(res);});
        //Online loop
        console.log('[init]'.green,' Запущен цикл установки онлайна');
        VK.call('account.setOnline', {});
        setInterval(function(){VK.call('account.setOnline')}, 600000);
      },
      sendmsg(type, id, msg, attach, sid, callback){
        if (type == 'conv') {id = id + 2000000000}
        if (attach) {obj = {peer_id: id, message: msg, attachment: attach}}
        else if(sid) {obj = {peer_id: id, sticker_id: sid}}
        else {obj = {peer_id: id, message: msg}}
        VK.call('messages.send', obj, function(res){
          if (res.error) {
            switch (res.error.error_code) {
              case 902:console.log('[msg] Ошибка отправки пользователю %s: Запрещено настройками приватности'.red, id);break;
              case 900:console.log('[msg] Ошибка отправки пользователю %s: Добавлен в чёрный список'.red, id);break;
              default:console.log('[msg] Произошла неизвестная ошибка: %s'.red, id)
            }
          }
          else {sentid = res;console.log('[msg] Отправлено [=>] %s'.cyan, sid ? '(Стикер #'+sid+')' : il.msgmask(id, msg));if (callback) {callback()}}
        })
      }
    };
    module.exports = bot;
    const il = {
      msgmask(id,msg){return id+': '+msg;},
      lpmask(obj){
        if(obj.type == 'conv'){return `[${obj.name}] ${obj.s.fname} ${obj.s.lname}: ${obj.msg.full}`}
        else{return `[${obj.s.fname} ${obj.s.lname}, ${obj.id}]: ${obj.msg.full}`}
      },
      parselp(answer, callback){
        answer.forEach(function(ans){
          switch(ans[0]){
            case 7: // Read incoming messages
              lpevent.emit('read', {peer_id: ans[1], local_id: ans[2]})
              break;
            case 8: // Friend goes online
              lpevent.emit('online', {user_id: ans[1]})
              break;
            case 9: // Friend goes offline
              lpevent.emit('offline', {user_id: ans[1], flags: ans[2]})
              break;
            case 61: // User started writing
              lpevent.emit('userwrite', {user_id: ans[1]})
              break;
            case 62: // User started writing in chat
              lpevent.emit('chatwrite', {user_id: ans[1], chat_id: ans[2]})
              break;
            case 4: // Incoming message
              var isConv = false;
              var convName = '', msg = '', userid = 0;
              if(ans[7] && ans[7].from){userid = ans[7]['from'];ans[3] -= 2000000000;isConv = true}
              else{userid = ans[3]}
              if(isConv){convName = ans[5]}
              if(sentid != ans[1] && !(processed.includes(ans[1]))){
                function pu(userid, isConv, callback){
                  if(cache[userid]){
                    callback(isConv ? {id: userid, fname: cache[userid][0], lname: cache[userid][1]} :
                                      {fname: cache[userid][0], lname: cache[userid][1]});
                  }else{
                    VK.call('users.get', {user_ids: userid}, function(res){
                      cache[userid] = [res[0].first_name, res[0].last_name];
                      console.log('[cache] Пользователь', userid, 'кэширован');
                      fs.writeFile('cache.json', JSON.stringify(cache, null, 2), null);
                      callback(isConv ? {id: userid, fname: res[0].first_name, lname: res[0].last_name} :
                                        {fname: res[0].first_name, lname: res[0].last_name});
                    })
                  }
                }
                pu(userid, isConv, function(result){
                  resobj = {
                    type: isConv ? 'conv' : 'user',
                    id: ans[3],
                    msgid: ans[1],
                    msg: {
                      full: ans[6],
                      args: bot.getArgs(ans[6], isConv)
                    },
                    s: result
                  };
                  if(isConv){resobj['name'] = convName}
                  console.log('[msg] Получено [<=] %s'.yellow,il.lpmask(resobj));il.parse(resobj);
                  processed.push(ans[1])
                })
              }
              break;
            default:
              break;
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
          VK.call('messages.getLongPollServer', {use_ssl: 1}, function(res){
            console.log('[init]'.green,' Цикл LongPoll перезапущен с новым ключом');il.longpollLoop(res);
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
    if(botname !== false){
      cmd = msgobj.msg.full.split(' ');
      function a(){return botname.includes(cmd[0])}
      if(msgobj.type == 'conv') {
        if(a() && dict.check(cmd.slice(1).join(' '))) {
          bot.sendmsg('conv', msgobj.id, bot.getAnswer(msgobj)+dict.check(cmd.slice(1).join(' ')));
        }else if(a()){
          msgevent.emit(cmd[1], msgobj)
        }
      }else{if(dict.check(msgobj.msg.full)){bot.sendmsg('user', msgobj.id, dict.check(msgobj.msg.full))}else{msgevent.emit(cmd[1], msgobj)}}
    }else{
      msgevent.emit('newmsg', msgobj);
    }
  }
  };
