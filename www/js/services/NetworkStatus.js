growApp.service('NetworkStatus', ['$log', '$rootScope', function ($log, $rootScope) {
    $rootScope.networkOnilne = false;
    document.addEventListener("offline", onOffline, false);
    document.addEventListener("online", onOnline, false);
    
    $log.log(navigator);

    function onOffline(){
        $rootScope.networkOnilne = false;
    }

    function onOnline(){
        $rootScope.networkOnilne = true;
    }

    function checkConnection() {
        var networkState = navigator.connection.type;
        if(networkState != Connection.NONE){
            return true;
        } else {
            return false;
        }
    }

    this.getNetworkStatus = function() {
        return checkConnection();
    }
}]);