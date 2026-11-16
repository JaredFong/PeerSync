let currentEditRequestId = null;
let currentReassignId = null;
const $ = s => document.querySelector(s);
let volunteers = [], requests = [];

async function loadVolunteers() {
    const q = new URLSearchParams();
    if($('#filter-category').value) q.set('category', $('#filter-category').value);
    if($('#filter-mode').value) q.set('mode', $('#filter-mode').value);
    if($('#filter-skill').value.trim()) q.set('skill', $('#filter-skill').value.trim());
    if($('#filter-day').value) q.set('day', $('#filter-day').value);
    try {
        const d = await PeerSync.api('/api/requests/volunteers?'+q);
        volunteers = d.volunteers;
        $('#volunteer-list').innerHTML = volunteers.length ? volunteers.map(v => `<article class="card"><div class="body"><strong>${PeerSync.safe(v.full_name)}</strong><p>${(v.categories||[]).map(c=>`<span class="tag">${PeerSync.safe(c)}</span>`).join('')}</p><p><b>Skills:</b> ${PeerSync.safe((v.skills||[]).join(', '))}</p><p><b>Availability:</b> ${PeerSync.safe((v.availability||[]).join(', '))} · ${PeerSync.safe(v.support_mode)}</p></div><button class="primary choose" data-id="${v.user_id}">Choose volunteer</button></article>`).join('') : '<div class="empty">No volunteers match these filters.</div>';
        $('#volunteer-select').innerHTML = '<option value="">Choose a volunteer</option>' + volunteers.map(v=>`<option value="${v.user_id}">${PeerSync.safe(v.full_name)}</option>`).join('');
        document.querySelectorAll('.choose').forEach(b => b.onclick = () => {
            $('#volunteer-select').value = b.dataset.id;
            $('#request-form').scrollIntoView({ behavior:'smooth' });
        });
    } catch(e) {
        PeerSync.msg(e.message, true);
    }
}

async function loadRequests() {
    try {
        const d = await PeerSync.api('/api/requests');
        requests = d.requests;
        
        $('#request-list').innerHTML = requests.length ? requests.map(r => `<article class="card"><div class="body"><strong>${PeerSync.safe(r.title)}</strong><p>${PeerSync.safe(r.category)} · ${PeerSync.safe(r.student_name)} → ${PeerSync.safe(r.volunteer_name||'Unassigned')}</p><p>${PeerSync.safe(r.description)}</p></div>${PeerSync.status(r.status)} ${Number(r.student_id)===window.currentUserId&&r.status==='Pending'?`<button class="secondary reassign-btn" data-id="${r.request_id}">Change volunteer (after 24h)</button><button class="secondary edit-btn" data-id="${r.request_id}">Edit</button><button class="secondary cancel-request" data-id="${r.request_id}">Cancel request</button>`:''} ${Number(r.volunteer_id)===window.currentUserId&&r.status==='Pending'?`<button class="primary respond" data-id="${r.request_id}" data-status="Accepted">Accept</button><button class="secondary respond" data-id="${r.request_id}" data-status="Rejected">Reject</button>`:''}${Number(r.volunteer_id)===window.currentUserId&&r.status==='Accepted'?`<button class="primary complete" data-id="${r.request_id}">Mark completed</button>`:''}</article>`).join('') : '<div class="empty">No requests yet.</div>';
        
        document.querySelectorAll('.respond').forEach(b => b.onclick = async() => {
            try {
                await PeerSync.api(`/api/requests/${b.dataset.id}/respond`, {
                    method:'PATCH', body:JSON.stringify({ status:b.dataset.status })
                });
                await Promise.all([loadRequests(),loadNotifications()]);
                PeerSync.msg('Request updated.');
            } catch(e) {
                PeerSync.msg(e.message, true);
            }
        });
        
        document.querySelectorAll('.complete').forEach(b => b.onclick = async() => {
            try {
                await PeerSync.api(`/api/requests/${b.dataset.id}/complete`, {
                    method:'PATCH', body:'{}'
                });
                await loadRequests();
                PeerSync.msg('Request completed. The student can now submit feedback.');
            } catch(e) {
                PeerSync.msg(e.message, true);
            }
        });

        document.querySelectorAll('.cancel-request').forEach(b => b.onclick = async () => {
            if (!confirm('Cancel this pending support request?')) return;
            try {
                await PeerSync.api(`/api/requests/${b.dataset.id}/cancel`, {method:'PATCH',body:'{}'});
                PeerSync.msg('Request cancelled.');
                await loadRequests();
            } catch(e) { PeerSync.msg(e.message,true); }
        });
        document.querySelectorAll('.reassign-btn').forEach(b => b.onclick = () => {
            currentReassignId=b.dataset.id;
            const selected=requests.find(r=>String(r.request_id)===String(currentReassignId));
            const options=volunteers.filter(v=>v.user_id!==Number(selected.volunteer_id)&&v.categories.includes(selected.category)&&(v.support_mode==='Both'||v.support_mode===selected.support_mode));
            $('#reassign-volunteer').innerHTML='<option value="">Choose a different volunteer</option>'+options.map(v=>`<option value="${v.user_id}">${PeerSync.safe(v.full_name)}</option>`).join('');
            $('.reassign-container').classList.remove('hidden');
            $('.reassign-container').scrollIntoView({behavior:'smooth'});
        });
        document.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => {
            currentEditRequestId = b.dataset.id;
            const reqToEdit = requests.find(x => String(x.request_id) === String(b.dataset.id));
            if(reqToEdit) {
                $('#request-title').value = reqToEdit.title || '';
                $('#request-desc').value = reqToEdit.description || '';
                if($('#request-type')) $('#request-type').value = reqToEdit.category || 'Academic';
                $('#edit-support-mode').value=reqToEdit.support_mode||'Virtual';
                $('#edit-preferred-date').value=reqToEdit.preferred_date ? String(reqToEdit.preferred_date).slice(0,10) : '';
                $('#edit-preferred-time').value=reqToEdit.preferred_time ? String(reqToEdit.preferred_time).slice(0,5) : '';
            }
            const editBox = $('.edit-request-container');
            if (editBox) {
                editBox.classList.remove('hidden');
                editBox.scrollIntoView({ behavior: 'smooth' });
            }
        });
        
    } catch(e) {
        PeerSync.msg(e.message, true);
    }
}

async function loadNotifications(){
    try{
        const data=await PeerSync.api('/api/requests/notifications');
        $('#notification-list').innerHTML=data.notifications.length?data.notifications.map(n=>`<article class="card"><div class="body"><strong>${PeerSync.safe(n.title)}</strong><p>${PeerSync.safe(n.message)}</p></div>${n.is_read?'':`<button class="secondary read-notification" data-id="${n.notification_id}">Mark read</button>`}</article>`).join(''):'<div class="empty">No notifications yet.</div>';
        document.querySelectorAll('.read-notification').forEach(b=>b.onclick=async()=>{try{await PeerSync.api(`/api/requests/notifications/${b.dataset.id}/read`,{method:'PATCH',body:'{}'});await loadNotifications();}catch(e){PeerSync.msg(e.message,true);}});
    }catch(e){PeerSync.msg(e.message,true);}
}
$('#refresh-notifications').onclick=loadNotifications;
$('#close-reassign').onclick=()=>$('.reassign-container').classList.add('hidden');
$('#reassign-form').onsubmit=async e=>{
    e.preventDefault();
    try{
        await PeerSync.api(`/api/requests/${currentReassignId}/reassign`,{method:'PATCH',body:JSON.stringify({volunteer_id:Number($('#reassign-volunteer').value)})});
        $('.reassign-container').classList.add('hidden');
        PeerSync.msg('Request reassigned.');await Promise.all([loadRequests(),loadNotifications()]);
    }catch(e){PeerSync.msg(e.message,true);}
};
$('#search-volunteers').onclick = loadVolunteers;

$('#request-form').onsubmit = async e => {
    e.preventDefault();
    try {
        await PeerSync.api('/api/requests', {
            method:'POST', body:JSON.stringify(Object.fromEntries(new FormData(e.target)))
        });
        e.target.reset();
        PeerSync.msg('Request sent.');
        loadRequests();
    } catch(x) {
        PeerSync.msg(x.message, true);
    }
};

$('#edit-request-form').onsubmit = async (e) => {
    e.preventDefault(); 
    if (!currentEditRequestId) return;
    try {
        const formData = new FormData(e.target);
        const updatedData = Object.fromEntries(formData);
        await PeerSync.api(`/api/requests/${currentEditRequestId}`, {
            method: 'PATCH', 
            body: JSON.stringify(updatedData)
        });
        $('.edit-request-container').classList.add('hidden');
        currentEditRequestId = null;
        PeerSync.msg('Request updated successfully.');
        await loadRequests(); 
    } catch(x) {
        PeerSync.msg(x.message, true);
    }
};

const cancelBtn = $('.btn-cancel');
if (cancelBtn) {
    cancelBtn.onclick = () => {
        $('.edit-request-container').classList.add('hidden');
    };
}

$('#preferred-date').min = new Date().toISOString().slice(0,10);
$('#edit-preferred-date').min = new Date().toISOString().slice(0,10);

(async() => {
    try {
        const d = await PeerSync.api('/api/auth/me');
        window.currentUserId = d.user.user_id;
        await Promise.all([loadVolunteers(), loadRequests(), loadNotifications()]);
    } catch(e) {
        PeerSync.msg(e.message, true);
    }
})();