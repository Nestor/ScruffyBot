'use strict';

function setup(bot){
    var module = new HighlightCheck(bot);
}

class HighlightCheck {
    constructor(bot) {
        this.scruffy = bot;
        this.config = this.scruffy.config.modules.highlight_check;

        if(this.scruffy.persistantMap.has(exports.name)){
            this.persistantMap = this.scruffy.persistantMap.get(exports.name);
        } else {
            this.persistantMap = this.scruffy.persistantMap.set(exports.name, {registered: []}).get(exports.name);
        }

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

        this.scruffy.on('message_received', function(message){
            self.onMsgReceived(message);
        });
    }

    onMsgReceived(message){
        if(this.scruffy.mainServer.channelList.indexOf(message.conversation.channel) != -1){
            for(let userMentioned of message.mentions){
                if(this.persistantMap.registered.indexOf(userMentioned.ID) != -1){
                    this.scruffy.mainServer.sendPrivateConversationMessage(userMentioned, `*Register Highlight*: ` +
                        `User _${message.senderName}_ mentioned you in channel [~${message.conversation.channel.name}~] !`);
                }
            }
        }
    }

    highlightCommand(message){
        var args = this.scruffy.commands.parseArguments(message.content);
        if(parseInt(args['count']) && parseInt(args['count']) <= 10){
            var amount = parseInt(args['count']);
        }
        else {
            var amount = 3;
        }
        //If there is an unknown argument we print help
        for(let arg in args){
            if(!(arg != "count" || arg != "register" || arg != "unregister" || arg != "help")){
                args['help'] = '';
            }
        }
        //Actions depending arguments:
        if (args['help'] != undefined){
            this.help(message);
        }
        else if (args['register'] != undefined){
            if(this.persistantMap.registered.indexOf(message.sender.ID) == -1){
                this.persistantMap.registered.push(message.sender.ID);
            }
            message.reply('_You have been registered to be notified everytime someone mentions you!_');
        }
        else if (args['unregister'] != undefined){
            var userIndex = this.persistantMap.registered.indexOf(message.sender.ID);
            if(userIndex != -1){
                this.persistantMap.registered.splice(userIndex, 1);
            }
            message.reply('_You will not be notified by users mentions anymore!_');
        }
        else {
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

    }

    help(message){
        var text = `The _!highlight_ command helps you manage mentions from other users (3 lasts by default) in the last 24 hours. \n` +
        `Arguments: \n` +
        `\`-register\` Register automatic notification, the bot will send you a private message with location of the notification everytime you get mentioned.\n` +
        `\`-unregister\` Unregister automatic notification, the bot will not send you notification everytime you get mentioned anymore.\n` +
        `\`-count [number]\` Amount of highlights you want to see, maximum is 20.\n` +
        `_Example:_ \n \`!highlight -count 8\` Shows you the last 8 highlights.`;
        message.reply(text);
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
