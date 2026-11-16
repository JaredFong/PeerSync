const r=require('express').Router(), c=require('../controllers/auth.controller'), auth=require('../middleware/auth');
r.post('/register',c.register);
r.post('/verify-registration',c.verifyRegistration);
r.post('/login',c.login);
r.post('/verify-login',c.verifyLogin);
r.get('/me',auth,c.me);
r.post('/logout',c.logout);
module.exports=r;
