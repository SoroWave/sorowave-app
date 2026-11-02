import { isConnected, requestAccess, getNetworkDetails } from '@stellar/freighter-api';

const API = import.meta.env.VITE_API_URL || window.SOROWAVE_API || 'http://localhost:4173';
const TESTNET = 'Test SDF Network ; September 2015';
const sampleTasks = [
  {id:'task-001',title:'Add a Soroban contract test fixture',description:'Create a reusable test fixture for bounty escrow scenarios and document how contributors can run it.',repo:'SoroWave/sorowave-contracts',category:'contracts',level:'Good first issue',reward:100,status:'Open'},
  {id:'task-002',title:'Build a Stellar address validation helper',description:'Add a small reusable validation helper with clear error messages for invalid Stellar public addresses.',repo:'SoroWave/sorowave-api',category:'developer-tools',level:'Small feature',reward:150,status:'Open'},
  {id:'task-003',title:'Document a testnet payment walkthrough',description:'Write a friendly guide explaining testnet wallets, Friendbot, and how to inspect a transaction.',repo:'SoroWave/sorowave-app',category:'payments',level:'Good first issue',reward:100,status:'Open'},
  {id:'task-004',title:'Show application status on task cards',description:'Help contributors see when their application is waiting for review.',repo:'SoroWave/sorowave-app',category:'developer-tools',level:'Small feature',reward:150,status:'Open'}
];
let tasks = sampleTasks, walletAddress = '', selectedTask = null, currentRoute = '';
const app = document.querySelector('#app'), dialog = document.querySelector('#apply-dialog'), formNote = document.querySelector('#form-note');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
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
  return {page, id:parts.join('/')};
}
function taskCard(task) {
  return `<article class="task-card"><div><a class="task-title" href="#/tasks/${encodeURIComponent(task.id)}">${esc(task.title)}</a><div class="task-meta"><span class="repo-name">${esc(task.repo)}</span><span class="tag">${esc((task.category || 'community').replace('-', ' '))}</span></div></div><span class="task-level">${esc(task.level || 'Community task')}</span><span class="task-reward">${Number(task.reward || 0)} <small>demo points</small></span><a class="apply-button" href="#/tasks/${encodeURIComponent(task.id)}">View task →</a></article>`;
}
function pageShell(eyebrow, title, intro, content, actions='') {
  return `<section class="page-shell"><div class="page-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${title}</h1><p class="page-intro">${intro}</p></div>${actions}</div>${content}</section>`;
}
async function renderExplore() {
  const category = new URLSearchParams(location.hash.split('?')[1] || '').get('category') || 'all';
  const search = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
  let error = '';
  try { const data = await request('/tasks'); if (Array.isArray(data.tasks)) tasks = data.tasks; } catch { error = 'API is offline. Showing starter tasks. Start the API to publish and apply.'; }
  const filtered = tasks.filter(task => (category === 'all' || task.category === category) && (!search || `${task.title} ${task.repo} ${task.description || ''}`.toLowerCase().includes(search.toLowerCase())));
  app.innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span> STELLAR BUILDERS, BUILD TOGETHER</p><h1>Good open source<br>moves <em>everyone</em> forward.</h1><p class="hero-lede">Pick a real problem. Ship a useful fix. Help build the tools and projects moving the Stellar ecosystem forward.</p><div class="hero-actions"><a class="button button-bright" href="#/explore">Explore open tasks <span>→</span></a><a class="text-link" href="#/about">See how it works ↓</a></div><p class="wallet-status" id="wallet-status">Connect Freighter to check testnet balance and attach your address to applications.</p></div><div class="hero-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="art-core"><span>SW</span><small>BUILD<br>TOGETHER</small></div><span class="node node-one">✳</span><span class="node node-two">⌘</span><span class="node node-three">↗</span><span class="node node-four">◎</span><span class="art-caption">COMMUNITY<br>POWERED</span></div></section><section class="stats"><div><strong>01</strong><span>Real problems<br>worth solving</span></div><div><strong>02</strong><span>Open work<br>for builders</span></div><div><strong>03</strong><span>Progress everyone<br>can see</span></div><div class="stats-tag">A small start.<br><b>A bigger ecosystem.</b></div></section><section class="work-section"><div class="section-heading"><div><p class="eyebrow">THE WORK BOARD</p><h2>Find your next <em>good problem.</em></h2></div><a href="#/publish" class="text-link">Have a project? Publish work ↗</a></div><form id="task-search" class="search-bar"><input name="q" value="${esc(search)}" placeholder="Search tasks and repositories" aria-label="Search tasks"><button class="button button-dark">Search</button></form><div class="filters"><a class="filter ${category==='all'?'active':''}" href="#/explore">All work <span>${tasks.length}</span></a>${[['contracts','Contracts'],['developer-tools','Developer tools'],['payments','Payments']].map(([slug,label])=>`<a class="filter ${category===slug?'active':''}" href="#/explore?category=${slug}">${label}</a>`).join('')}</div><div class="chain-panel"><div><b>Stellar testnet</b><span id="balance-status">${walletAddress?'Connected wallet: '+esc(walletAddress):'Connect a wallet to check its testnet account.'}</span></div><button id="fund-account" class="text-link" ${walletAddress?'':'hidden'}>Get test XLM ↗</button><a class="text-link" href="https://stellar.expert/explorer/testnet" target="_blank" rel="noreferrer">Testnet explorer ↗</a></div>${error?appError(error):''}<div class="task-list">${filtered.length?filtered.map(taskCard).join(''):empty('No tasks match this search yet.')}</div><p class="board-foot"><span class="live-dot"></span> Rewards shown are demo points; bounty payments are not enabled yet.</p></section>`;
  document.querySelector('#task-search').addEventListener('submit', event => { event.preventDefault(); const q = new FormData(event.currentTarget).get('q').trim(); location.hash = `/explore${q?`?q=${encodeURIComponent(q)}`:''}`; });
  document.querySelector('#fund-account')?.addEventListener('click', fundTestnet);
}
async function renderTask(id) {
  const task = tasks.find(item => item.id === id) || sampleTasks.find(item => item.id === id);
  let item = task;
  try { const data = await request(`/tasks/${encodeURIComponent(id)}`); item = data.task; } catch { /* the sample task remains available offline */ }
  if (!item) { app.innerHTML = pageShell('NOT FOUND','Task not found','This task may have been removed.','<a class="button button-bright" href="#/explore">Back to explore</a>'); return; }
  app.innerHTML = pageShell('TASK DETAILS',esc(item.title),`<span class="repo-name">${esc(item.repo)}</span> · ${esc(item.category)} · ${esc(item.level)}`,`<article class="detail-card"><p>${esc(item.description || 'The maintainer has not added a detailed description yet.')}</p><dl><div><dt>Reward</dt><dd>${Number(item.reward || 0)} demo points</dd></div><div><dt>Status</dt><dd>${esc(item.status || 'Open')}</dd></div><div><dt>Repository</dt><dd><a href="https://github.com/${esc(item.repo)}" target="_blank" rel="noreferrer">${esc(item.repo)} ↗</a></dd></div></dl><p class="form-note">Demo points are informational only. No payment is sent by this preview.</p><button class="button button-bright" id="apply-task" ${item.status==='Open'?'':'disabled'}>Apply to this task →</button></article>`,`<a class="text-link" href="#/explore">← All tasks</a>`);
  document.querySelector('#apply-task')?.addEventListener('click', () => openApply(item));
}
async function renderPublish() {
  app.innerHTML = pageShell('MAINTAINERS WELCOME','Publish a task','Share a clearly scoped issue from a public repository. Your task appears on the Explore page after it is saved.',`<form id="publish-form" class="form-card"><label for="title">Task title</label><input id="title" name="title" required minlength="8" maxlength="120" placeholder="Example: Add a test for escrow cancellation"><label for="repo">GitHub repository</label><input id="repo" name="repo" required placeholder="SoroWave/sorowave-app" pattern="[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+"><label for="description">What needs to be done?</label><textarea id="description" name="description" required minlength="30" maxlength="2000" placeholder="Explain the problem, useful context, and what a finished contribution looks like."></textarea><div class="form-grid"><div><label for="category">Category</label><select id="category" name="category"><option value="contracts">Contracts</option><option value="developer-tools">Developer tools</option><option value="payments">Payments</option></select></div><div><label for="level">Difficulty</label><select id="level" name="level"><option>Good first issue</option><option>Small feature</option><option>Advanced</option></select></div><div><label for="reward">Demo points</label><select id="reward" name="reward"><option value="100">100 points</option><option value="150">150 points</option><option value="200">200 points</option></select></div></div><p id="publish-note" class="form-note">Task listing is an open prototype. Do not include private information.</p><button class="button button-bright">Publish task →</button></form>`);
  document.querySelector('#publish-form').addEventListener('submit', publishTask);
}
async function renderApplications() {
  const username = localStorage.getItem('sorowave.github') || '';
  app.innerHTML = pageShell('YOUR CONTRIBUTIONS','My applications','Look up applications using the GitHub username you applied with.',`<form id="lookup-apps" class="search-bar"><input name="applicant" value="${esc(username)}" required placeholder="Your GitHub username"><button class="button button-dark">Find applications</button></form><div id="my-applications">${empty('Enter your GitHub username to find applications.')}</div>`);
  if (username) await loadApplications(username);
  document.querySelector('#lookup-apps').addEventListener('submit', async event => { event.preventDefault(); const handle = new FormData(event.currentTarget).get('applicant').trim().replace(/^@/,''); localStorage.setItem('sorowave.github',handle); await loadApplications(handle); });
}
async function loadApplications(handle) {
  const target = document.querySelector('#my-applications'); if (!target) return;
  try { const data = await request(`/applications?applicant=${encodeURIComponent(handle)}`); target.innerHTML = data.applications.length ? `<div class="application-list">${data.applications.map(item=>`<article class="application-card"><div><p class="eyebrow">${esc(item.status)}</p><h3>${esc(item.taskTitle)}</h3><p>Submitted ${new Date(item.createdAt).toLocaleDateString()}</p></div><p>${esc(item.message)}</p></article>`).join('')}</div>` : empty('No applications found for that username yet.'); }
  catch (error) { target.innerHTML = appError(error.message); }
}
async function renderMaintainer() {
  let allTasks = [], applications = [], error = '';
  try { [allTasks, applications] = await Promise.all([request('/tasks?all=true').then(data=>data.tasks),request('/applications').then(data=>data.applications)]); } catch (err) { error=err.message; }
  const pending = applications.filter(item=>item.status==='Pending').length;
  app.innerHTML = pageShell('MAINTAINER OVERVIEW','Project dashboard','A quick view of the tasks and contributor interest currently recorded in this prototype.',`${error?appError(error):''}<div class="dashboard-stats"><article><span>Open tasks</span><strong>${allTasks.filter(task=>task.status==='Open').length}</strong></article><article><span>Applications</span><strong>${applications.length}</strong></article><article><span>Waiting for review</span><strong>${pending}</strong></article></div><div class="section-heading dashboard-heading"><div><p class="eyebrow">YOUR BACKLOG</p><h2>Published tasks</h2></div><a class="button button-bright" href="#/publish">Publish a task +</a></div><div class="task-list">${allTasks.length?allTasks.map(taskCard).join(''):empty('No tasks yet. Publish the first one.')}</div><div class="section-heading dashboard-heading"><div><p class="eyebrow">COMMUNITY</p><h2>Recent applications</h2></div></div><div class="application-list">${applications.length?applications.slice().reverse().map(item=>`<article class="application-card"><div><p class="eyebrow">${esc(item.status)} · ${new Date(item.createdAt).toLocaleDateString()}</p><h3>${esc(item.taskTitle)}</h3><p>by ${esc(item.applicant)}${item.walletAddress?' · '+esc(item.walletAddress):''}</p></div><p>${esc(item.message)}</p></article>`).join(''):empty('No applications have been submitted yet.')}</div><p class="form-note">Prototype dashboard data is public and has no maintainer sign-in. Do not use it for private applicant data.</p>`);
}
function renderAbout() {
  app.innerHTML = `<section class="how-section"><div class="how-title"><p class="eyebrow">ABOUT SOROWAVE</p><h1>Open work.<br><em>Shared progress.</em></h1><p class="page-intro">SoroWave helps contributors find useful tasks across Stellar projects and gives maintainers a simple place to share their backlog.</p><a class="button button-bright" href="#/explore">Explore open tasks →</a></div><div class="steps"><article><span>01</span><h3>Pick a task</h3><p>Read the scope and repository link before applying.</p></article><article><span>02</span><h3>Build in the open</h3><p>Coordinate with the repository maintainers and share progress.</p></article><article><span>03</span><h3>Ship it together</h3><p>Submit your contribution for review in the project's GitHub repository.</p></article></div></section><section class="maintainer-cta"><div><p class="eyebrow">BUILT ON STELLAR TESTNET</p><h2>Help shape the <em>next wave.</em></h2><p>Connect Freighter on testnet to associate your public address with an application. This preview does not move funds.</p></div><a class="button button-dark" href="https://developers.stellar.org/" target="_blank" rel="noreferrer">Read Stellar docs ↗</a></section>`;
}
async function render() {
  const {page,id}=route(); currentRoute=page;
  document.querySelectorAll('[data-nav]').forEach(link=>link.classList.toggle('active',link.dataset.nav===page || (page==='tasks'&&link.dataset.nav==='explore')));
  window.scrollTo(0,0);
  if(page==='explore') await renderExplore(); else if(page==='tasks') await renderTask(decodeURIComponent(id)); else if(page==='publish') await renderPublish(); else if(page==='applications') await renderApplications(); else if(page==='maintainer') await renderMaintainer(); else if(page==='about') renderAbout(); else location.hash='/explore';
  app.focus({preventScroll:true});
}
function openApply(task) {
  selectedTask=task; document.querySelector('#dialog-task').textContent=task.title;
  formNote.textContent=walletAddress?`Application will include ${walletAddress.slice(0,5)}…${walletAddress.slice(-5)}.`:'Connect Freighter to attach a Stellar address. Applying does not require a transaction.';
  formNote.className='form-note'; dialog.showModal();
}
async function publishTask(event) {
  event.preventDefault(); const button=event.submitter, note=document.querySelector('#publish-note'); button.disabled=true; note.textContent='Publishing task…';
  const input=Object.fromEntries(new FormData(event.currentTarget));
  try { const data=await request('/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}); location.hash=`/tasks/${encodeURIComponent(data.task.id)}`; }
  catch(error) { note.textContent=error.message; note.className='form-note error'; button.disabled=false; }
}
async function connectWallet() {
  const status=document.querySelector('#wallet-status');
  try { const installed=await isConnected(); if(!installed.isConnected) throw new Error('Freighter was not detected. Install the Freighter wallet extension and try again.'); const access=await requestAccess(); if(access.error) throw new Error(access.error.message||'Wallet access was not granted.'); const details=await getNetworkDetails(); if(details.error) throw new Error(details.error.message||'Could not read the wallet network.'); if(details.networkPassphrase!==TESTNET) throw new Error('Switch Freighter to Stellar Testnet before connecting. No transaction was signed.'); walletAddress=access.address; localStorage.setItem('sorowave.wallet',walletAddress); document.querySelector('#connect-wallet').textContent=`${walletAddress.slice(0,5)}…${walletAddress.slice(-5)}`; if(status) status.textContent='Connected on Stellar testnet. Applications can include this address.'; await refreshBalance(walletAddress); }
  catch(error) { if(status) status.textContent=error.message||'Wallet connection failed.'; else alert(error.message||'Wallet connection failed.'); }
}
async function refreshBalance(address) {
  const balance=document.querySelector('#balance-status'), fund=document.querySelector('#fund-account'); if(!balance) return;
  try { const data=await request(`/stellar/accounts/${encodeURIComponent(address)}`); if(!data.funded) {balance.textContent='Account is not funded on testnet yet.'; if(fund) fund.hidden=false; return;} const xlm=data.balances.find(item=>item.asset==='XLM'); balance.textContent=`Test XLM balance: ${xlm?.balance||'0'}`; if(fund) fund.hidden=false; }
  catch { balance.textContent='Account lookup unavailable. Start the API to check testnet balance.'; }
}
async function fundTestnet() {
  if(!walletAddress) return; const balance=document.querySelector('#balance-status'); balance.textContent='Requesting testnet XLM from Friendbot…';
  try { const response=await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(walletAddress)}`); if(!response.ok) throw new Error(); balance.textContent='Friendbot request submitted. Refreshing balance…'; setTimeout(()=>refreshBalance(walletAddress),2500); }
  catch { balance.textContent='Friendbot request failed. Try again later.'; }
}
document.querySelector('#connect-wallet').addEventListener('click',connectWallet);
document.querySelector('#apply-form').addEventListener('submit',async event=>{
  if(event.submitter?.value!=='submit') return; event.preventDefault(); const applicant=document.querySelector('#applicant').value.trim().replace(/^@/,''); const message=document.querySelector('#message').value.trim();
  try { await request('/applications',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({taskId:selectedTask.id,applicant,message,walletAddress:walletAddress||undefined})}); localStorage.setItem('sorowave.github',applicant); formNote.textContent='Application saved. You can track it on My applications.'; formNote.className='form-note success'; event.target.reset(); setTimeout(()=>{dialog.close();location.hash='/applications';},850); }
  catch(error) { formNote.textContent=error.message; formNote.className='form-note error'; }
});
window.addEventListener('hashchange',render);
walletAddress=localStorage.getItem('sorowave.wallet')||'';
render();
