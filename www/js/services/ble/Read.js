var growApp = angular.module('growApp');

growApp.service('Read', ['$q', 'DataTxHelper', '$cordovaBluetoothLE', '$log', function ($q, DataTxHelper, $cordovaBluetoothLE, $log) { 

    this.readCharacteristic = function(address, service, characteristic, name, returnType) {
        var q = $q.defer();

        $cordovaBluetoothLE.read({ address: address, service: service, characteristic: characteristic }).then(
            function (obj) {
                var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
                var returnObj = {};
                switch (returnType) {
                    case "U16":
                        returnObj[name] = DataTxHelper.byteArrayToDecimal(new Uint8Array(bytes));
                        q.resolve(returnObj);
                    case "U32":
                        returnObj[name] = DataTxHelper.byteArrayToDecimal(new Uint8Array(bytes));
                        q.resolve(returnObj);
                }
            },
            function (err) {
                $log.log("Failed to read characteristic: " + JSON.stringify(err))
                q.reject(err);
            }
        );
        return q.promise;
    }
}]);