// https://tc39.github.io/ecma262/#sec-%typedarray%.prototype.join
if (!Int32Array.prototype.join) {
  Object.defineProperty(Int32Array.prototype, 'join', {
    value: Array.prototype.join
  });
}

if (!Int16Array.prototype.join) {
  Object.defineProperty(Int16Array.prototype, 'join', {
    value: Array.prototype.join
  });
}

var growApp = angular.module('growApp', ['ngRoute', 'ngCordovaBluetoothLE', 'onsen', 'ngCordova']);

// configure our routes
growApp.config(function($routeProvider) {
  $routeProvider
    // route for the home page
    .when('/', {
      templateUrl : 'templates/home.html',
      controller  : 'homeController'
    });
});

document.addEventListener("deviceready", function() { //manually bootstrap angular as need to wait on Cordova deviceready event before doing so.
  // retrieve the DOM element that had the ng-app attribute
  var domElement = document.getElementById("growApp");
  angular.bootstrap(domElement, ["growApp"]);
}, false);

growApp.controller('router', function($scope, $cordovaBluetoothLE, $cordovaSQLite, $log, $q){

  var db = $cordovaSQLite.openDB({ name: "my.db", location: 'default' });
  $scope.bleEnabled = false;

  document.addEventListener('tap', function(){
    $scope.startScan();
  });

  $scope.devices = {};

  $scope.bleInit = function(){
    var paramsInit = {
      request: true
    };

    $cordovaBluetoothLE.initialize(paramsInit).then(null,
    function(obj) {
      $scope.bleEnabled = false;
      //$log.log("Initialize Error : " + JSON.stringify(obj)); //Should only happen when testing in browser
    },
    function(obj) {
      //$log.log("Initialize Success : " + JSON.stringify(obj));
      $scope.bleEnabled = true;
      //$log.log($scope.bleEnabled);
    });
  }

  $scope.startScan = function(){
    var params = {
      services:[],
      allowDuplicates: false,
      //scanTimeout: 15000,
    };

    if (window.cordova) {
      params.scanMode = bluetoothle.SCAN_MODE_LOW_POWER;
      params.matchMode = bluetoothle.MATCH_MODE_STICKY;
      params.matchNum = bluetoothle.MATCH_NUM_ONE_ADVERTISEMENT;
      //params.callbackType = bluetoothle.CALLBACK_TYPE_FIRST_MATCH;
    }

    $log.log("Start Scan : " + JSON.stringify(params));

    $cordovaBluetoothLE.startScan(params).then(function(obj) {
      $log.log("Start Scan Auto Stop : " + JSON.stringify(obj));
    }, function(obj) {
      $log.log("Start Scan Error : " + JSON.stringify(obj));
    }, function(obj) {
      $log.log("Start Scan Success : " + JSON.stringify(obj));

      addDevice(obj);
    });

  }

  $scope.stopScan = function() {
    $log.log("Stop Scan");

    $cordovaBluetoothLE.stopScan().then(function(obj) {
      $log.log("Stop Scan Success : " + JSON.stringify(obj));
      var address = _.map($scope.devices, 'address');
      $scope.connect(address[0]);
    }, function(obj) {
      $log.log("Stop Scan Error : " + JSON.stringify(obj));
    });
  };

  $scope.close = function(address) {
    var params = {address:address};

    $log.log("Close : " + JSON.stringify(params));

    $cordovaBluetoothLE.close(params).then(function(obj) {
     $log.log("Close Success : " + JSON.stringify(obj));
    }, function(obj) {
      $log.log("Close Error : " + JSON.stringify(obj));
    });

    var device = $scope.devices[address];
    device.services = {};
  };

  $scope.connect = function(address) {
    var params = {address:address, timeout: 10000};

    $log.log("Connect : " + JSON.stringify(params));

    $cordovaBluetoothLE.connect(params).then(null, function(obj) {
      $log.log("Connect Error : " + JSON.stringify(obj));
      $scope.close(address); //Best practice is to close on connection error
    }, function(obj) {
      $log.log("Connect Success : " + JSON.stringify(obj));
      $scope.discover(address).then(
        function(address){ $scope.gatherTransferSetupParameters(address) },
        function(err){ $log.log(err) }
      );
    });
  };

  $scope.discover = function(address) {
    var q = $q.defer()
    var params = {
      address: address,
      timeout: 50000 //10000 DEFAULT
    };

    $log.log("Discover : " + JSON.stringify(params));

    $cordovaBluetoothLE.discover(params).then(function(obj) {
      $log.log("Discover Success : " + JSON.stringify(obj));

      var device = $scope.devices[obj.address];

      var services = obj.services;

      for (var i = 0; i < services.length; i++) {
        var service = services[i];

        addService(service, device);

        var serviceNew = device.services[service.uuid];

        var characteristics = service.characteristics;

        for (var j = 0; j < characteristics.length; j++) {
          var characteristic = characteristics[j];

          addCharacteristic(characteristic, serviceNew);

          var characteristicNew = serviceNew.characteristics[characteristic.uuid];

          var descriptors = characteristic.descriptors;

          for (var k = 0; k < descriptors.length; k++) {
            var descriptor = descriptors[k];

            addDescriptor(descriptor, characteristicNew);
          }
        }
      }
      q.resolve(address);
    }, function(obj) {
      $log.log("Discover Error : " + JSON.stringify(obj));
      q.reject("Discover Eror: " + JSON.stringify(obj));
    });
    return q.promise
  };

  $scope.gatherTransferSetupParameters = function(address){
    $q.all([$scope.getDeviceTime(address), $scope.getCurrentSessionID(address), $scope.getSessionMeasurmentPeriod(address), $scope.getSessionStartIndex(address)]).then(
      function (params) {
        $log.log(params);
      },
      function(){
        $log.log("err");
      }
    );
  }

  $scope.getSessionStartIndex = function (address) {
    var q = $q.defer();

    var historyService = "39E1FC00-84A8-11E2-AFBA-0002A5D5C51B";
    var sessionStartIndexCharacteristic = "39E1FC05-84A8-11E2-AFBA-0002A5D5C51B";
    var sessionID = $cordovaBluetoothLE.read({ address: address, service: historyService, characteristic: sessionStartIndexCharacteristic }).then(
      function (obj) {
        var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
        q.resolve(new Int32Array(bytes).join(''));
      },
      function (err) {
        $log.log("Failed to read current session period: " + JSON.stringify(err))
        q.reject(err);
      }
    );
    return q.promise;
  }

  $scope.getSessionMeasurmentPeriod = function(address){
    var q = $q.defer();

    var historyService = "39E1FC00-84A8-11E2-AFBA-0002A5D5C51B";
    var sessionPeriodCharacteristic = "39E1FC06-84A8-11E2-AFBA-0002A5D5C51B";
    var sessionID = $cordovaBluetoothLE.read({ address: address, service: historyService, characteristic: sessionPeriodCharacteristic }).then(
      function (obj) {
        var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
        q.resolve(new Int16Array(bytes).join(''));
      },
      function (err) {
        $log.log("Failed to read current session period: " + JSON.stringify(err))
        q.reject(err);
      }
    );
    return q.promise;
  }

  $scope.getDeviceTime = function(address){
    var q = $q.defer();

    var clockService = "39E1FD00-84A8-11E2-AFBA-0002A5D5C51B";
    var timeCharacteristic = "39E1FD01-84A8-11E2-AFBA-0002A5D5C51B";
    var deviceTime = $cordovaBluetoothLE.read({ address: address, service: clockService, characteristic: timeCharacteristic }).then(
      function (obj) {
        var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
        q.resolve(new Int32Array(bytes).join(''));
      },
      function (err) { 
        $log.log("Failed to read device time: " + JSON.stringify(err)); 
        q.reject(err); 
      }
    );
    return q.promise;
  }

  $scope.getCurrentSessionID = function (address){
    var q = $q.defer();

    var historyService = "39E1FC00-84A8-11E2-AFBA-0002A5D5C51B";
    var sessionIDCharacteristic = "39E1FC04-84A8-11E2-AFBA-0002A5D5C51B";
    var sessionID = $cordovaBluetoothLE.read({ address: address, service: historyService, characteristic: sessionIDCharacteristic }).then(
      function (obj) {
        var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
        q.resolve(new Int16Array(bytes).join(''));
      },
      function (err) { 
        $log.log("Failed to read current session ID: " + JSON.stringify(err)) 
        q.reject(err); 
      }
    );
    return q.promise;
  }


  function calculateStartupTime(deviceTime){
    var currentTime = new Date().getTime();
    return (currentTime - deviceTime);
  }

  function addService(service, device) {
    if (device.services[service.uuid] !== undefined) {
      return;
    }
    device.services[service.uuid] = {uuid : service.uuid, characteristics: {}};
  }

  function addCharacteristic(characteristic, service) {
    if (service.characteristics[characteristic.uuid] !== undefined) {
      return;
    }
    service.characteristics[characteristic.uuid] = {uuid: characteristic.uuid, descriptors: {}, properties: characteristic.properties};
  }

  function addDescriptor(descriptor, characteristic) {
    if (characteristic.descriptors[descriptor.uuid] !== undefined) {
      return;
    }
    characteristic.descriptors[descriptor.uuid] = {uuid : descriptor.uuid};
  }

  function addDevice(obj) {
    if (obj.status == "scanStarted") {
      return;
    }

    if(obj.name == null){
      return;
    }

    if ($scope.devices[obj.address] !== undefined) {
      return;
    }

    obj.services = {};
    $scope.devices[obj.address] = obj;
    $scope.stopScan();
  }

  $scope.read = function(address, service, characteristic){
    var params = {address:address, service:service, characteristic:characteristic};

    $log.log("Read : " + JSON.stringify(params));

    $cordovaBluetoothLE.read(params).then(function(obj) {
      params.address = address;
      $log.log("Read Success : " + JSON.stringify(obj));

      if (!obj.value) {
        return;
      }
      return $cordovaBluetoothLE.encodedStringToBytes(obj.value);
      // var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
      // $scope.deviceTime = new Int32Array(bytes).join('');
      // $log.log("LittleEndianU32: " + $scope.deviceTime);
      // $log.log("ASCII (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToString(bytes));
      // $log.log("HEX (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToHex(bytes));
      }, function(obj) {
        $log.log("Read Error : " + JSON.stringify(obj));
    });
  }

  $scope.subscribe = function(address, service, characteristic) {
    var params = {
      address:address,
      service:service,
      characteristic:characteristic,
      timeout: 5000,
      //subscribeTimeout: 5000
    };

    $log.log("Subscribe : " + JSON.stringify(params));

    $cordovaBluetoothLE.subscribe(params).then(function(obj) {
      $log.log("Subscribe Auto Unsubscribe : " + JSON.stringify(obj));
    }, function(obj) {
      $log.log("Subscribe Error : " + JSON.stringify(obj));
    }, function(obj) {
      //$log.log("Subscribe Success : " + JSON.stringify(obj));

      if (obj.status == "subscribedResult") {
        //$log.log("Subscribed Result");
        var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
        $log.log("Subscribe Success ASCII (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToString(bytes));
        $log.log("HEX (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToHex(bytes));
      } else if (obj.status == "subscribed") {
        $log.log("Subscribed");
      } else {
        $log.log("Unexpected Subscribe Status");
      }
    });
  };

});
