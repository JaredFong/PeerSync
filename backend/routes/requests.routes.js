const r=require('express').Router(),auth=require('../middleware/auth'),c=require('../controllers/requests.controller');
r.use(auth);
r.get('/volunteers',c.volunteers);
r.get('/',c.list);
r.post('/',c.create);
r.patch('/:id/respond',c.respond);
r.patch('/:id/complete',c.complete);
module.exports=r;
