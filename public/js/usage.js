let customersList = [];

async function initUsagePage() {
  const [resCust, resMat] = await Promise.all([
    fetch('/api/customers'),
    fetch('/api/materials')
  ]);
  customersList = await resCust.json();
  const mats = await resMat.json();

  const cs = document.getElementById('cust-select');
  cs.innerHTML = customersList.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const ms = document.querySelector('#usage-form select[name=material_id]');
  ms.innerHTML = mats
    .map(m => `<option value="${m.id}">${m.name} (${m.unit}) – ${m.price.toFixed(2)}</option>`)
    .join('');

  cs.onchange = () => {
    const cid = parseInt(cs.value, 10);
    renderCustomerInfo(cid);
    loadUsage(cid);
  };

  const firstId = parseInt(cs.value, 10);
  renderCustomerInfo(firstId);
  loadUsage(firstId);
}

function renderCustomerInfo(customer_id) {
  const cust = customersList.find(c => c.id === customer_id) || {};
  document.getElementById('cust-name').textContent    = cust.name    || '-';
  document.getElementById('cust-phone').textContent   = cust.phone   || '-';
  document.getElementById('cust-email').textContent   = cust.email   || '-';
  document.getElementById('cust-address').textContent = cust.address || '-';
}

async function loadUsage(customer_id) {
  const res  = await fetch(`/api/usage/${customer_id}`);
  const rows = await res.json();
  const tb   = document.querySelector('#usage-table tbody');
  let sum    = 0;
  tb.innerHTML = '';

  rows.forEach(u => {
    sum += u.price;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td>${u.quantity}</td>
      <td>${u.price.toFixed(2)}</td>
    `;
    tb.append(tr);
  });

  document.getElementById('usage-total').textContent = sum.toFixed(2);
}

document.getElementById('usage-form').onsubmit = async e => {
  e.preventDefault();
  const customer_id = parseInt(document.getElementById('cust-select').value, 10);
  const f = e.target;

  await fetch('/api/usage', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      customer_id,
      material_id: parseInt(f.material_id.value, 10),
      quantity:    parseFloat(f.quantity.value)
    })
  });

  f.reset();
  loadUsage(customer_id);
};

initUsagePage();
