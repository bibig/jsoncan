var should = require('should');
var assert = require('assert');
var utils = require('./utils');
var faker = require('faker');
var Jsoncan = require('../index');
var path = require('path');
var PATH = path.join(__dirname, 'table_counter_update_test');
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
      created:  { type: 'created' }
    }
  };
  var can = new Jsoncan(PATH, tables);
  
  var Blogs = can.open('blogs');
  var Categories = can.open('categories');
  var aCategoryCount = 10;
  var bCategoryCount = 10;  
  
  
  function addData () {
    var categoryA = Categories.insertSync({name: 'a'});
    var categoryB = Categories.insertSync({name: 'b'});
    var blogA = Blogs.insertSync({ _category: categoryA, title: 'a'});
    var blogB = Blogs.insertSync({ _category: categoryB, title: 'b'});
    var i;
    // console.log(categoryA);
    for (i = 1; i < aCategoryCount; i++) {
      Blogs.insertSync({ _category: categoryA, title: 'a'});
    }
    
    for (i = 1; i < bCategoryCount; i++) {
      Blogs.insertSync({ _category: categoryB, title: 'b'});
    }
  }
  
  before(function (done) {
    addData();
    done();
  });
  

  after(function (done) {
    utils.clear(PATH, done);
  });

  it('check init categories data', function () {
    var recordA = Categories.query().where('name', 'a').execSync()[0];
    var recordB = Categories.query().where('name', 'b').execSync()[0];
    assert.equal(recordA.blogs, aCategoryCount);
    assert.equal(recordB.blogs, bCategoryCount);
  });
  
  
  it('check update blog category', function (done) {
    var categoryB = Categories.query().where('name', 'b').execSync()[0];
    var blogA = Blogs.query().where('title', 'a').limit(1).execSync()[0];
    // console.log('blog(%s) category: %s', blogA.id, blogA._category);
    Blogs.update(blogA._id, {'_category': categoryB}, function (e, record) {
      should.not.exist(e);
      var categoryA = Categories.query().where('name', 'a').execSync()[0];
      var categoryB = Categories.query().where('name', 'b').execSync()[0];
      // console.log('categoryA(%s).blogs: %d', categoryA._id, categoryA.blogs);
      // console.log('categoryA(%s).blogs: %d', categoryB._id, categoryB.blogs);
      assert.equal(categoryA.blogs, aCategoryCount - 1);
      assert.equal(categoryB.blogs, bCategoryCount + 1);
      done();
    });
  });
  
  it('check update blog but donot change category field', function () {
    var categoryA, categoryB = Categories.query().where('name', 'b').execSync()[0];
    var blogA = Blogs.query().where('title', 'a').limit(1).execSync()[0];
    
    // console.log('blog(%s) category: %s', blogA.id, blogA._category);
    Blogs.updateSync(blogA._id, {'title': 'aaa'});
    categoryA = Categories.query().where('name', 'a').execSync()[0];
    categoryB = Categories.query().where('name', 'b').execSync()[0];
    // console.log('categoryA(%s).blogs: %d', categoryA._id, categoryA.blogs);
    // console.log('categoryA(%s).blogs: %d', categoryB._id, categoryB.blogs);
    assert.equal(categoryA.blogs, aCategoryCount - 1);
    assert.equal(categoryB.blogs, bCategoryCount + 1);
  });
  
  it('check update blog category sync', function () {
    var categoryA, categoryB = Categories.query().where('name', 'b').execSync()[0];
    var blogA = Blogs.query().where('title', 'a').limit(1).execSync()[0];
    // console.log('blog(%s) category: %s', blogA.id, blogA._category);
    Blogs.updateSync(blogA._id, {'_category': categoryB});
    categoryA = Categories.query().where('name', 'a').execSync()[0];
    categoryB = Categories.query().where('name', 'b').execSync()[0];
    // console.log('categoryA(%s).blogs: %d', categoryA._id, categoryA.blogs);
    // console.log('categoryA(%s).blogs: %d', categoryB._id, categoryB.blogs);
    assert.equal(categoryA.blogs, aCategoryCount - 2);
    assert.equal(categoryB.blogs, bCategoryCount + 2);
  });

}); // end