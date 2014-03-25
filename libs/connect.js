exports.create = create;

var fs = require('fs');
var path = require('path');
var async = require('async');
var query = require('./query');

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
    readFiles: readFiles,
    readFilesSync: readFilesSync,
    readAll: readAll,
    readAllSync: readAllSync,
    readAllByIndex: readAllByIndex,
    readAllByIndexSync: readAllByIndexSync,
    read: read,
    readSync: readSync,
    readBy: readBy,
    readBySync: readBySync,
    addIndexRecord: addIndexRecord,
    removeIndexRecord: removeIndexRecord,
    indexFilter: indexFilter,
    indexTargetsToFiles: indexTargetsToFiles,
    getFilesByIndex: getFilesByIndex,
    getFilesByIndexSync: getFilesByIndexSync
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
    
    // console.log(uniquePath);
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

function _readOneCallback (err, data, callback) {
  if (err) {
    // record none exist
    // if (err.errno === 34) {
    if (err.code === "ENOENT") {
      callback(null, null);
    } else {
      callback(err);
    }
  } else {
    callback(null, JSON.parse(data));
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

// 将读出所有记录
function readAll (table, callback) {
  var list = [];
  var _this = this;
  var _path = this.getTableIdPath(table);
  
  fs.readdir(_path, function (err, files) {
    var tasks;
    
    if (err) {
      callback(err);
    } else {
      files = files.map(function (file) {
        return path.join(_path, file);
      });
      
      _this.readFiles(files, callback);
    }
  });
}

function readAllByIndex (table, options, callback) {
  var _this = this;
  
  this.getFilesByIndex (table, options, function (e, files) {
    if (e) {
      callback(e);
    } else {
      _this.readFiles(files, callback);
    }
  });
}

function readAllSync (table) {
  var list = [];
  var _path = this.getTableIdPath(table);
  var files = fs.readdirSync(_path);
  
  files = files.map(function (file) {
    return path.join(_path, file);
  });
  
  return this.readFilesSync(files);
}

function readAllByIndexSync (table, options) {
  var files = this.getFilesByIndexSync(table, options);
  return this.readFilesSync(files);
}

function readFiles (files, callback) {
  var tasks = [];

  files.forEach(function (file) {
    if (!isValidFile(file)) { return; }
    tasks.push(function (callback) {
      fs.readFile(file, function (e, content) {
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

function readFilesSync (files) {
  var list = [];
  
  files.forEach(function (file) {
    if (isValidFile(file)) {
      list.push(JSON.parse(fs.readFileSync(file)));
    }
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
  // console.log('linkTableUniqueFileSync, %s = %s', name, value);
  var idFile = this.getTableIdFile(table, _id);
  var linkFile = this.getTableUniqueFile(table, name, value);
  fs.symlinkSync(idFile, linkFile);
}

function save (table, _id, data, callback) {
  fs.writeFile(this.getTableIdFile(table, _id), JSON.stringify(data), function (e) {
    if (e) {
      // console.log(e);
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
    // console.log('readTableUniqueAutoIncrementFile, %s = %s', name, value);
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
  // console.log('writeTableUniqueAutoIncrementFile, %s = %s', name, value);
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
  fs.appendFileSync(indexFile, indexRecordFormatedString(['+', value + '', _id]));
}

function removeIndexRecord  (table, name, value, _id) {
  var indexFile = this.getTableIndexFile(table, name);
  fs.appendFileSync(indexFile, indexRecordFormatedString(['-', value + '', _id]));
}


function indexRecordFormatedString (arr) {
  return arr.join(getIndexRecordSplitor()) + "\n";
}

function getIndexRecordSplitor () {
  return "\t\t";
}

// line format: [+-] indexValue <_id>
function indexFilter (content, filter) {
  var splitor = getIndexRecordSplitor();
  var re = new RegExp('^([+-])' + splitor + '(.*?)' + splitor + '(.*?)$', "mg");
  var line;
  var targets = [];
  var operator, value;
  var indexValue, sign, _id;
  
  if (Array.isArray(filter)) {
    operator = filter[0];
    value = filter[1];
  } else {
    operator = '=';
    value = filter;
  }
  
  while (line = re.exec(content)) {
    sign = line[1];
    indexValue = line[2];
    _id = line[3];
    if (query.compare(indexValue, operator, value)) {
      if (sign == '+') {
        targets.push(_id);
      } else if (sign == '-') {
        targets.splice(targets.indexOf(_id), 1);
      }
    }
  }

  return targets;
}

function indexTargetsToFiles (table, targets) {
  var files = [];
  var _this = this;
  
  targets.forEach(function (_id) {
    files.push(_this.getTableIdFile(table, _id));
  });
  
  return files;
}

function getFilesByIndex (table, options, callback) {
  var tasks = [];
  var _this = this;
  var noFileFoundErrorCode = 'NoFiles';
  
  Object.keys(options).forEach(function (name) {
    tasks.push(function (callback) {
      var file = _this.getTableIndexFile(table, name);
      fs.readFile(file, function (e, content) {
        var results, noFileFoundError;
        if (e) {
          callback(e);
        } else {
          results = _this.indexFilter(content, options[name]);
          if (results.length == 0) {
            noFileFoundError = new Error();
            noFileFoundError.code = noFileFoundErrorCode;
            callback(noFileFoundError);
          } else {
            callback(null, results);
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
      callback(null, _this.indexTargetsToFiles(table, getAllIntersection(results)));
    }
  });  
}

function getFilesByIndexSync (table, options) {
  var results = [];
  var _this = this;
  var names = Object.keys(options);
  
  for (var i = 0; i < names.length; i++) {
    var file = _this.getTableIndexFile(table, names[i]);
    var content = fs.readFileSync(file);
    var target = _this.indexFilter(content, options[names[i]]);
    if (target.length == 0) {
      return [];
    } else {
      results.push(target);
    }
  }

  return this.indexTargetsToFiles(table, getAllIntersection(results));
}

function getAllIntersection (targets) {
  var result = targets.shift();
  targets.forEach(function (target) {
    result = getIntersection(result, target);
  });
  
  return result;
}

function getIntersection (a, b) {
  var c = [];
  
  for (var i = 0; i < a.length; i++) {
    if (b.indexOf(a[i]) > -1) {
      c.push(a[i]);
    }
  }
  
  return c;
}