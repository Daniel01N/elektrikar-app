// materials.js

// Načtení a vykreslení tabulky materiálů
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
      <td>
        <button data-id="${m.id}" data-price="${m.price}" class="edit-btn">Upravit</button>
        <button data-id="${m.id}" class="delete-btn">Smazat</button>
      </td>
    `;
    tb.append(tr);
  });

  // Zpracování mazání
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async () => {
      await fetch(`/api/materials/${btn.dataset.id}`, { method: 'DELETE' });
      loadMaterials();
    };
  });

  // Zpracování úpravy ceny
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = async () => {
      const oldPrice = btn.dataset.price;
      const input = prompt('Zadejte novou cenu materiálu:', oldPrice);
      if (input === null) return;  // uživatel stiskl Cancel
      const newPrice = parseFloat(input.replace(',', '.'));
      if (isNaN(newPrice)) {
        alert('Neplatná hodnota ceny!');
        return;
      }
      await fetch(`/api/materials/${btn.dataset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice })
      });
      loadMaterials();
    };
  });
}

// Odeslání formuláře pro přidání nového materiálu
document.getElementById('mat-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  await fetch('/api/materials', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      name:  f.name.value.trim(),
      unit:  f.unit.value.trim(),
      price: parseFloat(f.price.value)
    })
  });
  f.reset();
  loadMaterials();
};

// Inicializace
loadMaterials();
let sortBy = 'id';
let sortAsc = true;

async function loadMaterials() {
  const res = await fetch('/api/materials');
  let rows = await res.json();

  // Řazení
  rows.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const tb = document.querySelector('#mat-table tbody');
  tb.innerHTML = '';

  rows.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.id}</td>
      <td>${m.name}</td>
      <td>${m.unit}</td>
      <td>${m.price.toFixed(2)}</td>
      <td>
        <button data-id="${m.id}" data-price="${m.price}" class="edit-btn">Upravit</button>
        <button data-id="${m.id}" class="delete-btn">Smazat</button>
      </td>
    `;
    tb.append(tr);
  });

  // Mazání
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async () => {
      await fetch(`/api/materials/${btn.dataset.id}`, { method: 'DELETE' });
      loadMaterials();
    };
  });

  // Úprava ceny
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = async () => {
      const oldPrice = btn.dataset.price;
      const input = prompt('Zadejte novou cenu:', oldPrice);
      if (input === null) return;
      const newPrice = parseFloat(input);
      if (isNaN(newPrice)) {
        alert('Neplatná hodnota');
        return;
      }
      await fetch(`/api/materials/${btn.dataset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice })
      });
      loadMaterials();
    };
  });
}

// Přidání nového materiálu
document.getElementById('mat-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  await fetch('/api/materials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:  f.name.value.trim(),
      unit:  f.unit.value.trim(),
      price: parseFloat(f.price.value)
    })
  });
  f.reset();
  loadMaterials();
};

// Klikání na záhlaví pro řazení
document.querySelectorAll('#mat-table thead th[data-sort]').forEach(th => {
  th.style.cursor = 'pointer';
  th.onclick = () => {
    const field = th.dataset.sort;
    if (sortBy === field) {
      sortAsc = !sortAsc;
    } else {
      sortBy = field;
      sortAsc = true;
    }
    loadMaterials();
  };
});

loadMaterials();
