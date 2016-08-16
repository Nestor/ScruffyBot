'use strict';

function setup(bot){
    var config = bot.config.modules.ping;
    bot.commands.register('ping', function(message){
        if(config.enabled){
            message.reply('pong!');
        }
    });
    for(let role of config.allowedRoles){
        bot.commands.allowRole('ping', role);
    }
}

exports.setup = setup;
exports.name = "ping";
