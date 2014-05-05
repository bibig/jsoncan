exports.create = create;

var libs = require('./table_libs');

/**
 * model way
 */

function create (data) {
  var parent = this; // Table
  var m      = {};
  
  m.isNew = data._id ? false : true;
  
  m.data = data;
  
  m.messages = null;
  
  m.get = function (name) { 
    return this.data[name]; 
  };
  
  m.set = function (/*name, value | hash*/) { 
    var self = this;
    var map;
    
    if (arguments.length == 2) {
      this.data[arguments[0]] = arguments[1]; 
    } else if (arguments.length == 1 && typeof arguments[0] == 'object') {
      map = arguments[0];
      Object.keys(map).forEach(function (name) {
        self.data[name] = map[name];
      });
    }

    return this;
  };
  
  m.read = function (name) {

    if (name) {
      return libs.present.call(parent, name, this.data[name], this.data);
    } else {
      return parent.schemas.presentAll(this.data);
    }

  };
  
  m.validate = function () {
    var data  = parent.schemas.addValues(this.data);
    var check = parent.validate(this.data);

    this.errors  = this.messages = check.getMessages();
    this.isValid = check.isValid();

    return this.isValid;
  };
  
  m.getPrimaryId = function () { return this.get('_id'); };
  
  m.save = function (callback) {
    var self = this;
    
    if (this.isNew) { // update
      parent.insert(this.data, function (e, record) {

        if (e) {
          callback(e);
        } else {
          self.data = record;
          self.isNew = false;
          callback(null, record);
        }

      });        
    } else {
      parent.update(this.getPrimaryId(), this.data, function (e, record) {

        if (e) {
          callback(e);
        } else {
          self.data = record;
          callback(null, record);
        }

      });
    }
  };
  
  m.saveSync = function () {
    var self = this;

    if (this.isNew) { // update
      this.data = parent.insertSync(this.data);        
      this.isNew = false;
    } else {
      this.data = parent.updateSync(this.getPrimaryId(), this.data);
    }

    return this;
  };
  
  m.remove = function (callback) {
    parent.remove(this.getPrimaryId(), callback);
  };
  
  m.removeSync = function () {
    parent.removeSync(this.getPrimaryId());
  };

  m.isValidPassword = function (pass, passwordFieldName) {
    passwordFieldName = passwordFieldName || 'password';

    if (parent.schemas.isType(passwordFieldName, 'password')) { // check whether the field is password
      return parent.schemas.isValidPassword(this.data[passwordFieldName], pass);
    } else {
      return false;
    }
    
  };
  
  return m;
}