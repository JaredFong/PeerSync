/* Use Case 2 — wireframe-aligned screens using the existing PeerSync API. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const safe = PeerSync.safe;
  const state = { userId: null, user: null, requests: [], volunteers: [], notifications: [], filter: 'All', selectedRequest: null, selectedVolunteer: null, draft: null, editId: null, reassignId: null, view: 'list' };
  const names = { Academic: 'Academic Support', Technology: 'Technology Support', 'New Student': 'New Student Support', 'General Student': 'General Student Support' };
  const displayCategory = key => names[key] || key || '—';
  const fmtDate = value => { if (!value) return 'Flexible'; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const fmtTime = value => value ? String(value).slice(0, 5) : 'Flexible';
  const statusName = status => ({Pending:'Open',Accepted:'Matched'}[status] || status || 'Open');
  const pill = status => `<span class="uc2-pill uc2-pill--${safe(String(status || 'Pending').toLowerCase())}">${safe(statusName(status))}</span>`;
  const error = e => PeerSync.msg(e.message || String(e), true);
  const api = (url, method, payload) => PeerSync.api(url, { method, body: JSON.stringify(payload || {}) });
  const nameAvatar = value => `<span class="uc2-avatar">${safe(PeerSync.initials(value))}</span>`;
  const item = (label, value) => `<div><span class="uc2-mini-label">${safe(label)}</span><div class="uc2-value">${safe(value == null || value === '' ? '—' : value)}</div></div>`;
  const futureDate = () => { const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  $('#preferred-date').min = futureDate();

  function show(view) {
    state.view = view;
    document.querySelectorAll('.uc2-view').forEach(el => el.classList.toggle('hidden', el.id !== `view-${view}`));
    PeerSync.msg('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  async function loadRequests() {
    const data = await PeerSync.api('/api/requests');
    state.requests = data.requests || [];
    renderRequests();
    renderIncoming();
  }
  async function loadNotifications() {
    const data = await PeerSync.api('/api/requests/notifications');
    state.notifications = data.notifications || [];
    $('#notification-count').textContent = state.notifications.filter(n => !n.is_read).length || '';
    $('#notification-list').innerHTML = state.notifications.length ? state.notifications.map(n => `<article class="uc2-notification ${n.is_read ? '' : 'unread'}"><div><strong>${safe(n.title)}</strong><p>${safe(n.message)}</p><small>${safe(fmtDate(n.created_at))}</small></div>${n.is_read ? '' : `<button class="secondary" data-action="read" data-id="${Number(n.notification_id)}">Mark Read</button>`}</article>`).join('') : '<div class="uc2-empty">No notifications yet.</div>';
  }
  function mine() { return state.requests.filter(r => Number(r.student_id) === state.userId); }
  function incoming() { return state.requests.filter(r => Number(r.volunteer_id) === state.userId && Number(r.student_id) !== state.userId); }
  function renderRequests() {
    const list = mine();
    const tabs = ['All','Open','Matched','Completed','Cancelled'];
    const count = key => list.filter(r => key === 'All' || (key === 'Open' ? r.status === 'Pending' : key === 'Matched' ? r.status === 'Accepted' : key === 'Cancelled' ? ['Cancelled','Rejected'].includes(r.status) : r.status === key)).length;
    $('#request-tabs').innerHTML = tabs.map(key => `<button type="button" class="${key === state.filter ? 'active' : ''}" data-action="tab" data-filter="${key}">${key} (${count(key)})</button>`).join('');
    const visible = list.filter(r => state.filter === 'All' || (state.filter === 'Open' ? r.status === 'Pending' : state.filter === 'Matched' ? r.status === 'Accepted' : state.filter === 'Cancelled' ? ['Cancelled','Rejected'].includes(r.status) : r.status === state.filter));
    $('#owned-requests').innerHTML = visible.length ? visible.map(r => `<tr><td>${safe(r.request_id)}</td><td>${safe(r.title)}</td><td>${safe(displayCategory(r.category))}</td><td>${pill(r.status)}</td><td>${safe(fmtDate(r.created_at))}</td><td><button type="button" data-action="details" data-id="${Number(r.request_id)}">View</button></td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:#78808d;padding:28px">No requests in this category.</td></tr>';
    $('#incoming-count').textContent = incoming().filter(r => r.status === 'Pending').length || '';
  }
  function renderIncoming() {
    const list = incoming();
    $('#incoming-list').innerHTML = list.length ? list.map(r => `<article class="uc2-request-item"><div><strong>${safe(r.title)}</strong><p>${safe(displayCategory(r.category))} · From ${safe(r.student_name)} · ${safe(fmtDate(r.created_at))}</p>${pill(r.status)}</div><button class="secondary" data-action="incoming-detail" data-id="${Number(r.request_id)}">View Details</button></article>`).join('') : '<div class="uc2-empty">No incoming volunteer requests.</div>';
  }
  function requestById(id) { return state.requests.find(r => Number(r.request_id) === Number(id)); }
  function renderDetails(request) {
    if (!request) return;
    state.selectedRequest = Number(request.request_id);
    const canModify = request.status === 'Pending' && Number(request.student_id) === state.userId;
    $('#request-details').innerHTML = `<div class="uc2-detail-top"><div><span class="uc2-mini-label">#${safe(request.request_id)}</span><h2>${safe(request.title)}</h2></div>${pill(request.status)}</div>
      <div class="uc2-meta">${item('Request Type',displayCategory(request.category))}${item('Date Submitted',fmtDate(request.created_at))}${item('Preferred Mode',request.support_mode === 'Virtual' ? 'Online' : request.support_mode)}${item('Preferred Time',`${fmtDate(request.preferred_date)}${request.preferred_time ? ' · '+fmtTime(request.preferred_time) : ''}`)}${item('Volunteer',request.volunteer_name || 'Not assigned')}</div>
      <div class="uc2-description"><span class="uc2-mini-label">Description</span>${safe(request.description)}</div>
      <div class="uc2-detail-actions">${canModify ? `<button class="secondary" data-action="edit" data-id="${Number(request.request_id)}">Edit Request</button><button class="secondary uc2-danger" data-action="cancel" data-id="${Number(request.request_id)}">Cancel Request</button><button class="secondary" data-action="reassign" data-id="${Number(request.request_id)}">Change Volunteer (after 24h)</button>` : ''}</div>`;
    show('details');
  }
  function renderIncomingDetail(request) {
    if (!request) return;
    state.selectedRequest = Number(request.request_id);
    $('#incoming-detail').innerHTML = `<div class="uc2-detail-top"><h2>Request Details</h2>${pill(request.status)}</div><div class="uc2-meta">${item('Title',request.title)}${item('Requested By',request.student_name)}${item('Type',displayCategory(request.category))}${item('Preferred Mode',request.support_mode === 'Virtual' ? 'Online' : request.support_mode)}${item('Preferred Time',`${fmtDate(request.preferred_date)}${request.preferred_time ? ' · '+fmtTime(request.preferred_time) : ''}`)}</div><div class="uc2-description"><span class="uc2-mini-label">Description</span>${safe(request.description)}</div><div class="uc2-detail-actions">${request.status === 'Pending' ? `<button class="primary" data-action="respond" data-status="Accepted" data-id="${Number(request.request_id)}">Accept Request</button><button class="secondary" data-action="respond" data-status="Rejected" data-id="${Number(request.request_id)}">Reject Request</button>` : ''}${request.status === 'Accepted' ? `<button class="primary" data-action="complete" data-id="${Number(request.request_id)}">Mark Completed</button>` : ''}</div>`;
    show('incoming-detail');
  }
  function readForm() { const data = Object.fromEntries(new FormData($('#request-form'))); data.preferred_date = data.preferred_date || ''; data.preferred_time = data.preferred_time || ''; return data; }
  function populateForm(data) {
    const form = $('#request-form');
    for (const [key, value] of Object.entries(data)) {
      const fields = form.querySelectorAll(`[name="${key}"]`);
      if (fields.length === 1 && fields[0].type !== 'radio') fields[0].value = value || '';
      else fields.forEach(field => { if (field.type === 'radio') field.checked = field.value === value; });
    }
  }
  function beginCreate() {
    state.editId = null;
    state.draft = null;
    $('#request-form').reset();
    $('#form-heading').textContent = 'Create a Support Request';
    $('#request-next').textContent = 'Find Volunteers';
    show('create');
  }
  async function searchVolunteers() {
    const q = new URLSearchParams();
    const category = $('#filter-category').value, mode = $('#filter-mode').value, skill = $('#filter-skill').value.trim(), day = $('#filter-day').value;
    if (category) q.set('category',category); if (mode) q.set('mode',mode); if (skill) q.set('skill',skill); if (day) q.set('day',day);
    const data = await PeerSync.api(`/api/requests/volunteers?${q.toString()}`);
    state.volunteers = data.volunteers || [];
    $('#volunteer-list').innerHTML = state.volunteers.length ? state.volunteers.map(v => {
      const skills = (v.skills || []).slice(0, 4).map(s => `<span class="uc2-chip">${safe(s)}</span>`).join('') || '<span class="muted">Not specified</span>';
      const availability = (v.availability || []).join(', ') || 'Contact volunteer';
      return `<article class="uc2-volunteer-card"><div class="uc2-volunteer-head">${nameAvatar(v.full_name)}<div><strong>${safe(v.full_name)}</strong><span class="muted">Peer Volunteer</span></div></div><div><span class="uc2-mini-label">Expertise</span>${skills}</div><div><span class="uc2-mini-label">Availability</span>${safe(availability)}</div><button class="primary" data-action="volunteer" data-id="${Number(v.user_id)}">View Profile</button></article>`;
    }).join('') : '<div class="uc2-empty">No volunteers match your criteria. Try changing the category, skill, support mode or available day.</div>';
  }
  function renderVolunteer(id) {
    const v = state.volunteers.find(x => Number(x.user_id) === Number(id)); if (!v) return;
    state.selectedVolunteer = Number(id);
    $('#volunteer-detail').innerHTML = `<div class="uc2-volunteer-head">${nameAvatar(v.full_name)}<div><h2 style="margin:0">${safe(v.full_name)}</h2><span class="muted">Peer Volunteer</span></div></div><div class="uc2-meta">${item('Support Categories',(v.categories || []).map(displayCategory).join(', '))}${item('Support Mode',v.support_mode === 'Virtual' ? 'Online' : v.support_mode)}${item('Skills',(v.skills || []).join(', '))}${item('Availability',(v.availability || []).join(', '))}</div><div class="uc2-description"><span class="uc2-mini-label">About</span>${safe(v.bio || 'This volunteer has not added a biography.')}</div><div class="uc2-detail-actions"><button class="primary" data-action="select-volunteer" data-id="${Number(v.user_id)}">Send Support Request</button><button class="secondary" data-view="matches">Back to Matches</button></div>`;
    show('volunteer');
  }
  async function selectVolunteer(id) {
    if (!state.draft) { show('create'); throw new Error('Complete the support request form first.'); }
    await api('/api/requests', 'POST', { ...state.draft, volunteer_id: Number(id) });
    state.draft = null;
    await Promise.all([loadRequests(),loadNotifications()]);
    show('list'); PeerSync.msg('Your support request was submitted successfully.');
  }
  async function beginReassign(id) {
    const request = requestById(id); if (!request) return;
    state.reassignId = Number(id);
    const q = new URLSearchParams({ category: request.category, mode: request.support_mode });
    const data = await PeerSync.api(`/api/requests/volunteers?${q.toString()}`);
    const options = (data.volunteers || []).filter(v => Number(v.user_id) !== Number(request.volunteer_id));
    $('#reassign-volunteer').innerHTML = '<option value="">Choose a different volunteer</option>' + options.map(v => `<option value="${Number(v.user_id)}">${safe(v.full_name)}</option>`).join('');
    show('reassign');
    if (!options.length) PeerSync.msg('No suitable alternative volunteers found. Try again later.',true);
  }
  function beginEdit(id) {
    const r = requestById(id); if (!r || r.status !== 'Pending' || Number(r.student_id) !== state.userId) return;
    state.editId = Number(id);
    populateForm({ category:r.category,title:r.title,description:r.description,support_mode:r.support_mode,preferred_date:r.preferred_date ? String(r.preferred_date).slice(0,10) : '',preferred_time:r.preferred_time ? String(r.preferred_time).slice(0,5) : '' });
    $('#form-heading').textContent = 'Edit Support Request';
    $('#request-next').textContent = 'Save Changes';
    show('create');
  }
  $('#request-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const data = readForm();
      if (state.editId) {
        await api(`/api/requests/${state.editId}`, 'PATCH', data);
        state.editId = null;
        await loadRequests();
        show('list'); PeerSync.msg('Request updated successfully.'); return;
      }
      state.draft = data;
      $('#filter-category').value = data.category;
      $('#filter-mode').value = data.support_mode;
      if (data.preferred_date) { const index = new Date(`${data.preferred_date}T12:00:00`).getDay(); $('#filter-day').value = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][index]; }
      else $('#filter-day').value = '';
      show('matches'); await searchVolunteers();
    } catch(e) { error(e); }
  });
  $('#search-volunteers').addEventListener('click', () => searchVolunteers().catch(error));
  $('#refresh-notifications').addEventListener('click', () => loadNotifications().catch(error));
  $('#reassign-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api(`/api/requests/${state.reassignId}/reassign`, 'PATCH', { volunteer_id: Number($('#reassign-volunteer').value) });
      await Promise.all([loadRequests(),loadNotifications()]); show('list'); PeerSync.msg('Request sent to a different volunteer.');
    } catch(e) { error(e); }
  });
  document.addEventListener('click', async event => {
    const trigger = event.target.closest('[data-view],[data-action]'); if (!trigger) return;
    const action = trigger.dataset.action, view = trigger.dataset.view, id = Number(trigger.dataset.id);
    try {
      if (view) { if (view === 'create' && state.view === 'list') beginCreate(); else if (view === 'create' && state.draft) { populateForm(state.draft); show('create'); } else if (view === 'details') renderDetails(requestById(state.selectedRequest)); else show(view); return; }
      if (action === 'tab') { state.filter = trigger.dataset.filter; renderRequests(); }
      if (action === 'details') renderDetails(requestById(id));
      if (action === 'incoming-detail') renderIncomingDetail(requestById(id));
      if (action === 'volunteer') renderVolunteer(id);
      if (action === 'select-volunteer') await selectVolunteer(id);
      if (action === 'edit') beginEdit(id);
      if (action === 'reassign') await beginReassign(id);
      if (action === 'cancel') {
        if (!confirm('Cancel this pending support request?')) return;
        await api(`/api/requests/${id}/cancel`, 'PATCH'); await loadRequests(); show('list'); PeerSync.msg('Support request cancelled.');
      }
      if (action === 'respond') {
        await api(`/api/requests/${id}/respond`, 'PATCH', { status: trigger.dataset.status });
        await Promise.all([loadRequests(),loadNotifications()]); renderIncomingDetail(requestById(id)); PeerSync.msg(`Request ${trigger.dataset.status.toLowerCase()}.`);
      }
      if (action === 'complete') {
        await api(`/api/requests/${id}/complete`,'PATCH'); await loadRequests(); renderIncomingDetail(requestById(id)); PeerSync.msg('Request marked as completed.');
      }
      if (action === 'read') { await api(`/api/requests/notifications/${id}/read`,'PATCH'); await loadNotifications(); }
    } catch(e) { error(e); }
  });
  (async () => {
    try {
      const data = await PeerSync.api('/api/auth/me');
      state.user = data.user; state.userId = Number(data.user.user_id);
      $('#sidebar-user').innerHTML = `${nameAvatar(data.user.full_name)}<span><strong>${safe(data.user.full_name || 'Student')}</strong><small>Student Account</small></span>`;
      await Promise.all([loadRequests(),loadNotifications()]);
      show('list');
    } catch(e) { error(e); }
  })();
})();
