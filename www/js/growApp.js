'use strict';
// Declare app level module which depends on views, and components
var growApp = angular.module('growApp', [
    'ngRoute',
    'ngCordova',
    'ngTouch',
    'ngCordovaBluetoothLE',
    'cordovaHTTP',
    'chart.js',
    'growApp.main',
    'growApp.graph',
    'growApp.services',
]);

growApp.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $locationProvider.hashPrefix('!');
    $routeProvider.otherwise({redirectTo: '/main'})
}]);

var onDeviceReady = function () {
    console.log("onDeviceReady");
    angular.bootstrap(document, ['growApp']);
};

document.addEventListener('deviceready', onDeviceReady);