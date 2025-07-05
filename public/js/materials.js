let sortBy = 'id', sortAsc = true, editingId = null;

async function loadMaterials() {
  const res  = await fetch('/api/materials');
  let rows    = await res.json();
  // řazení
  rows.sort((a,b)=>{
    let A = a[sortBy], B = b[sortBy];
    if(typeof A==='string') A=A.toLowerCase();
    if(typeof B==='string') B=B.toLowerCase();
    if(A<B) return sortAsc?-1:1;
    if(A>B) return sortAsc?1:-1;
    return 0;
  });
  // vykreslení
  const tb = document.querySelector('#mat-table tbody');
  tb.innerHTML = rows.map(m=>`
    <tr>
      <td>${m.id}</td>
      <td>${m.name}</td>
      <td>${m.unit}</td>
      <td>${m.price.toFixed(2)}</td>
      <td>
        <button data-id="${m.id}" class="edit-btn">Upravit</button>
        <button data-id="${m.id}" class="delete-btn">Smazat</button>
      </td>
    </tr>
  `).join('');

  // smazat
  document.querySelectorAll('.delete-btn').forEach(b=>b.onclick=async()=>{
    await fetch(`/api/materials/${b.dataset.id}`,{method:'DELETE'});
    loadMaterials();
  });
  // upravit
  document.querySelectorAll('.edit-btn').forEach(b=>b.onclick=()=>{
    const tr = b.closest('tr');
    editingId = b.dataset.id;
    const f = document.getElementById('mat-form');
    f.name.value  = tr.children[1].textContent;
    f.unit.value  = tr.children[2].textContent;
    f.price.value = tr.children[3].textContent;
    f.querySelector('button').textContent = 'Uložit';
  });
}

// odeslání formu
document.getElementById('mat-form').onsubmit = async e=>{
  e.preventDefault();
  const f = e.target;
  const payload = {
    name:  f.name.value.trim(),
    unit:  f.unit.value.trim(),
    price: parseFloat(f.price.value)
  };
  if(editingId){
    await fetch(`/api/materials/${editingId}`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    editingId = null;
    f.querySelector('button').textContent = 'Přidat';
  } else {
    await fetch('/api/materials',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
  }
  f.reset();
  loadMaterials();
};

// řazení headery
document.querySelectorAll('#mat-table thead th[data-sort]').forEach(th=>{
  th.style.cursor = 'pointer';
  th.onclick = () => {
    const fld = th.dataset.sort;
    if(sortBy===fld) sortAsc=!sortAsc;
    else { sortBy=fld; sortAsc=true; }
    loadMaterials();
  };
});

loadMaterials();
