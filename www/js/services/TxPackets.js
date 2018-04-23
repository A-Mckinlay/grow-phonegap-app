var growApp = angular.module('growApp');

growApp.service('TxPackets', ['$cordovaBluetoothLE', '$log', function ($cordovaBluetoothLE, $log) {
    this.transformPackets = function (packetQueue){
        var group = [];
        group.push(
            _.map(packetQueue, function(encodedStr){
                var hexBytes = $cordovaBluetoothLE.bytesToHex($cordovaBluetoothLE.encodedStringToBytes(encodedStr)).split(" ");
                var key = _.slice(hexBytes, 0, 2);
                key = key.reverse();
                key = key[0] + key[1].substring(2);
                key = parseInt(key, 16);
                var value = _.slice(hexBytes, 2).reverse();
                return {key, value};
            })
        );
        _.sortBy(group, function(packet){return packet.key}) //ensures ascending order req of spec
        $log.log("Group: "+ JSON.stringify(group));
        return group;
    }

    this.verifyGroup = function(group){
        for (var i = 0; i < group.length; i++) {
            if (group[i].key !== i) {
                return 'ack';
            }
        }
        return 'nack';
    }
}]);