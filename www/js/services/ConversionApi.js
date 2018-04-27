growApp.service('ConversionApi', ['$log', function ($log) {
    
    document.addEventListener("offline", onOffline, false);
    document.addEventListener("online", onOnline, false);

    function onOnline(){
        var networkState = navigator.connection.type;

        if (networkState !== Connection.NONE) {
            if (dataFileEntry) {
                tryToUploadFile();
            }
        }
        display('Connection type: ' + networkState);
    }

    function onOffline(){
        $log.log("device offline");
    }

    this.checkConnection = function() {
        var networkState = navigator.connection.type;

        var states = {};
        states[Connection.UNKNOWN] = 'Unknown connection';
        states[Connection.ETHERNET] = 'Ethernet connection';
        states[Connection.WIFI] = 'WiFi connection';
        states[Connection.CELL_2G] = 'Cell 2G connection';
        states[Connection.CELL_3G] = 'Cell 3G connection';
        states[Connection.CELL_4G] = 'Cell 4G connection';
        states[Connection.CELL] = 'Cell generic connection';
        states[Connection.NONE] = 'No network connection';

        $log.log('Connection type: ' + states[networkState]);
    }
}]);