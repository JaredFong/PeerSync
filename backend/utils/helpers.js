const categories = ['Academic','Technology','New Student','General Student'];
const modes = ['Virtual','Face-to-face','Both'];
const clean = v => typeof v === 'string' ? v.trim() : '';
const parseJson = (v, fallback=[]) =>  {
    if (Array.isArray(v)) return v;
    if (!v) return fallback;
    try  {
        return typeof v === 'string' ? JSON.parse(v) : v;
    }
    catch  {
        return fallback;
    }
};
module.exports =  {
    categories, modes, clean, parseJson
};
