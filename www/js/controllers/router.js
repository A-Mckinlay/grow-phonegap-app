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

growApp.controller('router', function($scope, $cordovaBluetoothLE, $cordovaSQLite, $log){

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
    });
  };

  function addDevice(obj) {
    if (obj.status == "scanStarted") {
      return;
    }

    if(obj.name == ""){
      return;
    }

    if ($scope.devices[obj.address] !== undefined) {
      return;
    }

    obj.services = {};
    $scope.devices[obj.address] = obj;
    $scope.stopScan();
    $scope.connect(obj.address);
  }
});
