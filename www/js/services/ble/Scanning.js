var growApp = angular.module('growApp');

growApp.service('Scanning', ['InitializeCentral', '$cordovaBluetoothLE', '$log', '$q', '$rootScope', function (InitializeCentral, $cordovaBluetoothLE, $log, $q, $rootScope) {
    InitializeCentral.prepareDeviceForBle();

    this.scan = function(){
        var q = $q.defer();

        var scanRetObject = {};
        startScan().then(function(obj){
            scanRetObject = obj;
            return stopScan()
        }).then(function(){
            q.resolve(scanRetObject);
        },
        function(){
            $log.log("scanning failed.");
            q.reject();
        });

        return q.promise;
    }

    function startScan() {
        var q = $q.defer();

        var params = {
            services: ["39E1FA00-84A8-11E2-AFBA-0002A5D5C51B"], //Will only return devices with this service(live service) i.e. only flower power devices.
            allowDuplicates: false,
            //scanTimeout: 15000,
        };

        if (window.cordova) {
            params.scanMode = bluetoothle.SCAN_MODE_LOW_POWER;
            params.matchMode = bluetoothle.MATCH_MODE_AGGRESSIVE;
            params.matchNum = bluetoothle.MATCH_NUM_ONE_ADVERTISEMENT;
            //params.callbackType = bluetoothle.CALLBACK_TYPE_FIRST_MATCH;
        }

        $log.log("Start Scan : " + JSON.stringify(params));

        $cordovaBluetoothLE.startScan(params).then(function (obj) {
            $log.log("Start Scan Auto Stop : " + JSON.stringify(obj));
            q.reject();
        }, function (obj) {
            $log.log("Start Scan Error : " + JSON.stringify(obj));
            q.reject()
        }, function (obj) {
            $log.log("Start Scan Success : " + JSON.stringify(obj));
            addDevice(obj);
            if (obj.address == "90:03:B7:C9:D9:C7"){
                q.resolve(obj);
            }
        });
        return q.promise;
    }

    function stopScan() {
        var q = $q.defer();

        $log.log("Stop Scan");

        $cordovaBluetoothLE.stopScan().then(function (obj) {
            $log.log("Stop Scan Success : " + JSON.stringify(obj));
            q.resolve();
        }, function (obj) {
            $log.log("Stop Scan Error : " + JSON.stringify(obj));
            q.reject();
        });

        return q.promise;
    };

    function addDevice(obj) {
        if (obj.status == "scanStarted") {
            return;
        }


        if ($rootScope.devices[obj.address] !== undefined) {
            return;
        }

        $log.log("adding device to list: " + JSON.stringify(obj));
        obj.services = {};
        $rootScope.devices[obj.address] = obj;
    }
}]);