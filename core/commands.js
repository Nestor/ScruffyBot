'use strict';

class CommandManager {
    constructor(bot){
        this.scruffy = bot;
        this.commandMap = new Map();

        //Parse messages
        var self = this;
        bot.on('message_received', (message) => {
            self.handleMessage(message);
        });
    }

    handleMessage(message){
        if(message.content.startsWith(this.scruffy.config.commandPrefix)){
            //Split message content to get the command only
            var command = message.content.split(" ")[0].substr(1);
            if(this.commandMap.has(command)){
                var commandObject = this.commandMap.get(command);

                //Check command can be issue in this channel
                var isInRightChannel = (commandObject.linkedChannels.length == 0 ||
                    commandObject.linkedChannels.indexOf(message.conversation.ID) != -1);

                //Check if user have the good role for this command and if he can ignore spamcheck
                var isAllowedRole = false;
                var ignoreSpamCheck = false;
                for (let role of message.senderRoles){
                    if(commandObject.allowedRoles.indexOf(role.ID) != -1){
                        isAllowedRole = true;
                    }
                    if(this.scruffy.config.roleIgnoringSpamCheck.indexOf(role.ID) != -1){
                        ignoreSpamCheck = true;
                    }
                }
                isAllowedRole = isAllowedRole || (commandObject.allowedRoles.length == 0);

                //Check if user is allowed
                var isAllowedUser = commandObject.allowedUsers.indexOf(message.senderID) != -1;

                if(commandObject.lastTimeCalled.has(message.conversation.ID)){
                    var isNotSpamming = ( ignoreSpamCheck || ((Date.now() -
                        commandObject.lastTimeCalled.get(message.conversation.ID)) > this.scruffy.config.spamCheckDelay));
                } else {
                    var isNotSpamming = true;
                }


                //If the command is sent in the right channel and the user is either allow or have
                //an allowed role
                if(isInRightChannel && (isAllowedRole || isAllowedUser) && isNotSpamming){
                    commandObject.lastTimeCalled.set(message.conversation.ID, Date.now());
                    commandObject.callback(message);
                }
                else if(isInRightChannel && isNotSpamming){
                    message.reply("You are not allowed to use this command.");
                }
            }
        }
    }

    register(command, registerFunction){
        if(this.commandMap.has(command)){
            return "Command already registered";
        } else {
            this.commandMap.set(command, {
                allowedUsers: [],
                allowedRoles: [],
                linkedChannels: [],
                callback: registerFunction,
                lastTimeCalled: new Map()
            });
            return null;
        }

    }

    unregister(command){
        if(!this.commandMap.has(command)){
            return "No such commands.";
        } else {
            this.commandMap.delete(command);
            return null;
        }
    }

    allowUser(command, user1, user2){
        if(this.commandMap.has(command)){
            var commandObject = this.commandMap.get(command);
            var i;
            for (i = 1; i < arguments.length; i++) {
                if(i==0){continue}; //Skip command
                if(commandObject.allowedUsers.indexOf(arguments[i])==-1){
                    commandObject.allowedUsers.push(arguments[i]);
                }
            }
            return null;
        } else {
            return "Unknown command";
        }
    }

    disallowUser(command, user1, user2){
        if(this.commandMap.has(command)){
            var commandObject = this.commandMap.get(command);
            var i;
            for (i = 1; i < arguments.length; i++) {
                if(i==0){continue}; //Skip command
                if(commandObject.allowedUsers.indexOf(arguments[i])!=-1){
                    var index = commandObject.allowedUsers.indexOf(arguments[i])
                    commandObject.allowedUsers.splice(index, 1);
                }
            }
            return null;
        } else {
            return "Unknown command";
        }
    }

    allowRole(command, role1, role2){
        if(this.commandMap.has(command)){
            var commandObject = this.commandMap.get(command);
            var i;
            for (i = 1; i < arguments.length; i++) {
                if(i==0){continue}; //Skip command
                if(commandObject.allowedRoles.indexOf(arguments[i])==-1){
                    commandObject.allowedRoles.push(arguments[i]);
                }
            }
            return null;
        } else {
            return "Unknown command";
        }
    }

    disallowRole(){
        if(this.commandMap.has(command)){
            var commandObject = this.commandMap.get(command);
            var i;
            for (i = 1; i < arguments.length; i++) {
                if(i==0){continue}; //Skip command
                if(commandObject.allowedRoles.indexOf(arguments[i])!=-1){
                    var index = commandObject.allowedRoles.indexOf(arguments[i])
                    commandObject.allowedRoles.splice(index, 1);
                }
            }
            return null;
        } else {
            return "Unknown command";
        }
    }

    linkToChannel(command, channel1, channel2){
        if(this.commandMap.has(command)){
            var commandObject = this.commandMap.get(command);
            var i;
            for (i = 1; i < arguments.length; i++) {
                if(i==0){continue}; //Skip command
                if(commandObject.linkedChannels.indexOf(arguments[i])==-1){
                    commandObject.linkedChannels.push(arguments[i]);
                }
            }
            return null;
        } else {
            return "Unknown command";
        }
    }

    unlinkToChannel(){
        if(this.commandMap.has(command)){
            var commandObject = this.commandMap.get(command);
            var i;
            for (i = 1; i < arguments.length; i++) {
                if(i==0){continue}; //Skip command
                if(commandObject.linkedChannels.indexOf(arguments[i])!=-1){
                    var index = commandObject.linkedChannels.indexOf(arguments[i])
                    commandObject.linkedChannels.splice(index, 1);
                }
            }
            return null;
        } else {
            return "Unknown command";
        }
    }

    //Pase a command message into object of arguments and values
    parseArguments(text){
        var command = text.split(' ')[0];
        var args = text.substr(command.length);
        var splited = args.split(' -');
        var parsed = {};
        for (let item of splited){
            if(item.length==0){continue}
            var key = item.split(' ')[0];
            var value = item.substr(key.length + 1);
            parsed[key] = value;
        }
        return parsed;
    }

    niceDate(timestamp){
        var date = new Date(timestamp);
        var day = date.getDate();
        var month = date.getMonth()+1;
        var year = date.getFullYear();
        var hours = (date.getHours().toString().length == 1) ? "0" + date.getHours() : date.getHours();
        var minutes = (date.getMinutes().toString().length == 1) ? "0" + date.getMinutes() : date.getMinutes();
        var seconds = (date.getSeconds().toString().length == 1) ? "0" + date.getSeconds() : date.getSeconds();
        var str = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        return str;
    }

    findChannel(channel_name){
        // Look for the corresponding channel
        var channel;
        var channel_secondresult;
        for(let channel_item of this.scruffy.mainServer.channelList){
            if(channel_name == channel_item.name){
                channel = channel_item;
            }
            if(channel_item.name.indexOf(channel_name) != -1 ||
                channel_item.urlPath.indexOf(channel_name) != -1){
                channel_secondresult = channel_item;
            }
        }
        if(channel == undefined && channel_secondresult != undefined){
            channel = channel_secondresult;
        }
        if(channel == undefined){
            return undefined;
        }
        return channel;
    }
}

exports.CommandManager = CommandManager;
exports.name = "Core.CommandManager"
