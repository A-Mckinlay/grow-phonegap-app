var growApp = angular.module('growApp', ['ngRoute', 'ngCordovaBluetoothLE', 'ngCordova', 'cordovaHTTP']);

// configure our routes
growApp.config(function ($routeProvider) {
    $routeProvider
        // route for the home page
        .when('/', {
            templateUrl: 'templates/home.html',
            controller: 'homeController'
        });
});

document.addEventListener("deviceready", function () { //manually bootstrap angular as need to wait on Cordova deviceready event before doing so.
    // retrieve the DOM element that had the ng-app attribute
    var domElement = document.getElementById("growApp");
    angular.bootstrap(domElement, ["growApp"]);
}, false);