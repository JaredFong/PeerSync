const pool = require('../db');
async function auth(req, res, next)  {
    try  {
        if (!req.session.userId) return res.status(401).json( {
            error: 'Please sign in to continue.'
        });
        const [rows] = await pool.query('SELECT user_id, student_id, full_name, email FROM Users WHERE user_id=? AND is_verified=1', [req.session.userId]);
        if (!rows.length) return res.status(401).json( {
            error: 'Please sign in to continue.'
        });
        req.user = rows[0];
        next();
    }
    catch (e)  {
        next(e);
    }
}
module.exports = auth;
