'use strict';
var growAppGraph = angular.module('growApp.graph', [
    'ngRoute',
    'ngCordova',
    'ngTouch',
    'chart.js',
    'growApp.services',
]);

growAppGraph.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/graph', {
        templateUrl: 'js/views/graph/graph.html',
        controller: 'graphCtrl'
    });
}]);

growAppGraph.controller('graphCtrl', ['$location', '$scope', '$log', 'DBCommunication', 'ChartJs', 'addressService', function ($location, $scope, $log, DBCommunication, ChartJs, addressService) {

    $scope.goToMain = function () {
        $location.path('/main')
    }

    DBCommunication.getCsvFile(addressService.address).then(function(histCsv){  //Get data, if it exists, on page load.
        var histJson = window.Papa.parse(histCsv, { header: true, trimHeader: true });
        var dataArray = _.forEach(histJson.data, function(obj){
            return {
                x: obj.Date,
                y: parseFloat(obj[" Light (mol/m²/d)"])
            };
        });
        $log.log(dataArray);
        var averagedData = averageData(dataArray);
        var labels = extractLabels(averagedData);
        $log.log("labels: " + JSON.stringify(labels));
        $scope.labels = labels;
        $scope.series = [];
        $scope.data = averagedData;
        $scope.onClick = function (points, evt) {
            console.log(points, evt);
        };
        $scope.options = {};
    });

    function extractLabels(averagedData) {
        var labels = _.map(averagedData, function(dataPoint){
            var date = new Date(dataPoint.x * 1000);
            return date.getDate().toString() + "/" + (date.getMonth() + 1).toString()
        });
        return labels;
    }

    function averageData(data){
        $log.log("extract labels: " + JSON.stringify(data))
        var rangeAverages = [];
        var i, j, temparray, chunk = 50;
        for (i = 0, j = data.length; i < j; i += chunk) {
            temparray = data.slice(i, i + chunk);

            var avg = _.meanBy(temparray, function(dataPoint){
                $log.log("light: " + parseFloat(dataPoint[" Light (mol/m²/d)"]));
                if (parseFloat(dataPoint[" Light (mol/m²/d)"]) == Infinity){
                    return 0;
                } else{
                    return parseFloat(dataPoint[" Light (mol/m²/d)"]);
                }
            });
            var firstDate = temparray[0].Date;
            rangeAverages.push({ x: firstDate, y: Math.round(avg) });
        }
        $log.log("range averages: " + JSON.stringify(rangeAverages));
        return rangeAverages;
    }
}]);
