var Client = require('cursejs').Client;

const fs = require('fs');
var winston = require('winston');

var CommandManager = require('./commands.js').CommandManager
var MessageHistory = require('./messagehistory.js').MessageHistory;
var TimebansManager = require('./timebans.js').TimebansManager;

const modules = require('../modules').modules;

class Bot extends Client{
    constructor(){
        super();
        winston.log('info', `###########################################################`);
        winston.log('info', `### └(‾.‾“)┐ Starting the amazing ScruffyBot ! '(⌐■_■)♪ ###`);
        winston.log('info', `###########################################################`);
        this.config = require('../config.json');
        var self = this;
        //Get informations for everyone
        this.on('ready',function(){
            self.mainServer = self.servers.get(self.config.mainServer);
            self.moderatorsRole = self.mainServer.roles.get(self.config.moderatorsID);
        });

        this.persistantMap = new Map();
        this.loadMap();

        //Load core modules
        this.commands = new CommandManager(this);
        this.msghistory = new MessageHistory(this);
        this.timebans = new TimebansManager(this);

        //Load modules
        this.on('ready',function(){
            for(let module of modules){
                module.setup(self);
                winston.log('info', 'Bot:', `Module ${module.name} loaded!`);
            }
            winston.log('info', 'Bot:', 'Scruffy is now ready ! :)')
        });

    }

    saveMap(){
        var map = JSON.stringify([...this.persistantMap], null, 4);
        if(fs.writeFileSync(this.config.persistantMap + ".tmp", map) == undefined){
            fs.renameSync(this.config.persistantMap + ".tmp", this.config.persistantMap);
            winston.log('info', 'Core.Bot', "Persistant Map Saved!");
        }else{
            winston.log('error', 'Core.Bot', err);
        }
    }

    loadMap(){
        try{
            var file = fs.readFileSync(this.config.persistantMap, 'utf8');
            if (file != undefined){
                //Load db to map
                let dbfile = JSON.parse(file);
                this.persistantMap = new Map(dbfile);
                winston.log('info', 'Core.Bot', "Persistant Map Loaded!");
            }
        }
        catch(err){
            winston.log('info', 'Core.Bot', "No Persistant Map Avalaible!");
        }
    }

    getSeconds(str) {
        var seconds = str.match(/(\d+)\s*s/);
        var minutes = str.match(/(\d+)\s*m/);
        var hours = str.match(/(\d+)\s*h/);
        var days = str.match(/(\d+)\s*j/) || str.match(/(\d+)\s*d/);
        var months = str.match(/(\d+)\s*M/);
        var years = str.match(/(\d+)\s*y/);

        if (seconds) { seconds = parseInt(seconds[1])} else {seconds = 0};
        if (minutes) { seconds += parseInt(minutes[1])*60; }
        if (hours) { seconds += parseInt(hours[1])*3600; }
        if (days) { seconds += parseInt(days[1])*86400; }
        if (months) { seconds += parseInt(months[1])*2628000; }
        if (years) { seconds += parseInt(years[1])*31540000; }
        return seconds;
    }

    getHighestRoleFromArray(userRoles, roleIDArray){
        userRoles.sort(function(a,b){
            return a.rank - b.rank;
        });
        for(let role of userRoles){
            if(roleIDArray.indexOf(role.ID) != -1){
                return role.ID;
            }
        }
        return undefined;
    }

    findChannel(channel_name){
        // Look for the corresponding channel
        var channel;
        var channel_secondresult;
        for(let channel_item of this.mainServer.channelList){
            if(channel_name == channel_item.name){
                channel = channel_item;
            }
            let pathName = channel_item.urlPath.split('/').pop();
            if(channel_item.name.indexOf(channel_name) != -1 ||
                pathName.indexOf(channel_name) != -1){
                //Don't replace if channel is already correctly found
                if(channel_secondresult == undefined){
                    channel_secondresult = channel_item;
                } else if(channel_name.length != channel_secondresult.name.length){
                    channel_secondresult = channel_item;
                }

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

exports.Bot = Bot;
