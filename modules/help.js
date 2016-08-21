'use strict';

function setup(bot){
    var module = new Help(bot);
}

class Help{
    constructor(bot){
        this.scruffy = bot;

        var self = this;
        this.scruffy.commands.register('help', function(message){
            self.helpCommand(message);
        });
    }

    helpCommand(message){
        var arrayOfCommands = this.scruffy.commands.availableCommands(message.sender, message.senderRoles);
        var answer;
        if(arrayOfCommands.length > 0){
            answer = `!help: _The commands availables for you are:_\n`;
            answer += "!" + arrayOfCommands.join(", !");
        } else {
            answer = "!help: No commands available.";
        }
        message.reply(answer);
    }
}

exports.name = "help";
exports.setup = setup;
