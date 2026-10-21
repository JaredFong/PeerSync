const esc=PeerSync.safe;
async function loadSessions() {
    const upcoming=document.querySelector('#upcoming-list'),past=document.querySelector('#past-list');
    try {
        const [me,r]=await Promise.all([PeerSync.api('/api/auth/me'),PeerSync.api('/api/requests')]);
        const id=Number(me.user.user_id), items=r.requests.filter(x=>(Number(x.student_id)===id||Number(x.volunteer_id)===id)&&['Accepted','Completed','Cancelled'].includes(x.status));
        const future=items.filter(x=>x.status==='Accepted'),old=items.filter(x=>['Completed','Cancelled'].includes(x.status));
        const card=x=>`<article class="card"><div class="body"><strong>${esc(x.title)}</strong><p>With ${esc(Number(x.student_id)===id?(x.volunteer_name||'Volunteer'):x.student_name)}</p><p>${esc(x.category)} · ${esc(x.support_mode||'Virtual')}</p><p>Preferred time: ${esc([x.preferred_date,x.preferred_time].filter(Boolean).join(' ')||'To be arranged')}</p></div>${PeerSync.status(x.status)}${x.status==='Accepted'&&Number(x.volunteer_id)===id?`<button class="primary complete" data-id="${x.request_id}">Mark Completed</button>`:''}${x.status==='Completed'&&Number(x.student_id)===id?`<a class="primary" href="/pages/feedback.html">Provide Feedback</a>`:''}</article>`;
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
    }
    catch(e) {
        PeerSync.msg(e.message,true)
    }
}
loadSessions();
