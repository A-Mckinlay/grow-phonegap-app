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

    $scope.transformCsv = function(){
        DBCommunication.getCsvFile(addressService.address).then(function(histCsv){
            var histJson = window.Papa.parse(histCsv, { header: true, trimHeader: true });
            $log.log(histJson);
            var dataArray = [];
            dataArray.push(_.forEach(histJson.data, function(obj){
                return {
                    x: obj.Date,
                    y: parseFloat(obj[" Light (mol/m²/d)"])
                }
            }))
            $log.log(dataArray);
        });
    }

    $scope.labels = ["January", "February", "March", "April", "May", "June", "July"];
    $scope.series = ['Series A', 'Series B'];
    $scope.data = [
        [65, 59, 80, 81, 56, 55, 40],
        [28, 48, 40, 19, 86, 27, 90]
    ];
    $scope.onClick = function (points, evt) {
        $log.log(points, evt);
    };
    $scope.datasetOverride = [{ yAxisID: 'y-axis-1' }, { yAxisID: 'y-axis-2' }];
    $scope.options = {
        scales: {
            yAxes: [
                {
                    id: 'y-axis-1',
                    type: 'linear',
                    display: true,
                    position: 'left'
                },
                {
                    id: 'y-axis-2',
                    type: 'linear',
                    display: true,
                    position: 'right'
                }
            ]
        }
    };
}]);
