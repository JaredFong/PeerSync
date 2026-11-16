(async()=> {
    try {
        const [me,r]=await Promise.all([PeerSync.api('/api/auth/me'),PeerSync.api('/api/requests')]);
        document.querySelector('#request-count').textContent=r.requests.filter(x=>x.student_id===me.user.user_id).length;
        document.querySelector('#accepted-count').textContent=r.requests.filter(x=>x.status==='Accepted'&&(x.student_id===me.user.user_id||x.volunteer_id===me.user.user_id)).length;
        document.querySelector('#volunteer-status').textContent=me.profile.is_volunteer?'Active':'Not yet'
    }
    catch(e) {
        PeerSync.msg(e.message,true)
    }
})();
