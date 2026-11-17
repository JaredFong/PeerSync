const esc=PeerSync.safe;
let currentRescheduleId = null;
let allRequests = [];

async function loadSessions() {
    const upcoming=document.querySelector('#upcoming-list'),past=document.querySelector('#past-list');
    try {
        const [me,r]=await Promise.all([PeerSync.api('/api/auth/me'),PeerSync.api('/api/requests')]);
        const id=Number(me.user.user_id);
        allRequests = r.requests;

        const items = allRequests.filter(x => (Number(x.student_id) === id || Number(x.volunteer_id) === id) && ['Accepted', 'Completed', 'Cancelled'].includes(x.status));        
        const future=items.filter(x=>x.status==='Accepted'),old=items.filter(x=>['Completed','Cancelled'].includes(x.status));
        const card=x=>`<article class="card">
            <div class="body">
                <strong>${esc(x.title)}</strong>
                <p>With ${esc(Number(x.student_id)===id?(x.volunteer_name||'Volunteer'):x.student_name)}</p>
                <p>${esc(x.category)} · ${esc(x.support_mode||'Virtual')}</p>
                <p>Preferred time: ${esc([x.preferred_date,x.preferred_time].filter(Boolean).join(' ')||'To be arranged')}</p>
            </div>
            ${PeerSync.status(x.status)}
            ${x.status === 'Accepted' ? `<button class="secondary reschedule-btn" data-id="${x.request_id}">Reschedule</button>` : ''}
            ${x.status==='Accepted'&&Number(x.volunteer_id)===id?`<button class="primary complete" data-id="${x.request_id}">Mark Completed</button>`:''}
            ${x.status==='Completed'&&Number(x.student_id)===id?`<a class="primary" href="/pages/feedback.html">Provide Feedback</a>`:''}</article>`;
            
            upcoming.innerHTML=future.length?future.map(card).join(''):'<div class="empty">No upcoming support sessions. Accepted requests will appear here.</div>';
            past.innerHTML=old.length?old.map(card).join(''):'<div class="empty">Completed or cancelled sessions will appear here.</div>';
            
            document.querySelectorAll('.complete').forEach(b=>b.onclick=async()=> {
                try {
                    await PeerSync.api(`/api/requests/${b.dataset.id}/complete`, {
                        method:'PATCH',body:'{}'
                    });

                    PeerSync.msg('Request marked completed. The student can now provide feedback.');
                    loadSessions()
                }
                catch(e) {
                    PeerSync.msg(e.message,true)
                }
            });

            document.querySelectorAll('.reschedule-btn').forEach(b => b.onclick = () => {
                currentRescheduleId = b.dataset.id;
                const req = allRequests.find(x => String(x.request_id) === String(currentRescheduleId));
            
                if (req) {
                    if (document.querySelector('#reschedule-type') && req.category) {
                    document.querySelector('#reschedule-type').value = req.category.toLowerCase();
                    }
                    
                    document.querySelector('#reschedule-title').value = req.title || '';
                    document.querySelector('#reschedule-desc').value = req.description || '';
                    
                    if (document.querySelector('#reschedule-time') && req.preferred_date) {
                        document.querySelector('#reschedule-time').value = req.preferred_date.slice(0, 10);
                    }

                    const isF2F = (req.support_mode || '').toLowerCase().includes('face');
                    document.querySelectorAll('input[name="supportMode"]').forEach(radio => {
                        radio.checked = (isF2F && radio.value === 'face-to-face') || (!isF2F && radio.value === 'online');
                    });
                }

                const editBox = document.querySelector('#reschedule-form-container');
                if (editBox) {
                    editBox.classList.remove('hidden');
                    editBox.scrollIntoView({ behavior: 'smooth' });
                }
            });
    }
    catch(e) {
        PeerSync.msg(e.message,true)
    }
}

const rescheduleForm = document.querySelector('#reschedule-form');
if (rescheduleForm) {
    rescheduleForm.onsubmit = async (e) => {
        e.preventDefault(); 
        if (!currentRescheduleId) return;

        try {
            const formData = new FormData(e.target);
            const payload = {
                support_mode: formData.get('supportMode') === 'face-to-face' ? 'Face-to-face' : 'Virtual',
                preferred_date: formData.get('preferredTime')
            };

            await PeerSync.api(`/api/requests/${currentRescheduleId}`, {
                method: 'PATCH', 
                body: JSON.stringify(payload)
            });

            document.querySelector('#reschedule-form-container').classList.add('hidden');
            currentRescheduleId = null;
            PeerSync.msg('Request rescheduled successfully.');
            
            await loadSessions();
        } 
        catch(x) {
            PeerSync.msg(x.message, true);
        }
    };
}

const closeRescheduleBtn = document.querySelector('#close-reschedule-btn');
if (closeRescheduleBtn) {
    closeRescheduleBtn.onclick = () => {
        document.querySelector('#reschedule-form-container').classList.add('hidden');
        currentRescheduleId = null;
    };
}

loadSessions();
