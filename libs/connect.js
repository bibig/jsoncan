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
    save: save,
    saveSync: saveSync,
    remove: remove,
    removeSync: removeSync,
    readAll: readAll,
    readAllSync: readAllSync,
    readTableIdIndexFile: readTableIdIndexFile,
    readTableIdIndexFileSync: readTableIdIndexFileSync,
    readTableIdsDir: readTableIdsDir,
    readTableIdsDirSync: readTableIdsDirSync,
    readTableIdsFiles: readTableIdsFiles,
    readTableIdsFilesSync: readTableIdsFilesSync,
    read: read,
    readSync: readSync,
    readBy: readBy,
    readBySync: readBySync,
    readIndex: readIndex,
    readIndexSync: readIndexSync,
    readAllIndexes: readAllIndexes,
    readAllIndexesSync: readAllIndexesSync,
    queryAll: queryAll,
    queryAllSync: queryAllSync,
    addIndexRecord: addIndexRecord,
    removeIndexRecord: removeIndexRecord,
    addIdRecord: addIdRecord,
    removeIdRecord: removeIdRecord,
    resetIdsFile: resetIdsFile,
    resetIndexFile: resetIndexFile
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
  return path.join(this.getTableIdPath(table), id);
}

function getTableUniquePath (table, name) {
  return path.join(this.getTablePath(table), name);
}

function getTableUniqueFile (table, name, value) {
  return path.join(this.getTableUniquePath(table, name), _encrypt(value));
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

function _encrypt (s) {
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

function readTableIdsDir (table, callback) {
  var _this = this;
  var dir = this.getTableIdPath(table);
  var ids = [];
  
  fs.readDir(dir, function (e, files) {
    if (e) {
      callback(e);
    } else {
      files.forEach(function (idFile) {
        ids.push(idFile.split('.')[0]);
      });
      callback(null, ids);
    }    
  });
}

function readTableIdsDirSync (table) {
  var _this = this;
  var dir = this.getTableIdPath(table);
  var ids = [];
  
  var files = fs.readdirSync(dir);
  files.forEach(function (idFile) {
    ids.push(idFile.split('.')[0]);
  });
  
  return ids;
}


function readTableIdIndexFile (table, callback) {
  var _this = this;
  var idsFile = this.getTableIndexFile(table, '_id');

  fs.readFile(idsFile, function (e, raw) {
    var ids;
    if (e) {
      if (e.code === "ENOENT") {
        callback(null, []);
      } else {
        callback(e);
      }
    } else {
      ids = _extortIds(raw);
      callback(null, ids);
    }
  });
}


function readTableIdIndexFileSync (table, callback) {
  var idsFile = this.getTableIndexFile(table, '_id');
  var raw, ids;
  try {
    raw = fs.readFileSync(idsFile, {encoding: 'utf8'});
    return _extortIds(raw);
  } catch (e) {
    if (e.code === "ENOENT") {
      return [];
    } else {
      throw e;
    }
  }
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

function resetIdsFile (table, ids) {
  var indexFile = this.getTableIndexFile(table, '_id');
  var content = '';
  ids.forEach(function (_id) {
    content += indexRecordFormatedString(['+', _id]);
  });
  
  fs.writeFileSync(indexFile, content);
}

function resetIndexFile (table, name) {
  var indexFile = this.getTableIndexFile(table, name);
  var records = this.readAllSync(table);
  var content = '';
  records.forEach(function (record) {
    content += indexRecordFormatedString(['+', record['_id'], record[name]]);
  });

  fs.writeFileSync(indexFile, content);
}

function removeIdRecord (table, _id) {
  var indexFile = this.getTableIndexFile(table, '_id');
  fs.appendFileSync(indexFile, indexRecordFormatedString(['-', _id]));
}


function indexRecordFormatedString (arr) {
  return arr.join(_getIndexRecordSplitor()) + "\n";
}

function _getIndexRecordSplitor () {
  return "\t\t";
}

/**
 * return [_id1, _id2, ...]
 */
function _extortIds (content) {
  var splitor = _getIndexRecordSplitor();
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

function readAllIndexes (table, names, callback) {
  var tasks = {};
  var _this = this;
  
  Object.keys(names).forEach(function (name) {
    tasks[name] = function (callback) {
      _this.readIndex(table, name, names[name], callback);
    }
  });
  
  async.series(
    [
      function (callback) {
        _this.readTableIdIndexFile(table, callback);
      },
      function (callback) {
        async.parallel(tasks, callback);  
      }
    ],
    function (e, results) {
      if (e) {
        callback(e);
      } else {
        callback(null, _mergeIndexesToRecords(results[0], results[1]));
      }
    }
  );
  
}

function readAllIndexesSync (table, names) {
  var indexes = {};
  var ids = this.readTableIdIndexFileSync(table);
  var _this = this;
  
  Object.keys(names).forEach(function (name) {
    indexes[name] = _this.readIndexSync(table, name, names[name]);
  });
  
  return _mergeIndexesToRecords(ids, indexes);
}


function readIndex (table, name, convertFn, callback) {
  var file = this.getTableIndexFile(table, name);
  fs.readFile(file, function (e, content) {
    if (e) {
      if (e.code === "ENOENT") {
        callback(null, {});
      } else {
        return e;
      }
    } else {
      callback(null, _parseIndexFile(content, convertFn));
    }
  });
}

function readIndexSync (table, name, convertFn) {
  var file = this.getTableIndexFile(table, name);
  var content;
  try {
    content = fs.readFileSync(file, {encoding: 'utf8'});
    return _parseIndexFile(content, convertFn);
  } catch (e) {
    if (e.code === "ENOENT") {
      return {}
    } else {
      throw e;
    }
  }
}

/**
 * return {_id1: xxx, _id2: xxx}
 */
function _parseIndexFile (content, convertFn) {
  var splitor = _getIndexRecordSplitor();
  var re = new RegExp('^([+-])' + splitor + '(.*?)' + splitor + '(.*?)$', "mg");
  var line;  
  var records = {};
  var sign, _id, indexValue;
  while (line = re.exec(content)) {
    sign = line[1];
    _id = line[2];
    indexValue = convertFn ? convertFn(line[3]) : line[3];
    
    if (sign == '+') {
      records[_id] = indexValue;
    } else if (sign == '-') {
      delete records[_id];
    }
  }
 
  return records;
}

function _mergeIndexesToRecords (ids, indexes) {
  var names = Object.keys(indexes);
  var records = [];
  
  ids.forEach(function (_id) {
    var record = { _id: _id };
    names.forEach(function (name) {
      record[name] = indexes[name][_id];
    });
    records.push(record);
  });

  return records;
}

// 将读出所有记录
function readAll (table, callback) {
  var list = [];
  var _path = this.getTableIdPath(table);
  var _this = this;
  
  fs.readdir(_path, function (err, ids) {
    if (err) {
      callback(err);
    } else {
      _this.readTableIdsFiles(table, ids, callback);
    }
  });
}

function readTableIdsFiles (table, ids, callback) {
  var _path = this.getTableIdPath(table);
  var tasks = [];
  
  ids.forEach(function (_id) {
    tasks.push(function (callback) {
      fs.readFile(path.join(_path, _id), {encoding: 'utf8'}, function (e, content) {
        if (e) { 
          callback(e);
        } else {
          callback(null, JSON.parse(content));
        }
      })
    });
  });
  
  async.parallelLimit(tasks, 100, callback);
}

function readTableIdsFilesSync (table, ids) {
  var _path = this.getTableIdPath(table);
  var list = [];
  
  ids.forEach(function (_id) {
    var content = fs.readFileSync(path.join(_path, _id), {encoding: 'utf8'});
    list.push(JSON.parse(content));
  });
  
  return list;
}

function readAllSync (table) {
  var list = [];
  var _path = this.getTableIdPath(table);
  var ids = fs.readdirSync(_path);
  
  return this.readTableIdsFilesSync (table, ids);
}