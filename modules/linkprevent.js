'use strict';

var winston = require('winston');

function setup(bot){
    var module = new LinkPrevent(bot);
}

class LinkPrevent {
    constructor(bot) {
        this.regex = /[^\s]*[A-Za-z0-9]+\.{1,3}[A-Za-z0-9]{2,20}[^\s]*/
        this.scruffy = bot;
        this.config = this.scruffy.config.modules.linkprevent;
        this.users = [];

        //Display in console which channels will be checked
        for (let channel of this.config.channels){
            if(this.scruffy.channels.has(channel)){
                winston.log("info", exports.name, `loaded for channel [${this.scruffy.channels.get(channel).name}]`);
            }
        }

        var self = this;
        this.scruffy.on('message_received', function(message){
            self.removeLink(message);
        });
        this.scruffy.on('message_edited', function(message){
            self.removeLink(message);
        });
    }

    removeLink(message){
        try {
            if(message.senderID == this.scruffy.clientID){
                return;
            }

            //Check for channel "Accueil"
            if(this.config.channels.indexOf(message.conversation.ID) != -1){
                var results = message.content.match(this.regex);
                //If message contain link:
                if(results != null){
                    //Ignore authorized members
                    if(this.config.allowedRoles.indexOf(message.senderVanityRole.ID) != -1){
                        return;
                    }

                    //Take actions:
                    message.deleteMessage(function(errors){
                        if(errors != undefined){
                            winston.log("error", exports.name, `Could not delete message in channel: ${message.conversation.ID}, message: ${message.ID}`);
                            winston.log("error", errors);
                        } else {
                            winston.log("info", exports.name, `Message deleted: ${message.senderName} - ${message.content}`);
                        }
                    });
                    if(this.users.indexOf(message.sender) == -1){
                        //Warning the user
                        message.reply(`@${message.senderID}:${message.senderName}\n﻿ＬＩＮＫＳ  ＡＲＥ  ＦＯＲＢＩＤＤＥＮ !\n ﻿ＬＩＥＮＳ  ＩＮＴＥＲＤＩＴＳ!`);
                        this.users.push(message.sender);
                    } else {
                        //Kick him if he already got warned
                        this.scruffy.mainServer.kickUser(message.sender);
                        winston.log("info", exports.name, `User kicked: ${message.senderName}`);
                    }
                } else {
                    //Clean warning if user sent something else than a link
                    if(this.users.indexOf(message.sender) != -1){
                        this.users.pop(message.sender);
                    }
                }
            }
        }
        catch(e){
            winston.log("error", exports.name, `Channel: ${message.conversation.ID} - Message: ${message.ID}`);
            winston.log("error", e);
        }
    }
}

exports.setup = setup;
exports.name = "linkprevent";
