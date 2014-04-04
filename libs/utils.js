exports.merge = merge;
exports.clone = clone;

function merge (targetObj, defaultObj) {
	if (! targetObj) targetObj = {};
	if (! defaultObj) { return targetObj; }
	
 	Object.keys(defaultObj).forEach(function (key) {
		if (targetObj[key] == undefined) {
			targetObj[key] = defaultObj[key];
		}
	});
	return targetObj;						 
}

function cloneArray (target) {
  var copycat = [];
  target.forEach(function (ele) {
    if (Array.isArray(ele)) {
      copycat[key] = cloneArray(ele);
    } else if (typeof ele == 'object') {
      copycat[key] = clone(ele);
    } else {
      copycat[key] = ele;
    }
  });
  return copycat;
}

function clone (target, keys) {
	var copycat = {};
	try {
	  if (Array.isArray(target)) {
	    return cloneArray(target);
	  } else if (typeof target == 'object') {
	    keys = keys || Object.keys(target);
      if ( keys.length > 0 ) {
        keys(target).forEach(function (key) {
          if (Array.isArray(target[key])) {
            copycat[key] = [];
            target[key].forEach(function (element) {
              copycat[key] = clone(element);
            });
          } else if (typeof target[key] == 'object' && target[key] != null) {
            copycat[key] = clone(target[key]);
          } else {
            copycat[key] = target[key];
          }
        });
      }  
	  }
	} catch (ignore) {}
	
	return copycat;
}
