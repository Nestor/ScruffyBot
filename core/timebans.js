'use strict';

const fs = require('fs');
const winston = require('winston');

class Ban{
    constructor(userID, reason, banDuration, requestorID, requestTimestamp, isIpBan){
        this.userID = userID;
        this.reason = reason;
        this.banDuration = banDuration;
        this.requestorID = requestorID;
        this.requestTimestamp = requestTimestamp;
        this.isIpBan = isIpBan;
    }
}

//Timebans currently only works with the Bot.mainServer
class TimebansManager {
    constructor(bot){
        this.scruffy = bot;
        this.config = this.scruffy.config.timebans;

        if(this.scruffy.persistantMap.has(exports.name)){
            this.persistantMap = this.scruffy.persistantMap.get(exports.name);
            winston.log("info", exports.name, "DB Loaded!");
        } else {
            this.persistantMap = this.scruffy.persistantMap.set(exports.name, {bans: {}}).get(exports.name);
            winston.log("info", exports.name, "DB Created!");
        }

        this.cleaners = new Map();
        var self = this;

        //Add cleaners when client is ready
        this.scruffy.on('ready', function(){
            //Generate cleaners for each ban
            for(let userID in self.persistantMap.bans){
                if(self.persistantMap.bans.hasOwnProperty(userID)){
                    let ban = self.persistantMap.bans[userID];

                    //calculate when user will get unbanned
                    var time = (ban.requestTimestamp + ban.banDuration) - Date.now();
                    //Let 10seconds before cleaning expired bans to avoid spamming on loading
                    if(time < 10000){
                        time = 10000;
                    }

                    //Take care of unbanning
                    var user = self.scruffy.getUser(userID);
                    self.cleaner(user);
                }
            }
        });

    }

    /**
     * Ban a user for a specific amount of time
     * @param  {User}       user        User to ban.
     * @param  {number}     duration    Duration of the ban in seconds.
     * @param  {string}     reason      Reason of the ban.
     * @param  {User}       requestor   Requestor of the ban.
     * @param  {boolean}    ipban       True if ip ban. (Not working for now)
     * @param  {Function}   callback    Function(errors).
     */
    ban(user, duration, requestor, reason, ipban, callback){
        var self = this; //Acces object from callback
        duration = duration * 1000;
        var requestTimestamp = Date.now();
        var expiration_date = new Date(requestTimestamp + duration);
        if(reason != null){
            var server_reason = `Ban until [${expiration_date.toUTCString()}]. ${reason}`.substr(0, 255);
        } else {
            var server_reason = `Ban until [${expiration_date.toUTCString()}].`;
        }


        //I don't care if username method fails, it's here only for additional logging
        user.username(function(_, username){
            self.scruffy.mainServer.banUser(user, server_reason, ipban, function(errors){
                if(errors === null){
                    winston.log('info', exports.name, `New ban: ${user.ID}, ${username}, ${duration}, ${requestor.ID}, ${reason}, ${ipban}.`);
                    //If already banned clean the timeout to make a new one
                    if(self.cleaners.has(user.ID)){
                        clearTimeout(self.cleaners.get(user.ID));
                    };

                    //Register the ban into a map
                    self.persistantMap.bans[user.ID] = new Ban(
                        user.ID,
                        server_reason,
                        duration,
                        requestor.ID,
                        requestTimestamp,
                        ipban
                    );

                    //Clean automatically the ban after the given time
                    self.cleaner(user);
                }
                //transmit the callback
                callback(errors);
            });
        });
    }

    cleaner(user){
        var self = this;
        if(this.cleaners.has(user.ID)){
            clearTimeout(this.cleaners.get(user.ID));
        };

        if(this.persistantMap.bans.hasOwnProperty(user.ID)){
            var ban = this.persistantMap.bans[user.ID];
            var timeToBan = (ban.requestTimestamp + ban.banDuration) - Date.now();
            if(timeToBan < 0){
                this.unban(user, function(errors){
                    if(errors != null){
                        winston.log("error", exports.name, "Unable to unban user:", user.ID);
                    } else {
                        winston.log("info", exports.name, "Succesfully unbanned:", user.ID);
                    }
                });
            }
            //Node timeout value is a signed integer..
            else if(timeToBan >= 2147483647){
                this.cleaners.set(user.ID, setTimeout(function(){
                    self.cleaner(user);
                }, 2147483647));
            }
            else {
                this.cleaners.set(user.ID, setTimeout(function(){
                    self.cleaner(user);
                }, timeToBan));
            }
        }
    }

    unban(user, callback){
        if (callback == undefined){
            callback = _ => {};
        }
        winston.log('info', exports.name, `Unbanning ${user.ID}.`);
        if(this.persistantMap.bans.hasOwnProperty(user.ID)){
            this.scruffy.mainServer.unban(user, callback);
            delete this.persistantMap.bans[user.ID];
        }
        if(this.cleaners.has(user.ID)){
            clearTimeout(this.cleaners.get(user.ID));
            this.cleaners.delete(user.ID);
        };
    }

}

exports.TimebansManager = TimebansManager;
exports.name = "Core.Timebans"
