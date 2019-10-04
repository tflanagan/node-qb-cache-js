'use strict';

/* Versioning */
const VERSION_MAJOR = 0;
const VERSION_MINOR = 2;
const VERSION_PATCH = 1;

/* Main  */
const QBCache = {
	VERSION: [ VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH ].join('.'),
	_cache: {},
	_waitFor: (key) => {
		return new QuickBase.Promise((resolve, reject) => {
			var nS = setInterval(() => {
				if(QBCache._cache[key] !== false){
					clearInterval(nS);
					nS = undefined;

					if(QBCache._cache[key] instanceof Error){
						reject(QBCache._cache[key]);
					}else{
						resolve(QBCache._cache[key].results);
					}
				}
			}, 100);
		});
	},
	expiresAfter: 60 * 1000,
	cacheableCalls: [
		'API_DoQuery',
		'API_DoQueryCount',
		'API_FindDBByName',
		'API_GenAddRecordForm',
		'API_GenResultsTable',
		'API_GetAncestorInfo',
		'API_GetAppDTMInfo',
		'API_GetDBInfo',
		'API_GetDBPage',
		'API_GetDBVar',
		'API_GetFieldProperties',
		'API_GetGroupRole',
		'API_GetNumRecords',
		'API_GetRecordAsHTML',
		'API_GetRecordInfo',
		'API_GetRoleInfo',
		'API_GetSchema',
		'API_GetUserInfo',
		'API_GetUserRole',
		'API_GetUsersInGroup',
		'API_GrantedDBs',
		'API_GrantedDBsForGroup',
		'API_GrantedGroups',
		'API_UserRoles'
	],
	hookInto: (qb) => {
		if(!qb.apiIsCached){
			const oldApi = qb.api;

			qb.apiIsCached = true;
			qb.api = (function(action, options, skipCache){
				const cacheCall = QBCache.cacheableCalls.indexOf(action) !== -1;
				const key = [
					qb.settings.realm,
					action,
					JSON.stringify(options || {})
				].join('-');

				if(cacheCall && !skipCache){
					if(!!QBCache._cache[key] && ((QBCache._cache[key] instanceof Error) || (QBCache._cache[key].expires <= Date.now()))){
						delete QBCache._cache[key];
					}

					if(QBCache._cache[key] === false){
						return QBCache._waitFor(key);
					}else
					if(QBCache._cache[key]){
						return QuickBase.Promise.resolve(QBCache._cache[key].results);
					}

					QBCache._cache[key] = false;
				}

				return oldApi.call(this, action, options).then((results) => {
					if(cacheCall){
						QBCache._cache[key] = {
							expires: Date.now() + QBCache.expiresAfter,
							results: results
						};
					}

					return results;
				}).catch((err) => {
					if(cacheCall){
						QBCache._cache[key] = err;
					}

					throw err;
				});
			}).bind(qb);
		}
	}
};

/* Export Module */
if(typeof module !== 'undefined' && module.exports){
	module.exports = QBCache;
}else
if(typeof define === 'function' && define.amd){
	define('QBCache', [], function(){
		return QBCache;
	});
}

if((typeof global !== 'undefined' && typeof window !== 'undefined' && global === window) || (typeof global === 'undefined' && typeof window !== 'undefined')){
	(global || window).QBCache = QBCache;
}
