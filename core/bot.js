var Client = require('cursejs').Client;

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
        this.commands = new CommandManager(this);
        this.msghistory = new MessageHistory(this);
        this.timebans = new TimebansManager(this);
        var self = this;
        this.on('ready',function(){
            self.mainServer = self.servers.get(self.config.mainServer);
            self.moderatorsRole = self.mainServer.roles.get(self.config.moderatorsID);

            for(let module of modules){
                module.setup(self);
                winston.log('info', 'Bot:', `Module ${module.name} loaded!`);
            }
            winston.log('info', 'Bot:', 'Scruffy is now ready ! :)')
        });

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
}

exports.Bot = Bot;
