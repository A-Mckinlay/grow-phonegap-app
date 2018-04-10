/**
* Convert From/To Binary/Decimal/Hexadecimal in JavaScript
* https://gist.github.com/faisalman
*
* Copyright 2012-2015, Faisalman <fyzlman@gmail.com>
* Licensed under The MIT License
* http://www.opensource.org/licenses/mit-license
*/
(function () {

  var ConvertBase = function (num) {
    return {
      from: function (baseFrom) {
        return {
          to: function (baseTo) {
            return parseInt(num, baseFrom).toString(baseTo);
          }
        };
      }
    };
  };

  // binary to decimal
  ConvertBase.bin2dec = function (num) {
    return ConvertBase(num).from(2).to(10);
  };

  // binary to hexadecimal
  ConvertBase.bin2hex = function (num) {
    return ConvertBase(num).from(2).to(16);
  };

  // decimal to binary
  ConvertBase.dec2bin = function (num) {
    return ConvertBase(num).from(10).to(2);
  };

  // decimal to hexadecimal
  ConvertBase.dec2hex = function (num) {
    return ConvertBase(num).from(10).to(16);
  };

  // hexadecimal to binary
  ConvertBase.hex2bin = function (num) {
    return ConvertBase(num).from(16).to(2);
  };

  // hexadecimal to decimal
  ConvertBase.hex2dec = function (num) {
    return ConvertBase(num).from(16).to(10);
  };

  this.ConvertBase = ConvertBase;

})(this);

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

if (!Int8Array.__proto__.from) {
  (function () {
    Int8Array.__proto__.from = function (obj, func, thisObj) {

      var typedArrayClass = Int8Array.__proto__;
      if (typeof this !== 'function') {
        throw new TypeError('# is not a constructor');
      }
      if (this.__proto__ !== typedArrayClass) {
        throw new TypeError('this is not a typed array.');
      }

      func = func || function (elem) {
        return elem;
      };

      if (typeof func !== 'function') {
        throw new TypeError('specified argument is not a function');
      }

      obj = Object(obj);
      if (!obj['length']) {
        return new this(0);
      }
      var copy_data = [];
      for (var i = 0; i < obj.length; i++) {
        copy_data.push(obj[i]);
      }

      copy_data = copy_data.map(func, thisObj);

      var typed_array = new this(copy_data.length);
      for (var i = 0; i < typed_array.length; i++) {
        typed_array[i] = copy_data[i];
      }
      return typed_array;
    }
  })();
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
      request: true,
      "statusReceiver": true,
      "restoreKey": "growflowerpowerapp"
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
    return q.promise;
  };
  
  $scope.transferData = function (address) {
    var q = $q.defer();

    var uploadService = "39E1FB00-84A8-11E2-AFBA-0002A5D5C51B";
    var params = {
      address: address,
      service: uploadService,
      characteristic: "39E1FB02-84A8-11E2-AFBA-0002A5D5C51B"
    };
    
    $cordovaBluetoothLE.subscribe(params).then(null, function (obj) {
      q.reject(obj.message);
    }, function (obj) {
      $scope.write(address, uploadService, "39E1FB03-84A8-11E2-AFBA-0002A5D5C51B", 0, 1).then(function () {  //0 -> Ready state
        $log.log("rx status is now ready boi!");
      }, function (obj) {
        $log.log("failed to set rx status to ready: " + JSON.stringify(obj));
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
          $log.log(characterisitics);
          firstEntryIndex = calculateFirstEntryIndex(characterisitics.lastEntryIndex, characterisitics.nbEntries);
          $log.log("first entry index: " + firstEntryIndex);
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
            returnObj[name] = new Int16Array(bytes).join('')
            q.resolve(returnObj);
          case "U32":
            returnObj[name] = new Int32Array(bytes).join('')
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
    return (lastEntryIndex - nbEntries + 1);
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

  function binStringToTypedBinStr(binString, numOfBytes){
    var leadingZeros = (numOfBytes * 8) - binString.length;
    var filledBinStr = "";
    if (leadingZeros > 0){
      for(var i=0; i<leadingZeros; i++){
        filledBinStr += '0';
      }
    }
    return filledBinStr + binString;
  }

  $scope.write = function (address, service, characteristic, value, numOfBytes) {
    var q = $q.defer();

    var buffer = new ArrayBuffer(numOfBytes);
    switch(numOfBytes){
      case 4:
        var typedByteArray = new Uint32Array(buffer);
        typedByteArray = Uint32Array.from(value.toString(2));
      case 1:
        // var dataView = new DataView(buffer).setUint8(0,value,true);
        // var typedArray = new Uint8Array(buffer);
        // var encodedString = $cordovaBluetoothLE.bytesToEncodedString(buffer);
    }


    var params = {
      address: address,
      service: service,
      characteristic: characteristic,
      value: window.btoa("00000001100001010011111110001100"),
      timeout: 5000
    };

    $log.log("Write : " + JSON.stringify(params));

    $cordovaBluetoothLE.write(params).then(function (obj) {
      $log.log("Write Success : " + JSON.stringify(obj));
      q.resolve(obj);
    }, function (obj) {
      $log.log("Write Error : " + JSON.stringify(obj));
      q.reject(obj);
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