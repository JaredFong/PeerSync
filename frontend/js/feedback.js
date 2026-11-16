const safe=PeerSync.safe;
async function loadFeedback() {
    try {
        const d=await PeerSync.api('/api/feedback');
        const list=document.querySelector('#feedback-list');
        list.innerHTML=d.items.length?d.items.map(x=>`<article class="card"><div class="body"><strong>${safe(x.title)}</strong><p>${safe(x.category)} · Volunteer: ${safe(x.volunteer_name)}</p>${x.feedback_id?`<p><b>Your rating:</b> $ {
            x.rating
        }
        /5</p><p>$ {
            safe(x.comments||'No written comment.')
        }
        </p><span class="status completed">Feedback submitted</span>`:`<form class="feedback-form" data-id="${x.request_id}"><label>Rating<select name="rating" required><option value="">Choose a rating</option><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Satisfactory</option><option value="2">2 — Needs improvement</option><option value="1">1 — Poor</option></select></label><label>Comments (optional)<textarea name="comments" rows="2" maxlength="1000" placeholder="Share a short comment"></textarea></label><button class="primary">Submit feedback</button></form>`}</div></article>`).join(''):'<div class="empty">No completed support requests are available for feedback yet. When a volunteer marks your request completed, it will appear here.</div>';
        document.querySelectorAll('.feedback-form').forEach(f=>f.onsubmit=async e=> {
            e.preventDefault();
            const data=Object.fromEntries(new FormData(f));
            data.request_id=Number(f.dataset.id);
            try {
                await PeerSync.api('/api/feedback', {
                    method:'POST',body:JSON.stringify(data)
                });
                PeerSync.msg('Feedback submitted.');
                await loadFeedback()
            }
            catch(err) {
                PeerSync.msg(err.message,true)
            }
        })
    }
    catch(e) {
        PeerSync.msg(e.message,true)
    }
}
loadFeedback();
