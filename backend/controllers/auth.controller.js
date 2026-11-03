const pool = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pendingRegistration = new Map(), pendingLogin = new Map();
const clean = v => typeof v === 'string' ? v.trim() : '';
const validEmail = e => /^[A-Z0-9._%+-]+@help\.edu\.my$/i.test(e);
const code = () => String(crypto.randomInt(100000,1000000));
const publicUser = u => ( {
    user_id:u.user_id,student_id:u.student_id,full_name:u.full_name,email:u.email
});
exports.register = async (req,res,next) =>  {
    try  {
        const student_id=clean(req.body.student_id), full_name=clean(req.body.full_name), email=clean(req.body.email).toLowerCase(), password=String(req.body.password||'');
        if(!student_id||!full_name||!email||password.length<8) return res.status(400).json( {
            error:'Complete all fields. Password must be at least 8 characters.'
        });
        if(!validEmail(email)) return res.status(400).json( {
            error:'Please use your HELP University student email (@help.edu.my).'
        });
        const hash=await bcrypt.hash(password,12), conn=await pool.getConnection();
        let userId;
        try  {
            await conn.beginTransaction();
            const [r]=await conn.query('INSERT INTO Users (student_id,full_name,email,password_hash) VALUES (?,?,?,?)',[student_id,full_name,email,hash]);
            userId=r.insertId;
            await conn.query('INSERT INTO Profiles (user_id) VALUES (?)',[userId]);
            await conn.commit();
        }
        catch(e) {
            await conn.rollback();
            throw e;
        }
        finally {
            conn.release();
        }
        const otp=code();
        pendingRegistration.set(email, {
            otp,userId,expires:Date.now()+600000
        });
        console.log(`[PeerSync demo] Registration OTP for ${email}: ${otp}`);
        res.status(201).json( {
            message:'Account created. Verify your email.',demoOtp:process.env.NODE_ENV==='production'?undefined:otp
        });
    }
    catch(e) {
        next(e);
    }
};
exports.verifyRegistration = async (req,res,next) =>  {
    try  {
        const email=clean(req.body.email).toLowerCase(), p=pendingRegistration.get(email);
        if(!p||p.expires<Date.now()||p.otp!==clean(req.body.code)) return res.status(400).json( {
            error:'Invalid or expired code.'
        });
        await pool.query('UPDATE Users SET is_verified=1 WHERE user_id=?',[p.userId]);
        pendingRegistration.delete(email);
        req.session.userId=p.userId;
        res.json( {
            message:'Email verified.'
        });
    }
    catch(e) {
        next(e);
    }
};
exports.login = async (req,res,next) =>  {
    try  {
        const email=clean(req.body.email).toLowerCase(), password=String(req.body.password||'');
        const [rows]=await pool.query('SELECT * FROM Users WHERE email=?',[email]);
        const u=rows[0];
        if(!u||!(await bcrypt.compare(password,u.password_hash))) return res.status(401).json( {
            error:'Email or password is incorrect.'
        });
        if(!u.is_verified) return res.status(403).json( {
            error:'Verify your email before signing in.'
        });
        const otp=code();
        pendingLogin.set(email, {
            otp,userId:u.user_id,expires:Date.now()+600000
        });
        console.log(`[PeerSync demo] Login OTP for ${email}: ${otp}`);
        res.json( {
            requiresOtp:true,email,demoOtp:process.env.NODE_ENV==='production'?undefined:otp
        });
    }
    catch(e) {
        next(e);
    }
};
exports.verifyLogin = async (req,res,next) =>  {
    try  {
        const email=clean(req.body.email).toLowerCase(), p=pendingLogin.get(email);
        if(!p||p.expires<Date.now()||p.otp!==clean(req.body.code)) return res.status(400).json( {
            error:'Invalid or expired code.'
        });
        req.session.userId=p.userId;
        pendingLogin.delete(email);
        const [rows]=await pool.query('SELECT user_id,student_id,full_name,email FROM Users WHERE user_id=?',[p.userId]);
        res.json( {
            user:publicUser(rows[0])
        });
    }
    catch(e) {
        next(e);
    }
};
exports.me = async (req,res,next) =>  {
    try  {
        const [p]=await pool.query('SELECT * FROM Profiles WHERE user_id=?',[req.user.user_id]);
        res.json( {
            user:publicUser(req.user),profile:p[0]|| {
            }
        });
    }
    catch(e) {
        next(e);
    }
};
exports.logout = (req,res) => req.session.destroy(()=>res.json( {
    message:'Signed out.'
}));
const fs = require('fs');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const f = process.argv[1];
const s = fs.readFileSync(f, 'utf8');
const sf = ts.createSourceFile(f, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
if (sf.parseDiagnostics.length) {
    console.error(sf.parseDiagnostics.map(d => d.messageText).join('\n'));
    process.exit(2);
}
process.stdout.write(ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false }).printFile(sf));
