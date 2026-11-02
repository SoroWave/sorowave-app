const API = window.SOROWAVE_API || 'http://localhost:4173';
const starterTasks = [
  {id:'task-001',title:'Add a Soroban contract test fixture',repo:'sorowave/contracts',category:'contracts',level:'Good first issue',reward:100,status:'Open'},
  {id:'task-002',title:'Build a Stellar address validation helper',repo:'sorowave/api',category:'developer-tools',level:'Small feature',reward:150,status:'Open'},
  {id:'task-003',title:'Document a testnet payment walkthrough',repo:'sorowave/app',category:'payments',level:'Good first issue',reward:100,status:'Open'},
  {id:'task-004',title:'Show application status on task cards',repo:'sorowave/app',category:'developer-tools',level:'Small feature',reward:150,status:'Open'}
];
let tasks = starterTasks;
let activeFilter = 'all';
let selectedTask = null;
const list = document.querySelector('#task-list');
const dialog = document.querySelector('#apply-dialog');
const note = document.querySelector('#form-note');

function render() {
  const visible = tasks.filter(task => activeFilter === 'all' || task.category === activeFilter);
  document.querySelector('#count-all').textContent = tasks.length;
  list.innerHTML = visible.length ? visible.map(task => `
    <article class="task-card">
      <div><a class="task-title" href="#" data-task="${escapeHtml(task.id)}">${escapeHtml(task.title)}</a><div class="task-meta"><span class="repo-name">${escapeHtml(task.repo)}</span><span class="tag">${escapeHtml(task.category.replace('-', ' '))}</span></div></div>
      <span class="task-level">${escapeHtml(task.level || 'Community task')}</span>
      <span class="task-reward">${Number(task.reward || 100)} <small>demo points</small></span>
      <button class="apply-button" data-apply="${escapeHtml(task.id)}">View task →</button>
    </article>`).join('') : '<p class="empty-state">No tasks in this category yet. Check back soon.</p>';
  list.querySelectorAll('[data-apply]').forEach(button => button.addEventListener('click', () => openApply(button.dataset.apply)));
  list.querySelectorAll('[data-task]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); openApply(link.dataset.task); }));
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function openApply(id) {
  selectedTask = tasks.find(task => task.id === id);
  if (!selectedTask) return;
  document.querySelector('#dialog-task').textContent = selectedTask.title;
  note.textContent = 'This demo saves your application to the local API when it is running.';
  note.className = 'form-note';
  dialog.showModal();
}
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
  button.classList.add('active'); activeFilter = button.dataset.filter; render();
}));
document.querySelector('#apply-dialog form').addEventListener('submit', async event => {
  if (event.submitter?.value !== 'submit') return;
  event.preventDefault();
  const applicant = document.querySelector('#applicant').value.trim().replace(/^@/, '');
  const message = document.querySelector('#message').value.trim();
  try {
    const response = await fetch(`${API}/applications`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({taskId:selectedTask.id,applicant,message})});
    if (!response.ok) throw new Error('The API could not accept this application.');
    note.textContent = 'Application saved. The project maintainer can review it in the API.';
    note.className = 'form-note success';
    event.target.reset();
  } catch {
    note.textContent = 'The API is offline. Start sorowave-api to save applications; this preview has not submitted your details.';
    note.className = 'form-note error';
  }
});
async function loadTasks() {
  try { const response = await fetch(`${API}/tasks`); if (response.ok) { const data = await response.json(); if (Array.isArray(data.tasks) && data.tasks.length) tasks = data.tasks; } } catch { /* Local sample tasks keep the preview usable without the API. */ }
  render();
}
loadTasks();
