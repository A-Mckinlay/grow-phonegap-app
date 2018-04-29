'use strict';
var growAppMain = angular.module('growApp.main', [
    'ngRoute',
    'ngCordova',
    'ngTouch',
    'ngCordovaBluetoothLE',
    'cordovaHTTP',
    'growApp.services',
]);

growAppMain.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/main', {
        templateUrl: 'js/views/main/main.html',
        controller: 'mainCtrl'
    });
}]);

growAppMain.controller('mainCtrl', ['addressService', 'Upload', 'NetworkStatus', 'DBCommunication', 'TxPackets', 'Subscribe', 'Scanning', 'Write', 'Read', 'Connect', 'DataTxHelper', '$scope', '$rootScope', '$cordovaBluetoothLE', '$log', '$q', '$location', function (addressService, Upload, NetworkStatus, DBCommunication, TxPackets, Subscribe, Scanning, Write, Read, Connect, DataTxHelper, $scope, $rootScope, $cordovaBluetoothLE, $log, $q, $location) {
    $log.log("mainCtrl");
    $scope.clickPrevious = function () {
        window.history.back();
    };

    $scope.goToGraph = function(){
        $location.path('/graph')
    }

    var address = addressService.address;
    var flowerPowerStartupTime = 0;
    $rootScope.devices = {};
    var b64File = "";

    $scope.begin = function () {  //Main life cycle of connect and download process.
        Scanning.scan().then(function (obj) {
            $log.log("Connecting to: " + JSON.stringify(obj));
            return Connect.connectToDevice(obj.address);
        }).then(function () {
            $log.log("Gather transfer steup parameters...");
            return gatherTransferSetupParameters();
        }).then(function (startupTime) {
            flowerPowerStartupTime = startupTime;
            $log.log("Begin transfer protocol...");
            return transferData();
        }).then(function (file) {
            var b64Array = [];
            b64Array.push(
                _.map(file, function (group) {
                    return _.map(group, function (kvObj) {
                        if (kvObj.key === 0) {
                            return
                        } else {
                            return kvObj.value.substring(0, kvObj.value.length - 1);  //return base64 value without trailing '=' TODO: confirm -1 or -2
                        }
                    });
                })
            );
            b64File = b64Array.join("") + '=';
            b64File = b64File.replace(/,/g, "");
            $log.log("file: " + b64File);
            $log.log("close connection...");
            return close();
        }, function () {
            $log.log("Transfer Failed.");
            return;
        }).then(function () {
            return setHistoryFile();
        }).then(null, function (obj) {
            $log.log("in main loop: " + JSON.stringify(obj));
        });
    }

    function gatherTransferSetupParameters() {
        var q = $q.defer();

        var clockService = {
            id: "39E1FD00-84A8-11E2-AFBA-0002A5D5C51B",
            characterisitic: "39E1FD01-84A8-11E2-AFBA-0002A5D5C51B"
        };
        var historyService = "39E1FC00-84A8-11E2-AFBA-0002A5D5C51B";
        var historyCharacUUIDs = {
            nbEntries: "39E1FC01-84A8-11E2-AFBA-0002A5D5C51B",
            lastEntryIndex: "39E1FC02-84A8-11E2-AFBA-0002A5D5C51B",
            transferStartIndex: "39E1FC03-84A8-11E2-AFBA-0002A5D5C51B",
            currentSeesionId: "39E1FC04-84A8-11E2-AFBA-0002A5D5C51B",
            currentSessionStartIndex: "39E1FC05-84A8-11E2-AFBA-0002A5D5C51B",
            currentSessionPeriod: "39E1FC06-84A8-11E2-AFBA-0002A5D5C51B",
        }

        $q.all([
            Read.readCharacteristic(address, historyService, historyCharacUUIDs.nbEntries, "nbEntries", "U16"),
            Read.readCharacteristic(address, historyService, historyCharacUUIDs.lastEntryIndex, "lastEntryIndex", "U32"),
            Read.readCharacteristic(address, clockService.id, clockService.characterisitic, "clock", "U32")
        ]).then(
            function (params) {
                var retrievedValues = {};
                params.forEach(function (element) {
                    var elementKey = Object.keys(element)[0];
                    retrievedValues[elementKey] = element[elementKey];
                });
                var startupTime = calculateStartupTime(retrievedValues.clock);
                $log.log("flowerPowerStartupTime: " + flowerPowerStartupTime + " clock val: " + retrievedValues.clock);
                var firstEntryIndex = calculateFirstEntryIndex(retrievedValues.lastEntryIndex, retrievedValues.nbEntries);
                Write.writeValueToCharacteristic(address, historyService, historyCharacUUIDs.transferStartIndex, firstEntryIndex, 4).then(function () {
                    q.resolve(startupTime);
                }, function () {
                    $log.log("err failed to write transfer start index")
                    q.reject();
                });
            },
            function () {
                $log.log("err");
                q.reject();
            });

        return q.promise;
    }

    function calculateFirstEntryIndex(lastEntryIndex, nbEntries) {
        return lastEntryIndex - nbEntries + 1;;
    }

    function calculateStartupTime(clock) {
        return (Math.round(new Date().getTime() / 1000) - clock);
    }

    function close() {
        var q = $q.defer();

        var params = { address: address };

        $log.log("Close : " + JSON.stringify(params));

        $cordovaBluetoothLE.close(params).then(function (obj) {
            $log.log("Close Success : " + JSON.stringify(obj));
            q.resolve();
        }, function (obj) {
            $log.log("Close Error : " + JSON.stringify(obj));
            q.reject({ CloseError: "close operation failed." });
        });
        return q.promise;
    };

    function transferData() {
        var q = $q.defer();

        var uploadService = {
            serviceId: "39E1FB00-84A8-11E2-AFBA-0002A5D5C51B",
            characterisitics: {
                txBuffer: "39E1FB01-84A8-11E2-AFBA-0002A5D5C51B",
                txStatus: "39E1FB02-84A8-11E2-AFBA-0002A5D5C51B",
                rxStatus: "39E1FB03-84A8-11E2-AFBA-0002A5D5C51B"
            }
        }

        var peripheralStates = ['idle', 'transferring', 'awaitingAck']; //Will be used like an enum, e.g peripheralStates[2] will return 'awaitingAck'. Peripheral being the flower power.
        var deviceStates = ['standby', 'receiving', 'ack', 'nack', 'cancel', 'error']; //As above but for the mobile device.

        var packetQueue = [];
        var file = [];
        var errorCount = 0;
        var groupCount = 0;
        var numPacketsExpected;
        var startTransferFrame;
        var prevstartTransferFrame;
        $log.log("subscribing...")

        Subscribe.subscribe(address, uploadService.serviceId, uploadService.characterisitics.txStatus).then(null, null, function (peripheralState) {
            $log.log("Peripheral State Notification:" + JSON.stringify(peripheralState));
            if (peripheralState.value && peripheralStates[DataTxHelper.oneByteEncodedStrToDec(peripheralState.value)] == 'awaitingAck') {
                var group = TxPackets.transformPackets(packetQueue);
                var validity = TxPackets.verifyGroup(group);

                if (validity === 'ack') {
                    file = file.concat(group);
                    errorCount = 0;
                    groupCount++;
                    packetQueue = []
                    if (groupCount == 1) {
                        var fileSize = TxPackets.getFileSize(group[0][0]);
                        numPacketsExpected = calculateNumOfPackets(fileSize, group);
                    }
                } else {
                    validity = 'nack';
                    packetQueue = [];
                    errorCount++;
                }

                if (errorCount >= 3) {
                    validity = 'error';
                }

                Write.writeValueToCharacteristic(address, uploadService.serviceId, uploadService.characterisitics.rxStatus, deviceStates.indexOf(validity), 1).then(function () {
                    if (validity === 'error') {
                        q.reject({ TransferStatus: validity });
                    }
                    $log.log(validity + "'d")
                });

                $log.log("GroupCount: " + groupCount + " Numpacketsexpected: " + numPacketsExpected);

                if (groupCount == numPacketsExpected) {
                    q.resolve(file);
                }
            }
            
            if (groupCount == 0 && !peripheralState.value) {
                Subscribe.subscribe(address, uploadService.serviceId, uploadService.characterisitics.txBuffer).then(null, function () { $log.log("unhandled reject") }, function (dataPacket) {
                    if (dataPacket.status == "subscribed") {
                        Write.writeValueToCharacteristic(address, uploadService.serviceId, uploadService.characterisitics.rxStatus, 1, 1).then(function () { //1 -> Recieving state
                            $log.log("rxStatus -> ReceivingState")
                        });
                    } else if (dataPacket.status == "subscribedResult") {

                        if (startTransferFrame) {
                            var prevStartTransferFrame = startTransferFrame
                            startTransferFrame = performance.now();
                        } else {
                            startTransferFrame = performance.now();
                        }

                        if (prevstartTransferFrame && prevstartTransferFrame - startTransferFrame >= 1000) {
                            validity = 'error';
                            Write.writeValueToCharacteristic(address, uploadService.serviceId, uploadService.characterisitics.rxStatus, deviceStates.indexOf(validity), 1).then(function () {
                                $log.log(validity + "'d")
                                q.reject({ TransferStatus: validity });
                            });
                        } else {
                            packetQueue.push(dataPacket.value);
                        }
                    }
                });
            }
        });

        return q.promise;
    }

    function calculateNumOfPackets(fileSize, group) {
        var framesInGroup = group.length;
        fileSize = fileSize - (18 * framesInGroup); //For the first packet as one frame is the header frame. 18 is the number of payload bytes in one frame. 
        var numOfPackets = Math.ceil((fileSize / 2304)) //calculate the number of packets required by the given file size. 2304 is the number of payload bytes in one full packet.
        $log.log("numOfPackets: " + numOfPackets);
        return numOfPackets;
    }

    function setHistoryFile() {
        DBCommunication.setHistoryFile(address, b64File, flowerPowerStartupTime);
    }

    $scope.getHistoryFile = function () {
        DBCommunication.getHistoryFile(address).then(function (result) {
            $log.log("history: " + result);
        });
    }

    $scope.dropTable = function () {
        DBCommunication.dropTable();
    }

    $scope.checkNetwork = function () {
        $log.log(NetworkStatus.getNetworkStatus());
    }

    $scope.upload = function () {
        Upload.attemptFileConversion(address);
    }

    $scope.parseCsv = function () {
        DBCommunication.parseCSVToTable();
    }

    $scope.getCsvFile = function () {
        DBCommunication.getCsvFile(address).then(function (result) {
            $log.log("csv: " + result);
        });
    }
}]);