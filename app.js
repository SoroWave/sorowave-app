import { isConnected, requestAccess, getNetworkDetails } from '@stellar/freighter-api';

const API = import.meta.env.VITE_API_URL || window.SOROWAVE_API || 'http://localhost:4173';
const TESTNET = 'Test SDF Network ; September 2015';
const starterTasks = [
  {id:'task-001',title:'Add a Soroban contract test fixture',repo:'sorowave/contracts',category:'contracts',level:'Good first issue',reward:100,status:'Open'},
  {id:'task-002',title:'Build a Stellar address validation helper',repo:'sorowave/api',category:'developer-tools',level:'Small feature',reward:150,status:'Open'},
  {id:'task-003',title:'Document a testnet payment walkthrough',repo:'sorowave/app',category:'payments',level:'Good first issue',reward:100,status:'Open'},
  {id:'task-004',title:'Show application status on task cards',repo:'sorowave/app',category:'developer-tools',level:'Small feature',reward:150,status:'Open'}
];
let tasks = starterTasks, activeFilter = 'all', selectedTask = null, walletAddress = '';
const list = document.querySelector('#task-list'), dialog = document.querySelector('#apply-dialog'), note = document.querySelector('#form-note');
function render() {
  const visible = tasks.filter(task => activeFilter === 'all' || task.category === activeFilter);
  document.querySelector('#count-all').textContent = tasks.length;
  list.innerHTML = visible.length ? visible.map(task => `<article class="task-card"><div><a class="task-title" href="#" data-task="${escapeHtml(task.id)}">${escapeHtml(task.title)}</a><div class="task-meta"><span class="repo-name">${escapeHtml(task.repo)}</span><span class="tag">${escapeHtml(task.category.replace('-', ' '))}</span></div></div><span class="task-level">${escapeHtml(task.level || 'Community task')}</span><span class="task-reward">${Number(task.reward || 100)} <small>demo points</small></span><button class="apply-button" data-apply="${escapeHtml(task.id)}">Apply →</button></article>`).join('') : '<p class="empty-state">No tasks in this category yet. Check back soon.</p>';
  list.querySelectorAll('[data-apply]').forEach(button => button.addEventListener('click', () => openApply(button.dataset.apply)));
  list.querySelectorAll('[data-task]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); openApply(link.dataset.task); }));
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function openApply(id) { selectedTask = tasks.find(task => task.id === id); if (!selectedTask) return; document.querySelector('#dialog-task').textContent = selectedTask.title; note.textContent = walletAddress ? `Application will include ${walletAddress.slice(0,5)}…${walletAddress.slice(-5)}.` : 'Connect Freighter to attach a Stellar address. Applying does not require a transaction.'; note.className = 'form-note'; dialog.showModal(); }
async function connectWallet() {
  const status = document.querySelector('#wallet-status');
  try {
    const installed = await isConnected();
    if (!installed.isConnected) throw new Error('Freighter was not detected. Install the Freighter wallet extension and try again.');
    const access = await requestAccess();
    if (access.error) throw new Error(access.error.message || 'Wallet access was not granted.');
    const address = access.address;
    const details = await getNetworkDetails();
    if (details.error) throw new Error(details.error.message || 'Could not read the wallet network.');
    if (details.networkPassphrase !== TESTNET) throw new Error('Switch Freighter to Stellar Testnet before connecting. No transaction was signed.');
    walletAddress = address;
    document.querySelector('#connect-wallet').textContent = `${address.slice(0,5)}…${address.slice(-5)}`;
    status.textContent = 'Connected on Stellar testnet. Applications can include this address.';
    await refreshBalance(address);
  } catch (error) { status.textContent = error.message || 'Wallet connection failed.'; }
}
async function refreshBalance(address) {
  const balance = document.querySelector('#balance-status'), fund = document.querySelector('#fund-account');
  try {
    const response = await fetch(`${API}/stellar/accounts/${encodeURIComponent(address)}`);
    if (!response.ok) throw new Error('Could not load account details.');
    const data = await response.json();
    if (!data.funded) { balance.textContent = 'Account is not funded on testnet yet.'; fund.hidden = false; return; }
    const xlm = data.balances.find(item => item.asset === 'XLM');
    balance.textContent = `Test XLM balance: ${xlm?.balance || '0'}`; fund.hidden = false;
  } catch { balance.textContent = 'Account lookup unavailable. Start the API to check testnet balance.'; }
}
document.querySelector('#connect-wallet').addEventListener('click', connectWallet);
document.querySelector('#fund-account').addEventListener('click', async () => {
  if (!walletAddress) return;
  const balance = document.querySelector('#balance-status');
  balance.textContent = 'Requesting testnet XLM from Friendbot…';
  try { const response = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(walletAddress)}`); if (!response.ok) throw new Error(); balance.textContent = 'Friendbot request submitted. Refreshing balance…'; setTimeout(() => refreshBalance(walletAddress), 2500); }
  catch { balance.textContent = 'Friendbot request failed. Try again later.'; }
});
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach(item => item.classList.remove('active')); button.classList.add('active'); activeFilter = button.dataset.filter; render(); }));
document.querySelector('#apply-dialog form').addEventListener('submit', async event => {
  if (event.submitter?.value !== 'submit') return;
  event.preventDefault();
  const applicant = document.querySelector('#applicant').value.trim().replace(/^@/, ''), message = document.querySelector('#message').value.trim();
  try {
    const response = await fetch(`${API}/applications`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({taskId:selectedTask.id,applicant,message,walletAddress:walletAddress || undefined})});
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'The API could not accept this application.');
    note.textContent = 'Application saved. The project maintainer can review it in the API.'; note.className = 'form-note success'; event.target.reset();
  } catch (error) { note.textContent = error.message || 'The API is offline. Start sorowave-api to save applications.'; note.className = 'form-note error'; }
});
async function loadTasks() { try { const response = await fetch(`${API}/tasks`); if (response.ok) { const data = await response.json(); if (Array.isArray(data.tasks) && data.tasks.length) tasks = data.tasks; } } catch { /* Sample tasks keep the preview usable without the API. */ } render(); }
loadTasks();
