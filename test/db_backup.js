var should = require('should');
var assert = require('assert');
var utils = require('./utils');
var faker = require('faker');
var Jsoncan = require('../index');
var path = require('path');
var PATH = path.join(__dirname, '_backup_test');
var fs = require('fs');

describe('counter update test', function () {
  
  var tables = {
    categories: {
      id: { type: 'random', size: 6, required: true, isUnique: true, index: true },
      name: { type: 'string', max: 30, required: true},
      blogs: { type: 'int', required: true, default: 0}
    },
    blogs: {
      id: { type: 'autoIncrement', isIndex: true},
      title: { type: 'string', max: 100, required: true},
      _category: { type: 'ref', required: true, counter: 'blogs'},
      created:  { type: 'created' },
      comments: { type: 'int', required: true, default: 0}
    },
    comments: {
      id: { type: 'autoIncrement', isIndex: true},
      title: { type: 'string', max: 100, required: true},
      _blog: { type: 'ref', required: true, counter: 'comments'},
      created: { type: 'created' }
    }
  };
  var can = new Jsoncan(PATH, tables);
  
  var Blogs = can.open('blogs');
  var Categories = can.open('categories');
  var Comments = can.open('comments');
  var aCategoryCount = 10;
  var bCategoryCount = 15;  
  var aBlogCommentCount = 11;
  var bBlogCommentCount = 13;
  var backFile = path.join(PATH, 'backup.js');  
  
  function addData () {
    var categoryA = Categories.insertSync({name: 'a'});
    var categoryB = Categories.insertSync({name: 'b'});
    var blogA = Blogs.insertSync({ _category: categoryA, title: 'a'});
    var blogB = Blogs.insertSync({ _category: categoryB, title: 'b'});
    // console.log(categoryA);
    for (var i = 1; i < aCategoryCount; i++) {
      Blogs.insertSync({ _category: categoryA, title: 'a'});
    }
    
    for (var i = 1; i < bCategoryCount; i++) {
      Blogs.insertSync({ _category: categoryB, title: 'b'});
    }
        
    for (var i = 0; i < aBlogCommentCount; i++) {
      Comments.insertSync({ _blog: blogA, title: '...' });
    }
    
    for (var i = 0; i < bBlogCommentCount; i++) {
      Comments.insertSync({ _blog: blogB, title: '...' });
    }
  }
  
  before(function (done) {
    addData();
    done();
  });
  

  after(function (done) {
    utils.clear(PATH, done);
  });
  
  
  it('backup db should not issue error', function (done) {

    can.backup(backFile, function (e) {
      should.not.exist(e);
      assert.ok(fs.existsSync(backFile));
      
      done();
    });
  });
  
  
  it('backup file should be ok', function () {
    var db = JSON.parse(fs.readFileSync(backFile, {encoding: 'utf8'}));
    
    db.should.have.property('categories');
    db.should.have.property('blogs');
    db.should.have.property('comments');
    
    assert.equal(db.categories.length, 2);
    assert.equal(db.blogs.length, aCategoryCount + bCategoryCount);
    assert.equal(db.comments.length, aBlogCommentCount + bBlogCommentCount);
    
    // console.log(db);
    
  });
  
  

});