exports.create = create;

var fs = require('fs');
var path = require('path');
var async = require('async');
var Query = require('./query');

// 创建connection
function create (_path) {
  if (!fs.existsSync(_path)) {
    try {
      fs.mkdirSync(_path);
    } catch (e) {
      throw new Error('Cannot build the jsoncan data path [' + _path + ']');
    }
  }
  
  return {
    PATH: _path,
    getTablePath: getTablePath,
    getTableIdPath: getTableIdPath,
    getTableIdFile: getTableIdFile,
    getTableUniquePath: getTableUniquePath,
    getTableUniqueFile: getTableUniqueFile,
    getTableUniqueAutoIncrementFile: getTableUniqueAutoIncrementFile,
    getTableIndexFile: getTableIndexFile,
    readTableUniqueAutoIncrementFile: readTableUniqueAutoIncrementFile,
    writeTableUniqueAutoIncrementFile: writeTableUniqueAutoIncrementFile,
    createTablePaths: createTablePaths,
    linkTableUniqueFile: linkTableUniqueFile,
    linkTableUniqueFileSync: linkTableUniqueFileSync,
    unlinkTableUniqueFile: unlinkTableUniqueFile,
    unlinkTableUniqueFileSync: unlinkTableUniqueFileSync,
    save: save, // for insert or update
    saveSync: saveSync,
    remove: remove,
    removeSync: removeSync,
    readIdFiles: readIdFiles,
    readIdFilesSync: readIdFilesSync,
    readAllIds: readAllIds,
    readAllIdsSync: readAllIdsSync,
    read: read,
    readSync: readSync,
    readBy: readBy,
    readBySync: readBySync,
    queryAll: queryAll,
    queryAllSync: queryAllSync,
    addIndexRecord: addIndexRecord,
    removeIndexRecord: removeIndexRecord,
    addIdRecord: addIdRecord,
    removeIdRecord: removeIdRecord,
    indexFilter: indexFilter,
    getRecordsByIndex: getRecordsByIndex,
    getRecordsByIndexSync: getRecordsByIndexSync,
    extortIds: extortIds
  };
}

function getTablePath (table) {
  return path.join(this.PATH, table);
}

function getTableIdPath (table) {
  return path.join(this.getTablePath(table), '_id');
}

// 获取table数据文件
function getTableIdFile (table, id) {
  return path.join(this.getTableIdPath(table), id + '.js');
}

function getTableUniquePath (table, name) {
  return path.join(this.getTablePath(table), name);
}

function getTableUniqueFile (table, name, value) {
  return path.join(this.getTableUniquePath(table, name), encrypt(value) + '.js');
}

function getTableUniqueAutoIncrementFile (table, name) {
  return path.join(this.getTableUniquePath(table, name), '.auto_increment');
}

function getTableIndexFile (table, name) {
  return path.join(this.getTablePath(table), name + '.index');
}

/**
 * create table data paths, including root path, unique fields paths
 * @table: table name
 * @uniqueFields: unique fields list
 * 
 */
function createTablePaths (table, uniqueFields) {
  var root = this.getTablePath(table);
  var idPath = this.getTableIdPath(table);
  var _this = this;
  
  if (!fs.existsSync(idPath)) {
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root);
    }
    fs.mkdirSync(idPath);
  }
  
  Object.keys(uniqueFields).forEach(function (name) {
    var uniquePath = _this.getTableUniquePath(table, name);
    var autoIncrementFromNumber = uniqueFields[name];
    var autoIncrementFile;
    
    if (!fs.existsSync(uniquePath)) {
      fs.mkdirSync(uniquePath);   
    }
    
    if (autoIncrementFromNumber > 0) {
      autoIncrementFile = _this.getTableUniqueAutoIncrementFile(table, name);
      if (!fs.existsSync(autoIncrementFile)) {
        fs.writeFileSync(autoIncrementFile, autoIncrementFromNumber);
      }
    }
    
  });
}

function encrypt (s) {
  if (s !== '' && (typeof s === 'string' || typeof s === 'number')) {
    s = s + '';
	  return require('crypto').createHash('sha1').update(s).digest('hex');
	} else {
	  throw new Error('invalid string param:' + s);
	}
}


function _read (file, callback) {
  fs.readFile(file, {encoding: 'utf8'}, function (e, data) {
    if (e) {
      // record does not exist
      if (e.code === "ENOENT") {
        callback(null, null);
      } else {
        callback(e);
      }
    } else {
      callback(null, JSON.parse(data));
    }
  });
}

function _readSync (file) {
  try {
    var data = fs.readFileSync(file, {encoding: 'utf8'});
    return JSON.parse(data);
  } catch (e) {
    if (e.code === "ENOENT") {
      return null;
    } else {
      return e;
    }
  }
}


// 得到原始json数据
function read (table, id, callback) {
  _read(this.getTableIdFile(table, id), callback);
}

function readBy (table, fieldName, fieldValue, callback) {
  _read(this.getTableUniqueFile(table, fieldName, fieldValue), callback);
}

// 得到原始json数据
function readSync (table, id) {
  return _readSync(this.getTableIdFile(table, id));
}

function readBySync (table, fieldName, fieldValue) {
  return _readSync(this.getTableUniqueFile(table, fieldName, fieldValue));
}

function readAllIds (table, callback) {
  var _this = this;
  var idsFile = this.getTableIndexFile(table, '_id');
  fs.readFile(idsFile, function (e, raw) {
    var ids;
    if (e) {
      callback(e);
    } else {
      ids = _this.extortIds(raw);
      callback(null, ids);
    }
  });
}


function readAllIdsSync (table, callback) {
  var idsFile = this.getTableIndexFile(table, '_id');
  var raw, ids;
  try {
    raw = fs.readFileSync(idsFile, {encoding: 'utf8'});
    return this.extortIds(raw);
  } catch (e) {
    if (e.code === "ENOENT") {
      return [];
    } else {
      throw e;
    }
  }
}

function readAllByIndexSync (table, options) {
  var records = this.getRecordsByIndexSync(table, options);
  var ids = getIdsInRecords(records);
  return this.readIdFilesSync(table, ids);
}

function readIdFiles (table, ids, callback) {
  var tasks = [];
  var _this = this;
  
  ids.forEach(function (_id) {
    tasks.push(function (callback) {
      fs.readFile(_this.getTableIdFile(table, _id), function (e, content) {
        if (e) {
          callback(e);
        } else {
          callback(null, JSON.parse(content));
        }
      })
    });
  });
  
  if (tasks.length > 0) {
    async.parallelLimit(tasks, 150, callback);
  } else {
    callback(null, []);
  }
}

function readIdFilesSync (table, ids) {
  var list = [];
  var _this = this;
  
  ids.forEach(function (_id) {
    var file = _this.getTableIdFile(table, _id);
    var string = fs.readFileSync(file);
    list.push(JSON.parse(string));
  });
  
  return list;
}

function isValidFile (file) {
  return file.split('.').pop() == 'js';
}

function remove (table, _id, callback) {
  fs.unlink(this.getTableIdFile(table, _id), callback);
}

function removeSync (table, _id) {
  fs.unlinkSync(this.getTableIdFile(table, _id));
}

function unlinkTableUniqueFile (table, name, value, callback) {
  fs.unlink(this.getTableUniqueFile(table, name, value), callback);
}

function unlinkTableUniqueFileSync (table, name, value) {
  fs.unlinkSync(this.getTableUniqueFile(table, name, value));
}

function linkTableUniqueFile (table, _id, name, value, callback) {
  var idFile = this.getTableIdFile(table, _id);
  var linkFile = this.getTableUniqueFile(table, name, value);
  fs.symlink(idFile, linkFile, callback);
}

function linkTableUniqueFileSync (table, _id, name, value) {
  var idFile = this.getTableIdFile(table, _id);
  var linkFile = this.getTableUniqueFile(table, name, value);
  fs.symlinkSync(idFile, linkFile);
}

function save (table, _id, data, callback) {
  fs.writeFile(this.getTableIdFile(table, _id), JSON.stringify(data), function (e) {
    if (e) {
      callback(e);
    } else {
      callback(null, data);
    }
  });
}

function saveSync (table, _id, data) {
  fs.writeFileSync(this.getTableIdFile(table, _id), JSON.stringify(data));
  return data;
}

function readTableUniqueAutoIncrementFile (table, name) {
  try {
    var autoIncrementFile = this.getTableUniqueAutoIncrementFile(table, name);
    var value = fs.readFileSync(autoIncrementFile, {encoding: 'utf8'});
    return value;
  } catch (e) {
    if (e.code === "ENOENT") {
      return null;
    } else {
      return e;
    }
  }
}

function writeTableUniqueAutoIncrementFile (table, name, value) {
  var autoIncrementFile = this.getTableUniqueAutoIncrementFile(table, name);
  fs.writeFileSync(autoIncrementFile, value);
}

/**
 * @table
 * @name: field name
 * @value: field value
 * @_id:  primary key value
 */
function addIndexRecord (table, name, value, _id) {
  var indexFile = this.getTableIndexFile(table, name);
  fs.appendFileSync(indexFile, indexRecordFormatedString(['+', _id, value + '']));
}

function removeIndexRecord  (table, name, value, _id) {
  var indexFile = this.getTableIndexFile(table, name);
  fs.appendFileSync(indexFile, indexRecordFormatedString(['-', _id, value + '']));
}

function addIdRecord (table, _id) {
  var indexFile = this.getTableIndexFile(table, '_id');
  fs.appendFileSync(indexFile, indexRecordFormatedString(['+', _id]));
}

function removeIdRecord (table, _id) {
  var indexFile = this.getTableIndexFile(table, '_id');
  fs.appendFileSync(indexFile, indexRecordFormatedString(['-', _id]));
}


function indexRecordFormatedString (arr) {
  return arr.join(getIndexRecordSplitor()) + "\n";
}

function getIndexRecordSplitor () {
  return "\t\t";
}

function extortIds (content) {
  var splitor = getIndexRecordSplitor();
  var re = new RegExp('^([+-])' + splitor + '(.*?)$', "mg");
  var line;
  var targets = [];
  var sign, _id;
  
  while (line = re.exec(content)) {
    sign = line[1];
    _id = line[2];
    if (sign == '+') {
      targets.push(_id);
    } else if (sign == '-') {
      targets.splice(targets.indexOf(_id), 1);
    }
  }
  
  return targets;
}

// line format: [+-] indexValue <_id>
function indexFilter (name, content, filter) {
  var splitor = getIndexRecordSplitor();
  var re = new RegExp('^([+-])' + splitor + '(.*?)' + splitor + '(.*?)$', "mg");
  var line;
  var targets = [];
  var records = {};
  var operator, value;
  var sign, _id, indexValue;
  
  if (Array.isArray(filter)) {
    operator = filter[0];
    value = filter[1];
  } else {
    operator = '=';
    value = filter;
  }
  
  while (line = re.exec(content)) {
    sign = line[1];
    _id = line[2];
    indexValue = line[3];
    records[_id] = {};
    records[_id][name] = indexValue;
    if (Query.compare(indexValue, operator, value)) {
      if (sign == '+') {
        targets.push(_id);
      } else if (sign == '-') {
        targets.splice(targets.indexOf(_id), 1);
      }
    }
  }
  return clone(records, targets);
}

function clone (source, keys) {
  var copycat = {};
  keys = keys || Object.keys(source);
  keys.forEach(function (key) {
    copycat[key] = source[key];
  });
  return copycat;
}

function merge (a, b) {
  var c = clone(a);
  
  Object.keys(b).forEach(function (key) {
    c[key] = b[key];
  });
  
  return c;
}

function getRecordsByIndex (table, filters, callback) {
  var tasks = [];
  var _this = this;
  var noFileFoundErrorCode = 'NoFiles';
  var keys = Object.keys(filters);
  
  keys.forEach(function (name) {
    tasks.push(function (callback) {
      var file = _this.getTableIndexFile(table, name);
      fs.readFile(file, function (e, content) {
        var records, noFileFoundError;
        if (e) {
          callback(e);
        } else {
          records = _this.indexFilter(name, content, filters[name]);
          if (Object.keys(records).length == 0) {
            noFileFoundError = new Error();
            noFileFoundError.code = noFileFoundErrorCode;
            callback(noFileFoundError);
          } else {
            callback(null, records);
          }
        }
      });    
    });
  });

  async.series(tasks, function (e, results) {
    if (e) {
      if (e.code == noFileFoundErrorCode) {
        callback(null, []);
      } else {
        callback(e);
      }
    } else {
      callback(null, getAllIntersection(results));
    }
  });  
}

/**
 * @return _ids
 */
function getRecordsByIndexSync (table, options) {
  var results = [];
  var _this = this;
  var names = Object.keys(options);
  
  for (var i = 0; i < names.length; i++) {
    var file = _this.getTableIndexFile(table, names[i]);
    var content = fs.readFileSync(file);
    var records = _this.indexFilter(names[i], content, options[names[i]]);
    if (Object.keys(records).length == 0) {
      return [];
    } else {
      results.push(records);
    }
  }
  return getAllIntersection(results);
}

function getAllIntersection (targets) {
  var result = targets.shift();
  if (targets.length > 0) {
    targets.forEach(function (target) {
      result = getIntersection(result, target);
    });
  } else {
    result = idsMapToRecords(result);
  }
  return result;
}

function idsMapToRecords (map) {
  var records = [];
  Object.keys(map || {}).forEach(function (_id) {
    var record = map[_id];
    record._id = _id;
    records.push(record);
  });
  
  return records;
}

function getIntersection (a, b) {
  var c = [];
  Object.keys(a).forEach(function (key) {
    var d;
    if (b[key] !== undefined) {
      d = merge(a[key], b[key]);
      d._id = key;
      c.push(d);
    }
  });
  
  return c;
}

function getIdsInRecords (records) {
  var ids = [];
  records.forEach(function (record) {
    ids.push(record._id);
  });
  return ids;
}

function queryAll (table, ids, options, callback) {
  var limit = options.limit || ids.length;
  var skip = options.skip || 0;
  var filters = options.filters;
  var count = 0;
  var records = [];
  var _this = this;
  
  async.whilst(
    function () {
      return ids.length > 0 && count < limit;
    },
    function (callback) {
      var _id = ids.shift();
      _this.read(table, _id, function (e, record) {
        if (e) {
          callback(e);
        } else {
          if (Query.checkHash(record, filters)) {
            if (skip > 0) {
              skip--;
            } else {
              records.push(record);
              count++;
            }
          }
          callback();
        }
      });
    
    },
    function (e) {
      if (e) {
        callback(e);
      } else {
        callback(null, records);
      }
    }
  );
}

function queryAllSync (table, ids, options) {
  var max = ids.length;
  var limit = options.limit || max;
  var skip = options.skip || 0;
  var filters = options.filters;
  var record, records = [];
  var _this = this;
  
  for (var i = 0; i < limit; i++) {
    if (max < 1) { break; }
    record = _this.readSync(table, ids[i]);
    if (Query.checkHash(record, filters)) {
      if (skip > 0) {
        skip--;
      } else {
        records.push(record);
      }
    }
    
    max--;
  }
  
  return records;
  
}