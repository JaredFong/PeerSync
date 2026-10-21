const pool=require('../db');
const  {
    categories,modes,clean,parseJson
}
=require('../utils/helpers');
exports.get=async(req,res,next)=> {
    try {
        const [rows]=await pool.query('SELECT * FROM Profiles WHERE user_id=?',[req.user.user_id]);
        const p=rows[0]|| {
        };
        res.json( {
            profile: {
                ...p,categories:parseJson(p.categories),skills:parseJson(p.skills),availability:parseJson(p.availability)
            }
        });
    }
    catch(e) {
        next(e);
    }
};
exports.update=async(req,res,next)=> {
    try {
        const bio=clean(req.body.bio).slice(0,600),isVolunteer=Boolean(req.body.is_volunteer),cats=parseJson(req.body.categories),skills=parseJson(req.body.skills).map(String).map(s=>s.trim()).filter(Boolean).slice(0,30),availability=parseJson(req.body.availability),mode=modes.includes(req.body.support_mode)?req.body.support_mode:'Both';
        if(isVolunteer&&(!cats.length||!skills.length||!availability.length))return res.status(400).json( {
            error:'Volunteers must select a category, add a skill and set availability.'
        });
        if(cats.some(c=>!categories.includes(c)))return res.status(400).json( {
            error:'Invalid category.'
        });
        await pool.query('UPDATE Profiles SET bio=?,is_volunteer=?,categories=?,skills=?,availability=?,support_mode=? WHERE user_id=?',[bio,isVolunteer,JSON.stringify(cats),JSON.stringify(skills),JSON.stringify(availability),mode,req.user.user_id]);
        res.json( {
            message:'Profile saved.'
        });
    }
    catch(e) {
        next(e);
    }
};
