var growApp = angular.module('growApp');

growApp.service('Write', ['$q', 'DataTxHelper', '$cordovaBluetoothLE', '$log', function ($q, DataTxHelper, $cordovaBluetoothLE, $log) { 

    this.writeValueToCharacteristic = function(address, service, characteristic, value, numOfBytes) {
        var q = $q.defer();

        if (numOfBytes === 4) {
            var encodedString = DataTxHelper.encode32Bit(value);
        } else if (numOfBytes === 1) {
            var encodedString = DataTxHelper.encode8Bit(value);
        }

        var params = {
            address: address,
            service: service,
            characteristic: characteristic,
            value: encodedString,
            timeout: 5000
        };

        $cordovaBluetoothLE.write(params).then(function (response) {
            $log.log("Write Success : " + JSON.stringify(response));
            q.resolve(response);
        }, function (response) {
            $log.log("Write Error : " + JSON.stringify(response));
            q.reject(response);
        });
        return q.promise;
    };
}]);