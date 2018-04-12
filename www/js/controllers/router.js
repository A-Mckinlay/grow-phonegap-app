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
        $log.log("read return value: " + JSON.stringify(obj));
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
    $log.log("params: " + lastEntryIndex + "    " + nbEntries);
    var ret = lastEntryIndex - nbEntries +1;

    $log.log("return of sum: " + ret);
    return (ret);
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
  
  $scope.encode32Bit = function (value) {
    var u32 = new Uint32Array([value]); // Create a new Types Array, which is a special view for an Array Buffer
    var u8 = new Uint8Array(u32.buffer); // We transmit bytewise, so use an 8 Bit View on the Array Buffer
    $log.log("u8: " + u8);
    return $cordovaBluetoothLE.bytesToEncodedString(u8); // Encode this Base64
  }

  $scope.write = function (address, service, characteristic, value, numOfBytes) {
    var q = $q.defer();
    
    var buffer = new ArrayBuffer(numOfBytes);
    $log.log("Buffer init: " + JSON.stringify(buffer));
    switch(numOfBytes){
      case 4:
      new DataView(buffer).setUint32(0, value, false);
      $log.log("buffer: " + JSON.stringify(buffer));
      var byteArray = new Uint8Array(buffer);
      $log.log("byteArray: " + JSON.stringify(byteArray));
      // var encodedString = base64js.fromByteArray(byteArray);
      var encodedString = $scope.encode32Bit(value); 
        $log.log("Encoded String: " + encodedString);
      case 1:
        
    }


    var params = {
      address: address,
      service: service,
      characteristic: characteristic,
      value: encodedString,
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
// Converts an ArrayBuffer directly to base64, without any intermediate 'convert to string then
// use window.btoa' step. According to my tests, this appears to be a faster approach:
// http://jsperf.com/encoding-xhr-image-data/5

/*
MIT LICENSE
Copyright 2011 Jon Leighton
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


function base64ArrayBuffer(arrayBuffer) {
  var base64 = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes = new Uint8Array(arrayBuffer)
  var byteLength = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4 // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2 // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }

  return base64
}
