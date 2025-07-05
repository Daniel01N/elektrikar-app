async function loadCustomers() {
  const res  = await fetch('/api/customers');
  const rows = await res.json();
  const tb   = document.querySelector('#cust-table tbody');
  tb.innerHTML = '';
  rows.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>${c.phone||''}</td>
      <td>${c.email||''}</td>
      <td>${c.address||''}</td>
      <td><button data-id="${c.id}" class="delete-btn">Smazat</button></td>
    `;
    tb.append(tr);
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async () => {
      await fetch(`/api/customers/${btn.dataset.id}`, { method: 'DELETE' });
      loadCustomers();
    };
  });
}

document.getElementById('cust-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  await fetch('/api/customers', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      name:    f.name.value,
      phone:   f.phone.value,
      email:   f.email.value,
      address: f.address.value
    })
  });
  f.reset();
  loadCustomers();
};

loadCustomers();
