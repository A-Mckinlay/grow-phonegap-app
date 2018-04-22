var growApp = angular.module('growApp');

growApp.service('Connect', ['$q', '$cordovaBluetoothLE', '$rootScope', '$log', function ($q, $cordovaBluetoothLE, $rootScope, $log){ 
    
    this.connectToDevice = function(address){
        var q = $q.defer()
        
        connect(address).then(function () {
            return discover(address)
        }).then(function(){
            q.resolve();
        }, 
        function(err){ 
            q.reject(err) 
        });
        
        return q.promise;
    }

    function connect(address) {
        var q = $q.defer();

        var params = { address: address, timeout: 10000 };

        $log.log("Connect : " + JSON.stringify(params));

        $cordovaBluetoothLE.connect(params).then(null, function (obj) {
            $log.log("Connect Error : " + JSON.stringify(obj));
            $cordovaBluetoothLE.close(params).then(function (obj) { //Best practice is to close on connection error
                $log.log("Close Success : " + JSON.stringify(obj)); 
            }, function (obj) {
                $log.log("Close Error : " + JSON.stringify(obj));
            });
            q.reject();
        },
        function (obj) {
            $log.log("Connect Success : " + JSON.stringify(obj));
            q.resolve(obj);
        });
        return q.promise;
    };

    var devices = {};

   function discover(address) {
        var q = $q.defer()
        var params = {
            address: address,
            timeout: 50000 //10000 DEFAULT
        };

        $log.log("Discover : " + JSON.stringify(params));

        $cordovaBluetoothLE.discover(params).then(function (obj) {
            //$log.log("Discover Success : " + JSON.stringify(obj));

            var device = $rootScope.devices[obj.address];

            var services = obj.services;

            for (var i = 0; i < services.length; i++) {
                var service = services[i];

                addService(service, device);

                var serviceNew = device.services[service.uuid];

                var characteristics = service.characteristics;

                for (var j = 0; j < characteristics.length; j++) {
                    var characteristic = characteristics[j];

                    addCharacteristic(characteristic, serviceNew);

                    var characteristicNew = serviceNew.characteristics[characteristic.uuid];

                    var descriptors = characteristic.descriptors;

                    for (var k = 0; k < descriptors.length; k++) {
                        var descriptor = descriptors[k];

                        addDescriptor(descriptor, characteristicNew);
                    }
                }
            }
            q.resolve();
        }, function (obj) {
            $log.log("Discover Error : " + JSON.stringify(obj));
            q.reject();
        });
        return q.promise;
    };

    function addService(service, device) {
        if (device.services[service.uuid] !== undefined) {
            return;
        }
        device.services[service.uuid] = { uuid: service.uuid, characteristics: {} };
    }

    function addCharacteristic(characteristic, service) {
        if (service.characteristics[characteristic.uuid] !== undefined) {
            return;
        }
        service.characteristics[characteristic.uuid] = { uuid: characteristic.uuid, descriptors: {}, properties: characteristic.properties };
    }

    function addDescriptor(descriptor, characteristic) {
        if (characteristic.descriptors[descriptor.uuid] !== undefined) {
            return;
        }
        characteristic.descriptors[descriptor.uuid] = { uuid: descriptor.uuid };
    }

}]);