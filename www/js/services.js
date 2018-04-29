'use strict';

/* Services */

var growAppServices = angular.module('growApp.services', ['ngCordova']);

growAppServices.value("addressService", {
	address: "90:03:B7:C9:D9:C7" //this should be fetched from the DB dependant on which device the user has chosen. Part of multiple devices epic.
})

growAppServices.service('Upload', ['$log', '$rootScope', 'DBCommunication', 'NetworkStatus', '$q', function ($log, $rootScope, DBCommunication, NetworkStatus, $q) {

	var networkOnline = function () {
		return NetworkStatus.getNetworkStatus();
	}

	this.attemptFileConversion = function (address) {
		$log.log("attemptFileConversion");
		if (networkOnline) {
			DBCommunication.isSentToApi(address).then(function (status) {
				if (status.isSent) {
					$log.log("Your latest download of the history file has already been converted");
				} else {
					$q.all([
						DBCommunication.getHistoryFile(address),
						DBCommunication.getStartupTime(address)
					]).then(function (reqValues) {
						var b64HistoryFile = reqValues[0];
						var startupTime = reqValues[1];

						var xhr = new XMLHttpRequest();

						xhr.addEventListener("readystatechange", function () {
							if (this.readyState === 4 && this.status == 200) {
								success(this.response, address);
							} else if (this.readyState === 4) {
								failure(this.response);
							}
						});

						xhr.open("POST", "http://us-central1-grow-app-202121.cloudfunctions.net/function-1", true);
						xhr.setRequestHeader("content-type", "text/plain")

						var reqObj = { startupTime: startupTime, b64History: b64HistoryFile }
						xhr.send(JSON.stringify(reqObj)); //Trying to stay close to CORS.
					});
				}
			});
		}
	}

	function success(response, address) {
		$log.log("Upload Success: " + response);
		// DBCommunication.setSentToAPI(); TODO: uncomment. Commented for dev purposes.
		DBCommunication.setCsvFile(address, response);
	}

	function failure(response) {
		$log.log("Upload Failed: " + JSON.stringify(response));
	}
}]);

growAppServices.service('TxPackets', ['$cordovaBluetoothLE', '$log', 'DataTxHelper', function ($cordovaBluetoothLE, $log, DataTxHelper) {
	this.transformPackets = function (packetQueue) {
		var group = [];
		group.push(
			_.map(packetQueue, function (encodedStr) {
				var hexBytes = $cordovaBluetoothLE.bytesToHex($cordovaBluetoothLE.encodedStringToBytes(encodedStr)).split(" ");
				var key = _.slice(hexBytes, 0, 2);
				key = key.reverse();
				key = key[0] + key[1].substring(2);
				key = parseInt(key, 16);
				var value = encodedStr//_.slice(hexBytes, 2).reverse();
				return { key, value };
			})
		);
		_.sortBy(group, function (packet) { return packet.key }) //ensures ascending order req of spec
		// $log.log("Group: "+ JSON.stringify(group));
		return group;
	}

	this.verifyGroup = function (group) {
		for (var i = 0; i < group.length; i++) {
			if (group[i].key !== i) {
				return 'ack';
			}
		}
		return 'nack';
	}

	this.getFileSize = function (headerFrame) {
		var encodedStr = headerFrame.value;
		var hexBytes = $cordovaBluetoothLE.bytesToHex($cordovaBluetoothLE.encodedStringToBytes(encodedStr)).split(" ");
		var payload = _.slice(hexBytes, 2).reverse();
		return parseInt(hexArrayToHexStr(payload), 16);
	}

	function hexArrayToHexStr(hexArray) {
		var hexStr = "";
		for (var i = 0; i < hexArray.length; i++) {
			$log.log(hexArray[i]);
			hexStr += hexArray[i].substring(2);
		}
		$log.log(hexStr);
		return hexStr;
	}
}]);

growAppServices.service('NetworkStatus', ['$log', '$rootScope', function ($log, $rootScope) {
	$rootScope.networkOnilne = false;
	document.addEventListener("offline", onOffline, false);
	document.addEventListener("online", onOnline, false);

	function onOffline() {
		$rootScope.networkOnilne = false;
	}

	function onOnline() {
		$rootScope.networkOnilne = true;
	}

	function checkConnection() {
		var networkState = navigator.connection.type;
		if (networkState != Connection.NONE) {
			return true;
		} else {
			return false;
		}
	}

	this.getNetworkStatus = function () {
		return checkConnection();
	}
}]);

growAppServices.service('DataTxHelper', ['$cordovaBluetoothLE', function ($cordovaBluetoothLE) {
	this.byteArrayToDecimal = function (byteArray) {
		var bitString = byteArrayToBitString(byteArray);
		return binToDec(bitString);
	}

	this.encode32Bit = function (value) {
		var u32 = new Uint32Array([value]);
		var u8 = new Uint8Array(u32.buffer);
		return window.bluetoothle.bytesToEncodedString(u8);
	}

	this.encode8Bit = function (value) {
		var u8 = new Uint8Array([value]);
		return window.bluetoothle.bytesToEncodedString(u8);
	}

	this.oneByteEncodedStrToDec = function (encodedString) {
		return parseInt($cordovaBluetoothLE.bytesToHex($cordovaBluetoothLE.encodedStringToBytes(encodedString)), 16);
	}

	function decToByteString(dec) {
		var binStr = dec.toString(2);
		while (binStr.length < 8) {
			binStr = "0" + binStr;
		}
		return binStr;
	}

	function byteArrayToBitString(byteArray) {
		var bitString = "";
		for (var i = 0; i < byteArray.length; i++) {
			var bitStringOfByte = decToByteString(byteArray[i]);
			bitString = bitStringOfByte + bitString;
		}
		return bitString;
	}

	function binToDec(bitString) {
		return parseInt(bitString, 2);
	}
}]);

// database/list service

growAppServices.service('DBCommunication', ['$cordovaSQLite', '$log', '$q', function ($cordovaSQLite, $log, $q) {
	var db = $cordovaSQLite.openDB({ name: "growApp.db", location: 'default' });

	//====Begin reigon HistoryFileTable====
	this.setHistoryFile = function (address, b64HistoryFile, startupTime) {
		db.sqlBatch([
			'CREATE TABLE IF NOT EXISTS HistoryFileTable (systemID TEXT NOT NULL PRIMARY KEY, historyFile TEXT NOT NULL, startupTime INT NOT NULL,sentToAPI INT NOT NULL)',
			['INSERT OR REPLACE INTO HistoryFileTable VALUES (?,?,?,?)', [getPeripheralSystemID(address), b64HistoryFile, startupTime, 0]],
		], function () {
			$log.log('Populated database OK');
			return true;
		}, function (error) {
			$log.log('SQL batch ERROR: ' + error.message);
			return false;
		});
	}

	this.getHistoryFile = function (address) {
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

	this.getStartupTime = function (address) {
		var q = $q.defer();

		db.executeSql('SELECT startupTime FROM HistoryFileTable WHERE systemID = (?)', [getPeripheralSystemID(address)], function (rs) {
			var result = rs.rows.item(0).startupTime
			q.resolve(result);
		}, function (error) {
			$log.log('SELECT SQL statement ERROR: ' + error.message);
			q.reject(error.message);
		});
		return q.promise;
	}

	this.setSentToAPI = function (address) {
		db.sqlBatch([
			['UPDATE HistoryFileTable SET sentToAPI = (?)', [1]],
		], function () {
			$log.log('History file updated as sent to api');
		}, function (error) {
			$log.log('SQL batch ERROR: ' + error.message);
		});
	}

	this.isSentToApi = function (address) {
		var q = $q.defer();

		db.executeSql('SELECT sentToAPI FROM HistoryFileTable WHERE systemID = (?)', [getPeripheralSystemID(address)], function (rs) {
			var result = rs.rows.item(0).sentToAPI;
			$log.log('sentToAPI: ' + result);
			if (result === 1) {
				q.resolve({ isSent: true });
			} else {
				q.resolve({ isSent: false });
			}
		}, function (error) {
			$log.log('SELECT SQL statement ERROR: ' + error.message);
			q.reject(error);
		});
		return q.promise;
	}

	this.dropTable = function () {
		db.executeSql('DROP TABLE IF EXISTS HistoryFileTable'), [], function (rs) {
			$log.log("Table dropped: " + JSON.stringify(rs));
		}, function (error) {
			$log.log('Drop table error: ' + error.message);
		}
	}
	//====End reigon HistoryFileTable====

	//====Begin reigon CsvFileTable====
	this.setCsvFile = function (address, csvFile) {
		db.sqlBatch([
			'CREATE TABLE IF NOT EXISTS CsvFileTable (systemID TEXT NOT NULL PRIMARY KEY, csvFile TEXT NOT NULL)',
			['INSERT OR REPLACE INTO CsvFileTable VALUES (?,?)', [getPeripheralSystemID(address), csvFile]],
		], function () {
			$log.log('Populated database OK');
			return true;
		}, function (error) {
			$log.log('SQL batch ERROR: ' + error.message);
			return false;
		});
	}

	this.getCsvFile = function (address) {
		var q = $q.defer();

		db.executeSql('SELECT csvFile FROM CsvFileTable WHERE systemID = (?)', [getPeripheralSystemID(address)], function (rs) {
			var result = rs.rows.item(0).csvFile
			q.resolve(result);
		}, function (error) {
			$log.log('SELECT SQL statement ERROR: ' + error.message);
			q.reject(error.message);
		});
		return q.promise;
	}

	//====End reigon CsvFileTable====

	function getPeripheralSystemID(address) {
		var byteArray = address.split(':'); //example address -> 90:03:B7:C9:D9:C7
		var systemID = byteArray.slice(0, 3).join('') + "0000" + byteArray.slice(3).join('');
		return systemID;
	}
}]);

//====Begin reigon BLE Services====

growAppServices.service('Connect', ['$q', '$cordovaBluetoothLE', '$rootScope', '$log', function ($q, $cordovaBluetoothLE, $rootScope, $log) {

	this.connectToDevice = function (address) {
		var q = $q.defer()

		connect(address).then(function () {
			return discover(address)
		}).then(function () {
			q.resolve();
		},
			function (err) {
				q.reject(err)
			});

		return q.promise;
	}

	function connect(address) {
		var q = $q.defer();

		var params = { address: address, timeout: 10000 };

		$log.log("Connect : " + JSON.stringify(params));

		$cordovaBluetoothLE.connect(params).then(null, function (obj) {
			$log.log("Connect Error : " + JSON.stringify(obj));
			$cordovaBluetoothLE.close(params).then(function (obj) { //Best practice is to close on connection error
				$log.log("Close Success : " + JSON.stringify(obj));
				q.reject(obj);
			}, function (obj) {
				$log.log("Close Error : " + JSON.stringify(obj));
				q.reject(obj);
			});
		},
			function (obj) {
				$log.log("Connect Success : " + JSON.stringify(obj));
				q.resolve(obj);
			});
		return q.promise;
	};

	var devices = {};

	function discover(address) {
		var q = $q.defer()
		var params = {
			address: address,
			timeout: 50000 //10000 DEFAULT
		};

		$log.log("Discover : " + JSON.stringify(params));

		$cordovaBluetoothLE.discover(params).then(function (obj) {
			//$log.log("Discover Success : " + JSON.stringify(obj));

			var device = $rootScope.devices[obj.address];

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
			q.resolve();
		}, function (obj) {
			$log.log("Discover Error : " + JSON.stringify(obj));
			q.reject();
		});
		return q.promise;
	};

	function addService(service, device) {
		if (device.services[service.uuid] !== undefined) {
			return;
		}
		device.services[service.uuid] = { uuid: service.uuid, characteristics: {} };
	}

	function addCharacteristic(characteristic, service) {
		if (service.characteristics[characteristic.uuid] !== undefined) {
			return;
		}
		service.characteristics[characteristic.uuid] = { uuid: characteristic.uuid, descriptors: {}, properties: characteristic.properties };
	}

	function addDescriptor(descriptor, characteristic) {
		if (characteristic.descriptors[descriptor.uuid] !== undefined) {
			return;
		}
		characteristic.descriptors[descriptor.uuid] = { uuid: descriptor.uuid };
	}

}]);

growAppServices.service('InitializeCentral', ['$cordovaBluetoothLE', '$log', '$q', function ($cordovaBluetoothLE, $log, $q) {


	this.prepareDeviceForBle = function () {
		var q = $q.defer();
		$log.log("Initializing...");
		getLocationPermissions().then(function (response) {
			$cordovaBluetoothLE.isInitialized().then(function (obj) {
				if (obj.isInitialized) {
					return q.resolve();
				} else {
					var paramsInit = {
						request: true,
						statusReceiver: true,
						restoreKey: "growflowerpowerapp",
					};
					$cordovaBluetoothLE.initialize(paramsInit).then(null, function (obj) {
						return q.reject(obj.message);
					}, function (obj) {
						return q.resolve();
					});
				}
			}, function (obj) {
				return q.reject(obj.message);
			});
		});
		return q.promise;
	}

	function getLocationPermissions() {
		var q = $q.defer();

		$log.log("ascertain location permissions")
		$cordovaBluetoothLE.hasPermission().then(function (response) {
			$log.log("hasPermission: " + JSON.stringify(response));
			if (response.hasPermission) {
				q.resolve(response);
			} else {
				$cordovaBluetoothLE.requestPermission().then(function (response) {
					$log.log("Coarse location permissions granted: " + JSON.stringify(response));
					q.resolve(response);
				},
					function (response) {
						$log.log("Course location permissions declined: " + JSON.stringify(response));
						q.reject(response);
					});
			}
		});

		return q.promise;
	}
}]);

growAppServices.service('Read', ['$q', 'DataTxHelper', '$cordovaBluetoothLE', '$log', function ($q, DataTxHelper, $cordovaBluetoothLE, $log) {

	this.readCharacteristic = function (address, service, characteristic, name, returnType) {
		var q = $q.defer();

		$cordovaBluetoothLE.read({ address: address, service: service, characteristic: characteristic }).then(
			function (obj) {
				var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
				var returnObj = {};
				switch (returnType) {
					case "U16":
						returnObj[name] = DataTxHelper.byteArrayToDecimal(new Uint8Array(bytes));
						q.resolve(returnObj);
					case "U32":
						returnObj[name] = DataTxHelper.byteArrayToDecimal(new Uint8Array(bytes));
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
}]);

growAppServices.service('Scanning', ['InitializeCentral', '$cordovaBluetoothLE', '$log', '$q', '$rootScope', function (InitializeCentral, $cordovaBluetoothLE, $log, $q, $rootScope) {
	InitializeCentral.prepareDeviceForBle();

	this.scan = function () {
		var q = $q.defer();

		var scanRetObject = {};
		startScan().then(function (obj) {
			scanRetObject = obj;
			return stopScan()
		}).then(function () {
			q.resolve(scanRetObject);
		},
			function () {
				$log.log("scanning failed.");
				q.reject();
			});

		return q.promise;
	}

	function startScan() {
		var q = $q.defer();

		var params = {
			services: ["39E1FA00-84A8-11E2-AFBA-0002A5D5C51B"], //Will only return devices with this service(live service) i.e. only flower power devices.
			allowDuplicates: false,
			//scanTimeout: 15000,
		};

		if (window.cordova) {
			params.scanMode = bluetoothle.SCAN_MODE_LOW_LATENCY;
			params.matchMode = bluetoothle.MATCH_MODE_AGGRESSIVE;
			params.matchNum = bluetoothle.MATCH_NUM_MAX_ADVERTISEMENT;
			params.callbackType = bluetoothle.CALLBACK_TYPE_ALL_MATCHES;
		}

		$log.log("Start Scan : " + JSON.stringify(params));

		$cordovaBluetoothLE.startScan(params).then(function (obj) {
			$log.log("Start Scan Auto Stop : " + JSON.stringify(obj));
			q.reject();
		}, function (obj) {
			$log.log("Start Scan Error : " + JSON.stringify(obj));
			q.reject()
		}, function (obj) {
			$log.log("Start Scan Success : " + JSON.stringify(obj));
			addDevice(obj);
			if (obj.address == "90:03:B7:C9:D9:C7") {
				q.resolve(obj);
			}
		});
		return q.promise;
	}

	function stopScan() {
		var q = $q.defer();

		$log.log("Stop Scan");

		$cordovaBluetoothLE.stopScan().then(function (obj) {
			$log.log("Stop Scan Success : " + JSON.stringify(obj));
			q.resolve();
		}, function (obj) {
			$log.log("Stop Scan Error : " + JSON.stringify(obj));
			q.reject();
		});

		return q.promise;
	};

	function addDevice(obj) {
		if (obj.status == "scanStarted") {
			return;
		}


		if ($rootScope.devices[obj.address] !== undefined) {
			return;
		}

		$log.log("adding device to list: " + JSON.stringify(obj));
		obj.services = {};
		$rootScope.devices[obj.address] = obj;
	}
}]);

growAppServices.service('Subscribe', ['$q', '$cordovaBluetoothLE', '$log', function ($q, $cordovaBluetoothLE, $log) {



	this.subscribe = function (address, service, characteristic) {
		var q = $q.defer();

		var params = {
			address: address,
			service: service,
			characteristic: characteristic,
			timeout: 5000,
			//subscribeTimeout: 5000
		};

		$log.log("Subscribe : " + JSON.stringify(params));

		$cordovaBluetoothLE.subscribe(params).then(function (obj) {
			$log.log("Subscribe Auto Unsubscribe : " + JSON.stringify(obj));
			q.resolve();
		}, function (obj) {
			$log.log("Subscribe Error : " + JSON.stringify(obj));
			q.reject();
		}, function (obj) {
			//$log.log("Subscribe Success : " + JSON.stringify(obj));

			if (obj.status == "subscribedResult") {
				//$log.log("Subscribed Result");
				// var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
				// $log.log("Subscribe Success ASCII (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToString(bytes));
				// $log.log("HEX (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToHex(bytes));
				q.notify(obj);
			} else if (obj.status == "subscribed") {
				$log.log("Subscribed");
				q.notify(obj);
			} else {
				$log.log("Unexpected Subscribe Status");
				q.notify(obj);
			}
		});

		return q.promise;
	};
}]);

growAppServices.service('Write', ['$q', 'DataTxHelper', '$cordovaBluetoothLE', '$log', function ($q, DataTxHelper, $cordovaBluetoothLE, $log) {

	this.writeValueToCharacteristic = function (address, service, characteristic, value, numOfBytes) {
		var q = $q.defer();

		if (numOfBytes === 4) {
			var encodedString = DataTxHelper.encode32Bit(value);
		} else if (numOfBytes === 1) {
			var encodedString = DataTxHelper.encode8Bit(value);
		}

		var params = {
			address: address,
			service: service,
			characteristic: characteristic,
			value: encodedString,
			timeout: 5000
		};

		$cordovaBluetoothLE.write(params).then(function (response) {
			$log.log("Write Success : " + JSON.stringify(response));
			q.resolve(response);
		}, function (response) {
			$log.log("Write Error : " + JSON.stringify(response));
			q.reject(response);
		});
		return q.promise;
	};
}]);

//====End reigon BLE Services====

