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
            message.reply('DB saved');
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
        //!del -u dzadaz -c Lobby Pvp -t 2h -r 10m
        var args = this.scruffy.commands.parseArguments(message.content);
        if(args.u != undefined && args.c != undefined && args.t != undefined){
            var time = this.scruffy.getSeconds(args.t)*1000
            var range = this.scruffy.getSeconds((args.r||"5m")) * 1000;
            var channel = this.scruffy.commands.findChannel(args.c);
            if(channel === undefined){
                message.reply("Unknown channel");
            } else {
                var results = this.search(time, range, args.u, channel);
                var reply = "";
                for(let msgid of results){
                    reply += "_History of the message:_ \n";
                    for (let histmsg of this.scruffy.msghistory.history.get(msgid).notifs){
                        reply += "[" + this.scruffy.commands.niceDate(histmsg.notifTimestamp) + "] ~" + notifType[histmsg.notifType] + "~ *" +
                                 histmsg.notifUsername + "*: " + histmsg.content + "\n";
                    }
                }

                if(reply.length == 0) {
                    reply = "No history found";
                }
                message.reply(reply);
            }
        } else {
            message.reply("Please provide a user, channel and time ago");
        }
    }

    //range is from time_ago to time_ago+range
    search(time_ago, range, username, channel){
        var results = [];

        //Start to search in history
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
        return results;
    }

}

exports.name = "deledited";
exports.setup = setup;
