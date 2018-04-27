growApp.service('NetworkStatus', ['$log', function ($log) {
    function checkConnection() {
        var networkState = navigator.connection.type;

        if(networkState != Connection.NONE){
            networkOnilne = true;
        } else {
            networkOnilne = false;
        }
    }

    this.getNetworkStatus = function() {
        checkConnection();
        if(networkOnilne){
            return 'online';
        } else {
            return 'offline';
        }
    }
}]);