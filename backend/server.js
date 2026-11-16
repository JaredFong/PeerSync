require('dotenv').config();
const express=require('express'),session=require('express-session'),path=require('path'),pool=require('./db');
const app=express(),PORT=process.env.PORT||3000;
app.use(express.json( {
    limit:'1mb'
}));
app.use(session( {
    name:'peersync.sid',secret:process.env.SESSION_SECRET||'development-only-change-this-secret',resave:false,saveUninitialized:false,cookie: {
        httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:14400000
    }
}));
app.use('/api/auth',require('./routes/auth.routes'));
app.use('/api/profile',require('./routes/profile.routes'));
app.use('/api/requests',require('./routes/requests.routes'));
app.use('/api/feedback',require('./routes/feedback.routes'));
app.get('/api/health',async(req,res)=> {
    try {
        await pool.query('SELECT 1');
        res.json( {
            status:'ok',database:'connected'
        });
    }
    catch(e) {
        res.status(503).json( {
            status:'error',database:'unavailable'
        });
    }
});
app.use('/api',(req,res)=>res.status(404).json( {
    error:'API endpoint not found.'
}));
app.use((err,req,res,next)=> {
    console.error(err);
    if(err.code==='ER_DUP_ENTRY')return res.status(409).json( {
        error:'Student ID or email already registered.'
    });
    res.status(500).json( {
        error:'Server error. Check server logs and database configuration.'
    });
});
app.use(express.static(path.join(__dirname,'..','frontend')));
app.listen(PORT,()=>console.log(`PeerSync running at http://localhost:${PORT}`));
