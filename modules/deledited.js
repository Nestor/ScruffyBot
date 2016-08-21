'use strict';

function setup(bot){
    var module = new Deledited(bot);
}

const notifType = {
    0: "Creation",
    1: "Edition",
    2: "Liked",
    3: "Deleted"
}

class Deledited {
    constructor(bot){
        this.scruffy = bot;
        this.config = this.scruffy.config.modules.deledited;
        var self = this;
        this.scruffy.commands.register('deled', function(message){
            self.delCommand(message);
        })
        this.scruffy.commands.register('saveDB', function(message){
            self.scruffy.msghistory.saveDB();
            message.reply('History: DB saved');
        });

        //allow Roles
        for(let role of this.config.deled.allowedRoles){
            this.scruffy.commands.allowRole('deled', role);
        }
        for(let role of this.config.saveDB.allowedRoles){
            this.scruffy.commands.allowRole('saveDB', role);
        }

    }

    delCommand(message){
        var args = this.scruffy.commands.parseArguments(message.content);
        if(args.u != undefined && args.c != undefined){
            if(args.t != undefined){
                var time = this.scruffy.getSeconds(args.t)*1000;
            } else {
                var time;
            }
            var range = this.scruffy.getSeconds((args.r||"5m")) * 1000;
            var channel = this.scruffy.findChannel(args.c);
            if(channel === undefined){
                message.reply("!deled: Unknown channel!");
            } else {
                var results = this.search(time, range, args.u, channel);
                var reply = "";
                for(let msgid of results){
                    reply += `_History of edited/deleted messages in channel [${channel.name}]:_ \n`;
                    for (let histmsg of this.scruffy.msghistory.history.get(msgid).notifs){
                        reply += "[" + this.scruffy.commands.niceDate(histmsg.notifTimestamp) + "] ~" + notifType[histmsg.notifType] + "~ *" +
                                 histmsg.notifUsername + "*: " + histmsg.content + "\n";
                    }
                }

                if(reply.length == 0) {
                    reply = `!deled: No history found in channel [${channel.name}]`;
                }
                message.reply(reply);
            }
        } else {
            this.helpDeled(message);
        }
    }

    //range is from time_ago to time_ago+range
    search(time_ago, range, username, channel){
        var results = [];

        //Start to search in history
        if(time_ago != undefined){
            var begin_range = Date.now() - time_ago;
            var end_range = Date.now() - time_ago + range;
            for(let [id, msg] of this.scruffy.msghistory.history){
                if(msg.notifs.length > 1){
                    if( msg.originalTimestamp >= begin_range &&
                        msg.originalTimestamp <= end_range &&
                        msg.authorNickname == username &&
                        msg.conversationID == channel.ID){
                        results.push(id);
                    }
                }
            }
        } else {
            for(let [id, msg] of this.scruffy.msghistory.history){
                if(msg.notifs.length > 1){
                    if( msg.authorNickname == username &&
                        msg.conversationID == channel.ID){
                        results.push(id);
                    }
                }
            }
            if(results.length > 1){
                results.sort(function(a,b){
                    return b.originalTimestamp - a.originalTimestamp;
                });
                results = [results[0]];
            }

        }

        return results;
    }

    helpDeled(message){
        var text = `The _!deled_ command help moderators to look at the history of edited or deleted messages.\n` +
        `Arguments: \n` +
        `\`-u [user]\` Username of the sender of an edited/deleted message.\n` +
        `\`-c [channel]\` Name of the channel to look into.\n` +
        `\`-t [time_ago]\` ~Facultative~ Time ago to start looking for the message under the form: "1d" (1day) or "5h 30m" (5h30).\n` +
        `\`-r [range]\` ~Facultative~ Default is 10minutes, the amount of time to look after time_ago, under the same form.\n` +
        `_Example:_ \n \`!deled -c Text Lobby -u MyUsername -t 4h 30m -r 30m\` Show all modified messages of user MyUsername in the ` +
        `channel Text Lobby between 4h30 and 4h ago.\n` +
        `\`!deled -c Text Lobby -u MyUsername\` Last modified message of user MyUsername in the channel Text Lobby.`;
        message.reply(text);
    }

}

exports.name = "deledited";
exports.setup = setup;
