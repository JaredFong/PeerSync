const pool=require('../db');
const  {
    categories,clean,parseJson
}
=require('../utils/helpers');
exports.volunteers=async(req,res,next)=> {
    try {
        const cat=clean(req.query.category),mode=clean(req.query.mode),skill=clean(req.query.skill).toLowerCase();
        const [rows]=await pool.query('SELECT u.user_id,u.full_name,p.bio,p.categories,p.skills,p.availability,p.support_mode FROM Users u JOIN Profiles p ON p.user_id=u.user_id WHERE p.is_volunteer=1 AND u.user_id<>? AND u.is_verified=1 ORDER BY u.full_name',[req.user.user_id]);
        const volunteers=rows.map(v=>( {
            ...v,categories:parseJson(v.categories),skills:parseJson(v.skills),availability:parseJson(v.availability)
        })).filter(v=>(!cat||v.categories.includes(cat))&&(!mode||v.support_mode==='Both'||v.support_mode===mode)&&(!skill||v.skills.some(s=>s.toLowerCase().includes(skill))));
        res.json( {
            volunteers
        });
    }
    catch(e) {
        next(e);
    }
};
exports.create=async(req,res,next)=> {
    try {
        const category=clean(req.body.category),title=clean(req.body.title),description=clean(req.body.description),mode=clean(req.body.support_mode),date=clean(req.body.preferred_date)||null,time=clean(req.body.preferred_time)||null,volunteerId=Number(req.body.volunteer_id);
        if(!categories.includes(category)||!title||!description||!['Virtual','Face-to-face'].includes(mode))return res.status(400).json( {
            error:'Complete all required request fields.'
        });
        if(date&&date<new Date().toISOString().slice(0,10))return res.status(400).json( {
            error:'Preferred date cannot be in the past.'
        });
        const [ps]=await pool.query('SELECT is_volunteer,categories,support_mode FROM Profiles WHERE user_id=?',[volunteerId]);
        if(!ps.length||!ps[0].is_volunteer||volunteerId===req.user.user_id)return res.status(400).json( {
            error:'Choose a valid volunteer.'
        });
        if(!parseJson(ps[0].categories).includes(category)||(ps[0].support_mode!=='Both'&&ps[0].support_mode!==mode))return res.status(400).json( {
            error:'Volunteer does not match category or mode.'
        });
        const conn=await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [r]=await conn.query('INSERT INTO Support_Requests (student_id,volunteer_id,category,title,description,preferred_date,preferred_time,support_mode) VALUES (?,?,?,?,?,?,?,?)',[req.user.user_id,volunteerId,category,title,description,date,time,mode]);
            await conn.query('INSERT INTO Volunteer_Matches (request_id,volunteer_id,match_score) VALUES (?,?,100)',[r.insertId,volunteerId]);
            await conn.commit();
            res.status(201).json( {
                message:'Request sent.',request_id:r.insertId
            });
        }
        catch(e) {
            await conn.rollback();
            throw e;
        }
        finally {
            conn.release();
        }
    }
    catch(e) {
        next(e);
    }
};
exports.list=async(req,res,next)=> {
    try {
        const [requests]=await pool.query('SELECT r.*,s.full_name student_name,v.full_name volunteer_name FROM Support_Requests r JOIN Users s ON s.user_id=r.student_id LEFT JOIN Users v ON v.user_id=r.volunteer_id WHERE r.student_id=? OR r.volunteer_id=? ORDER BY r.created_at DESC',[req.user.user_id,req.user.user_id]);
        res.json( {
            requests
        });
    }
    catch(e) {
        next(e);
    }
};
exports.respond=async(req,res,next)=> {
    try {
        const status=clean(req.body.status);
        if(!['Accepted','Rejected'].includes(status))return res.status(400).json( {
            error:'Invalid response.'
        });
        const [rows]=await pool.query('SELECT request_id FROM Support_Requests WHERE request_id=? AND volunteer_id=? AND status="Pending"',[req.params.id,req.user.user_id]);
        if(!rows.length)return res.status(404).json( {
            error:'Pending request not found.'
        });
        await pool.query('UPDATE Support_Requests SET status=? WHERE request_id=?',[status,req.params.id]);
        res.json( {
            message:`Request ${status.toLowerCase()}.`
        });
    }
    catch(e) {
        next(e);
    }
};
exports.complete=async(req,res,next)=> {
    try {
        const [rows]=await pool.query('SELECT request_id FROM Support_Requests WHERE request_id=? AND volunteer_id=? AND status="Accepted"',[req.params.id,req.user.user_id]);
        if(!rows.length)return res.status(404).json( {
            error:'Accepted request not found for this volunteer.'
        });
        await pool.query('UPDATE Support_Requests SET status="Completed" WHERE request_id=?',[req.params.id]);
        res.json( {
            message:'Request marked as completed. The student can now leave feedback.'
        });
    }
    catch(e) {
        next(e);
    }
};
