const r=require('express').Router(),auth=require('../middleware/auth'),c=require('../controllers/profile.controller');
r.use(auth);
r.get('/',c.get);
r.put('/',c.update);
module.exports=r;
