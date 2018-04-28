var growApp = angular.module('growApp');

growApp.service('DBCommunication', ['$cordovaSQLite', '$log', '$q',  function ($cordovaSQLite, $log, $q) {
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
        var q = $q.defer();

        db.executeSql('SELECT historyFile FROM HistoryFileTable WHERE systemID = (?)', [getPeripheralSystemID(address)], function (rs) {
            var result = rs.rows.item(0).historyFile
            q.resolve(result);
        }, function (error) {
            $log.log('SELECT SQL statement ERROR: ' + error.message);
            q.reject(error.message);
        });
        return q.promise;
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

    this.isSentToApi = function(address) {
        var q = $q.defer();

        db.executeSql('SELECT sentToAPI FROM HistoryFileTable WHERE systemID = (?)', [getPeripheralSystemID(address)], function (rs) {
            var result = rs.rows.item(0).sentToAPI;
            $log.log('sentToAPI: ' + result);
            if(result === 1)
            {
                q.resolve({isSent: true});
            } else {
                q.resolve({isSent: false});
            }
        }, function (error) {
            $log.log('SELECT SQL statement ERROR: ' + error.message);
            q.reject(error);
        });
        return q.promise;
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
        return systemID;
    }
}]);