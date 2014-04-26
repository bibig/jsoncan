var should = require('should');
var assert = require('assert');
var utils = require('./utils');
var faker = require('faker');
var Jsoncan = require('../index');
var path = require('path');
var PATH = path.join(__dirname, '_popluate_test');
var fs = require('fs');

describe('populate test', function () {
  
  var tables = {
    categories: {
      id: { type: 'random', size: 6, required: true, isUnique: true, index: true },
      name: { type: 'string', max: 30, required: true}
    },
    blogs: {
      id: { type: 'autoIncrement', isIndex: true},
      title: { type: 'string', max: 100, required: true},
      _category: { type: 'ref', required: true},
      created:  { type: 'created' }
    },
    comments: {
      id: { type: 'autoIncrement', isIndex: true},
      title: { type: 'string', max: 100, required: true},
      _blog: { type: 'ref', required: true},
      created: { type: 'created' }
    }
  };
  var can = new Jsoncan(PATH, tables);
  
  var Blogs = can.open('blogs');
  var Categories = can.open('categories');
  var Comments = can.open('comments');
    
  function addData () {
    var categoryA = Categories.insertSync({name: 'a'});
    var categoryB = Categories.insertSync({name: 'b'});
    // console.log(categoryA);
    var blog1 = Blogs.insertSync({
      _category: categoryA,
      title: 'a.1'
    });
    
    var blog2 = Blogs.insertSync({
      _category: categoryA,
      title: 'a.2'
    });
    
    Blogs.insertSync({
      _category: categoryA,
      title: 'a.3'
    });
    
    Blogs.insertSync({
      _category: categoryB,
      title: 'b.1'
    });
    
    Blogs.insertSync({
      _category: categoryB._id,
      title: 'b.2'
    });
    
    
    Comments.insertSync({
      _blog: blog1,
      title: 'comment 1.1'
    });
    
    Comments.insertSync({
      _blog: blog1,
      title: 'comment 1.2'
    });
    
    Comments.insertSync({
      _blog: blog1,
      title: 'comment 1.3'
    });
    
    Comments.insertSync({
      _blog: blog2._id,
      title: 'comment 2.1'
    });
  }
  
  before(function (done) {
    addData();
    done();
  });
  

  after(function (done) {
    utils.clear(PATH, done);
  });

  
  it('test populate (belongsTo type) sync way', function () {
    var query = Blogs.query().ref('categories');
    var blogs = query.execSync();
    blogs.forEach(function (blog) {
      blog._category.should.have.property('name');
      blog._category.should.have.property('_id');
    });
  });
  
  it('test populate (belongsTo type) async way', function (done) {
    var query = Blogs.query().ref('categories');
    query.exec(function (e, blogs) {
      should.not.exist(e);
      blogs.forEach(function (blog) {
        blog._category.should.have.property('name');
        blog._category.should.have.property('_id');
      });
      // console.log(query.belongsToCaches);
      done();
    });
  });
  
  
  it('test populate (hasMany type) sync way', function () {
    var blogs = Blogs.query().hasMany('comments').execSync();
    // console.log(blogs);
    blogs.forEach(function (blog) {
      assert.ok(Array.isArray(blog.comments));
      // blog.comments[0].should.have.property('title');
      // blog.comments[0].should.have.property('_id');
      // console.log(blog.comments.length);
    });
  });
  
  it('test populate (hasMany type) async way', function (done) {
    Blogs.query().hasMany('comments').exec(function (e, blogs) {
      should.not.exist(e);
      // console.log(blogs);
      blogs.forEach(function (blog) {
        assert.ok(Array.isArray(blog.comments));
      });
      done();
    });
    // console.log(blogs);
  });
  
  it('test finder().ref()', function (done) {
    var finder = Blogs.finder('id', 1).ref('categories').select('id, title, _category');
    finder.exec(function (e, record) {
      // console.log(record);
      should.not.exist(e);
      assert.ok(typeof record._category == 'object');
      record._category.should.have.property('_id');
      assert.equal(record._category._id, Blogs.finder('id', 1).execSync()._category);
      done();
    });
  });
  
  it('test finder().hasMany()', function (done) {
    var finder = Blogs.finder('id', 1).ref('categories').hasMany('comments', {order: ['created']}).select('id, title, _category, comments');
    finder.exec(function (e, record) {
      // console.log(record);
      should.not.exist(e);
      assert.ok(Array.isArray(record.comments));
      assert.equal(record.comments.length, 3);
      done();
    });
  });
  
  it('test findAll by ref field', function (done) {
    var categoryA = Categories.query({name: 'a'}).execSync()[0];
    var query = Blogs.query({_category: categoryA._id}).exec(function (e, records) {
      should.not.exists(e);
      assert.ok(records.length > 0);
      done();
    });
  });
  
});