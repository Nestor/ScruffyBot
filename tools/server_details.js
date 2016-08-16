'use strict';

const logins = require('../logins.json');
var Client = require('cursejs').Client;

var app = new Client();

app.on('ready', function(){
    for(let x of app.servers.values()){
        console.log(`#################### ${x.name} ####################`);
        console.log(`> ${x.ID}`);
        console.log(` CHANNELS:`);
        for(let y of x.channelList){
            console.log(`      > ID: ${y.ID} Name: ${y.name} UrlPath: ${y.urlPath}`);
        }
        console.log(" ROLES:");
        for(let z of x.roles.values()){
            var id = (z.ID + "         ").substr(0,8);
            var rank = (z.rank + "         ").substr(0,8);
            console.log(`      > ID: ${id} Rank: ${rank} Name: ${z.name}`);
        }
    }
    app.close();
});

app.run(logins.login, logins.password);
