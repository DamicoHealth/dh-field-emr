// ==========================================
// LAB GRID (button-based)
// ==========================================
function labKey(name) { return name.replace(/[^a-zA-Z0-9]/g, '_'); }

function renderLabGrid() {
  const grid = document.getElementById('labGrid');
  grid.innerHTML = LAB_TESTS.map(t => {
    const key = labKey(t);
    return `
      <div class="lab-row" data-test="${t}">
        <span class="lab-name">${t}</span>
        <div class="lab-btns">
          <button class="lab-btn lab-btn-pos" data-action="pos">POS</button>
          <button class="lab-btn lab-btn-neg" data-action="neg">NEG</button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.lab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.lab-row');
      const action = btn.dataset.action;
      const posBtn = row.querySelector('.lab-btn-pos');
      const negBtn = row.querySelector('.lab-btn-neg');
      if (action === 'pos') {
        const wasActive = posBtn.classList.contains('active-pos');
        posBtn.classList.toggle('active-pos');
        negBtn.classList.remove('active-neg');
      } else if (action === 'neg') {
        const wasActive = negBtn.classList.contains('active-neg');
        negBtn.classList.toggle('active-neg');
        posBtn.classList.remove('active-pos');
      }
    });
  });
}

function resetLabs() {
  LAB_TESTS.forEach(t => {
    const key = labKey(t);
    const row = document.querySelector(`.lab-row[data-test="${t}"]`);
    if (!row) return;
    row.querySelectorAll('.lab-btn').forEach(b => {
      b.classList.remove('active-pos', 'active-neg');
    });
    const alertC = document.getElementById('lab-alert-' + key);
    if (alertC) { alertC.innerHTML = ''; alertC.style.display = 'none'; }
  });
}
