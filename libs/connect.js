exports.create = create;

var fs = require('fs');
var path = require('path');
var async = require('async');

// 创建connection
function create (_path) {
  // console.log(_path);
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
    readAll: readAll,
    read: read,
    readBy: readBy,
    readAllSync: readAllSync,
    readSync: readSync,
    readBySync: readBySync
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
  var _path = this.getTableIdPath(table);
  
  function makeReadTasks (files) {
    var tasks = [];
    files.forEach(function (file) {
      if (!isValidFile(file)) { return; }
      tasks.push(function (callback) {
        fs.readFile(path.join(_path, file), function (e, content) {
          if (e) {
            callback(e);
          } else {
            callback(null, JSON.parse(content));
          }
        })
      });
    });
    return tasks;
  }
  
  fs.readdir(_path, function (err, files) {
    var tasks;
    
    if (err) {
      callback(err);
    } else {
      tasks = makeReadTasks(files);
      if (tasks.length > 0) {
        async.parallelLimit(tasks, 150, callback);
      } else {
        callback(null, []);
      }
      /*
      // if none files found, files = []
      // console.log('read %d files', files.length);
      files.forEach(function (file) {
        if (isValidFile(file)) {
          list.push(JSON.parse(fs.readFileSync(path.join(_path, file))));
        }
      });
      callback(null, list);
      */
    }
  });
}

function readAllSync (table) {
  var list = [];
  var _path = this.getTableIdPath(table);
  var files = fs.readdirSync(_path);
  
  files.forEach(function (file) {
    if (isValidFile(file)) {
      list.push(JSON.parse(fs.readFileSync(path.join(_path, file))));
    }
  });
  
  return list;
  
}

function isValidFile (file) {
  return file.split('.')[1] == 'js';
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

