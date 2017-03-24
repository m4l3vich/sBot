process.stdout.setEncoding('utf8');
const greet = [
    '+-------------------------+',
    '|   sBot v2.0.2 Cerium    |',
    '|  by m4l3vich, (c) 2017  |',
    '+-------------------------+',
    ''
];
class events extends require('events') {}
const event = new events();
const fs = require('fs');
const VKApi = require('node-vkapi');
const colors = require('colors');
const r = require('request');
const VK = require('./api');
var cache = {};
var authid = '';
var sentid = '';
var botname = [];
console.log(greet.join('\n').green);

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
    event, dict, cmds, VK, authid, botname, colors,
    getVer(){return greet[1]},
    getArgs(peer){
        if(peer.type == 'conv'){
            console.log(peer.msg);
            return peer.msg.split(' ').splice(2, peer.msg.length+1)
        }
        else{
            console.log(peer.msg);
            return peer.msg.split(' ').splice(1, peer.msg.length+1)
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
            fs.readFile('cache.json', 'utf-8', function(err, file){cache = JSON.parse(file);
                console.log('[init]'.green,' Загружено',Object.keys(cache).length,'пользователей из кэша');});
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
    sendmsg(type, id, msg, attach, callback){
        if (type == 'conv') {id = id + 2000000000}
        if (attach) {obj = {peer_id: id, message: msg, attachment: attach}}
        else {obj = {peer_id: id, message: msg}}
        VK.call('messages.send', obj, function(res){
            if (res.error) {
                switch (res.error.error_code) {
                    case 902:console.log('[msg] Ошибка отправки пользователю %s: Запрещено настройками приватности'.red, id);break;
                    case 900:console.log('[msg] Ошибка отправки пользователю %s: Добавлен в чёрный список'.red, id);break;
                    default:console.log('[msg] Произошла неизвестная ошибка: %s'.red, id)
                }
            }
            else {sentid = res;console.log('[msg] Отправлено [=>] %s'.cyan, il.msgmask(id, msg));if (callback) {callback()}}
        })
    }
};
module.exports = bot;
const il = {
    msgmask(id,msg){return id+': '+msg;},
    isWriting(array){if(array[0][0] != '4' && array[0].length == 3)return true;else return array[0][0] != '4';},
    lpmask(obj){
        if(obj.type == 'conv'){return '['+obj.name+'] '+obj.s.fname+' '+obj.s.lname+': '+obj.msg}
        else{return '['+obj.s.fname+' '+obj.s.lname+', '+obj.id+']: '+obj.msg}
    },
    parselp(answer, callback){
        var isConv = false;
        var convName = '';
        var msg = '';
        var userid = 0;
        var ans = answer[0];
        if(ans[0] != '4'){ans = ans.splice(0, 3)}
        if(ans[7]['from']){userid = ans[7]['from'];ans[3] -= 2000000000;isConv = true}
        else{userid = ans[3]}
        if(isConv == true){convName = ans[5]}
        if(msg == null){console.log(ans)}
        if(sentid != ans[1]){
            this.parseUser(userid, isConv, function(result){
                if(isConv){resobj = {type: 'conv', name: convName, id: ans[3], msgid: ans[1], msg: ans[6], s: result};
                    callback(resobj);il.parse(resobj);
                }else{
                    resobj = {type: 'user', id: ans[3], msgid: ans[1], msg: ans[6], s: result};
                    callback(resobj);il.parse(resobj);
                }
            })
        }
    },
    parseUser(userid, isConv, callback){
        var result = {};
        if(cache[userid] && isConv) {result = {id: userid, fname: cache[userid][0], lname: cache[userid][1]};callback(result);
        }else if(cache[userid] && !isConv){result = {fname: cache[userid][0], lname: cache[userid][1]};callback(result);
        }else {
            VK.call('users.get', {user_ids: userid}, function(res){
                cache[userid] = [res[0].first_name, res[0].last_name];
                console.log('[cache] Пользователь', userid, 'кэширован');
                if(isConv){result = {id: userid, fname: res[0].first_name, lname: res[0].last_name};}
                else{result = {fname: res[0].first_name, lname: res[0].last_name};}
                callback(result);
            })
        }
    },
    longpollLoop(info){
        r.post({
            url: 'https://'+info.server,
            headers: {'content-type' : 'application/x-www-form-urlencoded'},
            form: {act: 'a_check', key: info.key, ts: info.ts, wait: 25, mode: 2, version: 1}
        }, function(err, resp, body){
            try{answer = JSON.parse(body);} catch(e){console.log(err)}
            if(answer.updates && answer.updates.length == 0){il.longpollLoop({key: info.key, server: info.server, ts: answer.ts})}
            else if(answer.failed == 1){il.longpollLoop({key: info.key, server: info.server, ts: answer.ts})}
            else if(answer.failed == 2 || answer.failed == 3){
                VK.call('messages.getLongPollServer', {use_ssl: 1}, function(res){
                    console.log('[init]'.green,' Цикл LongPoll перезапущен с новым ключом');il.longpollLoop(res);});
            }
            else if(il.isWriting(answer.updates)){il.longpollLoop({key: info.key, server: info.server, ts: answer.ts})}
            else{
                il.parselp(answer.updates,function(obj){console.log('[msg] Получено [<=] %s'.blue,il.lpmask(obj));});
                il.longpollLoop({key: info.key, server: info.server, ts: answer.ts})
            }
        })
    },
    parse(msgobj){
        cmd = msgobj.msg.split(' ');
        function ch4name(){
            return botname.includes(cmd[0]);
        }
        if(msgobj.type == 'conv') {
            if (ch4name() && cmds.check(cmd[1], msgobj)){}
            if (ch4name() && dict.check(cmd.slice(1, cmd.length).join(' '))) {
                bot.sendmsg('conv', msgobj.id, bot.getAnswer(msgobj)+dict.check(cmd.slice(1, cmd.length).join(' ')));
            }
        }else{cmds.check(cmd[0], msgobj);if(dict.check(msgobj.msg)){bot.sendmsg('user', msgobj.id, dict.check(msgobj.msg))}}
    }
};
