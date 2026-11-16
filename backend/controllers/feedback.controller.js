const pool=require('../db');
const clean=v=>String(v??'').trim();
exports.list=async(req,res,next)=> {
    try {
        const [rows]=await pool.query(`SELECT r.request_id,r.title,r.category,r.status,r.volunteer_id,v.full_name volunteer_name,f.feedback_id,f.rating,f.comments,f.created_at feedback_created_at FROM Support_Requests r JOIN Users v ON v.user_id=r.volunteer_id LEFT JOIN Feedback f ON f.request_id=r.request_id WHERE r.student_id=? AND r.status='Completed' ORDER BY r.created_at DESC`,[req.user.user_id]);
        res.json( {
            items:rows
        });
    }
    catch(e) {
        next(e);
    }
};
exports.create=async(req,res,next)=> {
    try {
        const requestId=Number(req.body.request_id),rating=Number(req.body.rating),comments=clean(req.body.comments).slice(0,1000);
        if(!Number.isInteger(requestId)||requestId<1||!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json( {
            error:'Choose a completed request and a rating from 1 to 5.'
        });
        const [rows]=await pool.query(`SELECT request_id,student_id,volunteer_id FROM Support_Requests WHERE request_id=? AND student_id=? AND status='Completed'`,[requestId,req.user.user_id]);
        if(!rows.length)return res.status(403).json( {
            error:'Feedback is only available for your completed requests.'
        });
        try {
            await pool.query('INSERT INTO Feedback (request_id,student_id,volunteer_id,rating,comments) VALUES (?,?,?,?,?)',[requestId,req.user.user_id,rows[0].volunteer_id,rating,comments]);
            res.status(201).json( {
                message:'Feedback submitted.'
            });
        }
        catch(e) {
            if(e.code==='ER_DUP_ENTRY')return res.status(409).json( {
                error:'Feedback has already been submitted for this request.'
            });
            throw e;
        }
    }
    catch(e) {
        next(e);
    }
};
