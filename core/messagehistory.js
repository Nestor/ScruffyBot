'use strict';

const fs = require('fs');

var winston = require('winston');

class MessageItem{
    constructor(messageID, conversationID, authorID, authorNickname, originalTimestamp){
        this.messageID = messageID;
        this.conversationID = conversationID;
        this.authorID = authorID;
        this.authorNickname = authorNickname;
        this.originalTimestamp = originalTimestamp;
        this.notifs = [];
    }
    addNotif(notifType, content, notifUserID, notifUsername, notifTimestamp, mentionsArray){
        let notif = {
            notifType: notifType,
            content: content,
            notifUsername: notifUsername,
            notifUserID: notifUserID,
            notifTimestamp: notifTimestamp,
            mentionsArray: mentionsArray
        }
        this.notifs.push(notif);
    }
}

class MessageHistory {
    constructor(bot){
        this.scruffy = bot;
        this.config = this.scruffy.config.messageHistory;
        // history.get(message.ID) = [notifications..]
        this.history = new Map();
        this.cleanMap = new Map();
        this.loadDB();

        var self = this;
        this.scruffy.on('message_received', function(message){
            self.addNotification(message);
        });
        this.scruffy.on('message_edited', function(message){
            self.addNotification(message);
        });
        this.scruffy.on('message_deleted', function(message){
            self.addNotification(message);
        });

    }

    addNotification(message){
        //If the message have never been seen:
        if(!this.history.has(message.ID)){
            var notification = new MessageItem(message.ID,
                message.conversation.ID, message.sender.ID,
                message.senderName, message.serverTimestamp);
            this.history.set(message.ID, notification);
        }
        //If it's not the first time
        else {
            if(this.cleanMap.has(message.ID)){
                clearTimeout(this.cleanMap.get(message.ID));
            } else {
                winston.log("error", exports.name, `No existing cleaner for history item ${message.ID}.`);
            }
        }
        //Add the notification to the item
        var mentionsArray = [];
        for (let user of message.mentions){
            mentionsArray.push(user.ID);
        }
        switch(message.notificationType){
            case 0:
                this.history.get(message.ID).addNotif(
                    message.notificationType,
                    message.content,
                    message.sender.ID,
                    message.senderName,
                    message.serverTimestamp,
                    mentionsArray);
                break;
            case 1:
                this.history.get(message.ID).addNotif(
                    message.notificationType,
                    message.content,
                    message.editedUser.ID,
                    message.editedUsername,
                    message.editedTimestamp,
                    mentionsArray);
                break;
            case 3:
            this.history.get(message.ID).addNotif(
                message.notificationType,
                message.content,
                message.deletedUser.ID,
                message.deletedUsername,
                message.deletedTimestamp,
                mentionsArray);
                break;
        }

        //Finally, set the new cleaner:
        var self = this;
        var clean = setTimeout(function(){
            self.cleaner(message.ID);
        }, this.config.cleanerTime * 1000);
        this.cleanMap.set(message.ID, clean);
    }

    cleaner(id){
        //Clean history
        if(this.history.has(id)){
            this.history.delete(id);
        } else {
            winston.log("error", exports.name, `Message ${id} is not in history to be cleaned.`);
        }
        //Clean cleanmap
        if(this.cleanMap.has(id)){
            this.cleanMap.delete(id);
        } else {
            winston.log("error", exports.name, `Cleaner for id ${id} was not registered.`);
        }
    }

    saveDB(callback){
        if (callback == undefined){
            callback = _ => {};
        }
        let db = this.formatDB();
        //Instead of writing on top of the current db, we write next to it, and replace it once everything is written.
        fs.writeFile(this.config.dblocation + ".tmp", db, function(err) {
            if(err) {
                winston.log("error", exports.name, err);
            } else {
                fs.rename(self.config.dblocation + ".tmp", self.config.dblocation, function(err){
                    if(err){
                        winston.log("error", exports.name, err);
                    } else {
                        winston.log("info", exports.name, "DB Saved!");
                    }
                });
            }
            callback(err);
        });
    }

    syncSaveDB(){
        var db = this.formatDB();
        if(fs.writeFileSync(this.config.dblocation + ".tmp", db) == undefined){
            fs.renameSync(this.config.dblocation + ".tmp", this.config.dblocation);
            winston.log("info", exports.name, "DB Saved!");
        }else{
            winston.log("error", exports.name, err);
        }
    }

    formatDB(){
        var db = JSON.stringify({version: 4, db: [...this.history]}, null, 2);
        return db;
    }

    loadDB(){
        try{
            var file = fs.readFileSync(this.config.dblocation, 'utf8');
            if (file != undefined){
                let dbfile = JSON.parse(file);
                if(dbfile.db.length>0 && dbfile.version == 4){
                    this.history = new Map(dbfile.db);
                    for(let [id, item] of this.history){
                        var time = this.config.cleanerTime * 1000 - (Date.now() - item.notifs[item.notifs.length-1].notifTimestamp);
                        if(time < 0){
                            time = 0;
                        }
                        var self = this;
                        var clean = setTimeout(function(){
                            self.cleaner(id);
                        }, time);
                        this.cleanMap.set(id, clean);
                    }
                    winston.log("info", exports.name, "DB Loaded!");
                }
            }
        }
        catch(err){
            winston.log("info", exports.name, "No DB Avalaible!");
        }

    }

}


exports.MessageHistory = MessageHistory;
exports.name = "Core.MessageHistory"
