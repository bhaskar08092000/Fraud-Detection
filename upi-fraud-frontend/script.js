/*
  SENTINEL — CC6-AI02 frontend prototype
  This file intentionally uses plain JavaScript so beginners can follow it.
  Important: these are transparent demo rules, not a trained AI model or a live payment connection.
*/

// ---------- 1. Demo data ----------
const scenarioData = {
  refund: {
    amount: 5000, paymentType: 'collect', payee: 'refund-agent@upi', average: 650,
    message: 'Your refund of ₹5,000 is ready. Approve this collect request to receive the money.',
    expectedDirection: 'receive', actualDirection: 'debit', expectedPayee: 'myshop@upi', velocity: 1,
    newPayee: true, refundClaim: true, remoteAccess: false, newDevice: false, muleSignal: false
  },
  qr: {
    amount: 1800, paymentType: 'qr', payee: 'unknownseller@upi', average: 500,
    message: 'Scan this shop QR to complete your purchase.',
    expectedDirection: 'send', actualDirection: 'debit', expectedPayee: 'coffeehouse@upi', velocity: 1,
    newPayee: true, refundClaim: false, remoteAccess: false, newDevice: false, muleSignal: false
  },
  remote: {
    amount: 24000, paymentType: 'direct', payee: 'support-agent@upi', average: 900,
    message: 'Customer support asked me to install a screen-sharing app to resolve a refund issue.',
    expectedDirection: 'send', actualDirection: 'debit', expectedPayee: 'support-agent@upi', velocity: 2,
    newPayee: true, refundClaim: false, remoteAccess: true, newDevice: true, muleSignal: false
  },
  mule: {
    amount: 85000, paymentType: 'direct', payee: 'relay-account@upi', average: 4000,
    message: 'Several incoming transfers are followed by rapid transfers to another account.',
    expectedDirection: 'send', actualDirection: 'debit', expectedPayee: 'relay-account@upi', velocity: 7,
    newPayee: true, refundClaim: false, remoteAccess: false, newDevice: true, muleSignal: true
  },
  legitimate: {
    amount: 450, paymentType: 'direct', payee: 'known-cafe@upi', average: 600,
    message: 'Payment for coffee and snacks at my usual cafe.',
    expectedDirection: 'send', actualDirection: 'debit', expectedPayee: 'known-cafe@upi', velocity: 1,
    newPayee: false, refundClaim: false, remoteAccess: false, newDevice: false, muleSignal: false
  }
};

// Every item here is fictional and exists only to populate the interface.
let alerts = [
  { id: 'TXN-20841', payee: 'refund-agent@upi', category: 'FAKE_REFUND_COLLECT', label: 'Fake refund / collect', amount: 5000, score: 94, risk: 'HIGH', status: 'New', note: 'Refund claim conflicts with outgoing payment', time: 'Today, 10:42 AM' },
  { id: 'TXN-20839', payee: 'unknownseller@upi', category: 'QR_MISMATCH', label: 'QR recipient mismatch', amount: 1800, score: 91, risk: 'HIGH', status: 'Under review', note: 'QR recipient differs from intended merchant', time: 'Today, 10:36 AM' },
  { id: 'TXN-20832', payee: 'support-agent@upi', category: 'REMOTE_ACCESS', label: 'Remote-access risk', amount: 24000, score: 83, risk: 'HIGH', status: 'New', note: 'Remote-access signal and new payee', time: 'Today, 10:17 AM' },
  { id: 'TXN-20819', payee: 'relay-account@upi', category: 'MULE_PATTERN', label: 'Mule-account pattern', amount: 85000, score: 88, risk: 'HIGH', status: 'Under review', note: 'Rapid transfer sequence and linked recipient', time: 'Today, 09:55 AM' },
  { id: 'TXN-20798', payee: 'prizeclaim@upi', category: 'FAKE_REFUND_COLLECT', label: 'Fake refund / collect', amount: 3200, score: 78, risk: 'HIGH', status: 'New', note: 'Incoming refund claim linked to debit request', time: 'Today, 09:20 AM' },
  { id: 'TXN-20765', payee: 'new-store@upi', category: 'UNUSUAL_ACTIVITY', label: 'Unusual activity', amount: 12500, score: 56, risk: 'MEDIUM', status: 'Under review', note: 'Amount is much higher than normal', time: 'Yesterday, 06:48 PM' },
  { id: 'TXN-20744', payee: 'delivery-fee@upi', category: 'UNUSUAL_ACTIVITY', label: 'Unusual activity', amount: 700, score: 39, risk: 'MEDIUM', status: 'New', note: 'New recipient and unusual request context', time: 'Yesterday, 05:16 PM' },
  { id: 'TXN-20701', payee: 'known-cafe@upi', category: 'UNUSUAL_ACTIVITY', label: 'Routine payment check', amount: 450, score: 12, risk: 'LOW', status: 'Marked legitimate', note: 'Known payee and familiar amount', time: 'Yesterday, 01:22 PM' }
];

let sessionAnalysed = 0;
let sessionFlagged = 0;
let currentResult = null;
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// ---------- 2. Page navigation ----------
function showPage(pageName) {
  $$('.page').forEach((page) => page.classList.toggle('active', page.dataset.pagePanel === pageName));
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === pageName));
  const pageNames = { overview: 'Overview', checker: 'Payment checker', alerts: 'Fraud alerts', model: 'Model insights' };
  $('#breadcrumb-current').textContent = pageNames[pageName] || 'Overview';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (pageName === 'alerts') renderAlertsTable();
}

$$('.nav-item').forEach((item) => item.addEventListener('click', () => showPage(item.dataset.page)));
$$('[data-go-page]').forEach((button) => button.addEventListener('click', () => showPage(button.dataset.goPage)));

// ---------- 3. Scenario presets ----------
function fillScenario(name) {
  const data = scenarioData[name];
  if (!data) return;
  $('#scenario-select').value = name;
  $('#amount').value = data.amount;
  $('#payment-type').value = data.paymentType;
  $('#payee').value = data.payee;
  $('#average-amount').value = data.average;
  $('#message-context').value = data.message;
  $('#intended-direction').value = data.expectedDirection;
  $('#actual-direction').value = data.actualDirection;
  $('#expected-payee').value = data.expectedPayee;
  $('#velocity').value = data.velocity;
  $('#new-payee').checked = data.newPayee;
  $('#refund-claim').checked = data.refundClaim;
  $('#remote-access').checked = data.remoteAccess;
  $('#new-device').checked = data.newDevice;
  $('#mule-signal').checked = data.muleSignal;
  $('#empty-result').classList.remove('hidden');
  $('#result-content').classList.add('hidden');
  $('#result-subtitle').textContent = 'Ready to check a new transaction.';
}

$$('[data-scenario]').forEach((button) => button.addEventListener('click', () => {
  fillScenario(button.dataset.scenario);
  showPage('checker');
  showToast('Sample scenario loaded. Run the analysis to see the result.');
}));
$('#load-scenario').addEventListener('click', () => {
  const selected = $('#scenario-select').value;
  if (selected === 'custom') {
    showToast('Custom mode selected. Enter your fictional payment details.');
    return;
  }
  fillScenario(selected);
  showToast('Sample scenario loaded. Run the analysis to see the result.');
});

// ---------- 4. Feature extraction and readable demo rules ----------
function readTransactionForm() {
  return {
    amount: Number($('#amount').value),
    paymentType: $('#payment-type').value,
    payee: $('#payee').value.trim(),
    average: Math.max(0, Number($('#average-amount').value) || 0),
    message: $('#message-context').value.trim(),
    expectedDirection: $('#intended-direction').value,
    actualDirection: $('#actual-direction').value,
    expectedPayee: $('#expected-payee').value.trim(),
    velocity: Math.max(0, Number($('#velocity').value) || 0),
    newPayee: $('#new-payee').checked,
    refundClaim: $('#refund-claim').checked,
    remoteAccess: $('#remote-access').checked,
    newDevice: $('#new-device').checked,
    muleSignal: $('#mule-signal').checked
  };
}

function scoreTransaction(tx) {
  // These weights are intentionally visible so beginners can understand the demo.
  // This is NOT a trained machine-learning model. Tune only after testing labelled data.
  let score = 0;
  const reasons = [];
  let category = 'UNUSUAL_ACTIVITY';
  const samePayee = tx.payee.toLowerCase() === tx.expectedPayee.toLowerCase();
  const qrMismatch = tx.paymentType === 'qr' && tx.expectedPayee && tx.payee && !samePayee;
  const messageLower = tx.message.toLowerCase();
  const mentionsRefund = tx.refundClaim || /\b(refund|cashback|reversal|receive your money|return your money)\b/i.test(messageLower);
  const mentionsRemoteAccess = tx.remoteAccess || /(remote.?access|screen.?sharing|screen share|anydesk|teamviewer|customer support app)/i.test(messageLower);
  const refundDebitConflict = mentionsRefund && tx.expectedDirection === 'receive' && tx.actualDirection === 'debit';
  const amountRatio = tx.average > 0 ? tx.amount / tx.average : 0;

  if (refundDebitConflict && tx.paymentType === 'collect') {
    score += 52;
    category = 'FAKE_REFUND_COLLECT';
    reasons.push('The context says “refund”, but approving this request would debit the account.');
  } else if (refundDebitConflict) {
    score += 35;
    category = 'FAKE_REFUND_COLLECT';
    reasons.push('The user expects to receive money, but the transaction would send money out.');
  }

  if (qrMismatch) {
    score += 48;
    category = 'QR_MISMATCH';
    reasons.push('The QR payment recipient does not match the intended merchant.');
  }

  if (mentionsRemoteAccess) {
    score += 30;
    if (category === 'UNUSUAL_ACTIVITY') category = 'REMOTE_ACCESS';
    reasons.push('A remote-access or screen-sharing risk signal appears in the message or simulated device context.');
  }

  if (tx.muleSignal) {
    score += 38;
    category = 'MULE_PATTERN';
    reasons.push('The recipient is associated with a simulated rapid pass-through transfer pattern.');
  }

  if (tx.newPayee) {
    score += 12;
    reasons.push('This is the first payment to the recipient. A new payee is a warning signal, not proof of fraud.');
  }

  if (tx.newDevice) {
    score += 8;
    reasons.push('The device is unfamiliar in this simulated transaction.');
  }

  if (amountRatio >= 4) {
    score += 12;
    reasons.push(`The amount is ${amountRatio.toFixed(1)}× the user's typical payment.`);
  }

  if (tx.velocity >= 4) {
    score += 12;
    reasons.push(`${tx.velocity} transactions occurred in the last 10 minutes, which may indicate unusual activity.`);
  }

  // Compare QR recipient case-insensitively. If IDs match, no mismatch alert is added.
  score = Math.min(100, score);
  const risk = score >= 70 ? 'HIGH' : (score >= 35 ? 'MEDIUM' : 'LOW');
  if (reasons.length === 0) {
    category = 'ROUTINE_PAYMENT';
    reasons.push('No major warning signals were found in the fields provided. This does not guarantee the payment is safe.');
  }

  let label = category === 'ROUTINE_PAYMENT' ? 'Routine payment' : 'Unusual activity';
  if (category === 'FAKE_REFUND_COLLECT') label = 'Fake refund / collect';
  if (category === 'QR_MISMATCH') label = 'QR recipient mismatch';
  if (category === 'REMOTE_ACCESS') label = 'Remote-access risk';
  if (category === 'MULE_PATTERN') label = 'Mule-account pattern';

  let title = 'Payment looks low risk';
  let actionTitle = 'Check the details before paying';
  let actionCopy = 'Even a low demo score cannot guarantee that a payment is safe.';
  let actionTone = 'safe';
  if (risk === 'MEDIUM') {
    title = 'Some warning signals found';
    actionTitle = 'Pause and review this payment';
    actionCopy = 'Confirm that the payee, amount and reason for payment are correct before proceeding.';
    actionTone = 'warning';
  }
  if (risk === 'HIGH') {
    title = 'High-risk payment detected';
    actionTitle = tx.expectedDirection === 'receive' && tx.actualDirection === 'debit' ? 'You are about to PAY, not receive money.' : 'Do not approve until you verify the details.';
    actionCopy = `This simulated transaction is ₹${tx.amount.toLocaleString('en-IN')}. Review the signals below and verify the recipient independently.`;
    actionTone = 'danger';
  }

  return { score, risk, reasons, category, label, title, actionTitle, actionCopy, actionTone, amountRatio, qrMismatch, refundDebitConflict };
}

// ---------- 5. Show the result on the page ----------
function renderResult(tx, result) {
  currentResult = { tx, result };
  $('#empty-result').classList.add('hidden');
  $('#result-content').classList.remove('hidden');
  $('#result-subtitle').textContent = `Completed just now · ${tx.paymentType === 'collect' ? 'Collect request' : tx.paymentType === 'qr' ? 'QR payment' : 'Direct transfer'}`;
  $('#risk-gauge').style.setProperty('--score', result.score);
  const gaugeColor = result.risk === 'HIGH' ? '#d95e61' : result.risk === 'MEDIUM' ? '#e6a34b' : '#8ebc51';
  $('#risk-gauge').style.setProperty('--gauge-color', gaugeColor);
  $('#risk-score').textContent = result.score;
  $('#risk-badge').textContent = `${result.risk} RISK`;
  $('#risk-badge').className = `risk-level-badge risk-${result.risk.toLowerCase()}`;
  $('#risk-title').textContent = result.title;
  $('#risk-summary-text').textContent = `${result.label} · ${result.reasons.length} explanation signal${result.reasons.length === 1 ? '' : 's'}.`;
  $('#decision-callout').className = `decision-callout ${result.actionTone === 'danger' ? 'is-danger' : result.actionTone === 'safe' ? 'is-safe' : ''}`;
  $('#decision-title').textContent = result.actionTitle;
  $('#decision-copy').textContent = result.actionCopy;
  $('#reason-count').textContent = `${result.reasons.length} signal${result.reasons.length === 1 ? '' : 's'}`;
  const reasonList = $('#reason-list');
  reasonList.innerHTML = '';
  result.reasons.forEach((reason) => {
    const item = document.createElement('li');
    item.textContent = reason;
    reasonList.appendChild(item);
  });
  $('#result-amount').textContent = formatMoney(tx.amount);
  $('#result-direction').textContent = tx.actualDirection === 'debit' ? 'Debit · money out' : 'Credit · money in';
  $('#result-category').textContent = result.label;
  $('#continue-button').classList.toggle('hidden', result.risk === 'HIGH');

  // Save the check to the in-memory demo alert queue. Nothing is sent to a server.
  sessionAnalysed += 1;
  if (result.risk !== 'LOW') sessionFlagged += 1;
  const record = {
    id: `DEMO-${String(Date.now()).slice(-6)}`,
    payee: tx.payee || 'unknown-payee',
    category: result.category,
    label: result.label,
    amount: tx.amount,
    score: result.score,
    risk: result.risk,
    status: result.risk === 'LOW' ? 'Under review' : 'New',
    note: result.reasons[0],
    time: 'Just now'
  };
  alerts.unshift(record);
  renderOverviewAlerts();
  renderAlertsTable();
  updateCounters();
}

$('#payment-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const tx = readTransactionForm();
  if (!Number.isFinite(tx.amount) || tx.amount <= 0) {
    showToast('Enter an amount greater than zero.');
    $('#amount').focus();
    return;
  }
  if (!tx.payee) {
    showToast('Enter a fictional recipient or UPI ID.');
    $('#payee').focus();
    return;
  }
  const result = scoreTransaction(tx);
  renderResult(tx, result);
  showToast(`${result.risk} risk result generated for the demo.`);
});

$('#reset-form').addEventListener('click', () => {
  window.setTimeout(() => {
    $('#scenario-select').value = 'custom';
    $('#empty-result').classList.remove('hidden');
    $('#result-content').classList.add('hidden');
    $('#result-subtitle').textContent = 'Your result will appear here.';
    currentResult = null;
  }, 0);
});

$('#review-button').addEventListener('click', () => {
  $('#reason-list').scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('Review the listed signals and verify the recipient independently.');
});
$('#cancel-button').addEventListener('click', () => {
  if (!currentResult) return;
  showToast('Simulation cancelled. No payment was made.');
  $('#empty-result').classList.remove('hidden');
  $('#result-content').classList.add('hidden');
  $('#result-subtitle').textContent = 'Simulation cancelled · no money moved.';
});
$('#continue-button').addEventListener('click', () => {
  showToast('Demo flow continued. No real payment was initiated.');
});

// ---------- 6. Alert table, search and filters ----------
function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function riskClass(risk) { return `risk-${String(risk).toLowerCase()}`; }
function statusClass(status) {
  if (status === 'Marked legitimate') return 'status-legit';
  if (status === 'Under review') return 'status-review';
  return 'status-new';
}
function safeText(value) {
  // Use textContent for user-entered data rather than inserting it as HTML.
  return String(value ?? '');
}
function buildAlertRow(alert, full = false) {
  const row = document.createElement('tr');
  const cells = full
    ? [alert.id, alert.payee, alert.label, formatMoney(alert.amount), alert.risk, alert.status]
    : [alert.id, alert.label, formatMoney(alert.amount), alert.score, alert.status];
  cells.forEach((value, index) => {
    const cell = document.createElement('td');
    if (full && index === 0) {
      cell.className = 'id-cell'; cell.textContent = safeText(value);
    } else if (full && index === 1) {
      cell.className = 'payee-cell'; cell.textContent = safeText(value);
    } else if ((full && index === 2) || (!full && index === 1)) {
      cell.innerHTML = '<span class="table-category"><i class="table-cat-dot"></i></span>';
      cell.querySelector('.table-category').append(document.createTextNode(safeText(value)));
    } else if ((full && index === 4) || (!full && index === 3)) {
      const score = document.createElement('span');
      if (full) {
        score.className = `risk-chip ${riskClass(value)}`;
        score.textContent = safeText(value);
      } else {
        score.className = 'id-cell';
        score.textContent = `${value}/100`;
      }
      cell.appendChild(score);
    } else if ((full && index === 5) || (!full && index === 4)) {
      const status = document.createElement('span');
      status.className = `status-chip ${statusClass(value)}`;
      status.textContent = safeText(value);
      cell.appendChild(status);
    } else {
      cell.textContent = safeText(value);
    }
    row.appendChild(cell);
  });

  if (full) {
    const actionCell = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'row-action';
    button.type = 'button';
    button.textContent = '•••';
    button.title = 'Review this alert';
    button.addEventListener('click', () => openAlertReview(alert));
    actionCell.appendChild(button);
    row.appendChild(actionCell);
  } else {
    const actionCell = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'row-action';
    button.type = 'button';
    button.textContent = '↗';
    button.title = 'Open alert details';
    button.addEventListener('click', () => openAlertReview(alert));
    actionCell.appendChild(button);
    row.appendChild(actionCell);
  }
  return row;
}
function renderOverviewAlerts() {
  const body = $('#overview-alert-rows');
  body.innerHTML = '';
  alerts.slice(0, 5).forEach((alert) => body.appendChild(buildAlertRow(alert, false)));
}
function renderAlertsTable() {
  const query = $('#alert-search').value.trim().toLowerCase();
  const riskFilter = $('#risk-filter').value;
  const categoryFilter = $('#category-filter').value;
  const matched = alerts.filter((alert) => {
    const matchesSearch = `${alert.id} ${alert.payee} ${alert.label} ${alert.note}`.toLowerCase().includes(query);
    const matchesRisk = riskFilter === 'all' || alert.risk === riskFilter;
    const matchesCategory = categoryFilter === 'all' || alert.category === categoryFilter;
    return matchesSearch && matchesRisk && matchesCategory;
  });
  const body = $('#alerts-table-body');
  body.innerHTML = '';
  matched.forEach((alert) => body.appendChild(buildAlertRow(alert, true)));
  $('#no-alerts').classList.toggle('hidden', matched.length !== 0);
  $('#table-result-count').textContent = `Showing ${matched.length} of ${alerts.length} records`;
}
$('#alert-search').addEventListener('input', renderAlertsTable);
$('#risk-filter').addEventListener('change', renderAlertsTable);
$('#category-filter').addEventListener('change', renderAlertsTable);

function openAlertReview(alert) {
  const details = `${alert.id}\nPayee: ${alert.payee}\nScenario: ${alert.label}\nAmount: ${formatMoney(alert.amount)}\nRisk: ${alert.risk} (${alert.score}/100)\nStatus: ${alert.status}\nReason: ${alert.note}`;
  const choice = window.prompt(`${details}\n\nType L to mark legitimate, R to mark under review, or leave blank to close.`);
  if (!choice) return;
  const selected = choice.trim().toLowerCase();
  if (selected === 'l') alert.status = 'Marked legitimate';
  else if (selected === 'r') alert.status = 'Under review';
  else { showToast('No status changes made. Use L or R to update this demo alert.'); return; }
  renderAlertsTable();
  renderOverviewAlerts();
  updateCounters();
  showToast(`Alert ${alert.id} updated in this session.`);
}

$('#export-csv').addEventListener('click', () => {
  const headers = ['id', 'payee', 'category', 'label', 'amount_inr', 'score', 'risk', 'status', 'note', 'time'];
  const escapeCSV = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [headers.join(','), ...alerts.map((alert) => headers.map((header) => escapeCSV(alert[header])).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sentinel-demo-alerts.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Demo alert queue exported as CSV.');
});

// ---------- 7. Counters and small interface helpers ----------
function updateCounters() {
  const flagged = alerts.filter((a) => a.risk !== 'LOW').length;
  const high = alerts.filter((a) => a.risk === 'HIGH').length;
  const review = alerts.filter((a) => a.status === 'Under review').length;
  const legitimate = alerts.filter((a) => a.status === 'Marked legitimate').length;
  $('#nav-alert-count').textContent = String(alerts.length).padStart(2, '0');
  $('#alerts-total').textContent = alerts.length;
  $('#alerts-high').textContent = high;
  $('#alerts-review').textContent = review;
  $('#alerts-legitimate').textContent = legitimate;
  $('#metric-total').textContent = (1284 + sessionAnalysed).toLocaleString('en-IN');
  // The overview uses a separate illustrative baseline (1,284 transactions / 96 flagged).
  // This keeps the dashboard sample metrics consistent with its 'sample data' labels.
  const overviewFlagged = 96 + sessionFlagged;
  $('#metric-flagged').textContent = overviewFlagged;
  $('#metric-flagged-rate').textContent = `${((overviewFlagged / Math.max(1, 1284 + sessionAnalysed)) * 100).toFixed(1)}%`;
  // This value is only a live UI count, not a validated estimate of actual money saved.
  $('#metric-loss').textContent = '₹8.42L';
}
function showToast(message) {
  $('#toast-message').textContent = message;
  $('#toast').classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => $('#toast').classList.remove('show'), 3000);
}

$('#dismiss-banner').addEventListener('click', () => $('#demo-banner').classList.add('hidden'));
$('#help-button').addEventListener('click', () => $('#info-modal').classList.remove('hidden'));
$('#close-modal').addEventListener('click', () => $('#info-modal').classList.add('hidden'));
$('#modal-done').addEventListener('click', () => $('#info-modal').classList.add('hidden'));
$('#info-modal').addEventListener('click', (event) => {
  if (event.target === $('#info-modal')) $('#info-modal').classList.add('hidden');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') $('#info-modal').classList.add('hidden');
});

// ---------- 8. Initial render ----------
renderOverviewAlerts();
renderAlertsTable();
updateCounters();
