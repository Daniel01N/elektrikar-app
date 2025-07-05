// usage.js
let customersList = [];

async function initUsage() {
  const [rc, rm] = await Promise.all([
    fetch('/api/customers'), fetch('/api/materials')
  ]);
  customersList = await rc.json();
  const materials = await rm.json();

  const cs = document.getElementById('cust-select');
  cs.innerHTML = customersList.map(c=>
    `<option value="${c.id}">${c.name}</option>`
  ).join('');

  const ms = document.querySelector('#usage-form select[name=material_id]');
  ms.innerHTML = materials.map(m=>
    `<option value="${m.id}">${m.name} (${m.unit}) – ${m.price.toFixed(2)}</option>`
  ).join('');

  cs.onchange = () => {
    const id = +cs.value;
    renderCust(id);
    loadUsage(id);
  };

  renderCust(+cs.value);
  loadUsage(+cs.value);

  document.getElementById('usage-form').onsubmit = async e=>{
    e.preventDefault();
    const qty = parseFloat(e.target.quantity.value);
    const mid = +e.target.material_id.value;
    await fetch('/api/usage',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        customer_id: +cs.value,
        material_id: mid,
        quantity
      })
    });
    e.target.reset();
    loadUsage(+cs.value);
  };
}

function renderCust(id) {
  const c = customersList.find(x=>x.id===id) || {};
  document.getElementById('cust-name').textContent    = c.name   || '-';
  document.getElementById('cust-phone').textContent   = c.phone  || '-';
  document.getElementById('cust-email').textContent   = c.email  || '-';
  document.getElementById('cust-address').textContent = c.address|| '-';
}

async function loadUsage(customer_id) {
  const rows = await fetch(`/api/usage/${customer_id}`).then(r=>r.json());
  let sum = 0;
  document.querySelector('#usage-table tbody').innerHTML =
    rows.map(u=>{
      sum += u.price;
      return `<tr>
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.quantity}</td>
        <td>${u.price.toFixed(2)}</td>
      </tr>`;
    }).join('');
  document.getElementById('usage-total').textContent = sum.toFixed(2);
}

initUsage();
