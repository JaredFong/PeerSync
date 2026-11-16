const pool=require('../db');
const {availableFor, notify, responseHours}=require('../utils/request-workflow');
const  {
    categories,clean,parseJson
}
=require('../utils/helpers');
exports.volunteers=async(req,res,next)=> {
    try {
        const cat=clean(req.query.category),mode=clean(req.query.mode),skill=clean(req.query.skill).toLowerCase(),day=clean(req.query.day).toLowerCase();
        const [rows]=await pool.query('SELECT u.user_id,u.full_name,p.bio,p.categories,p.skills,p.availability,p.support_mode FROM Users u JOIN Profiles p ON p.user_id=u.user_id WHERE p.is_volunteer=1 AND u.user_id<>? AND u.is_verified=1 ORDER BY u.full_name',[req.user.user_id]);
        const volunteers=rows.map(v=>( {
            ...v,categories:parseJson(v.categories),skills:parseJson(v.skills),availability:parseJson(v.availability)
        })).filter(v=>(!cat||v.categories.includes(cat))&&(!mode||v.support_mode==='Both'||v.support_mode===mode)&&(!skill||v.skills.some(s=>String(s).toLowerCase().includes(skill)))&&(!day||v.availability.some(a=>String(a).toLowerCase().includes(day))));
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
        const [ps]=await pool.query('SELECT p.is_volunteer,p.categories,p.support_mode,p.availability,u.is_verified FROM Profiles p JOIN Users u ON u.user_id=p.user_id WHERE p.user_id=?',[volunteerId]);
        if(!ps.length||!ps[0].is_volunteer||!ps[0].is_verified||volunteerId===req.user.user_id)return res.status(400).json( {
            error:'Choose a valid volunteer.'
        });
        if(!parseJson(ps[0].categories).includes(category)||(ps[0].support_mode!=='Both'&&ps[0].support_mode!==mode))return res.status(400).json( {
            error:'Volunteer does not match category or mode.'
        });
        if(!availableFor(ps[0].availability,date,time))return res.status(409).json({error:'This volunteer is unavailable for the requested date or time. Choose another volunteer or change your preferences.'});
        const conn=await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [r]=await conn.query('INSERT INTO Support_Requests (student_id,volunteer_id,category,title,description,preferred_date,preferred_time,support_mode) VALUES (?,?,?,?,?,?,?,?)',[req.user.user_id,volunteerId,category,title,description,date,time,mode]);
            await conn.query('INSERT INTO Volunteer_Matches (request_id,volunteer_id,match_score) VALUES (?,?,100)',[r.insertId,volunteerId]);
            await notify(conn,volunteerId,'New support request',`You have a new ${category} support request: ${title}`,r.insertId);
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
exports.respond=async(req,res,next)=>{
    try{
        const status=clean(req.body.status);
        if(!['Accepted','Rejected'].includes(status))return res.status(400).json({error:'Invalid response.'});
        const conn=await pool.getConnection();
        try{
            await conn.beginTransaction();
            const [rows]=await conn.query('SELECT request_id,student_id,title FROM Support_Requests WHERE request_id=? AND volunteer_id=? AND status="Pending" FOR UPDATE',[req.params.id,req.user.user_id]);
            if(!rows.length){await conn.rollback();return res.status(404).json({error:'Pending request not found.'});}
            await conn.query('UPDATE Support_Requests SET status=? WHERE request_id=?',[status,req.params.id]);
            await notify(conn,rows[0].student_id,`Request ${status.toLowerCase()}`,`Your support request "${rows[0].title}" was ${status.toLowerCase()}.`,rows[0].request_id);
            await conn.commit();res.json({message:`Request ${status.toLowerCase()}.`});
        }catch(e){await conn.rollback();throw e;}finally{conn.release();}
    }catch(e){next(e);}
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

// Only the student who created a pending request may edit or cancel it.
exports.update=async(req,res,next)=>{
    try {
        const id=Number(req.params.id);
        if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid request ID.'});
        const [rows]=await pool.query('SELECT * FROM Support_Requests WHERE request_id=? AND student_id=?',[id,req.user.user_id]);
        if(!rows.length)return res.status(404).json({error:'Request not found.'});
        if(rows[0].status!=='Pending')return res.status(409).json({error:'Only pending requests can be edited.'});
        const category=clean(req.body.category),title=clean(req.body.title),description=clean(req.body.description);
        const mode=clean(req.body.support_mode),date=clean(req.body.preferred_date)||null,time=clean(req.body.preferred_time)||null;
        if(!categories.includes(category)||!title||title.length>140||!description||!['Virtual','Face-to-face'].includes(mode))
            return res.status(400).json({error:'Complete all required request fields.'});
        if(date&&date<new Date().toISOString().slice(0,10))return res.status(400).json({error:'Preferred date cannot be in the past.'});
        const [ps]=await pool.query('SELECT is_volunteer,categories,support_mode,availability FROM Profiles WHERE user_id=?',[rows[0].volunteer_id]);
        if(!ps.length||!ps[0].is_volunteer||!parseJson(ps[0].categories).includes(category)||(ps[0].support_mode!=='Both'&&ps[0].support_mode!==mode))
            return res.status(400).json({error:'Selected volunteer does not match the new category or mode.'});
        if(!availableFor(ps[0].availability,date,time))return res.status(409).json({error:'Volunteer is unavailable at the updated date/time.'});
        const [result]=await pool.query('UPDATE Support_Requests SET category=?,title=?,description=?,preferred_date=?,preferred_time=?,support_mode=? WHERE request_id=? AND student_id=? AND status="Pending"',
            [category,title,description,date,time,mode,id,req.user.user_id]);
        if(!result.affectedRows)return res.status(409).json({error:'Request status changed. Refresh and try again.'});
        res.json({message:'Request updated.'});
    }catch(e){next(e)}
};
exports.cancel=async(req,res,next)=>{
    try{
        const [result]=await pool.query('UPDATE Support_Requests SET status="Cancelled" WHERE request_id=? AND student_id=? AND status="Pending"',[req.params.id,req.user.user_id]);
        if(!result.affectedRows)return res.status(404).json({error:'Pending request not found for this student.'});
        res.json({message:'Request cancelled.'});
    }catch(e){next(e)}
};

// Students may select a different eligible volunteer after the response window has elapsed.
exports.reassign=async(req,res,next)=>{
    try{
        const id=Number(req.params.id), volunteerId=Number(req.body.volunteer_id);
        if(!Number.isInteger(id)||!Number.isInteger(volunteerId)||volunteerId<1)return res.status(400).json({error:'Invalid request or volunteer.'});
        const conn=await pool.getConnection();
        try{
            await conn.beginTransaction();
            const [rows]=await conn.query('SELECT * FROM Support_Requests WHERE request_id=? AND student_id=? FOR UPDATE',[id,req.user.user_id]);
            if(!rows.length){await conn.rollback();return res.status(404).json({error:'Request not found.'});}
            const r=rows[0];
            if(r.status!=='Pending'){await conn.rollback();return res.status(409).json({error:'Only pending requests can be reassigned.'});}
            const [age]=await conn.query('SELECT TIMESTAMPDIFF(HOUR,created_at,NOW()) AS hours_elapsed FROM Support_Requests WHERE request_id=?',[id]);
            if(age[0].hours_elapsed<responseHours){await conn.rollback();return res.status(409).json({error:`Please allow ${responseHours} hours for a response before selecting another volunteer.`});}
            if(volunteerId===r.volunteer_id||volunteerId===req.user.user_id){await conn.rollback();return res.status(400).json({error:'Choose a different volunteer.'});}
            const [ps]=await conn.query('SELECT p.is_volunteer,p.categories,p.support_mode,p.availability,u.is_verified FROM Profiles p JOIN Users u ON u.user_id=p.user_id WHERE p.user_id=?',[volunteerId]);
            if(!ps.length||!ps[0].is_volunteer||!ps[0].is_verified||!parseJson(ps[0].categories).includes(r.category)||(ps[0].support_mode!=='Both'&&ps[0].support_mode!==r.support_mode)||!availableFor(ps[0].availability,r.preferred_date,r.preferred_time)){
                await conn.rollback();return res.status(409).json({error:'Selected volunteer does not match the request or availability.'});
            }
            const oldVolunteer=r.volunteer_id;
            await conn.query('UPDATE Support_Requests SET volunteer_id=?,created_at=NOW() WHERE request_id=?',[volunteerId,id]);
            await conn.query('INSERT INTO Volunteer_Matches(request_id,volunteer_id,match_score) VALUES(?,?,100) ON DUPLICATE KEY UPDATE match_score=100',[id,volunteerId]);
            await notify(conn,oldVolunteer,'Request reassigned',`The request "${r.title}" was reassigned because no response was received.`,id);
            await notify(conn,volunteerId,'New support request',`You have a new ${r.category} support request: ${r.title}`,id);
            await notify(conn,req.user.user_id,'Volunteer changed',`Your request "${r.title}" has been sent to another volunteer.`,id);
            await conn.commit();res.json({message:'Request sent to the new volunteer. Status remains Pending.'});
        }catch(e){await conn.rollback();throw e;}finally{conn.release();}
    }catch(e){next(e);}
};
exports.notifications=async(req,res,next)=>{
    try{const [notifications]=await pool.query('SELECT notification_id,title,message,request_id,is_read,created_at FROM Notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50',[req.user.user_id]);res.json({notifications});}catch(e){next(e);}
};
exports.markRead=async(req,res,next)=>{
    try{await pool.query('UPDATE Notifications SET is_read=1 WHERE notification_id=? AND user_id=?',[req.params.id,req.user.user_id]);res.json({message:'Notification marked as read.'});}catch(e){next(e);}
};
