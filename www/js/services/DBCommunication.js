var growApp = angular.module('growApp');

growApp.service('DBCommunication', ['$cordovaSQLite', '$log', function ($cordovaSQLite, $log) {
    var db = $cordovaSQLite.openDB({ name: "growApp.db", location: 'default' });

    //====Begin reigon HistoryFileTable====
    this.setHistoryFile = function(address, b64HistoryFile){
        db.sqlBatch([
            'CREATE TABLE IF NOT EXISTS HistoryFileTable (systemID TEXT NOT NULL PRIMARY KEY, historyFile TEXT NOT NULL, sentToAPI INT NOT NULL)',
            ['INSERT OR REPLACE INTO HistoryFileTable VALUES (?,?,?)', [getPeripheralSystemID(address), b64HistoryFile, 0]],
        ], function () {
            $log.log('Populated database OK');
            return true;
        }, function (error) {
            $log.log('SQL batch ERROR: ' + error.message);
            return false;
        });
    }

    this.getHistoryFile = function (address){
        db.executeSql('SELECT historyFile FROM HistoryFileTable WHERE systemID = (?)', [getPeripheralSystemID(address)], function (rs) {
            $log.log('history file: ' + rs.rows.item(0).historyFile);
        }, function (error) {
            $log.log('SELECT SQL statement ERROR: ' + error.message);
        });
    }

    this.setSentToAPI = function(address) {
        db.sqlBatch([
            ['UPDATE HistoryFileTable SET sentToAPI = (?)', [1]],
        ], function () {
            $log.log('History file updated as sent to api');
        }, function (error) {
            $log.log('SQL batch ERROR: ' + error.message);
        });
    }

    this.dropTable = function(){
        db.executeSql('DROP TABLE IF EXISTS HistoryFileTable'), [], function(rs){
            $log.log("Table dropped: " + JSON.stringify(rs));
        }, function(error){
            $log.log('Drop table error: ' + error.message);
        }
    }
    //====End reigon HistoryFileTable====

    //====Begin reigon HistoryTable====
    
    //====End reigon HistoryTable====
    function getPeripheralSystemID(address){
        byteArray = address.split(':'); //example address -> 90:03:B7:C9:D9:C7
        var systemID = byteArray.slice(0, 3).join('') + "0000" + byteArray.slice(3).join('');
        $log.log("SystemID: " + systemID);
        return systemID;
    }
}]);