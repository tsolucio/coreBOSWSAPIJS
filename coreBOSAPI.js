/* coreBOS Webservice API Service */
'use strict';
angular.module('coreBOSAPIservice', [])
  .value('version', 'coreBOS2.1')
  .factory('coreBOSWSAPI', function($http, md5, coreBOSAPIStatus) {

		// Webservice access point
		var _servicebase = 'webservice.php';
		var _serviceurl = _servicebase;

		// Webservice user credentials
		var _serviceuser= false;
		var _servicekey = false;

		// Webservice login validity
		var _servicetoken=false;

		var corebosAPI = {};
		var apiConfigured = false;
		
		corebosAPI.setConfigured = function() {
			apiConfigured = !((_servicekey === false || _servicekey=='' || _servicekey=='PUT YOUR USER ACCESS KEY HERE') && coreBOSAPIStatus.getSessionInfo()=={});
		};
		corebosAPI.setConfigured();
		corebosAPI.isConfigured = function(newkey) {
			return apiConfigured;
		};
		corebosAPI.setcoreBOSUser = function(newkey,dologin) {
			dologin = typeof dologin !== 'undefined' ? dologin : false;
			_serviceuser = newkey;
			if (dologin)
				corebosAPI.doLogin(corebosAPI.getcoreBOSUser(),corebosAPI.getcoreBOSKey()).then(function() {});
		};
		corebosAPI.getcoreBOSUser = function() {
			return _serviceuser;
		};
		corebosAPI.setcoreBOSKey = function(newkey,dologin) {
			dologin = typeof dologin !== 'undefined' ? dologin : false;
			_servicekey = newkey;
			corebosAPI.setConfigured();
			if (dologin)
				corebosAPI.doLogin(corebosAPI.getcoreBOSUser(),corebosAPI.getcoreBOSKey()).then(function() {});
		};
		corebosAPI.getcoreBOSKey = function() {
			return _servicekey;
		};
		
		// Get the URL for sending webservice request.
		function getWebServiceURL(url) {
			if(url.indexOf(_servicebase) == -1) {  // no servicebase so we setup the whole thing
				if(url.charAt(url.length-1) != '/') {
					url = url + '/';
				}
				url = url + _servicebase;
			} // if not we suppose the URL is correct
			return url;
		}
		corebosAPI.setURL = function(url,dologin) {
			dologin = typeof dologin !== 'undefined' ? dologin : false;
			_serviceurl = getWebServiceURL(url);
			coreBOSAPIStatus.setServiceURL(url); // to control invalid access
			if (dologin)
				corebosAPI.doLogin(corebosAPI.getcoreBOSUser(),corebosAPI.getcoreBOSKey()).then(function() {});
		};
		corebosAPI.getURL = function() {
			return _serviceurl;
		};
		
		// Last operation error information
		var _lasterror  = false;
		
		corebosAPI.getlasterror = function() {
			return corebosAPI._lasterror;
		};
		// Check if result has any error.
		corebosAPI.hasError = function(resultdata) {
			if (resultdata != null && resultdata['success'] == false) {
				corebosAPI._lasterror = resultdata['error'];
				return true;
			}
			corebosAPI._lasterror = false;
			return false;
		};

		/**
		 * Perform the challenge
		 * @access private
		 */
		function __doChallenge(username) {
			var getdata = {
				'operation' : 'getchallenge',
				'username'  : username
			};
			return $http({
				method : 'GET',
				url : _serviceurl,
				params: getdata
			});
		}

		/**
		 * Perform the challenge
		 * @access public
		 */
		corebosAPI.doChallenge = function(username) {
			var getdata = {
				'operation' : 'getchallenge',
				'username'  : username
			};
			return $http({
				method : 'GET',
				url : _serviceurl,
				params: getdata
			});
		};

		corebosAPI.processDoChallenge = function(res, status) {
			var resobj = res.data;
			if(corebosAPI.hasError(res.data) == false) {
				var result = resobj['result'];
				_servicetoken = result.token;
				coreBOSAPIStatus.setServerTime(result.serverTime);
				coreBOSAPIStatus.setExpireTime(result.expireTime);
				return _servicetoken;
			} else {
				return false;
			}
		};

		/**
		 * Do Login Operation with a given challenge token
		 */
		corebosAPI.doLoginWithChallengeToken = function(username, accesskey, withpassword, chtoken) {
			if (username==undefined) username = corebosAPI.getcoreBOSUser();
			if (accesskey==undefined) accesskey = corebosAPI.getcoreBOSKey();
			if (withpassword==undefined) withpassword = false;
			corebosAPI.setcoreBOSUser(username);
			corebosAPI.setcoreBOSKey(accesskey);
			var postdata = {
				'operation' : 'login',
				'username'  : username,
				'accessKey' : (withpassword ? chtoken + accesskey : md5.createHash(chtoken + accesskey))
			};
			return $http({
				method : 'POST',
				url : _serviceurl,
				data: postdata
			});
		};

		/**
		 * Do Login Operation
		 */
		corebosAPI.doLogin = function(username, accesskey, withpassword) {
			if (username==undefined) username = corebosAPI.getcoreBOSUser();
			if (accesskey==undefined) accesskey = corebosAPI.getcoreBOSKey();
			if (withpassword==undefined) withpassword = false;
			return __doChallenge(username).then(function(res){
				corebosAPI.processDoChallenge(res);
				if(_servicetoken == false) {
					return false;  // Failed to get the service token
				}
	
				corebosAPI.setcoreBOSUser(username);
				corebosAPI.setcoreBOSKey(accesskey);

				var postdata = {
					'operation' : 'login',
					'username'  : username,
					'accessKey' : (withpassword ? _servicetoken + accesskey : md5.createHash(_servicetoken + accesskey))
				};
				return $http({
					method : 'POST',
					url : _serviceurl,
					data: postdata
				});
			}); // end then doChallenge
		};

		/**
		 * Do Logout Operation
		 */
		corebosAPI.doLogout = function() {
			if (coreBOSAPIStatus.hasInvalidKeys()) {  // not logged in
				return true;
			}
			var postdata = {
				'operation'    : 'logout',
				'sessionName'  : coreBOSAPIStatus.getSessionInfo()._sessionid
			};
			$http({
				method : 'POST',
				url : _serviceurl,
				params: postdata
			}).then(function(resp) {
				coreBOSAPIStatus.setInvalidKeys(true);
				coreBOSAPIStatus.setSessionInfo({});
			});
			return true;
		};

		/**
		 * Do Login Portal Operation
		 */
		corebosAPI.doLoginPortal = function(username, password) {
			var getdata = {
				'operation' : 'loginPortal',
				'username'  : username,
				'password'  : password
			};
			return $http({
				method : 'GET',
				url : _serviceurl,
				params: getdata
			});
		};

		/**
		 * Get actual record id from the response id.
		 */
		corebosAPI.getRecordId = function(id) {
			if (typeof id === 'undefined') return 0;
			var ids = id.split('x');
			return ids[1];
		};

		/**
		 * Helper method to work with dates
		 * Given a day, month and year it will return a date string formatted in the current user's format
		 * NOTE: this method requires that the session variable in coreBOSAPIStatus have a dateformat property
		 *  according to the connected user. Due to the way the REST API works this must be set outside this service
		 */
		corebosAPI.coreBOSformatDate = function(fday,fmonth,fyear) {
			switch (coreBOSAPIStatus.getSessionInfo().dateformat) {
				case 'dd-mm-yyyy':
					fdate = fday + '-' + fmonth + '-' + fyear;
					break;
				case 'mm-dd-yyyy':
					fdate = fmonth + '-' + fday + '-' + fyear;
					break;
				default:
					fdate = fyear + '-' + fmonth + '-' + fday;
			}
			return fdate;
		};

		/**
		 * Helper method to work with dates
		 * Given a date that came from coreBOS in the current user's format
		 * It returns the three components of the date in an object
		 *  {year: yyyy, month:mm, day: dd}
		 * NOTE: this method requires that the session variable in coreBOSAPIStatus have a dateformat property
		 *  according to the connected user. Due to the way the REST API works this must be set outside this service
		 */
		corebosAPI.coreBOSunformatDate = function(fdate) {
			var dr = fdate.split('-');
			switch (coreBOSAPIStatus.getSessionInfo().dateformat) {
				case 'dd-mm-yyyy':
					rdate = {day: dr[0], month: dr[1], year: dr[2]};
					break;
				case 'mm-dd-yyyy':
					rdate = {day: dr[1], month: dr[0], year: dr[2]};
					break;
				default:
					rdate = {day: dr[2], month: dr[1], year: dr[0]};;
			}
			return rdate;
		};

		/**
		 * Do Query Operation.
		 */
		corebosAPI.doQuery = function(query) {
			if(query.indexOf(';') == -1) query += ';';

			var getdata = {
				'operation'    : 'query',
				'sessionName'  : coreBOSAPIStatus.getSessionInfo()._sessionid,
				'query'        : query
			};
			return $http({
				method : 'GET',
				url : _serviceurl,
				params: getdata
			});
		};

		corebosAPI.getWhereCondition = function(firstrow, filterBy, filterByFields, orderBy, orderByReverse, glue, sqlwhere) {
			var where = '';
			if (angular.isUndefined(sqlwhere) || sqlwhere == '')
				where = '';
			else
				where = sqlwhere;
			if (angular.isUndefined(glue) || glue == '')
				glue = ' and ';
			else
				glue = ' ' + glue + ' ';
			if (filterBy != null) {
				var row = [];
				row.push(firstrow);
				var search_cols = corebosAPI.getResultColumns(row);
				angular.forEach(search_cols, function(value, key) {
					if (where != '') {
						where = where + glue;
					} else {
						where = ' where ';
					}
					where = where + value + " like '%" + filterBy + "%' ";
				});
			} else if (!angular.equals({}, filterByFields)) {
				angular.forEach(filterByFields, function(value, key) {
					if (where != '') {
						where = where + glue;
					} else {
						where = ' where ';
					}
					where = where + key + " like '%" + value + "%' ";
				});
			}
			if (orderBy != null) {
				where = where + ' order by ' + orderBy + ' ';
				if (orderByReverse) {
					where = where + ' desc ';
				}
			}
			return where;
		};

		corebosAPI.getLimit = function(limit,offset) {
			var limit_cond = '';
			if (angular.isNumber(limit)) {
				if (!angular.isNumber(offset)) offset = '0';
				limit_cond = ' limit '+ offset + ',' + limit + ' ';
			}
			return limit_cond;
		};

		/**
		 * Get Result Column Names.
		 * @param result: array Set of rows obtained from a Query
		 * @returns columns: array of names (strings) of columns present in result set
		 */
		corebosAPI.getResultColumns = function(result) {
			var columns = [];
			if(result != null && result.length != 0) {
				angular.forEach(result[0], function(value, key) {
					columns.push(key);
				});
			}
			return columns;
		};

		/**
		 * Get Reference IDs from Result Set.
		 * @param result: array Set of rows obtained from a Query
		 * @param columns: array of column names to get IDs from (should be reference fields)
		 * @returns ids: array of unique REST IDs (strings) present in all indicated columns of result set
		 */
		corebosAPI.getReferenceIDsFromResultSet = function(result,columns) {
			var rdoids = [];
			if(result != null && result.length != 0 && columns != null && columns.length != 0) {
				angular.forEach(result, function(value, key) {
					angular.forEach(columns, function(col, ck) {
						if (value[col]!='' && value[col]!= null && rdoids.indexOf(value[col])==-1)
							rdoids.push(value[col]);
					});
				});
			}
			return rdoids;
		};

		/**
		 * List types (modules) available.
		 */
		corebosAPI.doListTypes = function() {
			var getdata = {
				'operation'    : 'listtypes',
				'sessionName'  : coreBOSAPIStatus.getSessionInfo()._sessionid
			};
			return $http({
				method : 'GET',
				url : _serviceurl,
				params: getdata
			});
		};

		/**
		 * Process List types (modules).
		 * @param ListType.Information object returned from doListTypes call
		 * @param OnlyEntities boolean true if only Entity modules are to be returned
		 * @param SortResult boolean true if the result should be sorted by label
		 * @returns array of json objects with name of module and it's label
		 * can be used in a "select" like this:
		 * <select ng-model="selmtypes" ng-options="value.name as value.label for value in selecttypes"></select>
		 */
		corebosAPI.processListTypes = function(ListTypeInformation,OnlyEntities,SortResult) {
			if (angular.isUndefined(OnlyEntities) || OnlyEntities == '') OnlyEntities = false;
			if (angular.isUndefined(SortResult) || SortResult == '') SortResult = false;
			var ltypes = [];
			if(ListTypeInformation != null && !angular.equals({}, ListTypeInformation)) {
				angular.forEach(ListTypeInformation, function(value, key) {
					var option = {};
					if (OnlyEntities) {
						if (value.isEntity) {
							option.name = key;
							option.label = value.label;
							ltypes.push(option);
						}
					} else {
						option.name = key;
						option.label = value.label;
						ltypes.push(option);
					}
				});
			}
			if (SortResult) {
				ltypes.sort(function(a, b) {return a.label.localeCompare(b.label);});
			}
			return ltypes;
		};

		/**
		 * Do Describe Operation
		 */
		corebosAPI.doDescribe = function(module) {
			var getdata = {
				'operation'    : 'describe',
				'sessionName'  : coreBOSAPIStatus.getSessionInfo()._sessionid,
				'elementType'  : module
			};
			return $http({
				method : 'GET',
				url : _serviceurl,
				params: getdata
			});
		};

		/**
		 * Retrieve details of record
		 */
		corebosAPI.doRetrieve = function(record) {
			var getdata = {
				'operation'    : 'retrieve',
				'sessionName'  : coreBOSAPIStatus.getSessionInfo()._sessionid,
				'id'           : record
			};
			return $http({
				method : 'GET',
				url : _serviceurl,
				params: getdata
			});
		};

		/**
		 * Do Create Operation
		 */
		corebosAPI.doCreate = function(module, valuemap) {
			// Assign record to logged in user if not specified
			if(valuemap['assigned_user_id'] == null) {
				valuemap['assigned_user_id'] = coreBOSAPIStatus.getSessionInfo()._userid;
			}
			var postdata = {
				'operation'    : 'create',
				'sessionName'  : coreBOSAPIStatus.getSessionInfo()._sessionid,
				'elementType'  : module,
				'element'      : angular.toJson(valuemap)
			};
			return $http({
				method : 'POST',
				url : _serviceurl,
				data: postdata
			});
		};

		/**
		 * Do Update Operation
		 */
		corebosAPI.doUpdate = function(module, valuemap) {
			// Assign record to logged in user if not specified
			if(valuemap['assigned_user_id'] == null) {
				valuemap['assigned_user_id'] = coreBOSAPIStatus.getSessionInfo()._userid;
			}
			var postdata = {
				'operation'    : 'update',
				'sessionName'  : coreBOSAPIStatus.getSessionInfo()._sessionid,
				'elementType'  : module,
				'element'      : angular.toJson(valuemap)
			};
			return $http({
				method : 'POST',
				url : _serviceurl,
				data: postdata
			});
		};

		/**
		 * Do Delete Operation
		 */
		corebosAPI.doDelete = function(recordid) {
			var postdata = {
				'operation'    : 'delete',
				'sessionName'  : coreBOSAPIStatus.getSessionInfo()._sessionid,
				'id'           : recordid
			};
			return $http({
				method : 'POST',
				url : _serviceurl,
				data: postdata
			});
		};

		/**
		 * Invoke custom operation
		 */
		corebosAPI.doInvoke = function(method, params, type) {
			if(typeof(params) == 'undefined') params = {};
			if (angular.isString(params)) params = JSON.parse(params);
			var reqtype = 'POST';
			if(typeof(type) != 'undefined') reqtype = type.toUpperCase();

			var senddata = {
				'operation' : method,
				'sessionName' : coreBOSAPIStatus.getSessionInfo()._sessionid
			};
			senddata = angular.extend(senddata,params);
			if (reqtype=='POST') {
				var http_method = { data: senddata};
			} else {
				var http_method = { params: senddata};
			}
			var invokecall = {
				method : reqtype,
				url : _serviceurl,
			};
			var invokecall = angular.extend(invokecall,http_method);
			return $http(invokecall);
		};

		/**
		 * Retrieve related records.
		 */
		corebosAPI.doGetRelatedRecords = function(record, module, relatedModule, queryParameters) {
			if (angular.isObject(queryParameters)) queryParameters = angular.toJson(queryParameters);
			var senddata = {
				'operation' : 'getRelatedRecords',
				'sessionName' : coreBOSAPIStatus.getSessionInfo()._sessionid,
				'id' : record,
				'module' : module,
				'relatedModule' : relatedModule,
				'queryParameters' : queryParameters
			};
			return $http({
				method : 'POST',
				url : _serviceurl,
				data: senddata
			});
		};

		/**
		 * Set relation between records.
		 * param relate_this_id string ID of record we want to related other records with
		 * param with_this_ids string/array either a string with one unique ID or an array of IDs to relate to the first parameter
		 */
		corebosAPI.doSetRelated = function(relate_this_id, with_these_ids) {
			if (angular.isObject(with_these_ids)) with_these_ids = angular.toJson(with_these_ids);
			var senddata = {
				'operation' : 'SetRelation',
				'sessionName' : coreBOSAPIStatus.getSessionInfo()._sessionid,
				'relate_this_id' : relate_this_id,
				'with_these_ids' : with_these_ids
			};
			return $http({
				method : 'POST',
				url : _serviceurl,
				data: senddata
			});
		};
		
		/**
		 * Add comment to HelpDesk or Faq
		 */
		corebosAPI.doAddTicketFaqComment = function(id, valuemap) {
			var postdata = {
				'operation' : 'addTicketFaqComment',
				'sessionName' : coreBOSAPIStatus.getSessionInfo()._sessionid,
				'id' : id,
				'values' : angular.toJson(valuemap)
			};
			return $http({
				method : 'POST',
				url : _serviceurl,
				data: postdata
			});
		};

		/**
		 * Convert javascript object into PHP serialize format
		 * Helper method to interface with PHP REST methods
		 * Copied from php.js project: Thank you !!
		 */
		corebosAPI.serialize = function(mixed_value) {
			//  discuss at: http://phpjs.org/functions/serialize/
			// original by: Arpad Ray (mailto:arpad@php.net)
			// improved by: Dino
			// improved by: Le Torbi (http://www.letorbi.de/)
			// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net/)
			// bugfixed by: Andrej Pavlovic
			// bugfixed by: Garagoth
			// bugfixed by: Russell Walker (http://www.nbill.co.uk/)
			// bugfixed by: Jamie Beck (http://www.terabit.ca/)
			// bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net/)
			// bugfixed by: Ben (http://benblume.co.uk/)
			//    input by: DtTvB (http://dt.in.th/2008-09-16.string-length-in-bytes.html)
			//    input by: Martin (http://www.erlenwiese.de/)
			//        note: We feel the main purpose of this function should be to ease the transport of data between php & js
			//        note: Aiming for PHP-compatibility, we have to translate objects to arrays
			//   example 1: serialize(['Kevin', 'van', 'Zonneveld']);
			//   returns 1: 'a:3:{i:0;s:5:"Kevin";i:1;s:3:"van";i:2;s:9:"Zonneveld";}'
			//   example 2: serialize({firstName: 'Kevin', midName: 'van', surName: 'Zonneveld'});
			//   returns 2: 'a:3:{s:9:"firstName";s:5:"Kevin";s:7:"midName";s:3:"van";s:7:"surName";s:9:"Zonneveld";}'
	
			var val, key, okey, ktype = '', vals = '', count = 0, _utf8Size = function(str) {
				var size = 0, i = 0, l = str.length, code = '';
				for ( i = 0; i < l; i++) {
					code = str.charCodeAt(i);
					if (code < 0x0080) {
						size += 1;
					} else if (code < 0x0800) {
						size += 2;
					} else {
						size += 3;
					}
				}
				return size;
			}, _getType = function(inp) {
				var match, key, cons, types, type = typeof inp;
	
				if (type === 'object' && !inp) {
					return 'null';
				}
	
				if (type === 'object') {
					if (!inp.constructor) {
						return 'object';
					}
					cons = inp.constructor.toString();
					match = cons.match(/(\w+)\(/);
					if (match) {
						cons = match[1].toLowerCase();
					}
					types = ['boolean', 'number', 'string', 'array'];
					for (key in types) {
						if (cons == types[key]) {
							type = types[key];
							break;
						}
					}
				}
				return type;
			}, type = _getType(mixed_value);
	
			switch (type) {
			case 'function':
				val = '';
				break;
			case 'boolean':
				val = 'b:' + ( mixed_value ? '1' : '0');
				break;
			case 'number':
				val = (Math.round(mixed_value) == mixed_value ? 'i' : 'd') + ':' + mixed_value;
				break;
			case 'string':
				val = 's:' + _utf8Size(mixed_value) + ':"' + mixed_value + '"';
				break;
			case 'array':
			case 'object':
				val = 'a';
				/*
				 if (type === 'object') {
				 var objname = mixed_value.constructor.toString().match(/(\w+)\(\)/);
				 if (objname == undefined) {
				 return;
				 }
				 objname[1] = this.serialize(objname[1]);
				 val = 'O' + objname[1].substring(1, objname[1].length - 1);
				 }
				 */
	
				for (key in mixed_value) {
					if (mixed_value.hasOwnProperty(key)) {
						ktype = _getType(mixed_value[key]);
						if (ktype === 'function') {
							continue;
						}
	
						okey = (key.match(/^[0-9]+$/) ? parseInt(key, 10) : key);
						vals += this.serialize(okey) + this.serialize(mixed_value[key]);
						count++;
					}
				}
				val += ':' + count + ':{' + vals + '}';
				break;
			case 'undefined':
			// Fall-through
			default:
				// if the JS object has a property which contains a null value, the string cannot be unserialized by PHP
				val = 'N';
				break;
			}
			if (type !== 'object' && type !== 'array') {
				val += ';';
			}
			return val;
		};

		/**
		 * Convert PHP serialized string into javascript object
		 * Helper method to interface with PHP REST methods
		 * Copied from php.js project: Thank you !!
		 */
		corebosAPI.unserialize = function(data) {
			//  discuss at: http://phpjs.org/functions/unserialize/
			// original by: Arpad Ray (mailto:arpad@php.net)
			// improved by: Pedro Tainha (http://www.pedrotainha.com)
			// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
			// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
			// improved by: Chris
			// improved by: James
			// improved by: Le Torbi
			// improved by: Eli Skeggs
			// bugfixed by: dptr1988
			// bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
			// bugfixed by: Brett Zamir (http://brett-zamir.me)
			//  revised by: d3x
			//    input by: Brett Zamir (http://brett-zamir.me)
			//    input by: Martin (http://www.erlenwiese.de/)
			//    input by: kilops
			//    input by: Jaroslaw Czarniak
			//        note: We feel the main purpose of this function should be to ease the transport of data between php & js
			//        note: Aiming for PHP-compatibility, we have to translate objects to arrays
			//   example 1: unserialize('a:3:{i:0;s:5:"Kevin";i:1;s:3:"van";i:2;s:9:"Zonneveld";}');
			//   returns 1: ['Kevin', 'van', 'Zonneveld']
			//   example 2: unserialize('a:3:{s:9:"firstName";s:5:"Kevin";s:7:"midName";s:3:"van";s:7:"surName";s:9:"Zonneveld";}');
			//   returns 2: {firstName: 'Kevin', midName: 'van', surName: 'Zonneveld'}
	
			var utf8Overhead = function(chr) {
				// http://phpjs.org/functions/unserialize:571#comment_95906
				var code = chr.charCodeAt(0);
				if (code < 0x0080) {
					return 0;
				}
				if (code < 0x0800) {
					return 1;
				}
				return 2;
			};
			var read_until = function(data, offset, stopchr) {
				var i = 2, buf = [], chr = data.slice(offset, offset + 1);
	
				while (chr != stopchr) {
					if ((i + offset) > data.length) {
						return [0,'']; //('Error', 'Invalid');
					}
					buf.push(chr);
					chr = data.slice(offset + (i - 1), offset + i);
					i += 1;
				}
				return [buf.length, buf.join('')];
			};
			var read_chrs = function(data, offset, length) {
				var i, chr, buf;
	
				buf = [];
				for ( i = 0; i < length; i++) {
					chr = data.slice(offset + (i - 1), offset + i);
					buf.push(chr);
					length -= utf8Overhead(chr);
				}
				return [buf.length, buf.join('')];
			};
			var _unserialize = function(data, offset) {
				var dtype, dataoffset, keyandchrs, keys, contig, length, array, readdata, readData, ccount, stringlength, i, key, kprops, kchrs, vprops, vchrs, value, chrs = 0, typeconvert = function(x) {
					return x;
				};
	
				if (!offset) {
					offset = 0;
				}
				dtype = (data.slice(offset, offset + 1)).toLowerCase();
	
				dataoffset = offset + 2;
	
				switch (dtype) {
				case 'i':
					typeconvert = function(x) {
						return parseInt(x, 10);
					};
					readData = read_until(data, dataoffset, ';');
					chrs = readData[0];
					readdata = readData[1];
					dataoffset += chrs + 1;
					break;
				case 'b':
					typeconvert = function(x) {
						return parseInt(x, 10) !== 0;
					};
					readData = read_until(data, dataoffset, ';');
					chrs = readData[0];
					readdata = readData[1];
					dataoffset += chrs + 1;
					break;
				case 'd':
					typeconvert = function(x) {
						return parseFloat(x);
					};
					readData = read_until(data, dataoffset, ';');
					chrs = readData[0];
					readdata = readData[1];
					dataoffset += chrs + 1;
					break;
				case 'n':
					readdata = null;
					break;
				case 's':
					ccount = read_until(data, dataoffset, ':');
					chrs = ccount[0];
					stringlength = ccount[1];
					dataoffset += chrs + 2;
	
					readData = read_chrs(data, dataoffset + 1, parseInt(stringlength, 10));
					chrs = readData[0];
					readdata = readData[1];
					dataoffset += chrs + 2;
					// if (chrs != parseInt(stringlength, 10) && chrs != readdata.length) {
						// error('SyntaxError', 'String length mismatch');
					// }
					break;
				case 'a':
					readdata = {};
	
					keyandchrs = read_until(data, dataoffset, ':');
					chrs = keyandchrs[0];
					keys = keyandchrs[1];
					dataoffset += chrs + 2;
	
					length = parseInt(keys, 10);
					contig = true;
	
					for ( i = 0; i < length; i++) {
						kprops = _unserialize(data, dataoffset);
						kchrs = kprops[1];
						key = kprops[2];
						dataoffset += kchrs;
	
						vprops = _unserialize(data, dataoffset);
						vchrs = vprops[1];
						value = vprops[2];
						dataoffset += vchrs;
	
						if (key !== i)
							contig = false;
	
						readdata[key] = value;
					}
	
					if (contig) {
						array = new Array(length);
						for ( i = 0; i < length; i++)
							array[i] = readdata[i];
						readdata = array;
					}
	
					dataoffset += 1;
					break;
				default:
					//error('SyntaxError', 'Unknown / Unhandled data type(s): ' + dtype);
					break;
				}
				return [dtype, dataoffset - offset, typeconvert(readdata)];
			};

			return _unserialize((data + ''), 0)[2];
		};

		return corebosAPI;
	}
)
.factory('coreBOSAPIStatus',function() {
	var sessioninfo = {};
	var serviceurl = '';
	var invalidKeys = true;
	var _servertime = 0;
	var _expiretime = 0;
	var _localservertime = 0;
	var _localexpiretime = 0;
	var corebosAPIIK = {};
	corebosAPIIK.hasInvalidKeys = function() {
		if(this.invalidKeys == undefined)
			return true;
		else
			return this.invalidKeys;
	};
	corebosAPIIK.setInvalidKeys = function(ikey) {
		this.invalidKeys = ikey;
	};
	corebosAPIIK.setServiceURL = function(srvurl) {
		this.serviceurl = srvurl;
	};
	corebosAPIIK.getServiceURL = function() {
		return this.serviceurl;
	};
	corebosAPIIK.setSessionInfo = function(sinfo) {
		this.sessioninfo = sinfo;
	};
	corebosAPIIK.getSessionInfo = function() {
		return this.sessioninfo;
	};
	corebosAPIIK.setServerTime = function(srvt) {
		this._servertime = srvt;
		this._localservertime = Math.round(new Date().getTime() / 1000);
	};
	corebosAPIIK.getServerTime = function() {
		return this._servertime;
	};
	corebosAPIIK.setExpireTime = function(expt) {
		this._expiretime = expt;
		var validtime = expt - this._servertime;
		this._localexpiretime = this._localservertime + validtime;
	};
	corebosAPIIK.getExpireTime = function() {
		return this._expiretime;
	};
	corebosAPIIK.isLoggedIn = function() {
		// this method is useless: coreBOS does not expire the session once it has been obtained
		// we register the expiretime but it is only controlled during the login phase,
		// after that you are free to use it as long as you want
		// this method will return false when the expire time is up, but you will still be able to use the API
		var nowtime = Math.round(new Date().getTime() / 1000);
		var validspan = this._localexpiretime - nowtime;
		return (this.sessioninfo != {} && this._servertime && validspan > 0);
	};
	return corebosAPIIK;
})
.factory('corebosAPIInterceptor',function($q, coreBOSAPIStatus, $location) {
	return {
		'response': function(response) {
			if (response.config.url.indexOf(coreBOSAPIStatus.getServiceURL())!=-1) {
				if (response.data != undefined) {
					if (response.data.success) {  // we have a successful API call
						coreBOSAPIStatus.setInvalidKeys(false);
						if (response.config.data != undefined && response.config.data.operation == 'login') {  // we have a successful login > we have to save the session
							coreBOSAPIStatus.setSessionInfo({
								_sessionid: response.data.result.sessionName,
								_userid: response.data.result.userId
							});
						}
						if (response.config.params != undefined && response.config.params.operation == 'loginPortal') {  // we have a successful login via portal > we have to save the session
							coreBOSAPIStatus.setSessionInfo({
								_sessionid: response.data.result.sessionName,
								_userid: response.data.result.user['id']
							});
							coreBOSAPIStatus.setServerTime(response.data.result.serverTime);
							coreBOSAPIStatus.setExpireTime(response.data.result.expireTime);
						}
					} else {  // unsuccessful API call
						response.status = 401;
						if (response.data.error != undefined && response.data.error.code != undefined)
							response.statusText = response.data.error.code;
						if (response.config.data != undefined && (response.config.data.operation == 'login' || response.config.data.operation == 'loginPortal')) {  // we have an unsuccessful login > we have to invalidate status
							coreBOSAPIStatus.setInvalidKeys(true);
						}
						return $q.reject(response);
					}
				}
			}
			return response;
		},
		'responseError': function (rejection) {
			var status = rejection.status;
			if ((status==401 || status==404) && rejection.config.url.indexOf(coreBOSAPIStatus.getServiceURL())!=-1) {
				coreBOSAPIStatus.setInvalidKeys(true);
			}
			return  $q.reject(rejection);
		}
	};
})
.config(function($httpProvider) {
	$httpProvider.interceptors.push('corebosAPIInterceptor');
})
;
