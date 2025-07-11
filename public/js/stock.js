// stock.js
async function loadStock() {
  const [rM, rS] = await Promise.all([
    fetch('/api/materials'), fetch('/api/stock')
  ]);
  const mats  = await rM.json();
  const stock = await rS.json();

  document.querySelector('#stk-form select').innerHTML =
    mats.map(m=>`<option value="${m.id}">${m.name} (${m.unit})</option>`).join('');

  const tb = document.querySelector('#stk-table tbody');
  tb.innerHTML = stock.map(s=>`
    <tr>
      <td>${s.id}</td>
      <td>${s.name}</td>
      <td>${s.unit}</td>
      <td>${s.quantity}</td>
      <td><button data-id="${s.id}" class="delete-btn">Smazat</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.delete-btn').forEach(b=>{
    b.onclick = async ()=> {
      await fetch(`/api/stock/${b.dataset.id}`, { method:'DELETE' });
      loadStock();
    };
  });
}

document.getElementById('stk-form').onsubmit = async e=>{
  e.preventDefault();
  const f = e.target;
  await fetch('/api/stock',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      material_id: parseInt(f.material_id.value),
      quantity:    parseFloat(f.quantity.value)
    })
  });
  f.reset();
  loadStock();
};

loadStock();
