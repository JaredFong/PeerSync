const $=s=>document.querySelector(s);
let loginEmail='',regEmail='';
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=> {
    document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));
    ['login-form','login-otp','register-form','register-otp'].forEach(id=>$('#'+id).classList.add('hidden'));
    $('#'+(b.dataset.tab==='login'?'login-form':'register-form')).classList.remove('hidden');
    $('#auth-message').textContent=''
});
async function send(url,body) {
    return PeerSync.api(url, {
        method:'POST',body:JSON.stringify(body)
    })
}
$('#login-form').onsubmit=async e=> {
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target));
    loginEmail=d.email;
    try {
        const r=await send('/api/auth/login',d);
        $('#login-form').classList.add('hidden');
        $('#login-otp').classList.remove('hidden');
        $('#auth-message').textContent=r.demoOtp?'Demo OTP: '+r.demoOtp:'Check your email for the OTP.'
    }
    catch(x) {
        $('#auth-message').textContent=x.message;
        $('#auth-message').className='error'
    }
};
$('#login-otp').onsubmit=async e=> {
    e.preventDefault();
    try {
        await send('/api/auth/verify-login', {
            email:loginEmail,code:new FormData(e.target).get('code')
        });
        location.href='/pages/dashboard.html'
    }
    catch(x) {
        $('#auth-message').textContent=x.message
    }
};
$('#register-form').onsubmit=async e=> {
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target));
    regEmail=d.email;
    try {
        const r=await send('/api/auth/register',d);
        $('#register-form').classList.add('hidden');
        $('#register-otp').classList.remove('hidden');
        $('#auth-message').textContent=r.demoOtp?'Demo OTP: '+r.demoOtp:'Check your email for the OTP.'
    }
    catch(x) {
        $('#auth-message').textContent=x.message;
        $('#auth-message').className='error'
    }
};
$('#register-otp').onsubmit=async e=> {
    e.preventDefault();
    try {
        await send('/api/auth/verify-registration', {
            email:regEmail,code:new FormData(e.target).get('code')
        });
        location.href='/pages/dashboard.html'
    }
    catch(x) {
        $('#auth-message').textContent=x.message
    }
};
