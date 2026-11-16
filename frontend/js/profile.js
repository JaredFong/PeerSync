const $=s=>document.querySelector(s),form=$('#profile-form');
$('#is-volunteer').onchange=e=>$('#volunteer-fields').classList.toggle('hidden',!e.target.checked);
form.onreset=()=>setTimeout(()=>$('#volunteer-fields').classList.toggle('hidden',!$('#is-volunteer').checked),0);
async function load() {
    try {
        const d=await PeerSync.api('/api/profile'),p=d.profile;
        form.elements.bio.value=p.bio||'';
        form.elements.is_volunteer.checked=!!p.is_volunteer;
        document.querySelectorAll('[name=categories]').forEach(x=>x.checked=(p.categories||[]).includes(x.value));
        form.elements.skills.value=(p.skills||[]).join(', ');
        form.elements.availability.value=(p.availability||[]).join(', ');
        form.elements.support_mode.value=p.support_mode||'Both';
        $('#volunteer-fields').classList.toggle('hidden',!p.is_volunteer)
    }
    catch(e) {
        PeerSync.msg(e.message,true)
    }
}
form.onsubmit=async e=> {
    e.preventDefault();
    const f=new FormData(form),data= {
        bio:f.get('bio')||'',is_volunteer:f.get('is_volunteer')==='on',categories:f.getAll('categories'),skills:(f.get('skills')||'').split(',').map(x=>x.trim()).filter(Boolean),availability:(f.get('availability')||'').split(',').map(x=>x.trim()).filter(Boolean),support_mode:f.get('support_mode')
    };
    try {
        await PeerSync.api('/api/profile', {
            method:'PUT',body:JSON.stringify(data)
        });
        PeerSync.msg('Profile saved.')
    }
    catch(x) {
        PeerSync.msg(x.message,true)
    }
};
load();
