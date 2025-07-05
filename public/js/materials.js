async function loadMaterials() {
  const res  = await fetch('/api/materials');
  const rows = await res.json();
  const tb   = document.querySelector('#mat-table tbody');
  tb.innerHTML = '';
  rows.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.id}</td>
      <td>${m.name}</td>
      <td>${m.unit}</td>
      <td>${m.price.toFixed(2)}</td>
      <td><button data-id="${m.id}" class="delete-btn">Smazat</button></td>
    `;
    tb.append(tr);
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async () => {
      await fetch(`/api/materials/${btn.dataset.id}`, { method: 'DELETE' });
      loadMaterials();
    };
  });
}

document.getElementById('mat-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  await fetch('/api/materials', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      name:  f.name.value,
      unit:  f.unit.value,
      price: parseFloat(f.price.value)
    })
  });
  f.reset();
  loadMaterials();
};

loadMaterials();
