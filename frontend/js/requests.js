const $=s=>document.querySelector(s);
let volunteers=[],requests=[];
async function loadVolunteers() {
    const q=new URLSearchParams();
    if($('#filter-category').value)q.set('category',$('#filter-category').value);
    if($('#filter-mode').value)q.set('mode',$('#filter-mode').value);
    if($('#filter-skill').value.trim())q.set('skill',$('#filter-skill').value.trim());
    try {
        const d=await PeerSync.api('/api/requests/volunteers?'+q);
        volunteers=d.volunteers;
        $('#volunteer-list').innerHTML=volunteers.length?volunteers.map(v=>`<article class="card"><div class="body"><strong>${PeerSync.safe(v.full_name)}</strong><p>${(v.categories||[]).map(c=>`<span class="tag">$ {
            PeerSync.safe(c)
        }
        </span>`).join('')}</p><p><b>Skills:</b> ${PeerSync.safe((v.skills||[]).join(', '))}</p><p><b>Availability:</b> ${PeerSync.safe((v.availability||[]).join(', '))} · ${PeerSync.safe(v.support_mode)}</p></div><button class="primary choose" data-id="${v.user_id}">Choose volunteer</button></article>`).join(''):'<div class="empty">No volunteers match these filters.</div>';
        $('#volunteer-select').innerHTML='<option value="">Choose a volunteer</option>'+volunteers.map(v=>`<option value="${v.user_id}">${PeerSync.safe(v.full_name)}</option>`).join('');
        document.querySelectorAll('.choose').forEach(b=>b.onclick=()=> {
            $('#volunteer-select').value=b.dataset.id;
            $('#request-form').scrollIntoView( {
                behavior:'smooth'
            })
        })
    }
    catch(e) {
        PeerSync.msg(e.message,true)
    }
}
async function loadRequests() {
    try {
        const d=await PeerSync.api('/api/requests');
        requests=d.requests;
        $('#request-list').innerHTML=requests.length?requests.map(r=>`<article class="card"><div class="body"><strong>${PeerSync.safe(r.title)}</strong><p>${PeerSync.safe(r.category)} · ${PeerSync.safe(r.student_name)} → ${PeerSync.safe(r.volunteer_name||'Unassigned')}</p><p>${PeerSync.safe(r.description)}</p></div>${PeerSync.status(r.status)}${Number(r.volunteer_id)===window.currentUserId&&r.status==='Pending'?`<button class="primary respond" data-id="${r.request_id}" data-status="Accepted">Accept</button><button class="secondary respond" data-id="${r.request_id}" data-status="Rejected">Reject</button>`:''}${Number(r.volunteer_id)===window.currentUserId&&r.status==='Accepted'?`<button class="primary complete" data-id="${r.request_id}">Mark completed</button>`:''}</article>`).join(''):'<div class="empty">No requests yet.</div>';
        document.querySelectorAll('.respond').forEach(b=>b.onclick=async()=> {
            try {
                await PeerSync.api(`/api/requests/${b.dataset.id}/respond`, {
                    method:'PATCH',body:JSON.stringify( {
                        status:b.dataset.status
                    })
                });
                await loadRequests();
                PeerSync.msg('Request updated.')
            }
            catch(e) {
                PeerSync.msg(e.message,true)
            }
        });
        document.querySelectorAll('.complete').forEach(b=>b.onclick=async()=> {
            try {
                await PeerSync.api(`/api/requests/${b.dataset.id}/complete`, {
                    method:'PATCH',body:'{}'
                });
                await loadRequests();
                PeerSync.msg('Request completed. The student can now submit feedback.')
            }
            catch(e) {
                PeerSync.msg(e.message,true)
            }
        })
    }
    catch(e) {
        PeerSync.msg(e.message,true)
    }
}
$('#search-volunteers').onclick=loadVolunteers;
$('#request-form').onsubmit=async e=> {
    e.preventDefault();
    try {
        await PeerSync.api('/api/requests', {
            method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))
        });
        e.target.reset();
        PeerSync.msg('Request sent.');
        loadRequests()
    }
    catch(x) {
        PeerSync.msg(x.message,true)
    }
};
$('#preferred-date').min=new Date().toISOString().slice(0,10);
(async()=> {
    try {
        const d=await PeerSync.api('/api/auth/me');
        window.currentUserId=d.user.user_id;
        await Promise.all([loadVolunteers(),loadRequests()])
    }
    catch(e) {
        PeerSync.msg(e.message,true)
    }
})();
