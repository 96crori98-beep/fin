let data = {
    transactions: JSON.parse(localStorage.getItem('f_trans')) || [],
    emis: JSON.parse(localStorage.getItem('f_emis')) || [],
    subs: JSON.parse(localStorage.getItem('f_subs')) || [],
    currency: localStorage.getItem('f_cur') || '£'
};

function fmt(num) { return data.currency + Math.abs(parseFloat(num)).toLocaleString(undefined, {minimumFractionDigits: 2}); }

function switchTab(id, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
}

function setTheme(t) { document.body.className = t === 'default' ? '' : 'theme-' + t; localStorage.setItem('f_theme', t); }
setTheme(localStorage.getItem('f_theme') || 'default');
document.getElementById('currency-select').value = data.currency;

function handleNewTransaction(descOverride, amtOverride) {
    const d = descOverride || document.getElementById('desc').value;
    const a = amtOverride || document.getElementById('amt').value;
    if(!d || !a) return;
    data.transactions.push({ id: Date.now(), desc: d, amt: parseFloat(a), date: new Date().toISOString() });
    if(!descOverride) { document.getElementById('desc').value = ''; document.getElementById('amt').value = ''; }
    refresh();
}

function handleNewEMI() {
    const n = document.getElementById('e-name').value, t = document.getElementById('e-total').value, 
          p = document.getElementById('e-paid').value || 0, m = document.getElementById('e-monthly').value,
          id = document.getElementById('edit-id').value;
    if(!n || !t || !m) return;
    if(id) data.emis = data.emis.filter(x => x.id != id);
    data.emis.push({ id: id || Date.now(), name: n, total: parseFloat(t), paid: parseFloat(p), monthly: parseFloat(m) });
    resetEMIForm(); refresh();
}

function handleNewSub() {
    const n = document.getElementById('s-name').value, a = document.getElementById('s-amt').value, d = document.getElementById('s-day').value;
    if(!n || !a) return;
    data.subs.push({ id: Date.now(), name: n, amt: parseFloat(a), day: d });
    ['s-name','s-amt','s-day'].forEach(i => document.getElementById(i).value = '');
    refresh();
}

function refresh() {
    localStorage.setItem('f_trans', JSON.stringify(data.transactions));
    localStorage.setItem('f_emis', JSON.stringify(data.emis));
    localStorage.setItem('f_subs', JSON.stringify(data.subs));

    const curMonth = new Date().getMonth(), curYear = new Date().getFullYear();

    // Total Expense
    let totalExp = 0;
    data.transactions.forEach(t => { if(t.amt < 0) totalExp += t.amt; });
    document.getElementById('total-expense').innerText = fmt(totalExp);

    // EMI Logic
    let eHist = 0, eMonth = 0, eRemaining = 0;
    data.emis.forEach(e => {
        eHist += e.paid;
        eRemaining += (e.total - e.paid); // Add to remaining tally
    });
    
    data.transactions.forEach(t => {
        let d = new Date(t.date);
        if(t.desc.startsWith("Loan:") && d.getMonth() === curMonth && d.getFullYear() === curYear) eMonth += Math.abs(t.amt);
    });
    
    document.getElementById('emi-history-total').innerText = fmt(eHist);
    document.getElementById('emi-month-total').innerText = fmt(eMonth);
    document.getElementById('emi-remaining-total').innerText = fmt(eRemaining);

    const eDisp = document.getElementById('emi-display'); eDisp.innerHTML = '';
    data.emis.forEach(e => {
        const progress = Math.min((e.paid / e.total) * 100, 100).toFixed(1);
        eDisp.innerHTML += `<div class="card">
            <button class="edit-link" onclick="editEMI(${e.id})">EDIT</button>
            <strong>${e.name} (${progress}%)</strong>
            <div class="progress-container"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div style="display:flex; justify-content:space-between; align-items:center">
                <small>Remaining: ${fmt(e.total - e.paid)}</small>
                <button class="paid-btn" onclick="payEMI(${e.id})">PAID</button>
            </div></div>`;
    });

    // Sub Logic
    let sHist = 0, sMonth = 0;
    data.transactions.forEach(t => {
        let d = new Date(t.date);
        if(t.desc.startsWith("Sub:")) {
            sHist += Math.abs(t.amt);
            if(d.getMonth() === curMonth && d.getFullYear() === curYear) sMonth += Math.abs(t.amt);
        }
    });
    document.getElementById('sub-history-total').innerText = fmt(sHist);
    document.getElementById('sub-month-total').innerText = fmt(sMonth);

    const sDisp = document.getElementById('sub-display'); sDisp.innerHTML = '';
    data.subs.forEach(s => {
        sDisp.innerHTML += `<div class="card"><div style="display:flex; justify-content:space-between">
            <strong>${s.name} <small>(Day ${s.day})</small></strong><span>${fmt(s.amt)}</span>
            </div><div style="margin-top:15px; display:flex; justify-content:flex-end; gap:10px;">
            <button class="paid-btn" onclick="paySub(${s.id})">PAID</button>
            <button class="del-btn" onclick="removeItem('subs', ${s.id})">✕</button></div></div>`;
    });

    // Transactions
    const tList = document.getElementById('trans-list');
    tList.innerHTML = '<h3>Recent Activity</h3>';
    data.transactions.slice().reverse().forEach(t => {
        tList.innerHTML += `<div class="card" style="padding:10px; display:flex; justify-content:space-between; font-size:0.8rem">
            <span>${t.desc}</span>
            <div style="display:flex; gap:15px; align-items:center">
                <b style="color:${t.amt < 0 ? '#e74c3c' : '#2ecc71'}">${fmt(t.amt)}</b>
                <button class="del-btn" style="padding:2px 6px" onclick="removeItem('transactions', ${t.id})">✕</button>
            </div></div>`;
    });
}

function payEMI(id) {
    const e = data.emis.find(x => x.id == id);
    const amt = Math.min(e.monthly, e.total - e.paid);
    if(amt <= 0) return alert("Loan fully paid!");
    e.paid += amt;
    handleNewTransaction(`Loan: ${e.name}`, -amt);
}

function paySub(id) {
    const s = data.subs.find(x => x.id == id);
    handleNewTransaction(`Sub: ${s.name}`, -s.amt);
}

function editEMI(id) {
    const e = data.emis.find(x => x.id == id);
    document.getElementById('e-name').value = e.name;
    document.getElementById('e-total').value = e.total;
    document.getElementById('e-paid').value = e.paid;
    document.getElementById('e-monthly').value = e.monthly;
    document.getElementById('edit-id').value = e.id;
    document.getElementById('emi-form-title').innerText = "Edit Loan";
    document.getElementById('del-emi-btn').style.display = "block";
    window.scrollTo(0,0);
}

function resetEMIForm() {
    ['e-name','e-total','e-paid','e-monthly','edit-id'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('del-emi-btn').style.display = "none";
    document.getElementById('emi-form-title').innerText = "EMI Management";
}

function removeItem(type, id) {
    if(confirm("Confirm Delete?")) {
        data[type] = data[type].filter(x => x.id != id);
        refresh();
    }
}

function updateCurrency(v) { data.currency = v; localStorage.setItem('f_cur', v); refresh(); }

refresh();
