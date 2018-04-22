//Gets permissions and ensures bluetooth is enabled on device.

var growApp = angular.module('growApp');

growApp.service('InitializeCentral', ['$cordovaBluetoothLE', '$log', '$q', function ($cordovaBluetoothLE, $log, $q) {
    
    
    this.prepareDeviceForBle = function() {
        var q = $q.defer();
        $log.log("Initializing...");
        getLocationPermissions().then(function(response){
            $cordovaBluetoothLE.isInitialized().then(function (obj) {
                if (obj.isInitialized) {
                    return q.resolve();
                } else {
                    var paramsInit = {
                        request: true,
                        statusReceiver: true,
                        restoreKey: "growflowerpowerapp",
                    };
                    $cordovaBluetoothLE.initialize(paramsInit).then(null, function (obj) {
                        return q.reject(obj.message);
                    }, function (obj) {
                        return q.resolve();
                    });
                }
            }, function (obj) {
                return q.reject(obj.message);
            });
        });
        return q.promise;
    }

    function getLocationPermissions() {
        var q = $q.defer();

        $log.log("ascertain location permissions")
        $cordovaBluetoothLE.hasPermission().then(function (response) {
            $log.log("hasPermission: " + JSON.stringify(response));
            if (response.hasPermission) {
                q.resolve(response);
            } else {
                $cordovaBluetoothLE.requestPermission().then(function (response) {
                    $log.log("Coarse location permissions granted: " + JSON.stringify(response));
                    q.resolve(response);
                },
                function (response) {
                    $log.log("Course location permissions declined: " + JSON.stringify(response));
                    q.reject(response);
                });
            }
        });

        return q.promise;
    }
}]);