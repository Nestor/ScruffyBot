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
        this.bans = new Map();
        this.cleaners = new Map();
        this.config = this.scruffy.config.timebans;
        this.saving = false;

        this.loadDB();
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
                    self.bans.set(user.ID, new Ban(
                        user.ID,
                        server_reason,
                        duration,
                        requestor.ID,
                        requestTimestamp,
                        ipban
                    ));

                    //Clean automatically the ban after the given time
                    self.cleaner(user);

                    self.saveDB();
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

        if(this.bans.has(user.ID)){
            var ban = this.bans.get(user.ID);
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
        if(this.bans.has(user.ID)){
            this.scruffy.mainServer.unban(user, callback);
            this.bans.delete(user.ID);
        }
        if(this.cleaners.has(user.ID)){
            clearTimeout(this.cleaners.get(user.ID));
            this.cleaners.delete(user.ID);
        };
        this.saveDB();
    }

    formatDB(){
        var db = JSON.stringify({version: 1, db: [...this.bans]}, null, 2);
        return db;
    }

    saveDB(callback){
        if (callback == undefined){
            callback = _ => {};
        }
        if(!this.saving){
            this.saving = true;
            let db = this.formatDB();
            var self = this;
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
                self.saving = false;
                callback(err);
            });
        } else {
            var self = this;
            setTimeout(function(){
                self.saveDB(callback);
            }, 30000);
        }
    }

    loadDB(callback){
        var self = this;
        if (callback == undefined){
            callback = _ => {};
        }
        try{
            var file = fs.readFileSync(this.config.dblocation, 'utf8');
            if (file != undefined){
                let dbfile = JSON.parse(file);
                if(dbfile.db.length>0 && dbfile.version == 1){
                    //Load db to map
                    this.bans = new Map(dbfile.db);

                    //Add cleaners when client is ready
                    this.scruffy.on('ready', function(){
                        //Generate cleaners for each ban
                        for(let [userID, ban] of self.bans){
                            //calculate when user will get unbanned
                            var time = (ban.requestTimestamp + ban.banDuration) - Date.now();
                            if(time < 10000){
                                time = 10000;
                            }

                            //Take care of unbanning
                            var user = self.scruffy.getUser(userID);
                            self.cleaner(user);
                        }
                    });

                    winston.log("info", exports.name, "DB Loaded!");
                }
            }
        }
        catch(err){
            winston.log("info", exports.name, "No DB Avalaible!");
        }
    }

}

exports.TimebansManager = TimebansManager;
exports.name = "Core.Timebans"
