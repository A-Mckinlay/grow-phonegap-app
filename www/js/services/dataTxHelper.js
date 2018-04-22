var growApp = angular.module('growApp');

growApp.service('DataTxHelper', function(){
    this.byteArrayToDecimal = function(byteArray) {
        var bitString = byteArrayToBitString(byteArray);
        return binToDec(bitString);
    }
    
    this.encode32Bit = function(value) {
        var u32 = new Uint32Array([value]);
        var u8 = new Uint8Array(u32.buffer);
        return window.bluetoothle.bytesToEncodedString(u8);
    }
    
    this.encode8Bit = function(value) {
        var u8 = new Uint8Array([value]);
        return window.bluetoothle.bytesToEncodedString(u8);
    }
    
    function decToByteString(dec) {
        var binStr = dec.toString(2);
        while (binStr.length < 8) {
            binStr = "0" + binStr;
        }
        return binStr;
    }
    
    function byteArrayToBitString(byteArray) {
        var bitString = "";
        for (var i = 0; i < byteArray.length; i++) {
            var bitStringOfByte = decToByteString(byteArray[i]);
            bitString = bitStringOfByte + bitString;
        }
        return bitString;
    }
    
    function binToDec(bitString) {
        return parseInt(bitString, 2);
    }
    
});
