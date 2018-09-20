![Logo](admin/vuplus.png)
# ioBroker vuplus Adapter
==============

[![NPM version](http://img.shields.io/npm/v/iobroker.vuplus.svg)](https://www.npmjs.com/package/iobroker.vuplus)
[![Downloads](https://img.shields.io/npm/dm/iobroker.vuplus.svg)](https://www.npmjs.com/package/iobroker.vuplus)

[![NPM](https://nodei.co/npm/iobroker.vuplus.png?downloads=true)](https://nodei.co/npm/iobroker.vuplus/)

Adapter for ioBroker to connect to a vuplus or Sat receiver (Dreambox might work too).
This adapter is based on BasGo's adapter for CCU.IO
Testes with a vuplus duo2

## Install

## Configuration
- IP Address of your vuplus receiver
- Username
- Passwort
- Polling interval (default 20000ms)
- Enigmalight Port (if is enabled) - Just enable webremote in the Settings of Enigmalight and set the Port to this Adapter (default: 1414)

## Usage
This adapter creates different states to control and monitor the vuplus box.

## Changelog

### 0.1.1 (2018-09-20)
* (phlupp) remove DOWNMIX
* (phlupp) add MESSAGE: send info message to screen
* (phlupp) HDD_CAPACITY and HDD_FREE only if box has HDD.
+ (phlupp)(NightWatcher) Admin3

### 0.1.0 (2017-10-04)
* (bluefox) make adapter installable
* (bluefox) add Volume control, Mute Toggle, Channel UP/DOWN

### 0.0.4 (2017-09-10)
* (NightWatcher) add support for EnigmaLight Server

### 0.0.3 (2017-08-24)
* (NightWatcher) add command "getcurrent"

### 0.0.2 (2015-09-30)
* (vader722) inital commit

## License

The MIT License (MIT)

Copyright (c) 2015-2017 vader722

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
