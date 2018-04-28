growApp.service('Upload', ['$log', '$rootScope', 'DBCommunication', 'NetworkStatus', function ($log, $rootScope, DBCommunication, NetworkStatus) {

    var networkOnline = function(){
        return NetworkStatus.getNetworkStatus();
    }

    this.attemptFileConversion = function(address){
        $log.log("attemptFileConversion");
        if(networkOnline){
           DBCommunication.isSentToApi(address).then(function(status){
               if (status.isSent)
               {
                   $log.log("Your latest download of the history file has already been converted");
               } else {
                   DBCommunication.getHistoryFile(address).then(function (b64HistoryFile){
                       // $log.log("data to be sent to api: " + b64HistoryFile);
       
                       var xhr = new XMLHttpRequest();
   
                       xhr.addEventListener("readystatechange", function () {
                           if (this.readyState === 4 && this.status == 200) {
                               success(this.response);
                           } else if(this.readyState === 4) {
                               failure(this.response);
                           }
                       });
   
                       xhr.open("POST", "http://us-central1-grow-app-202121.cloudfunctions.net/growappfunc", true);
                       xhr.setRequestHeader("content-type", "text/plain")
   
                       xhr.send(b64HistoryFile);
                   });
               }
           });
        }
    }
    
    function success(response) { 
        $log.log("Upload Success: " + response);
        DBCommunication.setSentToAPI();
    }

    function failure(response) {
        $log.log("Upload Failed: " + JSON.stringify(response));
    }
}]);