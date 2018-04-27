var growApp = angular.module('growApp');

growApp.service('DBCommunication', ['$cordovaSQLite', '$log', function ($cordovaSQLite, $log) {
    var db = $cordovaSQLite.openDB({ name: "growApp.db", location: 'default' });

    this.testDB = function(address, b64HistoryFile){
        db.sqlBatch([
            'CREATE TABLE IF NOT EXISTS HistoryFileTable (systemID TEXT NOT NULL PRIMARY KEY, historyFile TEXT NOT NULL)',
            ['INSERT INTO HistoryFileTable VALUES (?,?)', [getPeripheralSystemID(address), b64HistoryFile]],
        ], function () {
            $log.log('Populated database OK');
        }, function (error) {
            $log.log('SQL batch ERROR: ' + error.message);
        });
    }

    this.getHistoryFile = function (address){
        db.executeSql('SELECT historyFile FROM HistoryFileTable WHERE systemID = (?)', [getPeripheralSystemID(address)], function (rs) {
            $log.log('history file: ' + rs.rows.item(0).historyFile);
        }, function (error) {
            $log.log('SELECT SQL statement ERROR: ' + error.message);
        });
    }

    function getPeripheralSystemID(address){
        byteArray = address.split(':'); //example address -> 90:03:B7:C9:D9:C7
        var systemID = byteArray.slice(0, 3).join('') + "0000" + byteArray.slice(3).join('');
        $log.log("SystemID: " + systemID);
        return systemID;
    }
}]);