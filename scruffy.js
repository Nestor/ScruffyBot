'use strict';

const winston = require('winston');
const Bot = require('./core/bot.js').Bot;

var scruffy = new Bot();
var logins = require('./logins.json');


//Save DB in case of crash or closing
process.on('uncaughtException', function(err){
    winston.log('error', 'CRITICAL ERROR:', err);
    scruffy.msghistory.syncSaveDB();
    process.exit();
});

process.on('SIGINT', function(){
    scruffy.msghistory.syncSaveDB();
    process.exit();
});

scruffy.run(logins.login, logins.password);
