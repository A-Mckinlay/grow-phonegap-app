var growApp = angular.module('growApp');

growApp.controller('router', ['Subscribe', 'Scanning', 'Write', 'Read', 'Connect', 'DataTxHelper', '$scope', '$rootScope', '$cordovaBluetoothLE', '$cordovaSQLite', '$log', '$q', function (Subscribe, Scanning, Write, Read, Connect, DataTxHelper, $scope, $rootScope, $cordovaBluetoothLE, $cordovaSQLite, $log, $q) {

  var db = $cordovaSQLite.openDB({ name: "my.db", location: 'default' });
  var address = "90:03:B7:C9:D9:C7"; //this should be fetched from the DB dependant on which device the user has chosen to connect to.
  $rootScope.devices = {};

  $scope.begin = function () {  //Main life cycle of connect and download process.
    Scanning.scan().then(function(obj){
      $log.log("Connecting to: " + JSON.stringify(obj));
      return Connect.connectToDevice(obj.address);
    }).then(function () {
      $log.log("Gather transfer steup parameters...");
      return gatherTransferSetupParameters();
    }).then(function () {
      $log.log("Begin transfer protocol...");
      return transferData();
    }).then(function(){
      $log.log("close connection...");
      close();
    });
  }

  function close() {
    var params = { address: address };

    $log.log("Close : " + JSON.stringify(params));

    $cordovaBluetoothLE.close(params).then(function (obj) {
      $log.log("Close Success : " + JSON.stringify(obj));
    }, function (obj) {
      $log.log("Close Error : " + JSON.stringify(obj));
    });

    // var device = $scope.devices[address];
    // device.services = {};
  };



  function transferData() {
    var q = $q.defer();

    var uploadService = {
      serviceId: "39E1FB00-84A8-11E2-AFBA-0002A5D5C51B",
      characterisitics: {
        txBuffer: "39E1FB01-84A8-11E2-AFBA-0002A5D5C51B",
        txStatus: "39E1FB02-84A8-11E2-AFBA-0002A5D5C51B",
        rxStatus: "39E1FB03-84A8-11E2-AFBA-0002A5D5C51B"
      }
    }

    $log.log("subscribing...")

    Subscribe.subscribe(address, uploadService.serviceId, uploadService.characterisitics.txStatus).then(null, function (response) {
      $log.log("subscription failed: " + JSON.stringify(response));
    },
      function (response) {
        $log.log("subscribed to tx status:" + JSON.stringify(response));
        Subscribe.subscribe(address, uploadService.serviceId, uploadService.characterisitics.txBuffer).then(null, function (response) {
          $log.log("subscription failed: " + JSON.stringify(response));
        },
          function (response) {
            $log.log("subscribed to tx buffer:" + JSON.stringify(response));
            Write.writeValueToCharacteristic(address, uploadService.serviceId, uploadService.characterisitics.rxStatus, 1, 1).then(function (response) {  //1 -> Recieving state
              $log.log("rx status set to receiving state" + JSON.stringify(response));
            },
              function (response) {
                $log.log("failed to set rx status to ready: " + JSON.stringify(response));
              });
          });
      });

    return q.promise;
  }

  function gatherTransferSetupParameters() {
    var q = $q.defer();

    var historyService = "39E1FC00-84A8-11E2-AFBA-0002A5D5C51B";
    var historyCharacUUIDs = {
      nbEntries: "39E1FC01-84A8-11E2-AFBA-0002A5D5C51B",
      lastEntryIndex: "39E1FC02-84A8-11E2-AFBA-0002A5D5C51B",
      transferStartIndex: "39E1FC03-84A8-11E2-AFBA-0002A5D5C51B",
      currentSeesionId: "39E1FC04-84A8-11E2-AFBA-0002A5D5C51B",
      currentSessionStartIndex: "39E1FC05-84A8-11E2-AFBA-0002A5D5C51B",
      currentSessionPeriod: "39E1FC06-84A8-11E2-AFBA-0002A5D5C51B",
    }

    $q.all([
      Read.readCharacteristic(address, historyService, historyCharacUUIDs.nbEntries, "nbEntries", "U16"),
      Read.readCharacteristic(address, historyService, historyCharacUUIDs.lastEntryIndex, "lastEntryIndex", "U32")
    ]).then(
      function (params) {
        var characterisitics = {};
        params.forEach(function (element) {
          elementKey = Object.keys(element)[0];
          characterisitics[elementKey] = element[elementKey];
        });
        firstEntryIndex = calculateFirstEntryIndex(characterisitics.lastEntryIndex, characterisitics.nbEntries);
        Write.writeValueToCharacteristic(address, historyService, historyCharacUUIDs.transferStartIndex, firstEntryIndex, 4).then(function () {
          q.resolve();
        }, function () {
          $log.log("err failed to write transfer start index")
          q.reject();
        });
      },
      function () {
        $log.log("err");
        q.reject();
    });
    
    return q.promise;
  }

  function calculateFirstEntryIndex(lastEntryIndex, nbEntries) {
    return lastEntryIndex - nbEntries + 1;;
  }
}]);

