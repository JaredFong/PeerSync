const {parseJson}=require('./helpers');
const responseHours=Math.max(1,Number(process.env.REQUEST_RESPONSE_HOURS)||24);
// Availability can contain weekdays (e.g. Monday), or weekday with time range
// (e.g. "Monday 14:00-18:00"). Unknown/free-text entries cannot be verified.
function availableFor(raw,date,time){
    const entries=parseJson(raw).map(String).map(x=>x.trim()).filter(Boolean);
    if(!date)return true;
    const d=date instanceof Date ? date : new Date(String(date).slice(0,10)+'T12:00:00Z');
    if(Number.isNaN(d.getTime()))return false;
    const day=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getUTCDay()];
    if(!entries.length)return false;
    return entries.some(entry=>{
        const text=entry.toLowerCase();
        if(!text.includes(day.toLowerCase()))return false;
        if(!time)return true;
        const match=text.match(/(\d{1,2}):(\d{2})\s*[-–to]+\s*(\d{1,2}):(\d{2})/);
        if(!match)return true; // day-level availability, time not specified
        const minutes=t=>Number(t[1])*60+Number(t[2]);
        const requested=String(time).slice(0,5).split(':').map(Number);
        const value=requested[0]*60+requested[1];
        return value>=minutes([null,match[1],match[2]])&&value<=minutes([null,match[3],match[4]]);
    });
}
async function notify(conn,userId,title,message,requestId){
    if(userId)await conn.query('INSERT INTO Notifications(user_id,title,message,request_id) VALUES(?,?,?,?)',[userId,title,message,requestId]);
}
module.exports={availableFor,notify,responseHours};
