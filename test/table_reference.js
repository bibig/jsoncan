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
      name: { type: 'string', max: 30, required: true}
    },
    blogs: {
      id: { type: 'autoIncrement', isIndex: true},
      title: { type: 'string', max: 100, required: true},
      category: { type: 'ref', required: true, 
        ref: {
          table: 'categories',
          key: '_id',
          options: { order: ['name', true] }
        }
      },
      created:  { type: 'created' }
    },
    comments: {
      id: { type: 'autoIncrement', isIndex: true},
      title: { type: 'string', max: 100, required: true},
      _blog: { type: 'ref', required: true,
        ref: {
          table: 'blogs',
          fields: ['title']
        }
      },
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
    
    var blog1 = Blogs.insertSync({
      category: categoryA._id,
      title: 'a.1'
    });
    
    var blog2 = Blogs.insertSync({
      category: categoryA._id,
      title: 'a.2'
    });
    
    Blogs.insertSync({
      category: categoryA._id,
      title: 'a.3'
    });
    
    Blogs.insertSync({
      category: categoryB._id,
      title: 'b.1'
    });
    
    Blogs.insertSync({
      category: categoryB._id,
      title: 'b.2'
    });
    
    
    Comments.insertSync({
      _blog: blog1._id,
      title: 'comment 1.1'
    });
    
    Comments.insertSync({
      _blog: blog1._id,
      title: 'comment 1.2'
    });
    
    Comments.insertSync({
      _blog: blog1._id,
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
    var blogs = Blogs.query().ref('category').execSync();
    blogs.forEach(function (blog) {
      blog.category.should.have.property('name');
      blog.category.should.have.property('_id');
    });
  });
  
  it('test populate (belongsTo type) async way', function (done) {
    var query = Blogs.query().ref('category');
    query.exec(function (e, blogs) {
      should.not.exist(e);
      blogs.forEach(function (blog) {
        blog.category.should.have.property('name');
        blog.category.should.have.property('_id');
      });
      // console.log(query.belongsToCaches);
      done();
    });
  });
  
  
  it('test populate (hasMany type) sync way', function () {
    var blogs = Blogs.query().hasMany('comments', '_blog').execSync();
    // console.log(blogs);
    blogs.forEach(function (blog) {
      assert.ok(Array.isArray(blog.comments));
      // blog.comments[0].should.have.property('title');
      // blog.comments[0].should.have.property('_id');
      // console.log(blog.comments.length);
    });
  });
  
  
  
  it('test populate (hasMany type) async way', function (done) {
    Blogs.query().hasMany('comments', '_blog').exec(function (e, blogs) {
      should.not.exist(e);
      // console.log(blogs);
      blogs.forEach(function (blog) {
        assert.ok(Array.isArray(blog.comments));
      });
      done();
    });
    
    // console.log(blogs);
  });
  
  
  
});