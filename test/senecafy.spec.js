
/* global it */
/* global describe */
/* global after */
/* global process */
/* global before */
const Iridium = require('iridium');
const Chai = require('chai');
const expect = Chai.expect;
const Core = Iridium.Core;
const User = require('./models/user');
const Address = require('./models/address');
const seneca = require('seneca')();
const Bluebird = require('bluebird');
const Otomatk = require('../index');
const Senecafy = Otomatk.Senecafy;
var db, UserModel, AddressModel;
var senecaRole = 'user';
var senecafy = new Senecafy(seneca, senecaRole);

seneca.actAsync = Bluebird.promisify(seneca.act);

before((done) => {
  db = new Core(process.env.DB_URI || 'mongodb://localhost/test');
  return db.connect().then(() => {
    console.log('Connected to DB..');
    UserModel = new Iridium.Model(db, User);
    AddressModel = new Iridium.Model(db, Address);
    senecafy.load([UserModel, AddressModel]);
    done();
  });
});

// Load up with data;
before((done) => {
  var users = [];
  for (var i = 0; i < 100; i++) {
    users.push({
      username: 'test ' + i,
      email: 'test' + i + '@test.com',
      age: i
    });
  }
  UserModel.collection.insertMany(users, (err, r) => {
    if (err) {
      return done(err);
    }
    done();
  });
});

describe('Senecafy', () => {
  it('should execute list command without any query', (done) => {
    seneca
      .actAsync({ role: senecaRole, plugin: UserModel.collectionName, cmd: 'list' })
      .then((data) => {
        expect(data).to.have.length.of(100);
        expect(data).to.be.instanceOf(Array);
        done();
      })
      .catch((err) => {
        done(err);
      })
  });
  
  it('should list users whose age is above 50', (done) => {
    seneca
    .actAsync({ role: senecaRole, plugin: UserModel.collectionName, cmd: 'list' }, { data: { age: { $gt: 50 } } })
    .then((data) => {
      expect(data).to.have.length.of.at.least(1);
      expect(data).to.be.instanceOf(Array);
      data.forEach((i) => {
        expect(i.age).to.be.above(50);
      });
      done();
    })
    .catch((err) => {
      done(err);
    });
  });
  
  it('should get the user details whose age is 50', (done) => {
    seneca
    .actAsync({ role: senecaRole, plugin: UserModel.collectionName, cmd: 'load' }, { data: { age: 50 } })
    .then((data) => {
      expect(data).not.to.be.null;
      expect(data).not.to.be.undefined;
      done();
    })
    .catch((err) => {
      done(err);
    });
  });
  
  it('should save a new user', (done) => {
    seneca
    .actAsync({ role: senecaRole, plugin: UserModel.collectionName, cmd: 'save' }, { 
      data: { username: 'test_user500', email: 'test_user500@test.com', age: 500 } 
    })
    .then((data) => {
      expect(data).not.to.be.null;
      expect(data).not.to.be.undefined
      expect(data._id).not.to.be.undefined;
      expect(data.age).to.equal(500);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });
  
  it('should update an existing user', (done) => {
    var updateId;
    var preUpdateAge;
    var postUpdateAge = 400;
    seneca
    .actAsync({ role: senecaRole, plugin: UserModel.collectionName, cmd: 'save' }, { 
      data: { username: 'test_user200', email: 'test_user200@test.com', age: 200 } 
    })
    .then((data) => {
      updateId = data._id.toString();
      preUpdateAge = data.age;
      data.age = postUpdateAge;
      return seneca.actAsync({ role: senecaRole, plugin: UserModel.collectionName, cmd: 'save' }, { data: data });
    })
    .then((data) => {
      expect(data).not.to.be.null;
      expect(data).not.to.be.undefined
      expect(data._id).not.to.be.undefined;
      expect(data.age).to.equal(postUpdateAge);
      expect(data.age).to.not.equal(preUpdateAge);
      expect(data._id.toString()).to.equal(updateId);
      done();
    });
  });
  
  it('should add a new address', (done) => {
    seneca
    .actAsync({ role: senecaRole, plugin: AddressModel.collectionName, cmd: 'save' }, {
      data: {
        zipcode: 111,
        city: 'Boston',
        state: 'Commonwealth'
      }
    })
    .then((data) => {
      expect(data).not.to.be.null;
      expect(data).not.to.be.undefined
      expect(data._id).not.to.be.undefined;
      expect(data.city).to.equal('Boston');
      done();
    });
  });
});

after((done) => {
  UserModel.collection.drop((err) => {
    if (err) {
      return done(err);
    }
    db.close();
    done();
  })
});