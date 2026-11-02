import { isConnected, requestAccess, getNetworkDetails } from '@stellar/freighter-api';

const API = import.meta.env.VITE_API_URL || window.SOROWAVE_API || 'http://localhost:4173';
const TESTNET = 'Test SDF Network ; September 2015';
const previewWave = {
  id: 'sorowave-community-preview',
  title: 'Community Preview Cycle',
  status: 'preview',
  issues: 3,
  completedIssues: 0,
  pointsAvailable: 500,
  rewardPool: null,
  description: 'A preview cycle for practicing the contribution workflow. It is not an official Drips Wave and has no funded reward pool.'
};
const sampleTasks = [
  {id:'task-app-search',title:'Add keyword search to the task board',description:'Let contributors search task titles, repository names, and issue descriptions. Keep the search usable on mobile and announce the result count to assistive technology.',repo:'SoroWave/sorowave-app',issueNumber:1,issueUrl:'https://github.com/SoroWave/sorowave-app/issues/1',category:'developer-tools',complexity:'Medium',points:150,status:'Open',waveId:previewWave.id},
  {id:'task-api-pagination',title:'Add pagination to GET /tasks',description:'Add stable page and page-size parameters to the task endpoint. Return pagination metadata and keep the default response bounded.',repo:'SoroWave/sorowave-api',issueNumber:1,issueUrl:'https://github.com/SoroWave/sorowave-api/issues/1',category:'developer-tools',complexity:'Medium',points:150,status:'Open',waveId:previewWave.id},
  {id:'task-contract-lifecycle',title:'Add Soroban tests for the bounty lifecycle',description:'Cover contract initialization, bounty creation, release, cancellation, authorization failures, and invalid state transitions with Soroban test utilities.',repo:'SoroWave/sorowave-contracts',issueNumber:1,issueUrl:'https://github.com/SoroWave/sorowave-contracts/issues/1',category:'contracts',complexity:'High',points:200,status:'Open',waveId:previewWave.id}
];

let tasks = sampleTasks;
let currentWave = previewWave;
let leaderboard = [];
let taskPagination = { page: 1, pageSize: 20, total: sampleTasks.length, totalPages: 1 };
let walletAddress = localStorage.getItem('sorowave.wallet') || '';
let selectedTask = null;
const app = document.querySelector('#app');
const dialog = document.querySelector('#apply-dialog');
const formNote = document.querySelector('#form-note');

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const appError = message => `<div class="notice error">${esc(message)}</div>`;
const empty = message => `<div class="empty-state">${esc(message)}</div>`;

async function request(path, options) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

function route() {
  const raw = location.hash.replace(/^#\/?/, '') || 'explore';
  const clean = raw.split('?')[0];
  const [page, ...parts] = clean.split('/');
  return { page, id: parts.join('/') };
}

function pageShell(eyebrow, title, intro, content, actions = '') {
  return `<section class="page-shell"><div class="page-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${title}</h1><p class="page-intro">${intro}</p></div>${actions}</div>${content}</section>`;
}

function issueCard(task) {
  return `<article class="task-card"><div><a class="task-title" href="#/tasks/${encodeURIComponent(task.id)}">${esc(task.title)}</a><div class="task-meta"><span class="repo-name">${esc(task.repo)} #${Number(task.issueNumber || 0)}</span><span class="tag">${esc((task.category || 'community').replace('-', ' '))}</span></div></div><span class="task-level">${esc(task.complexity || 'Trivial')}</span><span class="task-reward">${Number(task.points || 100)} <small>points</small></span><a class="apply-button" href="#/tasks/${encodeURIComponent(task.id)}">View issue →</a></article>`;
}

function waveBanner(wave) {
  const issueCount = Number(wave.activeIssues ?? wave.issues ?? tasks.length);
  const completedCount = Number(wave.completedIssues || 0);
  const points = Number(wave.pointsAvailable ?? tasks.reduce((sum, task) => sum + Number(task.points || 0), 0));
  return `<section class="wave-banner"><div class="wave-banner-copy"><p class="eyebrow"><span class="live-dot"></span> COMMUNITY PREVIEW · NOT AN OFFICIAL DRIPS WAVE</p><h2>${esc(wave.title || previewWave.title)}</h2><p>${esc(wave.description || previewWave.description)}</p><span class="wave-status">${esc((wave.status || 'preview').toUpperCase())} CYCLE · DATES NOT SET</span></div><div class="wave-metrics"><article><strong>${issueCount}</strong><span>active issues</span></article><article><strong>${completedCount}</strong><span>completed</span></article><article><strong>${points}</strong><span>points available</span></article><article><strong>${wave.rewardPool ? esc(wave.rewardPool) : '—'}</strong><span>funded reward pool</span></article></div></section>`;
}

async function renderExplore() {
  const query = new URLSearchParams(location.hash.split('?')[1] || '');
  const category = query.get('category') || 'all';
  const search = query.get('q') || '';
  const page = Math.max(1, Number(query.get('page') || 1));
  let error = '';
  try {
    const taskQuery = new URLSearchParams({ page: String(page), limit: '10' });
    if (category !== 'all') taskQuery.set('category', category);
    if (search) taskQuery.set('q', search);
    const [taskData, waveData] = await Promise.all([request(`/tasks?${taskQuery}`), request('/waves')]);
    if (Array.isArray(taskData.tasks)) tasks = taskData.tasks;
    if (taskData.pagination) taskPagination = taskData.pagination;
    if (Array.isArray(waveData.waves) && waveData.waves.length) currentWave = waveData.waves[0];
  } catch {
    error = 'The API is offline. Showing the preview issues. Start the API to publish and apply.';
  }
  const filtered = error ? sampleTasks.filter(task => (category === 'all' || task.category === category) && (!search || `${task.title} ${task.repo} ${task.description}`.toLowerCase().includes(search.toLowerCase()))) : tasks;
  const firstResult = taskPagination.total ? (taskPagination.page - 1) * taskPagination.pageSize + 1 : 0;
  const lastResult = Math.min(taskPagination.page * taskPagination.pageSize, taskPagination.total);
  const pager = taskPagination.totalPages > 1 ? `<div class="issue-pagination"><span>Showing ${firstResult}–${lastResult} of ${taskPagination.total} issues</span><div>${page > 1 ? `<a class="button button-quiet" href="#/explore?${new URLSearchParams({ ...(category !== 'all' ? {category} : {}), ...(search ? {q: search} : {}), page: String(page - 1) })}">← Previous</a>` : ''}${page < taskPagination.totalPages ? `<a class="button button-quiet" href="#/explore?${new URLSearchParams({ ...(category !== 'all' ? {category} : {}), ...(search ? {q: search} : {}), page: String(page + 1) })}">Next →</a>` : ''}</div></div>` : '';

  app.innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span> STELLAR BUILDERS, BUILD TOGETHER</p><h1>Good open source<br>moves <em>everyone</em> forward.</h1><p class="hero-lede">Pick a real GitHub issue, get assigned, ship a pull request, and build a contribution record.</p><div class="hero-actions"><a class="button button-bright" href="#/explore">Browse preview issues <span>→</span></a><a class="text-link" href="#/about">How the cycle works ↓</a></div><p class="wallet-status" id="wallet-status">${walletAddress ? `Connected on testnet: ${esc(walletAddress)}` : 'Connect Freighter to attach your public address to an application.'}</p></div><div class="hero-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="art-core"><span>SW</span><small>BUILD<br>TOGETHER</small></div><span class="node node-one">✳</span><span class="node node-two">⌘</span><span class="node node-three">↗</span><span class="node node-four">◎</span><span class="art-caption">COMMUNITY<br>POWERED</span></div></section>${waveBanner(currentWave)}<section class="work-section"><div class="section-heading"><div><p class="eyebrow">ISSUES IN THIS CYCLE</p><h2>Find your next <em>good problem.</em></h2></div><a href="#/publish" class="text-link">Maintainer? Add a GitHub issue ↗</a></div><form id="task-search" class="search-bar"><input name="q" value="${esc(search)}" placeholder="Search issue titles, scope, and repos" aria-label="Search issues"><button class="button button-dark">Search</button></form><div class="filters"><a class="filter ${category === 'all' ? 'active' : ''}" href="#/explore">All issues <span>${taskPagination.total}</span></a>${[['contracts','Contracts'],['developer-tools','Developer tools'],['payments','Payments']].map(([slug,label]) => `<a class="filter ${category === slug ? 'active' : ''}" href="#/explore?category=${slug}">${label}</a>`).join('')}</div><div class="chain-panel"><div><b>Stellar testnet</b><span id="balance-status">${walletAddress ? 'Checking connected testnet account…' : 'Connect a wallet to check its testnet account.'}</span></div><button id="fund-account" class="text-link" ${walletAddress ? '' : 'hidden'}>Get test XLM ↗</button><a class="text-link" href="https://stellar.expert/explorer/testnet" target="_blank" rel="noreferrer">Testnet explorer ↗</a></div>${error ? appError(error) : ''}<div class="task-list">${filtered.length ? filtered.map(issueCard).join('') : empty('No issues match this search yet.')}</div>${pager}<p class="board-foot"><span class="live-dot"></span> Points are preview values only. This cycle has no funded reward pool or payout.</p></section>`;

  document.querySelector('#task-search').addEventListener('submit', event => {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get('q').trim();
    location.hash = `/explore${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  });
  document.querySelector('#fund-account')?.addEventListener('click', fundTestnet);
  if (walletAddress) refreshBalance(walletAddress);
}

async function renderTask(id) {
  let item = tasks.find(task => task.id === id) || sampleTasks.find(task => task.id === id);
  try { item = (await request(`/tasks/${encodeURIComponent(id)}`)).task; }
  catch { /* preview issue details remain available if the API is offline */ }
  if (!item) {
    app.innerHTML = pageShell('NOT FOUND', 'Issue not found', 'This issue may have been removed from the preview.', '<a class="button button-bright" href="#/explore">Back to issues</a>');
    return;
  }
  app.innerHTML = pageShell('GITHUB ISSUE', esc(item.title), `${esc(item.repo)} #${Number(item.issueNumber || 0)} · ${esc(item.category)} · ${esc(item.complexity || 'Trivial')}`, `<article class="detail-card"><p>${esc(item.description || 'See the GitHub issue for the maintainer’s full scope and acceptance criteria.')}</p><dl><div><dt>Points</dt><dd>${Number(item.points || 100)} preview points</dd></div><div><dt>Issue state</dt><dd>${esc(item.status || 'Open')}</dd></div><div><dt>Wave</dt><dd>Community preview cycle</dd></div></dl><p class="assignment-rule"><b>Contribution rule:</b> Apply first. Wait until a maintainer assigns you before starting work. Link your pull request to the issue with <code>Closes #${Number(item.issueNumber || 0)}</code>.</p><div class="detail-actions"><a class="button button-quiet" href="${esc(item.issueUrl)}" target="_blank" rel="noreferrer">Read issue on GitHub ↗</a><button class="button button-bright" id="apply-task" ${item.status === 'Open' ? '' : 'disabled'}>Apply to this issue →</button></div><p class="form-note">Preview points are not money. This project has no funded reward pool or payout yet.</p></article>`, '<a class="text-link" href="#/explore">← All issues</a>');
  document.querySelector('#apply-task')?.addEventListener('click', () => openApply(item));
}

async function renderPublish() {
  app.innerHTML = pageShell('MAINTAINERS','Add an issue to the preview cycle','Create the issue in GitHub first. SoroWave verifies that it is a public, open issue and uses its canonical title.', `<div class="repo-onboarding"><p class="eyebrow">REPOSITORIES IN THIS PREVIEW</p><div>${['sorowave-app','sorowave-api','sorowave-contracts'].map(repo => `<a href="https://github.com/SoroWave/${repo}" target="_blank" rel="noreferrer">SoroWave/${repo} ↗</a>`).join('')}</div></div><form id="publish-form" class="form-card"><label for="issueUrl">GitHub issue URL</label><input id="issueUrl" name="issueUrl" type="url" required placeholder="https://github.com/org/repo/issues/123"><p id="issue-lookup-note" class="form-note">Paste a URL and leave the field to verify the issue and prefill its title and description.</p><label for="title">Issue title</label><input id="title" name="title" required minlength="8" maxlength="120" readonly placeholder="Verified from GitHub"><label for="description">Scope and acceptance criteria</label><textarea id="description" name="description" required minlength="40" maxlength="4000" placeholder="Add any missing acceptance criteria or contributor guidance."></textarea><div class="form-grid"><div><label for="category">Category</label><select id="category" name="category"><option value="contracts">Contracts</option><option value="developer-tools">Developer tools</option><option value="payments">Payments</option></select></div><div><label for="complexity">Complexity</label><select id="complexity" name="complexity"><option value="Trivial">Trivial — 100 points</option><option value="Medium">Medium — 150 points</option><option value="High">High — 200 points</option></select></div></div><p id="publish-note" class="form-note">Only a public, open GitHub issue can be added. Points are preview values.</p><button class="button button-bright">Add issue to cycle →</button></form>`);
  document.querySelector('#issueUrl').addEventListener('change', lookupGitHubIssue);
  document.querySelector('#issueUrl').addEventListener('blur', lookupGitHubIssue);
  document.querySelector('#publish-form').addEventListener('submit', publishTask);
}

async function lookupGitHubIssue(event) {
  const input = event.currentTarget;
  const url = input.value.trim();
  if (!url) return;
  const note = document.querySelector('#issue-lookup-note');
  note.textContent = 'Checking public GitHub issue…';
  note.className = 'form-note';
  try {
    const data = await request(`/github/issue?url=${encodeURIComponent(url)}`);
    document.querySelector('#title').value = data.issue.title;
    document.querySelector('#description').value = data.issue.body;
    note.textContent = `Verified open issue #${data.issue.number} in ${data.issue.repository}. Add acceptance criteria if the GitHub description is brief.`;
    note.className = 'form-note success';
  } catch (error) {
    note.textContent = error.message;
    note.className = 'form-note error';
  }
}

async function renderApplications() {
  const username = localStorage.getItem('sorowave.github') || '';
  app.innerHTML = pageShell('CONTRIBUTOR SPACE', 'Applications & points', 'Track decisions, submit a pull request after assignment, and see the preview cycle leaderboard.', `<form id="lookup-apps" class="search-bar"><input name="applicant" value="${esc(username)}" required placeholder="Your GitHub username"><button class="button button-dark">Load my activity</button></form><div id="my-applications">${empty('Enter your GitHub username to load your applications.')}</div><div class="section-heading dashboard-heading"><div><p class="eyebrow">COMMUNITY STANDINGS</p><h2>Preview leaderboard</h2></div></div><div id="leaderboard" class="leaderboard-list">${empty('No points have been earned in this preview cycle yet.')}</div>`);
  document.querySelector('#lookup-apps').addEventListener('submit', async event => {
    event.preventDefault();
    const handle = new FormData(event.currentTarget).get('applicant').trim().replace(/^@/, '');
    localStorage.setItem('sorowave.github', handle);
    await loadApplications(handle);
  });
  await loadLeaderboard();
  if (username) await loadApplications(username);
}

async function loadApplications(handle) {
  const target = document.querySelector('#my-applications');
  if (!target) return;
  try {
    const data = await request(`/applications?applicant=${encodeURIComponent(handle)}`);
    target.innerHTML = data.applications.length ? `<div class="application-list">${data.applications.map(item => `<article class="application-card"><div><p class="eyebrow">${esc(item.status)}</p><h3>${esc(item.taskTitle)}</h3><p>${esc(item.repo)} · submitted ${new Date(item.createdAt).toLocaleDateString()}</p>${item.pointsAwarded ? `<strong class="earned-points">+${Number(item.pointsAwarded)} points earned</strong>` : ''}</div><div><p>${esc(item.message)}</p>${item.prUrl ? `<p><a href="${esc(item.prUrl)}" target="_blank" rel="noreferrer">View pull request ↗</a></p>` : ''}${item.status === 'Assigned' ? `<form class="pr-submit" data-pr-form="${esc(item.id)}"><label>Pull request URL</label><input name="prUrl" type="url" required placeholder="https://github.com/${esc(item.repo)}/pull/123"><button class="button button-dark">Submit PR link</button><small>Use “Closes #${Number(item.issueNumber || 0)}” in its description. The PR is checked against GitHub.</small></form>` : ''}</div></article>`).join('')}</div>` : empty(`No applications found for @${handle} yet.`);
    target.querySelectorAll('[data-pr-form]').forEach(form => form.addEventListener('submit', submitPullRequest));
  } catch (error) { target.innerHTML = appError(error.message); }
}

async function loadLeaderboard() {
  const target = document.querySelector('#leaderboard');
  if (!target) return;
  try {
    const data = await request(`/leaderboard?waveId=${encodeURIComponent(currentWave.id)}`);
    leaderboard = data.leaderboard;
    target.innerHTML = leaderboard.length ? leaderboard.map((entry, index) => `<article class="leaderboard-row"><span class="leaderboard-rank">${index + 1}</span><b>${esc(entry.applicant)}</b><span>${entry.completedIssues} completed ${entry.completedIssues === 1 ? 'issue' : 'issues'}</span><strong>${entry.points} pts</strong></article>`).join('') : empty('No points have been earned in this preview cycle yet.');
  } catch { target.innerHTML = empty('Leaderboard is unavailable while the API is offline.'); }
}

async function renderMaintainer() {
  let allTasks = [], applications = [], error = '', networkStatus = null, networkError = '';
  try {
    [allTasks, applications] = await Promise.all([
      request('/tasks?all=true').then(data => data.tasks),
      request('/applications').then(data => data.applications)
    ]);
  } catch (err) { error = err.message; }
  try { networkStatus = await request('/stellar/status'); }
  catch (err) { networkError = err.message; }
  const pending = applications.filter(item => item.status === 'Pending').length;
  const assigned = applications.filter(item => ['Assigned', 'PR submitted'].includes(item.status)).length;
  const completed = applications.filter(item => item.status === 'Completed').length;
  const serviceRows = networkStatus?.services.map(service => `<div class="service-row"><span class="service-dot ${esc(service.status)}"></span><b>${esc(service.name)}</b><span>${esc(service.detail)}</span><strong class="service-state ${esc(service.status)}">${esc(service.status)}</strong></div>`).join('') || '';
  const contractState = networkStatus?.contracts
    ? `Pool ${esc(networkStatus.contracts.pool)} · token ${esc(networkStatus.contracts.token)}`
    : 'Contract configuration unavailable';
  const networkPanel = `<section class="network-panel"><div class="network-panel-heading"><div><p class="eyebrow">SOROWAVE NETWORK CHECK</p><h2>Stellar testnet</h2></div><span class="network-badge ${networkStatus?.status === 'healthy' ? 'healthy' : 'degraded'}">${esc(networkStatus?.status || 'unavailable')}</span></div>${networkError ? appError(networkError) : `<div class="service-list">${serviceRows}</div><p class="network-contract-state">${contractState}</p><p class="network-checked">${networkStatus?.checkedAt ? `Checked ${new Date(networkStatus.checkedAt).toLocaleTimeString()}` : 'Status is unavailable.'}</p>`}</section>`;
  const applicationsMarkup = applications.length ? applications.slice().reverse().map(item => `<article class="application-card"><div><p class="eyebrow">${esc(item.status)} · ${new Date(item.createdAt).toLocaleDateString()}</p><h3>${esc(item.taskTitle)}</h3><p>by ${esc(item.applicant)}${item.walletAddress ? ` · ${esc(item.walletAddress)}` : ''}</p><p><a href="https://github.com/${esc(item.repo)}/issues/${Number(item.issueNumber || 0)}" target="_blank" rel="noreferrer">Open linked issue ↗</a></p></div><div><p>${esc(item.message)}</p>${item.prUrl ? `<p><a href="${esc(item.prUrl)}" target="_blank" rel="noreferrer">Review pull request ↗</a></p>` : ''}<div class="review-actions">${item.status === 'Pending' ? `<button class="button button-bright" data-review="Assigned" data-id="${esc(item.id)}">Accept & assign</button><button class="button button-quiet" data-review="Rejected" data-id="${esc(item.id)}">Reject</button>` : ''}${item.status === 'PR submitted' ? `<button class="button button-bright" data-review="Completed" data-id="${esc(item.id)}">Award points after merge</button>` : ''}</div></div></article>`).join('') : empty('No applications have been submitted yet.');
  app.innerHTML = pageShell(
    'MAINTAINER WORKFLOW',
    'Issue review desk',
    'Review applications, record assignments, check linked pull requests, and award preview points when work is complete.',
    `${error ? appError(error) : ''}<div class="maintainer-preview-note">Local preview controls are open to anyone using this prototype. They do not assign GitHub issues automatically; complete the actual assignment and review on GitHub too.</div>${networkPanel}<div class="dashboard-stats"><article><span>Open issues</span><strong>${allTasks.filter(task => task.status === 'Open').length}</strong></article><article><span>Pending applications</span><strong>${pending}</strong></article><article><span>In progress</span><strong>${assigned}</strong></article><article><span>Completed issues</span><strong>${completed}</strong></article></div><div class="section-heading dashboard-heading"><div><p class="eyebrow">PREVIEW ISSUE POOL</p><h2>Cycle issues</h2></div><a class="button button-bright" href="#/publish">Add issue +</a></div><div class="task-list">${allTasks.length ? allTasks.map(issueCard).join('') : empty('No issues yet. Add a public GitHub issue to the preview cycle.')}</div><div class="section-heading dashboard-heading"><div><p class="eyebrow">REVIEW QUEUE</p><h2>Contributor applications</h2></div></div><div class="application-list">${applicationsMarkup}</div>`
  );
  document.querySelectorAll('[data-review]').forEach(button => button.addEventListener('click', reviewApplication));
}

function renderAbout() {
  app.innerHTML = `<section class="how-section"><div class="how-title"><p class="eyebrow">ABOUT SOROWAVE</p><h1>One cycle.<br><em>Useful work.</em></h1><p class="page-intro">SoroWave is a community preview of a recurring contribution cycle for the Stellar ecosystem. It borrows the issue-first workflow used by Drips Wave projects.</p><a class="button button-bright" href="#/explore">Browse cycle issues →</a></div><div class="steps"><article><span>01</span><h3>Maintainers scope issues</h3><p>Link a public GitHub issue, write acceptance criteria, and set Trivial, Medium, or High complexity.</p></article><article><span>02</span><h3>Contributors apply</h3><p>Share a concise plan. Wait for maintainer assignment before beginning; the application is not an assignment.</p></article><article><span>03</span><h3>Build and submit a PR</h3><p>Work in the repository, link a pull request to the issue, and respond to review.</p></article><article><span>04</span><h3>Review and earn points</h3><p>A maintainer marks work complete after review. The preview leaderboard counts points by completed issue.</p></article></div></section><section class="maintainer-cta"><div><p class="eyebrow">IMPORTANT PROJECT STATUS</p><h2>Preview points are <em>not payouts.</em></h2><p>This cycle has no reward budget, dates, identity checks, GitHub OAuth, or automated GitHub sync. SoroWave is independent and is not affiliated with or endorsed by Drips Wave.</p></div><a class="button button-dark" href="https://docs.drips.network/wave/" target="_blank" rel="noreferrer">Read official Drips Wave docs ↗</a></section>`;
}

async function render() {
  const { page, id } = route();
  document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === page || (page === 'tasks' && link.dataset.nav === 'explore')));
  window.scrollTo(0, 0);
  if (page === 'explore') await renderExplore();
  else if (page === 'tasks') await renderTask(decodeURIComponent(id));
  else if (page === 'publish') await renderPublish();
  else if (page === 'applications') await renderApplications();
  else if (page === 'maintainer') await renderMaintainer();
  else if (page === 'about') renderAbout();
  else location.hash = '/explore';
  app.focus({ preventScroll: true });
}

function openApply(task) {
  selectedTask = task;
  document.querySelector('#dialog-task').textContent = task.title;
  formNote.textContent = walletAddress ? `Application will include ${walletAddress.slice(0, 5)}…${walletAddress.slice(-5)}.` : 'Connect Freighter to attach a Stellar address. Applying does not require a transaction.';
  formNote.className = 'form-note';
  dialog.showModal();
}

async function publishTask(event) {
  event.preventDefault();
  const button = event.submitter;
  const note = document.querySelector('#publish-note');
  button.disabled = true;
  note.textContent = 'Adding issue…';
  const input = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const data = await request('/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    location.hash = `/tasks/${encodeURIComponent(data.task.id)}`;
  } catch (error) {
    note.textContent = error.message;
    note.className = 'form-note error';
    button.disabled = false;
  }
}

async function submitPullRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.dataset.prForm;
  const prUrl = new FormData(form).get('prUrl').trim();
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    await request(`/applications/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prUrl }) });
    await loadApplications(localStorage.getItem('sorowave.github') || '');
  } catch (error) {
    form.insertAdjacentHTML('beforeend', appError(error.message));
    button.disabled = false;
  }
}

async function reviewApplication(event) {
  const button = event.currentTarget;
  const status = button.dataset.review;
  if (status === 'Completed' && !confirm('Confirm the pull request has been reviewed and the GitHub issue is complete? Preview points will be added to the leaderboard.')) return;
  button.disabled = true;
  try {
    await request(`/applications/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    await renderMaintainer();
  } catch (error) {
    alert(error.message);
    button.disabled = false;
  }
}

async function connectWallet() {
  const status = document.querySelector('#wallet-status');
  try {
    const installed = await isConnected();
    if (!installed.isConnected) throw new Error('Freighter was not detected. Install the Freighter wallet extension and try again.');
    const access = await requestAccess();
    if (access.error) throw new Error(access.error.message || 'Wallet access was not granted.');
    const details = await getNetworkDetails();
    if (details.error) throw new Error(details.error.message || 'Could not read the wallet network.');
    if (details.networkPassphrase !== TESTNET) throw new Error('Switch Freighter to Stellar Testnet before connecting. No transaction was signed.');
    walletAddress = access.address;
    localStorage.setItem('sorowave.wallet', walletAddress);
    document.querySelector('#connect-wallet').textContent = `${walletAddress.slice(0, 5)}…${walletAddress.slice(-5)}`;
    if (status) status.textContent = 'Connected on Stellar testnet. Applications can include this address.';
    await refreshBalance(walletAddress);
  } catch (error) {
    if (status) status.textContent = error.message || 'Wallet connection failed.';
    else alert(error.message || 'Wallet connection failed.');
  }
}

async function refreshBalance(address) {
  const balance = document.querySelector('#balance-status');
  const fund = document.querySelector('#fund-account');
  if (!balance) return;
  try {
    const data = await request(`/stellar/accounts/${encodeURIComponent(address)}`);
    if (!data.funded) {
      balance.textContent = 'Account is not funded on testnet yet.';
      if (fund) fund.hidden = false;
      return;
    }
    const xlm = data.balances.find(item => item.asset === 'XLM');
    balance.textContent = `Test XLM balance: ${xlm?.balance || '0'}`;
    if (fund) fund.hidden = false;
  } catch { balance.textContent = 'Account lookup unavailable. Start the API to check testnet balance.'; }
}

async function fundTestnet() {
  if (!walletAddress) return;
  const balance = document.querySelector('#balance-status');
  balance.textContent = 'Requesting testnet XLM from Friendbot…';
  try {
    const response = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(walletAddress)}`);
    if (!response.ok) throw new Error();
    balance.textContent = 'Friendbot request submitted. Refreshing balance…';
    setTimeout(() => refreshBalance(walletAddress), 2500);
  } catch { balance.textContent = 'Friendbot request failed. Try again later.'; }
}

document.querySelector('#connect-wallet').addEventListener('click', connectWallet);
document.querySelector('#apply-form').addEventListener('submit', async event => {
  if (event.submitter?.value !== 'submit') return;
  event.preventDefault();
  const applicant = document.querySelector('#applicant').value.trim().replace(/^@/, '');
  const message = document.querySelector('#message').value.trim();
  try {
    await request('/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId: selectedTask.id, applicant, message, walletAddress: walletAddress || undefined }) });
    localStorage.setItem('sorowave.github', applicant);
    formNote.textContent = 'Application saved. Wait for assignment before starting work; track the decision on Applications.';
    formNote.className = 'form-note success';
    event.target.reset();
    setTimeout(() => { dialog.close(); location.hash = '/applications'; }, 900);
  } catch (error) { formNote.textContent = error.message; formNote.className = 'form-note error'; }
});

window.addEventListener('hashchange', render);
document.querySelector('#connect-wallet').textContent = walletAddress ? `${walletAddress.slice(0, 5)}…${walletAddress.slice(-5)}` : 'Connect Freighter';
render();
