/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

var request		= require('request');
var net			= require('net');
var http		= require('http');
var querystring	= require('querystring');
var xml2js		= require('xml2js');
var ping		= require(__dirname + '/lib/ping');
var utils       = require(__dirname + '/lib/utils'); // Get common adapter utils

var adapter     = utils.adapter('vuplus');

var isConnected      = null;
var isEnigmaEnabled  = false;
var deviceId         = 1;


var CMD_CHANNEL_UP   = 402;
var CMD_CHANNEL_DOWN = 403;
var CMD_VOLUME_DOWN  = 114;
var CMD_VOLUME_UP    = 115;
var CMD_PLAY_PAUSE   = 164;
var CMD_MUTE_UNMUTE  = 113;

var PATH_REMOTE_CONTROL = '/web/remotecontrol?command=';
var PATH_VOLUME         = '/web/vol';
var PATH_VOLUME_SET     = '/web/vol?set=set';
var PATH_ABOUT          = '/web/about';
var PATH_GET_CURRENT    = '/web/getcurrent';
// var PATH_CHANNEL        = '/web/subservices';
var PATH_POWERSTATE     = '/web/powerstate';
var PATH_DOWNMIX        = '/web/downmix';
var PATH_CONTROL_LIGHT  =  '/control/light?set=';

var commands = {
    TOGGLE_MUTE:  CMD_MUTE_UNMUTE,
    CHANNEL_UP:   CMD_CHANNEL_UP,
    CHANNEL_DOWN: CMD_CHANNEL_DOWN,
    PLAY_PAUSE:   CMD_PLAY_PAUSE,
    VOLUME_UP:    CMD_VOLUME_UP,
    VOLUME_DOWN:  CMD_VOLUME_DOWN
};

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    if (id && state && !state.ack) {
        var parts = id.split('.');
        var name = parts.pop();
        if (commands[name]) {
            getResponse('NONE', deviceId, PATH_REMOTE_CONTROL + commands[name], function (error, command, deviceId, xml) {
                if (error) {
                    adapter.log.error('Cannot send command "' + name + '": ' + error);
                }
            });
        } else
        if (id === adapter.namespace + '.VuPlus.STANDBY') {
            getResponse('NONE', deviceId, PATH_POWERSTATE + '?newstate=' + (state.val ? 1 : 0), function (error, command, deviceId, xml) {
                if (!error) {
                    adapter.setState('VuPlus.STANDBY', state.val, true);
                } else {
                    adapter.setState('VuPlus.STANDBY', {val: state.val, ack: true, q: 0x42});
                }
            });
        } else if (id === adapter.namespace + '.VuPlus.VOLUME') {
            getResponse('NONE', deviceId, PATH_VOLUME_SET + parseInt(state.val, 10), function (error, command, deviceId, xml) {
                if (!error) {
                    adapter.setState('VuPlus.VOLUME', parseInt(state.val, 10), true);
                } else {
                    adapter.setState('VuPlus.VOLUME', {val: parseInt(state.val, 10), ack: true, q: 0x42});
                }
            });
        } else
        if (id === adapter.namespace + '.VuPlus.COMMAND') {
            adapter.log.debug('Its our Command: ' + state.val);
            getResponse('NONE', deviceId, PATH_REMOTE_CONTROL + state.val, function (error, command, deviceId, xml) {
                if (!error) {
                    adapter.setState('VuPlus.COMMAND', state.val, true);
                } else {
                    adapter.setState('VuPlus.COMMAND', {val: state.val, ack: true, q: 0x42});
                }
            });
        } else
		if (id === adapter.namespace + '.VuPlus.EnigmaLight.LightsOn') {
            setEnigmaLightState(PATH_CONTROL_LIGHT + (state.val === true || state.val === 'true' ? 'on' : 'off' ), function (error) {
                if (!error) {
                    adapter.setState('VuPlus.EnigmaLight.LightsOn', (state.val === true || state.val === 'true'), true);
                } else {
                    adapter.setState('VuPlus.EnigmaLight.LightsOn', {val: (state.val === true || state.val === 'true'), ack: true, q: 0x82});
                }
            });
		}
    }
    if (state && id === adapter.namespace + '.VuPlus.EnigmaLight.ENABLED') {
        isEnigmaEnabled = state.val;
    }
});

adapter.on('ready', main);

function setConnection(_isConnected) {
    if (isConnected !== _isConnected) {
        isConnected = _isConnected;
        adapter.setState('info.connection', isConnected, true);
    }
}

function getResponse(command, deviceId, path, callback){
   // var device = dreamSettings.boxes[deviceId];
    var options = {
        host:    adapter.config.IPAddress,
        port:    '80',
        path:    path,
        method: 'GET'
    };

    adapter.log.debug('creating request for command "' + command + '" (deviceId: ' + deviceId + ', host: ' + options.host + ', port: ' + options.port + ', path: "' + options.path + '")');

    if (adapter.config.Username && adapter.config.Password) {
        options.headers = {
            'Authorization': 'Basic ' + new Buffer(adapter.config.Username + ':' + adapter.config.Password).toString('base64')
        };
        adapter.log.debug('using authorization with user "' + adapter.config.Username + '"');
    } else {
        adapter.log.debug('using no authorization');
    }

    var req = http.get(options, function(res) {
        var pageData = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            pageData += chunk;
        });
        res.on('end', function () {
            try {
                var parser = new xml2js.Parser();
                parser.parseString(pageData, function (err, result) {
                    if (callback) {
                        callback(null, command, deviceId, result);
                        callback = null;
                    }
                });
            } catch (e) {
                if (callback) {
                    callback('Cannot parse: ' + pageData, command, deviceId);
                    callback = null;
                }
            }
        });
    });
    req.on('error', function(e) {
        if (callback) {
            callback('received error: ' + e.message, command, deviceId);
            callback = null;
        }
    });
}

function getEnigmaLightState() {
	var options = {
        host:   adapter.config.IPAddress,
        port:   adapter.config.EnigmaLightPort,
        path:   '/api/statusinfo',
        method: 'GET'
    };
	
	var req = http.get(options, function(res) {
		var jsonString = '';
		res.on('data', function (chunk) {
            jsonString += chunk;
        });
		res.on('end', function () {
			var obj = JSON.parse(jsonString);
			
			adapter.setState('VuPlus.EnigmaLight.LightsOn', obj.current_mode !== 'Off');
			
			adapter.log.debug('SUCCESS at collectiong Informations from EnigmaLight Server' + jsonString);
		});
    });
    req.on('error', function(e) {
        adapter.log.debug('Error at collectiong Informations from EnigmaLight Server');
    });
}

function setEnigmaLightState(path, callback) {
	var options = {
        host:   adapter.config.IPAddress,
        port:   adapter.config.EnigmaLightPort,
        path:   path,
        method: 'GET'
    };
	
	var req = http.get(options, function (res) {
		res.on('end', function () {			
			adapter.log.debug('SUCCESS at setting Information from EnigmaLight Server' + res);
            callback && callback(null);
		});
    });
    req.on('error', function (e) {
        adapter.log.debug('Error at setting EnigmaLight Server');
        callback && callback(e);
    });
}

function parseBool(string) {
    var cleanedString = string[0].replace(/(\t\n|\n|\t)/gm,'');

    switch (cleanedString.toLowerCase()){
        case 'true':
        case 'yes':
        case '1':
            return true;

        default:
            return false;
    }
}

function evaluateCommandResponse(error, command, deviceId, xml) {
    if (error) {
        adapter.log.error('Error for "' + command + "': " + error);
        return;
    }

    adapter.log.debug('evaluating response for command "' + command + '": ' + JSON.stringify(xml));

    if (!xml) {
        adapter.log.error('Empty answer');
        return;
    }
    //var id = parseInt(deviceId.substring(1));
    //var boxId = (dreamSettings.firstId) + (id * 10);

    var bool;

    switch (command.toUpperCase()) {
        case 'MESSAGE':
        case 'RESTART':
        case 'REBOOT':
        case 'DEEPSTANDBY':
            //setState(boxId, '');
            break;

        case 'MUTE':
        case 'UNMUTE':
        case 'MUTE_TOGGLE':
        case 'VOLUME':
            //setState(boxId + 2, parseInt(xml.e2volume.e2current[0]));	// 20
            //setState(boxId + 3, parseBool(xml.e2volume.e2ismuted));		// True|False
            //setState(boxId, '');
            break;

        case 'WAKEUP':
        case 'STANDBY':
        case 'OFF':
        case 'STANDBY_TOGGLE':
            adapter.setState('VuPlus.COMMAND', {val: '', ack: true});
            break;

        case 'GETSTANDBY':
            if (!xml.e2powerstate) {
                adapter.log.error('No e2powerstate found');
                return;
            }
            bool = parseBool(xml.e2powerstate.e2instandby);
            adapter.log.debug('Box Standy: ' + bool);
            adapter.setState('VuPlus.STANDBY', bool, true);
            //setState(boxId + 1, parseBool(xml.e2powerstate.e2instandby));		// true|false
            break;

        case 'GETDOWNMIX':
            if (!xml.e2state) {
                adapter.log.error('No e2state found');
                return;
            }
            bool = parseBool(xml.e2state.e2state);
            adapter.log.debug('Box DownMix: ' + bool);
            adapter.setState('VuPlus.DOWNMIX', bool, true);
            break;

        case 'GETVOLUME':
            if (!xml.e2volume || !xml.e2volume.e2current) {
                adapter.log.error('No e2volume found');
                return;
            }
            bool = parseBool(xml.e2volume.e2ismuted);
            adapter.log.debug('Box Volume: ' + parseInt(xml.e2volume.e2current[0], 10));
            adapter.log.debug('Box Muted: '  + bool);

            adapter.setState('VuPlus.VOLUME', parseInt(xml.e2volume.e2current[0], 10), true);
            adapter.setState('VuPlus.MUTED', bool, true);
            break;

        case 'GETINFO':
            if (!xml.e2abouts || !xml.e2abouts.e2about) {
                adapter.log.error('No e2abouts found');
                return;
            }
            adapter.log.debug('Box Sender: '       + xml.e2abouts.e2about[0].e2servicename[0]);
            adapter.log.debug('Box HDD capacity: ' + xml.e2abouts.e2about[0].e2hddinfo[0].capacity[0]);
            adapter.log.debug('Box HDD free: '     + xml.e2abouts.e2about[0].e2hddinfo[0].free[0]);

            adapter.setState('VuPlus.CHANNEL',      xml.e2abouts.e2about[0].e2servicename[0],           true);
            adapter.setState('VuPlus.HDD_CAPACITY', xml.e2abouts.e2about[0].e2hddinfo[0].capacity[0],   true);
            adapter.setState('VuPlus.HDD_FREE',     xml.e2abouts.e2about[0].e2hddinfo[0].free[0],       true);
			break;

        case 'GETCURRENT':
            if (!xml.e2currentserviceinformation || !xml.e2currentserviceinformation.e2eventlist) {
                adapter.log.error('No e2currentserviceinformation found');
                return;
            }
            adapter.log.debug('Current Provider: '    + xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicename[0]);
            adapter.log.debug('Current Title: '       + xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventname[0]);
            adapter.log.debug('Current Description: ' + xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescription[0]);

            adapter.setState('VuPlus.Current.PROVIDER', xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicename[0], true);
            adapter.setState('VuPlus.Current.TITLE',    xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventname[0],        true);
            adapter.setState('VuPlus.Current.DESC',     xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescription[0], true);
            break;

        case 'KEY':
        case 'VOLUME_UP':
        case 'VOLUME_DOWN':
        case 'LEFT':
        case 'RIGHT':
        case 'UP':
        case 'DOWN':
        case 'EXIT':
        case 'CH_UP':
        case 'CH_DOWN':
        case 'SELECT':
        case 'OK':
        case 'BOUQUET_UP':
        case 'BOUQUET_DOWN':
        case 'INFO':
        case 'MENU':
            //setState(boxId, '');
        default:
            adapter.log.info('received unknown command "' + command + '" @ evaluateCommandResponse');
            break;
    }
}

function checkStatus() {
    ping.probe(adapter.config.IPAddress, null, function (error, result) {
        if (result && result.alive) {
            setConnection(true);
            getResponse('GETSTANDBY', deviceId, PATH_POWERSTATE,  evaluateCommandResponse);
            getResponse('GETINFO',    deviceId, PATH_ABOUT,       evaluateCommandResponse);
            getResponse('GETVOLUME',  deviceId, PATH_VOLUME,      evaluateCommandResponse);
            getResponse('GETCURRENT', deviceId, PATH_GET_CURRENT, evaluateCommandResponse);
            getResponse('GETDOWNMIX', deviceId, PATH_DOWNMIX,     evaluateCommandResponse);
        } else {
            setConnection(false);
            adapter.log.debug('VUPlus: ' + adapter.config.IPAddress + ' is not reachable!');
        }
		
        if (isEnigmaEnabled) {
            getEnigmaLightState();
        }
    });
}

function main() {
    setConnection(false);
    adapter.log.debug('config IPAddress: ' + adapter.config.IPAddress);
    adapter.log.debug('config Username: '  + adapter.config.Username);
    adapter.log.debug('config Password: '  + adapter.config.Password);

    adapter.config.EnigmaLightPort = parseInt(adapter.config.EnigmaLightPort, 10) || 0;
    adapter.config.PollingInterval = parseInt(adapter.config.PollingInterval, 10) || 0;

    if (adapter.config.PollingInterval && adapter.config.PollingInterval < 1000) {
        adapter.config.PollingInterval = 1000;
    }

    if (adapter.config.IPAddress === '' || adapter.config.IPAddress === '0.0.0.0') {
        adapter.log.error('Please specify IP address');
        return;
    }

    adapter.getState('VuPlus.EnigmaLight.ENABLED', function (err, state) {
        isEnigmaEnabled = state ? state.val : false;
    });

    // Try to Connect to EnigmaLight Server
	if (adapter.config.EnigmaLightPort > 0) {
		var enigmaLightsOptions = {
            host:   adapter.config.IPAddress,
            port:   adapter.config.EnigmaLightPort,
            method: 'GET'
        };

		var req = http.get(enigmaLightsOptions, function (/* res */) {
            adapter.log.debug('VUPlus EnigmaLight Exists on Port: ' + adapter.config.EnigmaLightPort);
            isEnigmaEnabled = true;
			adapter.setState('VuPlus.EnigmaLight.ENABLED', isEnigmaEnabled, true);
		});
		
		req.on('error', function (/* e */) {
            adapter.log.debug('VUPlus EnigmaLight does not exists on Port: ' + adapter.config.EnigmaLightPort);
            isEnigmaEnabled = false;
            adapter.setState('VuPlus.EnigmaLight.ENABLED', isEnigmaEnabled, true);
		});
	} else {
        isEnigmaEnabled = false;
        adapter.setState('VuPlus.EnigmaLight.ENABLED', isEnigmaEnabled, true);
    }

    // in this example all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

    adapter.setState('VuPlus.COMMAND', '', true);

    //Check ever 5 secs
    adapter.log.info('starting Polling every ' + adapter.config.PollingInterval + ' ms');

    if (adapter.config.PollingInterval) {
        setInterval(checkStatus, adapter.config.PollingInterval);
        checkStatus();
    }
}
