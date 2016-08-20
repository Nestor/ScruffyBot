'use strict';

function setup(bot){
    var module = new HighlightCheck(bot);
}

class HighlightCheck {
    constructor(bot) {
        this.scruffy = bot;
        this.config = this.scruffy.config.modules.highlight_check;

        var self = this;
        this.scruffy.commands.register('highlight', function(message){
            if(self.config.enabled){
                self.highlightCommand(message);
            }
        });

        //allow Roles
        for(let role of this.config.allowedRoles){
            this.scruffy.commands.allowRole('highlight', role);
        }
    }

    highlightCommand(message){
        var args = message.content.substr('!highlight '.length);
        if(parseInt(args) && parseInt(args)<10){
            var amount = parseInt(args);
        }
        else {
            var amount = 1;
        }
        var [msgs, times] = this.searchHighlight(message.sender.ID, amount);
        //Make answer look nice, iterate through results
        var reply = `_You have been recently highlighted ${times} times._\n`;
        for(let item of msgs){
            var msg = this.scruffy.msghistory.history.get(item);
            var date = this.scruffy.commands.niceDate(msg.originalTimestamp);
            var channel_name = this.scruffy.channels.get(msg.conversationID).name;
            reply += `[${date}] *${msg.authorNickname}*: ~${channel_name}~\n`;
        }
        message.reply(reply);
    }

    searchHighlight(userID, amount){
        var results = [];

        for(let [id, msg] of this.scruffy.msghistory.history){
            if(msg.notifs.length > 0){
                //Conditions are: User mentioned, in a channel conversation, in the last 24hours
                if(msg.notifs[0].mentionsArray.indexOf(userID) != -1 &&
                    Date.now() - msg.originalTimestamp < 86400000 &&
                    this.scruffy.channels.get(msg.conversationID) != undefined){
                    results.push(id);
                }
            }
        }

        //Sort the mentions by first more recently
        var self = this;
        results.sort(function(a, b){
            return self.scruffy.msghistory.history.get(b).originalTimestamp -
                self.scruffy.msghistory.history.get(a).originalTimestamp;
        });

        return [results.slice(0, amount), results.length];
    }
}

exports.setup = setup;
exports.name = "highlight_check";
