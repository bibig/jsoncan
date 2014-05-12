exports.create = create;

var fs    = require('fs');
var path  = require('path');
var async = require('async');
var Xun   = require('xun');
var myna  = require('myna')({
  900: 'Cannot build the jsoncan data path [%s]',
  901: 'invalid string param: %s in creating table unique file',
});

var Conn = function (path) {
  this.PATH = path;
};

// 创建connection
function create (_path) {

  if (!fs.existsSync(_path)) {

    try {
      fs.mkdirSync(_path);
    } catch (e) {
      throw myna.speak(900, _path);
    }

  }

  return new Conn(_path);
}

Conn.prototype.getTablePath = function (table) {
  return path.join(this.PATH, table);
};

Conn.prototype.getTableIdPath = function (table) {
  return path.join(this.getTablePath(table), '_id');
};

// 获取table数据文件
Conn.prototype.getTableIdFile = function (table, id) {
  return path.join(this.getTableIdPath(table), id);
};

Conn.prototype.getTableUniquePath = function (table, name) {
  return path.join(this.getTablePath(table), name);
};

Conn.prototype.getTableUniqueFile = function (table, name, value) {
  return path.join(this.getTableUniquePath(table, name), _encrypt(value));
};

Conn.prototype.getTableUniqueAutoIncrementFile = function (table, name) {
  return path.join(this.getTableUniquePath(table, name), '.auto_increment');
};

Conn.prototype.getTableIndexFile = function (table, name) {
  return path.join(this.getTablePath(table), name + '.index');
};

/**
 * create table data paths, including root path, unique fields paths
 * @table: table name
 * @uniqueFields: unique fields list
 * 
 */
Conn.prototype.createTablePaths = function (table, uniqueFields) {
  var root   = this.getTablePath(table);
  var idPath = this.getTableIdPath(table);
  var self   = this;
  
  if (!fs.existsSync(idPath)) {

    if (!fs.existsSync(root)) {
      fs.mkdirSync(root);
    }

    fs.mkdirSync(idPath);
  }
  
  Object.keys(uniqueFields).forEach(function (name) {
    var uniquePath              = self.getTableUniquePath(table, name);
    var autoIncrementFromNumber = uniqueFields[name];
    var autoIncrementFile;
    
    if (!fs.existsSync(uniquePath)) {
      fs.mkdirSync(uniquePath);   
    }
    
    if (autoIncrementFromNumber > 0) {
      autoIncrementFile = self.getTableUniqueAutoIncrementFile(table, name);

      if (!fs.existsSync(autoIncrementFile)) {
        fs.writeFileSync(autoIncrementFile, autoIncrementFromNumber);
      }

    }
    
  });
};


// 得到原始json数据
Conn.prototype.read = function (table, id, callback) {
  _read(this.getTableIdFile(table, id), callback);
};

Conn.prototype.readBy = function (table, fieldName, fieldValue, callback) {
  _read(this.getTableUniqueFile(table, fieldName, fieldValue), callback);
};

// 得到原始json数据
Conn.prototype.readSync = function (table, id) {
  return _readSync(this.getTableIdFile(table, id));
};

Conn.prototype.readBySync = function (table, fieldName, fieldValue) {
  return _readSync(this.getTableUniqueFile(table, fieldName, fieldValue));
};

Conn.prototype.readTableIdsDir = function (table, callback) {
  var self = this;
  var dir  = this.getTableIdPath(table);
  var ids  = [];
  
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
};

Conn.prototype.readTableIdsDirSync = function (table) {
  var self  = this;
  var dir   = this.getTableIdPath(table);
  var ids   = [];
  var files = fs.readdirSync(dir);

  files.forEach(function (idFile) {
    ids.push(idFile.split('.')[0]);
  });
  
  return ids;
};


Conn.prototype.readTableIdIndexFile = function (table, callback) {
  var self    = this;
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
};


Conn.prototype.readTableIdIndexFileSync = function (table, callback) {
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
};

Conn.prototype.remove = function (table, _id, callback) {
  fs.unlink(this.getTableIdFile(table, _id), callback);
};

Conn.prototype.removeSync = function (table, _id) {
  fs.unlinkSync(this.getTableIdFile(table, _id));
};

Conn.prototype.unlinkTableUniqueFile = function (table, name, value, callback) {
  fs.unlink(this.getTableUniqueFile(table, name, value), callback);
};

Conn.prototype.unlinkTableUniqueFileSync = function (table, name, value) {
  fs.unlinkSync(this.getTableUniqueFile(table, name, value));
};

Conn.prototype.linkTableUniqueFile = function (table, _id, name, value, callback) {
  // var idFile = this.getTableIdFile(table, _id);
  var idFile = path.join('../_id/', _id);
  var linkFile = this.getTableUniqueFile(table, name, value);
  
  fs.symlink(idFile, linkFile, callback);
};

Conn.prototype.linkTableUniqueFileSync = function (table, _id, name, value) {
  // var idFile = this.getTableIdFile(table, _id);
  var idFile = path.join('../_id/', _id);
  var linkFile = this.getTableUniqueFile(table, name, value);

  fs.symlinkSync(idFile, linkFile);
};

Conn.prototype.save = function (table, _id, data, callback) {
  fs.writeFile(this.getTableIdFile(table, _id), JSON.stringify(data), function (e) {
  
    if (e) {
      callback(e);
    } else {
      callback(null, data);
    }

  });
};

Conn.prototype.saveSync = function (table, _id, data) {
  fs.writeFileSync(this.getTableIdFile(table, _id), JSON.stringify(data));
  
  return data;
};

Conn.prototype.readTableUniqueAutoIncrementFile = function (table, name) {
  try {
    var autoIncrementFile = this.getTableUniqueAutoIncrementFile(table, name);
    var value             = fs.readFileSync(autoIncrementFile, {encoding: 'utf8'});

    return value;

  } catch (e) {

    if (e.code === "ENOENT") {
      return null;
    } else {
      return e;
    }

  }
};

Conn.prototype.writeTableUniqueAutoIncrementFile = function (table, name, value, callback) {
  var autoIncrementFile = this.getTableUniqueAutoIncrementFile(table, name);
  // console.log(autoIncrementFile);
  fs.writeFile(autoIncrementFile, value, callback);
};

Conn.prototype.writeTableUniqueAutoIncrementFileSync = function (table, name, value) {
  var autoIncrementFile = this.getTableUniqueAutoIncrementFile(table, name);

  fs.writeFileSync(autoIncrementFile, value);
};

/**
 * @table
 * @name: field name
 * @value: field value
 * @_id:  primary key value
 */
Conn.prototype.addIndexRecord = function (table, name, value, _id, callback) {
  var indexFile = this.getTableIndexFile(table, name);

  fs.appendFile(indexFile, _indexRecordFormatedString(['+', _id, value + '']), callback);
};

Conn.prototype.addIndexRecordSync = function (table, name, value, _id) {
  var indexFile = this.getTableIndexFile(table, name);

  fs.appendFileSync(indexFile, _indexRecordFormatedString(['+', _id, value + '']));
};


Conn.prototype.removeIndexRecord = function  (table, name, value, _id, callback) {
  var indexFile = this.getTableIndexFile(table, name);

  fs.appendFile(indexFile, _indexRecordFormatedString(['-', _id, value + '']), callback);
};

Conn.prototype.removeIndexRecordSync = function  (table, name, value, _id) {
  var indexFile = this.getTableIndexFile(table, name);

  fs.appendFileSync(indexFile, _indexRecordFormatedString(['-', _id, value + '']));
};

Conn.prototype.addIdRecord = function (table, _id, callback) {
  var indexFile = this.getTableIndexFile(table, '_id');

  fs.appendFile(indexFile, _indexRecordFormatedString(['+', _id]), callback);
};

Conn.prototype.addIdRecordSync = function (table, _id) {
  var indexFile = this.getTableIndexFile(table, '_id');

  fs.appendFileSync(indexFile, _indexRecordFormatedString(['+', _id]));
};

Conn.prototype.resetIdsFile = function (table, ids) {
  var indexFile = this.getTableIndexFile(table, '_id');
  var content   = '';

  ids.forEach(function (_id) {
    content += _indexRecordFormatedString(['+', _id]);
  });
  
  fs.writeFileSync(indexFile, content);
};

Conn.prototype.resetIndexFile = function (table, name) {
  var indexFile = this.getTableIndexFile(table, name);
  var records   = this.readAllSync(table);
  var content   = '';

  records.forEach(function (record) {
    content += _indexRecordFormatedString(['+', record._id, record[name]]);
  });

  fs.writeFileSync(indexFile, content);
};

Conn.prototype.removeIdRecord = function (table, _id, callback) {
  var indexFile = this.getTableIndexFile(table, '_id');
  
  fs.appendFile(indexFile, _indexRecordFormatedString(['-', _id]), callback);
};

Conn.prototype.removeIdRecordSync = function (table, _id) {
  var indexFile = this.getTableIndexFile(table, '_id');
  
  fs.appendFileSync(indexFile, _indexRecordFormatedString(['-', _id]));
};

Conn.prototype.queryAll = function (table, ids, options, callback) {
  var limit   = options.limit || ids.length;
  var skip    = options.skip || 0;
  var filters = options.filters;
  var count   = 0;
  var records = [];
  var self    = this;
  
  async.whilst(

    function () {
      return ids.length > 0 && count < limit;
    },

    function (callback) {
      var _id = ids.shift();
    
      self.read(table, _id, function (e, record) {
       
        if (e) {
          callback(e);
        } else if ( ! record ) { // null value
          callback();
        } else  {
       
          if (Xun.isMatch(record, filters)) {
       
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
}; // end of queryAll

Conn.prototype.queryAllSync = function (table, ids, options) {
  var max     = ids.length;
  var limit   = options.limit || max;
  var skip    = options.skip || 0;
  var filters = options.filters;
  var records = [];
  var self    = this;
  var record;
  var i;
  
  for (i = 0; i < max; i++) {

    if (limit < 1) { break; }
    
    record = self.readSync(table, ids[i]);
    
    if (!record) { continue; }
    
    if (Xun.isMatch(record, filters)) {
    
      if (skip > 0) {
        skip--;
      } else {
        records.push(record);
        limit--;
      }

    }
  }

  return records;
}; 

Conn.prototype.readAllIndexes = function (table, names, callback) {
  var tasks = {};
  var self  = this;
  
  Object.keys(names).forEach(function (name) {
    tasks[name] = function (callback) {
      self.readIndex(table, name, names[name], callback);
    };
  });
  
  async.series(
    [
      function (callback) {
        self.readTableIdIndexFile(table, callback);
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
}; // end of readAllIndexes

Conn.prototype.readAllIndexesSync = function (table, names) {
  var indexes = {};
  var ids     = this.readTableIdIndexFileSync(table);
  var self    = this;
  
  Object.keys(names).forEach(function (name) {
    indexes[name] = self.readIndexSync(table, name, names[name]);
  });
  
  return _mergeIndexesToRecords(ids, indexes);
};


Conn.prototype.readIndex = function (table, name, convertFn, callback) {
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

};

Conn.prototype.readIndexSync = function (table, name, convertFn) {
  var file = this.getTableIndexFile(table, name);
  var content;

  try {
    content = fs.readFileSync(file, {encoding: 'utf8'});
    return _parseIndexFile(content, convertFn);
  } catch (e) {
  
    if (e.code === "ENOENT") {
      return {};
    } else {
      throw e;
    }

  }
};


Conn.prototype.readTableIdsFilesSync = function (table, ids) {
  var _path = this.getTableIdPath(table);
  var list  = [];

  ids.forEach(function (_id) {
    var content = fs.readFileSync(path.join(_path, _id), {encoding: 'utf8'});
    list.push(JSON.parse(content));
  });
  
  return list;
};

Conn.prototype.readAllSync = function (table) {
  var _path = this.getTableIdPath(table);
  var ids   = fs.readdirSync(_path);

  return this.readTableIdsFilesSync (table, ids);
};

// 将读出所有记录
Conn.prototype.readAll = function (table, callback) {
  var _path = this.getTableIdPath(table);
  var self  = this;
  
  fs.readdir(_path, function (err, ids) {

    if (err) {
      callback(err);
    } else {
      self.readTableIdsFiles(table, ids, callback);
    }

  });

};

Conn.prototype.readTableIdsFiles = function (table, ids, callback) {
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

      });

    });

  });
  
  async.parallelLimit(tasks, 100, callback);
};

function _encrypt (s) {

  if (s !== '' && (typeof s === 'string' || typeof s === 'number')) {
    s = s + '';
    return require('crypto').createHash('sha1').update(s).digest('hex');
  } else {
    throw myna.speak(901, s);
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


function _getIndexRecordSplitor () {
  return "\t\t";
}

/**
 * return [_id1, _id2, ...]
 */
function _extortIds (content) {
  var splitor = _getIndexRecordSplitor();
  var re      = new RegExp('^([+-])' + splitor + '(.*?)$', "mg");
  var targets = [];
  var line, sign, _id;
  
  while ( (line = re.exec(content)) !== null ) {
    sign = line[1];
    _id  = line[2];

    if (sign == '+') {
      targets.push(_id);
    } else if (sign == '-') {
      targets.splice(targets.indexOf(_id), 1);
    }
  }
  
  return targets;
}



/**
 * return {_id1: xxx, _id2: xxx}
 */
function _parseIndexFile (content, convertFn) {
  var splitor = _getIndexRecordSplitor();
  var re      = new RegExp('^([+-])' + splitor + '(.*?)' + splitor + '(.*?)$', "mg");
  var records = {};
  var line, sign, _id, indexValue;

  while ( (line = re.exec(content)) !== null )  {
    sign = line[1];
    _id  = line[2];
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
  var names   = Object.keys(indexes);
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

function _indexRecordFormatedString (arr) {
  return arr.join(_getIndexRecordSplitor()) + "\n";
}