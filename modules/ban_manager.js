'use strict';

const winston = require('winston');

function setup(bot){
    var module = new Ban_Manager(bot);
}

class Ban_Manager{
    constructor(bot){
        this.scruffy = bot;
        this.config = this.scruffy.config.modules.ban_manager;

        var self = this;
        this.scruffy.commands.register('ban', function(message){
            self.banCommand(message);
        });

        this.scruffy.commands.register('unban', function(message){
            self.unbanCommand(message);
        });

        for(let item of this.config.canBan){
            this.scruffy.commands.allowRole('ban', item.role);
            this.scruffy.commands.allowRole('unban', item.role);
        }
        for(let item of this.config.canFullUnbanRoles){
            this.scruffy.commands.allowRole('ban', item);
            this.scruffy.commands.allowRole('unban', item);
        }
    }

    //!ban -u user -d duration -r reason
    banCommand(message){
        var self = this;
        var args = this.scruffy.commands.parseArguments(message.content);
        var maxTime = this.getMaxBanTime(message.senderRoles);

        if(args.r == undefined){
            args.r = null;
        }

        if(args.ip != undefined){
            args.ip = true;
        } else {
            args.ip = false;
        }

        if(args.u != undefined && args.d != undefined){
            var time = this.scruffy.getSeconds(args.d);
            if(maxTime < time){
                message.reply("!ban: Duration too big.");
            } else {
                this.scruffy.mainServer.searchUser(args.u, null, null, 1, 0, true, function(errors, user){
                    if(errors === null && user.length > 0){
                        user = user[0];

                        self.scruffy.timebans.ban(user.user, time, message.sender, args.r, args.ip, function(errors){
                            if(errors == null){
                                message.reply(`!ban: User ${user.username} (Nickname ${user.nickname}) has been banned for ${time}seconds.`);
                            } else {
                                console.log(errors);
                                message.reply("!ban: Cannot complete request.");
                            }
                        });
                    } else if(errors === null){
                        message.reply("!ban: No corresponding user found.");
                    } else {
                        winston.log('error', exports.name, 'Cannot complete request to find user.', errors);
                        message.reply("!ban: Cannot complete request.");
                    }
                })
            }
        } else {
            message.reply("!ban: No user specified.");
        }


    }

    //!unban -u user
    unbanCommand(message){
        var args = this.scruffy.commands.parseArguments(message.content);
        var self = this;
        var userban;
        if(args.u != undefined){
            this.scruffy.mainServer.getBans(args.u, null, 1, function(errors, bans){
                if(errors === null && bans.length > 0){
                    for(let ban of bans){
                        if(ban.username == args.u){
                            userban = ban;
                        }
                    }
                    if(userban != undefined){
                        //Handle ban if sender can full unban
                        if(self.scruffy.getHighestRoleFromArray(message.senderRoles, self.config.canFullUnbanRoles) != undefined){
                            self.scruffy.mainServer.unban(userban.user, function(errors){
                                if(errors == null){
                                    message.reply(`!unban: User ${userban.username} unbanned.`);
                                } else {
                                    message.reply("!unban: Cannot complete request.");
                                }
                            });
                        }
                        //Handle self managed ban
                        else if(userban.requestorUser.ID == self.scruffy.clientID){
                            var rolesArray = [];
                            for(let item of self.config.canBan){
                                rolesArray.push(item.role);
                            }
                            if(self.scruffy.getHighestRoleFromArray(message.senderRoles, rolesArray) != undefined){
                                if(self.scruffy.timebans.bans.has(userban.user.ID)){
                                    if(self.scruffy.timebans.bans.get(userban.user.ID).requestorID == message.sender.ID){
                                        self.scruffy.timebans.unban(userban.user, function(errors){
                                            if(errors == null){
                                                message.reply(`!unban: User ${userban.username} unbanned.`);
                                            } else {
                                                message.reply("!unban: Cannot complete request.");
                                            }
                                        });
                                    } else {
                                        message.reply("!unban: Cannot unban this user.");
                                    }
                                } else {
                                    message.reply("!unban: No corresponding bans found.");
                                }

                            }
                        } else {
                            message.reply("!unban: Cannot unban this user.");
                        }
                    } else {
                        //Happens if api find the name in a ban reason
                        message.reply("!unban: No corresponding bans found.");
                    }
                } else if(errors === null){
                    message.reply("!unban: No corresponding bans found.");
                } else {
                    winston.log('error', exports.name, 'Cannot complete request to find ban.', errors);
                    message.reply("!unban: Cannot complete request.");
                }
            });
        } else {
            message.reply("!unban: Please specify a user.")
        }


        //If it's not a ban made by scruffy, check the ban and unban him if the author is moderator and author of the ban

    }

    getMaxBanTime(userRoles){
        var maxTimeArray = [];
        var rolesArray = [];
        for(let item of this.config.canBan){
            maxTimeArray[item.role] = item.maxTime;
            rolesArray.push(item.role);
        }
        var role = this.scruffy.getHighestRoleFromArray(userRoles, rolesArray);
        if(role != undefined){
            return maxTimeArray[role];
        } else {
            return undefined;
        }
    }


}

exports.setup = setup;
exports.name = "Ban_Manager";
