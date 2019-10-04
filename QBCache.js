'use strict';

/* Versioning */
const VERSION_MAJOR = 0;
const VERSION_MINOR = 1;
const VERSION_PATCH = 0;

/* Main  */
const QBCache = {
	VERSION: [ VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH ].join('.'),
	_cache: {},
	_noop: function(){},
	_waitFor: (key) => {
		return new Promise((resolve, reject) => {
			var nS = setInterval(() => {
				if(typeof(QBCache._cache[key]) === 'function'){
					return;
				}else
				if(QBCache._cache[key] instanceof Error){
					return reject(QBCache._cache[key]);
				}

				clearInterval(nS);
				nS = undefined;

				resolve(QBCache._cache[key].results);
			}, 100);
		});
	},
	expiresAfter: 60 * 1000,
	hookInto: function(qb){
		if(!qb.apiIsCached){
			const oldApi = qb.api;

			qb.apiIsCached = true;
			qb.api = (function(action, options){
				const key = [
					qb.settings.realm,
					action,
					JSON.stringify(options || {})
				].join('-');

				if(!!QBCache._cache[key] && ((QBCache._cache[key] instanceof Error) || (QBCache._cache[key].expires <= Date.now()))){
					delete QBCache._cache[key];
				}

				if(typeof(QBCache._cache[key]) === 'function'){
					return QBCache._waitFor(key);
				}else
				if(QBCache._cache[key]){
					return QuickBase.Promise.resolve(QBCache._cache[key].results);
				}

				QBCache._cache[key] = QBCache._noop;

				return oldApi.call(this, action, options).then((results) => {
					QBCache._cache[key] = {
						expires: Date.now() + QBCache.expiresAfter,
						results: results
					};

					return results;
				}).catch((err) => {
					QBCache._cache[key] = err;

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
