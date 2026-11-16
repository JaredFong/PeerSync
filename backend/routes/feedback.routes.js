const r=require('express').Router(),auth=require('../middleware/auth'),c=require('../controllers/feedback.controller');
r.use(auth);
r.get('/',c.list);
r.post('/',c.create);
module.exports=r;
