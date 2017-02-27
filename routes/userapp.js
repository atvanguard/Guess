const https = require('https');
const mdb = require('./dbapi');
const config = require('./config');
const express = require('express');
const router = express.Router();
const db = new mdb.Database();
const util = require('util');

/*
curl -H "Content-Type: application/json" -H "Accept: application/json" \
-X POST \
-d '{"name":"user_name"}' http://localhost:3000/login
OR
-d '{"auth_token": "..."}' http://localhost:3000/login
*/
router.post('/login', function(req, res, next) {
  // Check if auth_token is provided
  if (req.body.hasOwnProperty(config.AUTH_TOKEN)) {
    util.getProfileFromGoogle(req.body[config.AUTH_TOKEN],
      (err, googleName, email) => {
        if (err) return;
        // Once email is retrieved, check if already exists in db
        db.checkUserExists(email, (_id, name) => {
          if (_id) return loginResponse(_id, name, res);
          createUser(googleName, email, res);
        });
    });
  } else if (req.body.hasOwnProperty(config.NAME)
    && req.body[config.NAME].length != 0) {
    // Create user without email
    createUser(req.body[config.NAME], undefined, res);
  } else res.status(400).send('Name or auth_token not provided.');
});

let createUser = function(name, email, res) {
  db.createUser(name, email, (_id, name) => {
    if (_id) return loginResponse(_id, name, res);
    res.status(500).send('Error occurred in user creation.');
  });
};

let loginResponse = function(_id, name, res) {
  res.cookie(config.COOKIE_NAME, _id.toString())
    .send({'user': {'name': name}});
};

/*
curl -H "Content-Type: application/json" \
-H "Cookie: userid=588d937f009f04028792504e" \
-X POST \
-d '{"word_data": [{"word_id": 123, "time": 5}, {"word_id": 456, "time": 3}]}' \
http://localhost:3000/recordstats
*/
router.post('/recordstats', function(req, res, next) {
  if (!(config.COOKIE_NAME in req.cookies))
    return res.status(400).send('Cookie not provided.');
  if (!req.body.hasOwnProperty('word_data'))
      return res.status(400).send('Words not provided');

  var _id = req.cookies[config.COOKIE_NAME];
  db.recordGameStats(_id, req.body, (err, error_msg) => {
    if (err) {
      if (error_msg) return res.status(400).send(error_msg);
      res.status(500).send('Error occurred in recording stat.');
    }
    res.send('Stat recorded');
  });
});

// Helper endpoints
// curl http://localhost:3000/allusers
router.get('/allusers', function(req, res, next) {
  db.readCollection('users', (results) => {
    res.send(results);
  });
});

// curl http://localhost:3000/getuser/588ebf8ef8c2925da254f565
router.get('/getuser/:id', function(req, res, next) {
  db.getUser(req.params['id'], (user) => {
    res.send(user);
  });
});

module.exports = router;
