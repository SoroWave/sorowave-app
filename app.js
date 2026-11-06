import { isConnected, requestAccess, getNetworkDetails, signTransaction } from '@stellar/freighter-api';

const API = import.meta.env.VITE_API_URL || window.SOROWAVE_API || 'http://localhost:4173';
const TESTNET = 'Test SDF Network ; September 2015';
const previewWave = {
  id: 'sorowave-community-preview',
  title: 'Community Preview Cycle',
  status: 'preview',
  issues: 2,
  completedIssues: 0,
  pointsAvailable: 300,
  rewardPool: null,
  description: 'A preview cycle for practicing the contribution workflow. It is not an official Drips Wave and has no funded reward pool.'
};
const sampleTasks = [
  {id:'task-app-search',title:'Add keyword search to the task board',description:'Let contributors search task titles, repository names, and issue descriptions. Keep the search usable on mobile and announce the result count to assistive technology.',repo:'SoroWave/sorowave-app',issueNumber:1,issueUrl:'https://github.com/SoroWave/sorowave-app/issues/1',category:'developer-tools',complexity:'Medium',points:150,status:'Open',waveId:previewWave.id},
  {id:'task-api-pagination',title:'Add pagination to GET /tasks',description:'Add a bounded limit and stable next-page cursor to GET /tasks. Keep category filtering consistent across pages, reject malformed values, and document example requests and responses.',repo:'SoroWave/sorowave-api',issueNumber:1,issueUrl:'https://github.com/SoroWave/sorowave-api/issues/1',category:'developer-tools',complexity:'Medium',points:150,status:'Open',waveId:previewWave.id}
];

let tasks = sampleTasks;
let currentWave = previewWave;
let leaderboard = [];
let taskPagination = { page: 1, pageSize: 20, total: sampleTasks.length, totalPages: 1 };
let walletAddress = localStorage.getItem('sorowave.wallet') || '';
let selectedTask = null;
let issueLookupSequence = 0;
let verifiedIssueUrl = '';
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
  if (!response.ok) {
    const error = new Error(data.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function requestAsMaintainer(path, options = {}) {
  let token = sessionStorage.getItem('sorowave.maintainerToken') || '';
  if (!token) {
    token = window.prompt('Enter the maintainer token configured by the SoroWave API host:') || '';
    if (!token) throw new Error('Maintainer token is required for this action.');
    sessionStorage.setItem('sorowave.maintainerToken', token);
  }
  try {
    return await request(path, {
      ...options,
      headers: { ...options.headers, authorization: `Bearer ${token}` }
    });
  } catch (error) {
    if (error.status === 401) {
      sessionStorage.removeItem('sorowave.maintainerToken');
      throw new Error('That maintainer token was rejected. Reload the page and enter the correct token.');
    }
    throw error;
  }
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
  return `<section class="wave-banner"><div class="wave-banner-copy"><p class="eyebrow"><span class="live-dot"></span> SOROWAVE FIELD CYCLE · INDEPENDENT PREVIEW</p><h2>${esc(wave.title || previewWave.title)}</h2><p>${esc(wave.description || previewWave.description)}</p><span class="wave-status">${esc((wave.status || 'preview').toUpperCase())} · TESTNET · NO PAYOUTS</span></div><div class="wave-metrics"><article><strong>${issueCount}</strong><span>open issues</span></article><article><strong>${completedCount}</strong><span>verified</span></article><article><strong>${points}</strong><span>preview points</span></article><article><strong>${wave.rewardPool ? esc(wave.rewardPool) : '—'}</strong><span>funded pool</span></article></div></section>`;
}

async function renderExplore() {
  const query = new URLSearchParams(location.hash.split('?')[1] || '');
  const category = query.get('category') || 'all';
  const search = query.get('q') || '';
  const requestedPage = Number(query.get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  taskPagination = { page, pageSize: 10, total: 0, totalPages: 0 };
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
  if (error) taskPagination = { page: 1, pageSize: 10, total: filtered.length, totalPages: 1 };
  const exploreUrl = (nextCategory = category, nextSearch = search, nextPage = 1) => {
    const params = new URLSearchParams();
    if (nextCategory !== 'all') params.set('category', nextCategory);
    if (nextSearch) params.set('q', nextSearch);
    if (nextPage > 1) params.set('page', String(nextPage));
    return `#/explore${params.size ? `?${params}` : ''}`;
  };
  const firstResult = taskPagination.total ? (taskPagination.page - 1) * taskPagination.pageSize + 1 : 0;
  const lastResult = Math.min(taskPagination.page * taskPagination.pageSize, taskPagination.total);
  const pager = taskPagination.totalPages > 1 ? `<div class="issue-pagination"><span>Showing ${firstResult}–${lastResult} of ${taskPagination.total} issues</span><div>${page > 1 ? `<a class="button button-quiet" href="${exploreUrl(category, search, page - 1)}">← Previous</a>` : ''}${page < taskPagination.totalPages ? `<a class="button button-quiet" href="${exploreUrl(category, search, page + 1)}">Next →</a>` : ''}</div></div>` : '';

  app.innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span> AN OPEN SOURCE WORKBENCH ON STELLAR</p><h1>Make useful work<br>leave a <em>lasting signal.</em></h1><p class="hero-lede">Find a real repository issue, agree on the work with its maintainer, and make each contribution easy to follow.</p><div class="hero-actions"><a class="button button-bright" href="${exploreUrl('all', '', 1)}">Explore open issues <span>→</span></a><a class="text-link" href="#/about">See how SoroWave works ↓</a></div><p class="wallet-status" id="wallet-status">${walletAddress ? `Connected on testnet: ${esc(walletAddress)}` : 'A Stellar testnet wallet links your application to your public contributor record.'}</p></div><div class="hero-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="art-core"><span>SW</span><small>OPEN<br>WORK</small></div><span class="node node-one">✳</span><span class="node node-two">⌘</span><span class="node node-three">↗</span><span class="node node-four">◎</span><span class="art-caption">BUILT IN<br>PUBLIC</span></div></section>${waveBanner(currentWave)}<section class="work-section"><div class="section-heading"><div><p class="eyebrow">THE SOROWAVE WORKBENCH</p><h2>Choose a task. <em>Make it count.</em></h2></div><a href="#/publish" class="text-link">Have a useful issue? Bring it in ↗</a></div><form id="task-search" class="search-bar"><input name="q" value="${esc(search)}" placeholder="Search issues, repositories, or scope" aria-label="Search issues"><button class="button button-dark">Search</button></form><div class="filters"><a class="filter ${category === 'all' ? 'active' : ''}" href="${exploreUrl('all')}">All issues <span>${taskPagination.total}</span></a>${[['contracts','Contracts'],['developer-tools','Developer tools'],['payments','Payments']].map(([slug,label]) => `<a class="filter ${category === slug ? 'active' : ''}" href="${exploreUrl(slug)}">${label}</a>`).join('')}</div><div class="chain-panel"><div><b>Stellar testnet</b><span id="balance-status">${walletAddress ? 'Checking connected testnet account…' : 'Connect a wallet to check its testnet account.'}</span></div><button id="fund-account" class="text-link" ${walletAddress ? '' : 'hidden'}>Request test XLM ↗</button><a class="text-link" href="https://stellar.expert/explorer/testnet" target="_blank" rel="noreferrer">View testnet ledger ↗</a></div>${error ? appError(error) : ''}<div class="task-list">${filtered.length ? filtered.map(issueCard).join('') : empty('No issues match this search yet.')}</div>${pager}<p class="board-foot"><span class="live-dot"></span> SoroWave preview points are community signals, not payouts.</p></section>`;

  document.querySelector('#task-search').addEventListener('submit', event => {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get('q').trim();
    location.hash = exploreUrl(category, q, 1);
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
  app.innerHTML = pageShell('GITHUB ISSUE', esc(item.title), `${esc(item.repo)} #${Number(item.issueNumber || 0)} · ${esc(item.category)} · ${esc(item.complexity || 'Trivial')}`, `<article class="detail-card"><p>${esc(item.description || 'See the GitHub issue for the maintainer’s full scope and acceptance criteria.')}</p><dl><div><dt>Points</dt><dd>${Number(item.points || 100)} preview points</dd></div><div><dt>Issue state</dt><dd>${esc(item.status || 'Open')}</dd></div><div><dt>Wave</dt><dd>Community preview cycle</dd></div></dl><p class="assignment-rule"><b>Contribution rule:</b> Connect a Stellar testnet wallet to apply. Wait until a maintainer assigns you before starting work. Link your pull request to the issue with <code>Closes #${Number(item.issueNumber || 0)}</code>.</p><div class="detail-actions"><a class="button button-quiet" href="${esc(item.issueUrl)}" target="_blank" rel="noreferrer">Read issue on GitHub ↗</a><button class="button button-bright" id="apply-task" ${item.status === 'Open' ? '' : 'disabled'}>${walletAddress ? 'Apply to this issue →' : 'Connect wallet to apply →'}</button></div><p class="form-note">Points and payouts are available onchain only after the Soroban pool is deployed and configured.</p></article>`, '<a class="text-link" href="#/explore">← All issues</a>');
  document.querySelector('#apply-task')?.addEventListener('click', async () => {
    if (!walletAddress) await connectWallet();
    if (walletAddress) openApply(item);
  });
}

async function renderPublish() {
  app.innerHTML = pageShell('MAINTAINERS','Add an issue to the preview cycle','Create the issue in GitHub first. SoroWave verifies that it is a public, open issue and uses its canonical title.', `<div class="repo-onboarding"><p class="eyebrow">REPOSITORIES IN THIS PREVIEW</p><div>${['sorowave-app','sorowave-api','sorowave-contracts'].map(repo => `<a href="https://github.com/SoroWave/${repo}" target="_blank" rel="noreferrer">SoroWave/${repo} ↗</a>`).join('')}</div></div><form id="publish-form" class="form-card"><label for="issueUrl">GitHub issue URL</label><div class="verify-row"><input id="issueUrl" name="issueUrl" type="url" required placeholder="https://github.com/org/repo/issues/123"><button id="verify-issue" class="button button-quiet" type="button">Verify issue</button></div><p id="issue-lookup-note" class="form-note">Paste a URL, then verify it before adding it to the cycle.</p><label for="title">Issue title</label><input id="title" name="title" required minlength="8" maxlength="120" readonly placeholder="Verified from GitHub"><label for="description">Scope and acceptance criteria</label><textarea id="description" name="description" required minlength="40" maxlength="4000" placeholder="Add any missing acceptance criteria or contributor guidance."></textarea><div class="form-grid"><div><label for="category">Category</label><select id="category" name="category"><option value="contracts">Contracts</option><option value="developer-tools">Developer tools</option><option value="payments">Payments</option></select></div><div><label for="complexity">Complexity</label><select id="complexity" name="complexity"><option value="Trivial">Trivial — 100 points</option><option value="Medium">Medium — 150 points</option><option value="High">High — 200 points</option></select></div></div><p id="publish-note" class="form-note">Only a public, open GitHub issue can be added. Points are preview values.</p><button class="button button-bright">Add issue to cycle →</button></form>`);
  verifiedIssueUrl = '';
  const issueInput = document.querySelector('#issueUrl');
  document.querySelector('#verify-issue').addEventListener('click', lookupGitHubIssue);
  issueInput.addEventListener('input', () => {
    if (issueInput.value.trim() === verifiedIssueUrl) return;
    issueLookupSequence += 1;
    verifiedIssueUrl = '';
    document.querySelector('#verify-issue').disabled = false;
    document.querySelector('#title').value = '';
    document.querySelector('#description').value = '';
    document.querySelector('#issue-lookup-note').textContent = 'Verify this GitHub issue before adding it to the cycle.';
    document.querySelector('#issue-lookup-note').className = 'form-note';
  });
  document.querySelector('#publish-form').addEventListener('submit', publishTask);
}

async function lookupGitHubIssue(event) {
  const input = document.querySelector('#issueUrl');
  const button = event.currentTarget;
  const url = input.value.trim();
  if (!url || url === verifiedIssueUrl) return;
  const sequence = ++issueLookupSequence;
  verifiedIssueUrl = '';
  document.querySelector('#title').value = '';
  document.querySelector('#description').value = '';
  const note = document.querySelector('#issue-lookup-note');
  button.disabled = true;
  note.textContent = 'Checking public GitHub issue…';
  note.className = 'form-note';
  try {
    const data = await request(`/github/issue?url=${encodeURIComponent(url)}`);
    if (sequence !== issueLookupSequence || input.value.trim() !== url) return;
    document.querySelector('#title').value = data.issue.title;
    document.querySelector('#description').value = data.issue.body;
    verifiedIssueUrl = url;
    note.textContent = `Verified open issue #${data.issue.number} in ${data.issue.repository}. Add acceptance criteria if the GitHub description is brief.`;
    note.className = 'form-note success';
  } catch (error) {
    if (sequence !== issueLookupSequence || input.value.trim() !== url) return;
    note.textContent = error.message;
    note.className = 'form-note error';
  } finally { if (sequence === issueLookupSequence) button.disabled = false; }
}

async function renderApplications() {
  const username = localStorage.getItem('sorowave.github') || '';
  app.innerHTML = pageShell('CONTRIBUTOR LOGBOOK', 'Your work, in one place', 'Follow each application from first hello to merged pull request, and see what the community has verified.', `<section id="onchain-rewards" class="network-panel"><div class="network-panel-heading"><div><p class="eyebrow">STELLAR TESTNET · SOROBAN</p><h2>Cycle pool status</h2></div><span class="network-badge degraded">Loading</span></div><p>Checking the configured SoroWave pool contract…</p></section><form id="lookup-apps" class="search-bar"><input name="applicant" value="${esc(username)}" required placeholder="Your GitHub username"><button class="button button-dark">Open my logbook</button></form><div id="my-applications">${empty('Enter your GitHub username to load your activity.')}</div><div class="section-heading dashboard-heading"><div><p class="eyebrow">COMMUNITY SIGNAL</p><h2>Verified contributions</h2></div></div><div id="leaderboard" class="leaderboard-list">${empty('No points have been earned in this preview cycle yet.')}</div>`);
  document.querySelector('#lookup-apps').addEventListener('submit', async event => {
    event.preventDefault();
    const handle = new FormData(event.currentTarget).get('applicant').trim().replace(/^@/, '');
    localStorage.setItem('sorowave.github', handle);
    await loadApplications(handle);
  });
  await loadLeaderboard();
  await loadOnchainRewards();
  if (username) await loadApplications(username);
}

async function loadOnchainRewards() {
  const panel = document.querySelector('#onchain-rewards');
  if (!panel) return;
  const badge = state => `<span class="network-badge ${state === 'ready' ? 'healthy' : 'degraded'}">${state}</span>`;
  try {
    const config = await request('/stellar/config');
    if (!config.contractId || !/^\d+$/.test(String(config.waveId ?? ''))) {
      panel.innerHTML = `<div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · STELLAR TESTNET</p><h2>Onchain reward pool</h2></div>${badge('not configured')}</div><p>The app is wired to fund a Soroban pool, record verified contribution points, and read or claim rewards. No deployed pool contract and numeric wave ID are configured yet, so onchain rewards are not available.</p><p class="form-note">A maintainer must deploy and initialize the reviewed pool, then set <code>SOROWAVE_CONTRACT_ID</code> and <code>SOROWAVE_WAVE_ID</code> in the API environment.</p>`;
      return;
    }
    if (!walletAddress) {
      panel.innerHTML = `<div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · STELLAR TESTNET</p><h2>Onchain reward pool</h2></div>${badge('wallet needed')}</div><p>A testnet pool is configured. Connect Freighter to read your onchain points and claim status.</p>`;
      return;
    }
    const { client, waveId } = await getPoolConnection(config);
    const [waveTx, pointsTx, claimedTx] = await Promise.all([
      client.get_wave({ wave_id: waveId }),
      client.get_points({ wave_id: waveId, contributor: walletAddress }),
      client.has_claimed({ wave_id: waveId, contributor: walletAddress })
    ]);
    const wave = waveTx.result;
    const points = Number(pointsTx.result || 0);
    const claimed = Boolean(claimedTx.result);
    if (!wave) {
      panel.innerHTML = `<div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · STELLAR TESTNET</p><h2>Onchain reward pool</h2></div>${badge('configured')}</div><p>Contract is configured, but wave ${esc(config.waveId)} has not been created onchain yet.</p>`;
      return;
    }
    const remaining = wave.remaining_pool?.toString?.() ?? String(wave.remaining_pool ?? '0');
    const finalized = Boolean(wave.finalized);
    const canClaim = finalized && points > 0 && !claimed;
    panel.innerHTML = `<div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · STELLAR TESTNET</p><h2>Onchain reward pool</h2></div>${badge(finalized ? 'ready' : 'active')}</div><div class="wave-metrics"><article><strong>${esc(remaining)}</strong><span>token base units remaining</span></article><article><strong>${points}</strong><span>your onchain points</span></article><article><strong>${wave.total_points}</strong><span>total awarded points</span></article><article><strong>${claimed ? 'Yes' : 'No'}</strong><span>claimed by this wallet</span></article></div><p>${finalized ? 'This pool is finalized. Eligible contributors can claim their pro-rata token reward.' : 'The pool is not finalized yet; claims stay disabled until a maintainer finalizes it onchain.'}</p><button id="claim-reward" class="button button-bright" ${canClaim ? '' : 'disabled'}>${claimed ? 'Already claimed' : 'Claim testnet reward →'}</button><p id="claim-status" class="form-note">Read directly from the Soroban testnet contract. Claiming requires Freighter approval.</p>`;
    document.querySelector('#claim-reward')?.addEventListener('click', () => claimOnchainReward(client, waveId));
  } catch (error) {
    panel.innerHTML = `<div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · STELLAR TESTNET</p><h2>Onchain reward pool</h2></div>${badge('unavailable')}</div><p>${esc(error.message || 'Could not read the pool contract.')}</p><p class="form-note">No transaction was submitted.</p>`;
  }
}

async function claimOnchainReward(client, waveId) {
  const button = document.querySelector('#claim-reward');
  const status = document.querySelector('#claim-status');
  if (!walletAddress || !button || !status) return;
  button.disabled = true;
  status.textContent = 'Preparing claim. Review and approve the transaction in Freighter to continue.';
  try {
    const tx = await client.claim({ wave_id: waveId, contributor: walletAddress });
    const sent = await signAndSendWithFreighter(tx);
    status.textContent = `Claim confirmed on Stellar testnet: ${sent.hash || 'transaction submitted'}.`;
    await loadOnchainRewards();
  } catch (error) {
    status.textContent = `${error.message || 'Claim failed.'} No funds move unless the transaction is approved and confirmed.`;
    button.disabled = false;
  }
}

async function getPoolConnection(config) {
  if (!walletAddress) throw new Error('Connect a Stellar testnet wallet in Freighter.');
  if (!config?.contractId || !/^\d+$/.test(String(config.waveId ?? ''))) throw new Error('The Soroban pool contract and numeric wave ID are not configured.');
  const details = await getNetworkDetails();
  if (details.error || details.networkPassphrase !== TESTNET) throw new Error('Switch Freighter to Stellar Testnet. No transaction was submitted.');
  const { contract } = await import('@stellar/stellar-sdk');
  const client = await contract.Client.from({ contractId: config.contractId, networkPassphrase: TESTNET, rpcUrl: config.rpcUrl, publicKey: walletAddress });
  return { client, waveId: BigInt(config.waveId) };
}

async function signAndSendWithFreighter(tx) {
  return tx.signAndSend({ signTransaction: async xdr => {
    const signed = await signTransaction(xdr, { networkPassphrase: TESTNET, address: walletAddress });
    if (signed.error) throw new Error(signed.error.message || 'Freighter declined or could not sign the transaction.');
    return { signedTxXdr: signed.signedTxXdr, signerAddress: signed.signerAddress };
  } });
}

async function loadChainOperations() {
  const panel = document.querySelector('#chain-operations');
  if (!panel) return;
  try {
    const config = await request('/stellar/config');
    if (!config.contractId || !/^\d+$/.test(String(config.waveId ?? ''))) {
      panel.innerHTML = `<div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · MAINTAINER OPERATIONS</p><h2>Fund and finalize the cycle</h2></div><span class="network-badge degraded">not configured</span></div><p>Deploy and initialize the reviewed pool contract, then configure its contract ID and numeric wave ID in the API before using onchain operations.</p>`;
      return;
    }
    if (!walletAddress) {
      panel.innerHTML = `<div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · MAINTAINER OPERATIONS</p><h2>Fund and finalize the cycle</h2></div><span class="network-badge degraded">wallet needed</span></div><p>Connect the pool administrator wallet in Freighter to inspect or manage this testnet cycle.</p>`;
      return;
    }
    const { client, waveId } = await getPoolConnection(config);
    const wave = (await client.get_wave({ wave_id: waveId })).result;
    const badge = wave ? (wave.cancelled ? 'cancelled' : wave.finalized ? 'finalized' : 'active') : 'not created';
    const details = wave ? `<div class="wave-metrics"><article><strong>${esc(wave.initial_pool)}</strong><span>initial token base units</span></article><article><strong>${esc(wave.remaining_pool)}</strong><span>pool remaining</span></article><article><strong>${wave.total_points}</strong><span>awarded points</span></article><article><strong>${wave.remaining_points}</strong><span>unclaimed points</span></article></div><p>Creator: <code>${esc(wave.creator)}</code></p>` : `<p>Wave ${esc(config.waveId)} has not been created onchain yet.</p>`;
    const create = !wave ? `<form id="create-pool" class="search-bar"><label class="sr-only" for="pool-amount">Amount in token base units</label><input id="pool-amount" name="amount" type="number" min="1" step="1" required placeholder="Token amount in base units"><button class="button button-bright">Fund pool →</button></form><p class="form-note">The connected wallet must hold the configured token. The transfer and pool creation are one Soroban transaction.</p>` : '';
    const canFinalize = wave && !wave.finalized && !wave.cancelled && Number(wave.total_points) > 0;
    const canCancel = wave && !wave.finalized && !wave.cancelled && Number(wave.total_points) === 0 && wave.creator === walletAddress;
    panel.innerHTML = `<div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · MAINTAINER OPERATIONS</p><h2>Fund and finalize the cycle</h2></div><span class="network-badge ${wave && !wave.cancelled ? 'healthy' : 'degraded'}">${badge}</span></div>${details}${create}<div class="review-actions">${canFinalize ? '<button id="finalize-pool" class="button button-bright">Finalize pool →</button>' : ''}${canCancel ? '<button id="cancel-pool" class="button button-quiet">Cancel and refund pool</button>' : ''}</div><p id="pool-operation-status" class="form-note">Connected wallet: ${esc(walletAddress)} · Testnet transactions require Freighter approval.</p>`;
    document.querySelector('#create-pool')?.addEventListener('submit', event => createPool(event, client, waveId));
    document.querySelector('#finalize-pool')?.addEventListener('click', () => operatePool('finalize', client, waveId));
    document.querySelector('#cancel-pool')?.addEventListener('click', () => operatePool('cancel', client, waveId));
  } catch (error) {
    panel.innerHTML = `<div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · MAINTAINER OPERATIONS</p><h2>Fund and finalize the cycle</h2></div><span class="network-badge degraded">unavailable</span></div><p>${esc(error.message || 'Could not read the configured pool.')}</p>`;
  }
}

async function createPool(event, client, waveId) {
  event.preventDefault();
  const form = event.currentTarget;
  const amount = form.elements.amount.value;
  if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) return;
  if (!confirm(`Create wave ${waveId} and transfer ${amount} token base units from ${walletAddress} into the Soroban pool? Review the transaction in Freighter before approving.`)) return;
  const status = document.querySelector('#pool-operation-status');
  status.textContent = 'Preparing pool funding transaction…';
  try {
    const tx = await client.create_wave({ creator: walletAddress, wave_id: waveId, amount: BigInt(amount) });
    const sent = await signAndSendWithFreighter(tx);
    status.textContent = `Pool created and funded on testnet: ${sent.hash || 'confirmed'}.`;
    await loadChainOperations();
  } catch (error) {
    status.textContent = `${error.message || 'Pool funding failed.'} No transfer occurs unless approved and confirmed in Freighter.`;
  }
}

async function operatePool(operation, client, waveId) {
  const method = operation === 'finalize' ? 'finalize_wave' : 'cancel_wave';
  const prompt = operation === 'finalize'
    ? `Finalize wave ${waveId}? This locks the points total and enables eligible contributors to claim.`
    : `Cancel wave ${waveId} and refund its remaining pool to ${walletAddress}? This is allowed only before any points are awarded.`;
  if (!confirm(`${prompt} Freighter will ask you to approve the transaction.`)) return;
  const status = document.querySelector('#pool-operation-status');
  const button = document.querySelector(operation === 'finalize' ? '#finalize-pool' : '#cancel-pool');
  if (button) button.disabled = true;
  status.textContent = `Preparing ${operation} transaction…`;
  try {
    const tx = await client[method]({ wave_id: waveId });
    const sent = await signAndSendWithFreighter(tx);
    status.textContent = `${operation === 'finalize' ? 'Pool finalized' : 'Pool cancelled and refunded'} on testnet: ${sent.hash || 'confirmed'}.`;
    await loadChainOperations();
  } catch (error) {
    status.textContent = `${error.message || `Could not ${operation} the pool.`} No state changes unless approved and confirmed in Freighter.`;
    if (button) button.disabled = false;
  }
}

async function loadApplications(handle) {
  const target = document.querySelector('#my-applications');
  if (!target) return;
  try {
    const data = await request(`/applications?applicant=${encodeURIComponent(handle)}`);
    target.innerHTML = data.applications.length ? `<div class="application-list">${data.applications.map(item => `<article class="application-card"><div><p class="eyebrow">${esc(item.status)}</p><h3>${esc(item.taskTitle)}</h3><p>${esc(item.repo)} · submitted ${new Date(item.createdAt).toLocaleDateString()}</p>${item.pointsAwarded ? `<strong class="earned-points">+${Number(item.pointsAwarded)} points earned</strong>` : ''}</div><div>${item.prUrl ? `<p><a href="${esc(item.prUrl)}" target="_blank" rel="noreferrer">View pull request ↗</a></p>` : ''}${item.status === 'Assigned' ? `<form class="pr-submit" data-pr-form="${esc(item.id)}"><label>Pull request URL</label><input name="prUrl" type="url" required placeholder="https://github.com/${esc(item.repo)}/pull/123"><button class="button button-dark">Submit PR link</button><small>Use “Closes #${Number(item.issueNumber || 0)}” in its description. The PR is checked against GitHub.</small></form>` : ''}</div></article>`).join('')}</div>` : empty(`No applications found for @${handle} yet.`);
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
  try { allTasks = (await request('/tasks?all=true')).tasks; }
  catch (err) { error = err.message; }
  let authorized = false;
  try {
    applications = (await requestAsMaintainer('/applications')).applications;
    authorized = true;
  } catch (err) { error = error ? `${error} ${err.message}` : err.message; }
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
  const applicationsMarkup = applications.length ? applications.slice().reverse().map(item => {
    const task = allTasks.find(candidate => candidate.id === item.taskId);
    const points = Number(task?.points || item.pointsAwarded || 0);
    return `<article class="application-card"><div><p class="eyebrow">${esc(item.status)} · ${new Date(item.createdAt).toLocaleDateString()}</p><h3>${esc(item.taskTitle)}</h3><p>by ${esc(item.applicant)}${item.walletAddress ? ` · ${esc(item.walletAddress)}` : ''}</p><p><a href="https://github.com/${esc(item.repo)}/issues/${Number(item.issueNumber || 0)}" target="_blank" rel="noreferrer">Open linked issue ↗</a></p></div><div><p>${esc(item.message)}</p>${item.prUrl ? `<p><a href="${esc(item.prUrl)}" target="_blank" rel="noreferrer">Review pull request ↗</a></p>` : ''}<div class="review-actions">${item.status === 'Pending' ? `<button class="button button-bright" data-review="Assigned" data-id="${esc(item.id)}">Accept & assign</button><button class="button button-quiet" data-review="Rejected" data-id="${esc(item.id)}">Reject</button>` : ''}${item.status === 'PR submitted' ? `<button class="button button-bright" data-review="Completed" data-id="${esc(item.id)}" data-contributor="${esc(item.walletAddress || '')}" data-points="${points}">Approve merge & award ${points} onchain points</button>` : ''}${item.status === 'Completed' && item.onchainAwardTx ? `<p class="form-note success">Soroban award tx <code>${esc(item.onchainAwardTx)}</code></p>` : ''}</div></div></article>`;
  }).join('') : empty('No applications have been submitted yet.');
  app.innerHTML = pageShell(
    'MAINTAINER WORKFLOW',
    'Review desk',
    'Help good contributions happen: review requests, coordinate assignments, confirm merged work, and record points on Soroban.',
    `${error ? appError(error) : ''}<div class="maintainer-preview-note">Maintainer actions require the API token for this local preview. Assignments recorded here do not update GitHub automatically, so assign the issue on GitHub as well.</div>${networkPanel}<section id="chain-operations" class="network-panel"><div class="network-panel-heading"><div><p class="eyebrow">SOROBAN · MAINTAINER OPERATIONS</p><h2>Fund and finalize the cycle</h2></div></div><p>Loading configured pool…</p></section><div class="dashboard-stats"><article><span>Open issues</span><strong>${allTasks.filter(task => task.status === 'Open').length}</strong></article><article><span>Pending applications</span><strong>${pending}</strong></article><article><span>In progress</span><strong>${assigned}</strong></article><article><span>Completed issues</span><strong>${completed}</strong></article></div><div class="section-heading dashboard-heading"><div><p class="eyebrow">PREVIEW ISSUE POOL</p><h2>Cycle issues</h2></div><a class="button button-bright" href="#/publish">Add issue +</a></div><div class="task-list">${allTasks.length ? allTasks.map(issueCard).join('') : empty('No issues yet. Add a public GitHub issue to the preview cycle.')}</div><div class="section-heading dashboard-heading"><div><p class="eyebrow">REVIEW QUEUE</p><h2>Contributor applications</h2></div></div>${authorized ? `<div class="application-list">${applicationsMarkup}</div>` : `<div class="empty-state">Enter the maintainer token to view or review private applications. Refresh this page after configuring the local API token.</div>`}`
  );
  document.querySelectorAll('[data-review]').forEach(button => button.addEventListener('click', reviewApplication));
  await loadChainOperations();
}

function renderAbout() {
  app.innerHTML = `<section class="how-section"><div class="how-title"><p class="eyebrow">WHY SOROWAVE EXISTS</p><h1>Open work.<br><em>Clear credit.</em></h1><p class="page-intro">SoroWave is a community workbench for open source contributors building on Stellar. It gives maintainers a place to bring real issues and contributors a transparent path from application to verified work.</p><a class="button button-bright" href="#/explore">Open the issue board →</a></div><div class="steps"><article><span>01</span><h3>Bring a real issue</h3><p>A maintainer verifies a public GitHub issue and adds its scope to a community cycle.</p></article><article><span>02</span><h3>Agree before building</h3><p>Contributors share their plan and wait for the maintainer to assign the work.</p></article><article><span>03</span><h3>Ship a linked change</h3><p>Build in the repository, open a pull request, and link it back to the original issue.</p></article><article><span>04</span><h3>Record the contribution</h3><p>After review and merge, maintainers can record verified points. A configured Soroban pool can support claims.</p></article></div></section><section class="maintainer-cta"><div><p class="eyebrow">CURRENT PREVIEW STATUS</p><h2>Useful work first.<br><em>Rewards later.</em></h2><p>This preview uses Stellar testnet. Points are not money and no pool is funded. SoroWave is an independent community project and is not affiliated with Drips Wave.</p></div><a class="button button-dark" href="#/explore">See the current workbench ↗</a></section>`;
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
  formNote.textContent = walletAddress ? `Applying with Stellar testnet address ${walletAddress.slice(0, 5)}…${walletAddress.slice(-5)}. Applying does not submit a transaction.` : 'Connect Freighter to apply with your Stellar address.';
  formNote.className = 'form-note';
  dialog.showModal();
}

async function publishTask(event) {
  event.preventDefault();
  const button = event.submitter;
  const note = document.querySelector('#publish-note');
  const issueUrl = document.querySelector('#issueUrl').value.trim();
  if (!issueUrl || issueUrl !== verifiedIssueUrl) {
    note.textContent = 'Verify the current GitHub issue URL before adding it.';
    note.className = 'form-note error';
    return;
  }
  button.disabled = true;
  note.textContent = 'Adding issue…';
  const input = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const data = await requestAsMaintainer('/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
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
  if (status === 'Completed' && !confirm(`Confirm the merged pull request has been reviewed? This will award ${button.dataset.points} Soroban points to ${button.dataset.contributor || 'the applicant'} on Stellar testnet. Freighter will ask you to approve the transaction.`)) return;
  button.disabled = true;
  let awardTx = '';
  try {
    if (status === 'Completed') {
      if (!button.dataset.contributor) throw new Error('This applicant has no Stellar wallet attached. Ask them to apply again with Freighter connected.');
      if (!walletAddress) await connectWallet();
      if (!walletAddress) throw new Error('Connect the pool administrator wallet in Freighter before awarding points.');
      const config = await request('/stellar/config');
      const { client, waveId } = await getPoolConnection(config);
      const points = Number(button.dataset.points);
      if (!Number.isSafeInteger(points) || points <= 0) throw new Error('This issue has no valid points value.');
      const tx = await client.award_application_points({
        wave_id: waveId,
        application_id: button.dataset.id,
        contributor: button.dataset.contributor,
        points: BigInt(points)
      });
      const sent = await signAndSendWithFreighter(tx);
      awardTx = sent.hash;
      if (!awardTx) throw new Error('The award transaction was submitted, but no confirmation hash was returned. Check the Stellar testnet explorer before retrying.');
    }
    await requestAsMaintainer(`/applications/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, ...(awardTx ? { onchainAwardTx: awardTx } : {}) }) });
    await renderMaintainer();
  } catch (error) {
    alert(awardTx ? `Soroban awarded the points in transaction ${awardTx}, but the application record did not sync: ${error.message}. You can retry safely; the contract prevents duplicate awards for this application.` : error.message);
    if (!awardTx) button.disabled = false;
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
    if (document.querySelector('#onchain-rewards')) await loadOnchainRewards();
    if (document.querySelector('#chain-operations')) await loadChainOperations();
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
  if (!walletAddress) {
    formNote.textContent = 'Connect Freighter on Stellar testnet before applying so any later onchain points go to your wallet.';
    formNote.className = 'form-note error';
    return;
  }
  const applicant = document.querySelector('#applicant').value.trim().replace(/^@/, '');
  const message = document.querySelector('#message').value.trim();
  const submitButton = document.querySelector('#submit-application');
  submitButton.disabled = true;
  formNote.textContent = 'Submitting your application…';
  formNote.className = 'form-note';
  try {
    await request('/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId: selectedTask.id, applicant, message, walletAddress: walletAddress || undefined }) });
    localStorage.setItem('sorowave.github', applicant);
    formNote.textContent = 'Application saved. Wait for assignment before starting work; track the decision on Applications.';
    formNote.className = 'form-note success';
    event.target.reset();
    setTimeout(() => { dialog.close(); location.hash = '/applications'; }, 900);
  } catch (error) { formNote.textContent = error.message; formNote.className = 'form-note error'; submitButton.disabled = false; }
});

window.addEventListener('hashchange', render);
document.querySelector('#connect-wallet').textContent = walletAddress ? `${walletAddress.slice(0, 5)}…${walletAddress.slice(-5)}` : 'Connect Freighter';
render();
