function decToByteString(dec){
  var binStr = dec.toString(2);
  while(binStr.length<8){
    binStr = "0" + binStr;
  }
  return binStr;
}

function byteArrayToBitString(byteArray){
  var bitString = "";
  for(var i=0; i<byteArray.length; i++){
    var bitStringOfByte = decToByteString(byteArray[i]);
    bitString = bitStringOfByte + bitString;  
  }
  return bitString;
}

function binToDec(bitString){
  return parseInt(bitString, 2);
}

function byteArrayToDecimal(byteArray){
  var bitString = byteArrayToBitString(byteArray);
  return binToDec(bitString);
}

function encode32Bit(value){
  var u32 = new Uint32Array([value]);
  var u8 = new Uint8Array(u32.buffer);
  return window.bluetoothle.bytesToEncodedString(u8);
}

function encode8Bit(value){
  var u8 = new Uint8Array([value]);
  return window.bluetoothle.bytesToEncodedString(u8);
}

var growApp = angular.module('growApp', ['ngRoute', 'ngCordovaBluetoothLE', 'ngCordova']);

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
  $log.log("ascertain location permissions")
  $cordovaBluetoothLE.hasPermission().then(function (response) {
    $log.log("hasPermission: " + JSON.stringify(response));
    if (!response.hasPermission) {
      $cordovaBluetoothLE.requestPermission().then(function (response) {
        $log.log("Coarse location permissions granted: " + JSON.stringify(response));
      },
      function (response) {
        $log.log("Course location permissions declined: " + JSON.stringify(response));
      });
    }
  });
  

  document.addEventListener('onclick', function(){
    $scope.bleInit();
    $scope.startScan();
  });

  $scope.devices = {};

  $scope.bleInit = function(){
    var paramsInit = {
      request: true,
      statusReceiver: true,
      restoreKey: "growflowerpowerapp",
    };

    $cordovaBluetoothLE.initialize(paramsInit).then(function(response){
      $log.log("initialized: " + JSON.stringify(response));
    },
    function(reponse){
      $log.log("Failed to initialize bluetooth got response: " + JSON.stringify(response));
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
      params.matchMode = bluetoothle.MATCH_MODE_AGGRESSIVE;
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
      //$log.log("Discover Success : " + JSON.stringify(obj));
      
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
    return q.promise;
  };
  
  $scope.transferData = function (address) {

    var uploadService = "39E1FB00-84A8-11E2-AFBA-0002A5D5C51B";
    var params = {
      address: address,
      service: uploadService,
      characteristic: "39E1FB02-84A8-11E2-AFBA-0002A5D5C51B",
      timeout: 5000,
    };
    
    $log.log("subscribing...")
    
    $cordovaBluetoothLE.subscribe(params).then(null, function (response) {
      $log.log("subscription failed: " + JSON.stringify(response));
    }, 
    function(response){
      $log.log("subscribed to tx status:" + JSON.stringify(response));
      $cordovaBluetoothLE.subscribe({ address: address, service: params.service, characteristic: "39E1FB01-84A8-11E2-AFBA-0002A5D5C51B", timeout: params.timeout }).then(null, function (response) {
        $log.log("subscription failed: " + JSON.stringify(response));
      },
      function(response){
        $log.log("subscribed to tx buffer:" + JSON.stringify(response));
        $log.log("Beginning Transfer Process...");
  
        $scope.write(address, uploadService, "39E1FB03-84A8-11E2-AFBA-0002A5D5C51B", 0, 1).then(function (response) {  //0 -> Ready state
          $log.log("rx status set to ready state" + JSON.stringify(response));
        },
        function (response) {
          $log.log("failed to set rx status to ready: " + JSON.stringify(response));
        });
      });
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

      if (obj.status == "subscribedResult") {
        var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
        $log.log("Subscribe Success ASCII (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToString(bytes));
        $log.log("HEX (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToHex(bytes));
      } else if (obj.status == "subscribed") {
        $log.log("Subscribed: " + JSON.stringify(obj));
      } else {
        $log.log("Unexpected Subscribe Status");
      }
    });
  };

  $scope.gatherTransferSetupParameters = function(address){
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
        $scope.readCharacteristic(address, historyService, historyCharacUUIDs.nbEntries, "nbEntries", "U16"),
        $scope.readCharacteristic(address, historyService, historyCharacUUIDs.lastEntryIndex, "lastEntryIndex", "U32")
      ]).then(
        function (params) {
          var characterisitics = {};
          params.forEach(function(element){
            elementKey = Object.keys(element)[0];
            characterisitics[elementKey] = element[elementKey];
          });
          //$log.log(characterisitics);
          firstEntryIndex = calculateFirstEntryIndex(characterisitics.lastEntryIndex, characterisitics.nbEntries);
          //$log.log("first entry index: " + firstEntryIndex);
          $scope.write(address, historyService, historyCharacUUIDs.transferStartIndex, firstEntryIndex, 4).then(function(){
            $scope.transferData(address);
          },function(){
            $log.log("err failed to write transfer start index")
          });
        },
        function(){
          $log.log("err");
          q.reject();
        }
      );
  }

  $scope.readCharacteristic = function (address, service, characteristic, name, returnType) {
    var q = $q.defer();

    $cordovaBluetoothLE.read({ address: address, service: service, characteristic: characteristic }).then(
      function (obj) {
        var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
        var returnObj = {};
        switch(returnType){
          case "U16":
            returnObj[name] = byteArrayToDecimal(new Uint8Array(bytes));
            q.resolve(returnObj);
          case "U32":
            returnObj[name] = byteArrayToDecimal(new Uint8Array(bytes));
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

  function calculateStartupTime(deviceTime){
    var currentTime = new Date().getTime();
    return (currentTime - deviceTime);
  }

  function calculateFirstEntryIndex(lastEntryIndex, nbEntries){
    return lastEntryIndex - nbEntries + 1;;
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

    if (obj.name == "HTC BS 022AFD" || obj.name == "HTC BS D1DCA2" || obj.name == "[LG] webOS TV UJ630V"){
      return;
    }

    if ($scope.devices[obj.address] !== undefined) {
      return;
    }


    $log.log("adding device to list: " + JSON.stringify(obj));
    obj.services = {};
    $scope.devices[obj.address] = obj;
    $scope.stopScan();
  }

  $scope.write = function (address, service, characteristic, value, numOfBytes) {
    var q = $q.defer();
    
    if(numOfBytes === 4){
      var encodedString = encode32Bit(value); 
    }else if(numOfBytes === 1){
      var encodedString = encode8Bit(value);
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
      }, function(obj) {
        $log.log("Read Error : " + JSON.stringify(obj));
    });
  }
});
