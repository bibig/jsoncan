exports.create = create;

var fs = require('fs');
var path = require('path');

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
    createTablePaths: createTablePaths,
    save: save, // for insert or update
    remove: remove,
    findAll: findAll,
    find: find,
    findBy: findBy
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

/**
 * 连接表时的初始化任务
 * 1. 创建表的根目录
 * 2. 为schemas中定义的唯一字段创建目录
 * @table: 表名
 * @fields: 表字段的定义信息表
 * 
 */
function createTablePaths (table, fields) {
  var root = this.getTablePath(table);
  var idPath = this.getTableIdPath(table);
  var _this = this;
  
  if (!fs.existsSync(idPath)) {
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root);
    }
    fs.mkdirSync(idPath);
  }
  
  Object.keys(fields).forEach(function (name) {
    var field = fields[name];
    var uniquePath;
    if (field.isUnique) {
      uniquePath = _this.getTableUniquePath(table, name);
      // console.log(uniquePath);
      if (!fs.existsSync(uniquePath)) {
        fs.mkdirSync(uniquePath);   
      }   
    }
  });
}


function encrypt (s) {
	return require('crypto').createHash('sha1').update(s).digest('hex');
}

function _findOneCallback (err, data, callback) {
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

function _find (file, callback) {
  fs.readFile(file, {encoding: 'utf8'}, function (err, data) {
    if (err) {
      // record does not exist
      // if (err.errno === 34) {
      if (err.code === "ENOENT") {
        callback(null, null);
      } else {
        callback(err);
      }
    } else {
      callback(null, JSON.parse(data));
    }
  });
}


// 得到原始json数据
function find (table, id, callback) {
  _find(this.getTableIdFile(table, id), callback);
}

function findBy (table, fieldName, fieldValue, callback) {
  _find(this.getTableUniqueFile(table, fieldName, fieldValue), callback);
}



// 将读出所有记录
function findAll (table, callback) {
  var list = [];
  var _path = this.getTableIdPath(table);
  fs.readdir(_path, function (err, files) {
    if (err) {
      callback(err);
    } else {
      // if none files found, files = []
      files.forEach(function (file) {
        if (isValidFile(file)) {
          list.push(JSON.parse(fs.readFileSync(path.join(_path, file))));
        }
      });
      callback(null, list);
    }
  });
}

function isValidFile (file) {
  return file.split('.')[1] == 'js';
}

// for connect
function remove (table, _id, callback) {
  fs.unlink(this.getTableIdFile(table, _id), callback);
}

// for connect
function save (table, _id, data, callback) {
  fs.writeFile(this.getTableIdFile(table, _id), JSON.stringify(data), function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
}