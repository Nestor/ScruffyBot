'use strict';

function setup(bot){
    var config = bot.config.modules.spaceit;
    bot.commands.register('spaceit', function(message){
        if(config.enabled){
            var text = '\u200B\n'.repeat(15);
            for(var i=0; i<5; i++){
                message.reply(text);
            }
        }
    });
    for(let role of config.allowedRoles){
        bot.commands.allowRole('spaceit', role);
    }
}

exports.setup = setup;
exports.name = "spaceit";
