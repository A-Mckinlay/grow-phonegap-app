var growApp = angular.module('growApp');

growApp.service('Subscribe', ['$q', '$cordovaBluetoothLE', '$log', function ($q, $cordovaBluetoothLE, $log) { 
    
    

    this.subscribe = function (address, service, characteristic) {
        var q = $q.defer();

        var params = {
            address: address,
            service: service,
            characteristic: characteristic,
            timeout: 5000,
            //subscribeTimeout: 5000
        };

        $log.log("Subscribe : " + JSON.stringify(params));

        $cordovaBluetoothLE.subscribe(params).then(function (obj) {
            $log.log("Subscribe Auto Unsubscribe : " + JSON.stringify(obj));
            q.resolve();
        }, function (obj) {
            $log.log("Subscribe Error : " + JSON.stringify(obj));
            q.reject();
        }, function (obj) {
            //$log.log("Subscribe Success : " + JSON.stringify(obj));

            if (obj.status == "subscribedResult") {
                //$log.log("Subscribed Result");
                // var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
                // $log.log("Subscribe Success ASCII (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToString(bytes));
                // $log.log("HEX (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToHex(bytes));
                q.notify(obj);
            } else if (obj.status == "subscribed") {
                $log.log("Subscribed");
                q.notify(obj);
            } else {
                $log.log("Unexpected Subscribe Status");
                q.notify(obj);
            }
        });
        
        return q.promise;
    };
}]);