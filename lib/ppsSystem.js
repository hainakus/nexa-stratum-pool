var fs = require('fs');

var async = require('async');

var logSystem = 'pps';
require('./exceptionWriter.js')(logSystem);


log('info', logSystem, 'Started');


function runInterval(){
    async.waterfall([

        //Get all good shares
        function(callback){
            redisClient.hgetall(config.coin + ':shares:good', function(error, result) {
                if (error) {
                    log('error', logSystem, 'Error trying to get worker good shares from redis %j', [error]);
                    callback(true);
                    return;
                }
                callback(null, result);
            });
        },

        function(shares, callback){
            redisClient.hgetall(config.coin + ':shares:good:total', function(error, result) {
                if (error) {
                    log('error', logSystem, 'Error trying to get worker total good shares from redis %j', [error]);
                    callback(true);
                    return;
                }
                callback(null, shares, result);
            });
        },

        function(shares, totals, callback){

            if(config.poolServer.type == "pps"){
                var res = [];
                var redisCommands = [];

                for(worker in shares){

                    var pShare = 0;
                    var pShareNoBonus = 0;

                    if(shares[worker] >= 1){

                        pShare = parseInt(shares[worker] / 1) * 1;
                        pShareNoBonus = pShare;
                        var total = totals[worker];

                        pShare * config.poolServer.ppsReward;

                        redisCommands.push(['hincrbyfloat', config.coin + ':shares:good', worker, -pShareNoBonus]);
                        redisCommands.push(['hincrby', config.coin + ':workers:' + worker, 'balance', pShare*config.coinUnits]);

                        res.push({"id": worker, "bool": true, "shares": pShareNoBonus, "balance": pShare*config.coinUnits});

                    }else{
                        res.push({"id": worker, "bool": false, "shares": 0, "balance": 0});
                    }

                } //end for()

                redisClient.multi(redisCommands).exec(function(err, replies){
                    if (err){
                        log('error', logSystem, 'PPS failed to update stats on redis: %s', [err]);
                        callback(true);
                        return;
                    }
                    for(var i=0; i < res.length; i++){
                        if(res[i].bool){
                            log('info', logSystem, '%d balance has been added to %s for %d good shares', [res[i].balance, res[i].id, res[i].shares]);
                        }
                    }
                    res = [];

                });

            } //end if pps

            callback(null, totals);

        },

        function(totals, callback){

            if(config.poolServer.type == "pps"){
                var res = [];
                var redisCommands = [];

                for(worker in totals){

                    var tShare = 0;
                    var tShareNoBonus = 0;

                    if(totals[worker] >= 1000){

                        tShare = parseInt(totals[worker] / 1000) * 1000;
                        tShareNoBonus = tShare;

                        if(config.poolServer.bonusChance <= Math.floor(Math.random() * (1 - 1000) + 1)){
                            pBonus = (tShare * config.poolServer.bonusReward);

                            redisCommands.push(['hincrbyfloat', config.coin + ':shares:good:total', worker, -tShareNoBonus]);
                            redisCommands.push(['hincrby', config.coin + ':workers:' + worker, 'balance', pBonus*config.coinUnits]);

                            res.push({"id": worker, "bool": true, "balance": pBonus*config.coinUnits});
                        }else{
                            res.push({"id": worker, "bool": false, "balance": 0});
                        }

                    }else{
                        res.push({"id": worker, "bool": false, "balance": 0});
                    }

                } //end for()

                redisClient.multi(redisCommands).exec(function(err, replies){
                    if (err){
                        log('error', logSystem, 'PPS failed to update stats on redis: %s', [err]);
                        callback(true);
                        return;
                    }
                    for(var i=0; i < res.length; i++){
                        if(res[i].bool){
                            log('info', logSystem, '%d balance has been added to %s as bonus', [res[i].balance, res[i].id]);
                        }
                    }
                    res = [];
                });

            } //end if pps
            callback(null);
        }

    ], function(error, result){
        setTimeout(runInterval, config.poolServer.ppsInterval * 1000);
    });
}

runInterval();
