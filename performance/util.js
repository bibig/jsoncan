exports.createTable = createTable;
exports.prepareData = prepareData;
exports.run         = run;
exports.report      = report;
exports.setTime     = setTime;
exports.allTime     = allTime;
exports.clear       = clear;
exports.max         = 100;

var exec    = require('child_process').exec;
var Jsoncan = require('../index');
var faker   = require('faker');
var PATH    = __dirname + '/__data';
var beginTime;
var allTime;

function setMax (num) {
  this.max = num;
}

function setTime () {
  beginTime = Date.now();
}

function createTable (hasAutoIncrement) {
  var fields = {
    id: {
      type: hasAutoIncrement ? 'autoIncrement': 'random'
    },
    name: {
      type: 'string'
    }
  };
  var can = new Jsoncan(PATH);

  return can.open('People', fields);
}

function prepareData () {
  var list = [];

  for (var i = 0; i < this.max; i++) {
    list.push({name: faker.Name.findName()});
  }

  return list;
}

function report () {
  var t = parseInt(1000 * (Date.now() - beginTime) / this.max, 10) / 1000;

  if (arguments.length > 0) {
    console.log.apply(console, arguments);
  }

  console.log(' -> %d ms/record', t);
}

function run (callback) {
  clear(function () {
    allTime = Date.now();
    callback();
  });
}

function allTime () {
  console.log('all time: %d ms', Date.now() - allTime);
}

function clear (callback) {
  var command = 'rm -rf ' + PATH;
  
  exec(command, function(e, stdout, stde) {
    if (callback) callback();
  });
}