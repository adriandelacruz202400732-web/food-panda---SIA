/* =============================================
   FOODPANDA ORDER PORTAL — app.js
   API Base: https://foodpanda-prefinal.onrender.com
============================================= */

const API = 'https://foodpanda-prefinal.onrender.com';

// ---- Food emoji map ----
const FOOD_EMOJIS = {
  burger: '🍔', pizza: '🍕', chicken: '🍗', chickenjoy: '🍗',
  fries: '🍟', rice: '🍚', spaghetti: '🍝', pasta: '🍝',
  steak: '🥩', salad: '🥗', soup: '🍜', sushi: '🍣',
  sandwich: '🥪', hotdog: '🌭', taco: '🌮', bbq: '🍖',
  cake: '🎂', donut: '🍩', ice: '🍦', dessert: '🍰',
  juice: '🧃', coffee: '☕', tea: '🍵', cola: '🥤',
  milk: '🥛', water: '💧', shake: '🥤', drink: '🧋',
};

function getEmoji(name = '') {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(FOOD_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🍽️';
}

// ---- State ----
let allFoods = [];
let pendingOrderId = null;
let activeCategory = 'all';

// ===================== DOM REFS =====================
const foodGrid     = document.getElementById('food-grid');
const searchInput  = document.getElementById('search-input');
const refreshBtn   = document.getElementById('refresh-btn');
const addForm      = document.getElementById('add-food-form');
const addBtn       = document.getElementById('add-btn');
const prevName     = document.getElementById('prev-name');
const prevRest     = document.getElementById('prev-rest');
const prevPrice    = document.getElementById('prev-price');
const receiptWrap  = document.getElementById('receipt-wrapper');
const fetchRecBtn  = document.getElementById('fetch-receipt-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalFood    = document.getElementById('modal-food');
const modalCancel  = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
const toast        = document.getElementById('toast');
const toastMsg     = document.getElementById('toast-msg');

// Edit modal refs
const editModalOverlay = document.getElementById('edit-modal-overlay');
const editForm         = document.getElementById('edit-food-form');
const editFoodId       = document.getElementById('edit-food-id');
const editFoodName     = document.getElementById('edit-food-name');
const editFoodRest     = document.getElementById('edit-food-restaurant');
const editFoodPrice    = document.getElementById('edit-food-price');
const editCancel       = document.getElementById('edit-modal-cancel');
const editSubmit       = document.getElementById('edit-submit-btn');

// Update order modal refs
const updateOrderOverlay  = document.getElementById('update-order-overlay');
const updateOrderFoodId   = document.getElementById('update-order-food-id');
const updateOrderCancel   = document.getElementById('update-order-cancel');
const updateOrderConfirm  = document.getElementById('update-order-confirm');
const updateOrderCurrent  = document.getElementById('update-order-current');

// ===================== TABS =====================
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'receipt') fetchReceipt();
  });
});

// ===================== TOAST =====================
let toastTimer;
function showToast(msg, isError = false) {
  clearTimeout(toastTimer);
  toastMsg.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ===================== FETCH FOODS =====================
async function fetchFoods() {
  foodGrid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Fetching menu…</p></div>`;
  try {
    const res  = await fetch(`${API}/api/foods`);
    const data = await res.json();
    allFoods = Array.isArray(data) ? data : [];
    renderFoods();
  } catch (err) {
    foodGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>Failed to load menu. The server may be waking up — try refreshing in a moment.</p></div>`;
  }
}

// ===================== RENDER FOODS =====================
function renderFoods() {
  const query = searchInput.value.toLowerCase().trim();

  const filtered = allFoods.filter(f => {
    const matchSearch = !query || f.name.toLowerCase().includes(query) || f.restaurant.toLowerCase().includes(query);
    const matchCat    = activeCategory === 'all' || matchCategory(f, activeCategory);
    return matchSearch && matchCat;
  });

  if (!filtered.length) {
    foodGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">🔍</span><p>No food items found.</p></div>`;
    return;
  }

  foodGrid.innerHTML = filtered.map(f => `
    <div class="food-card" data-id="${f.id}">
      <div class="food-card-emoji">${getEmoji(f.name)}</div>
      <div class="food-card-body">
        <div class="food-card-id">#${f.id}</div>
        <div class="food-card-name">${escHtml(f.name)}</div>
        <div class="food-card-rest"><i class="fa fa-store"></i> ${escHtml(f.restaurant)}</div>
      </div>
      <div class="food-card-footer">
        <div class="food-card-price">₱${Number(f.price).toLocaleString()}</div>
      </div>
      <div class="food-card-actions">
        <button type="button" class="btn-order order-btn"
          data-id="${f.id}"
          data-name="${escHtml(f.name)}"
          data-restaurant="${escHtml(f.restaurant)}"
          data-price="${f.price}">
          <i class="fa fa-bag-shopping"></i> Order Now
        </button>
        <div class="food-card-secondary-actions">
          <button type="button" class="btn btn-edit edit-btn"
            data-id="${f.id}"
            data-name="${escHtml(f.name)}"
            data-restaurant="${escHtml(f.restaurant)}"
            data-price="${f.price}">
            <i class="fa fa-pen"></i> Edit
          </button>
          <button type="button" class="btn btn-danger delete-btn" data-id="${f.id}">
            <i class="fa fa-trash"></i> Remove
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function matchCategory(food, cat) {
  const name = (food.name + ' ' + food.restaurant).toLowerCase();
  const map = {
    'fast food': ['burger', 'fries', 'chicken', 'mcdo', 'jollibee', 'kfc', 'hotdog'],
    'drinks':    ['juice', 'cola', 'coffee', 'tea', 'milk', 'water', 'drink', 'shake'],
    'dessert':   ['cake', 'donut', 'ice cream', 'dessert', 'pastry', 'sweet'],
    'meals':     ['rice', 'spaghetti', 'pasta', 'steak', 'salad', 'soup', 'sushi', 'sandwich', 'pizza'],
  };
  return (map[cat] || []).some(kw => name.includes(kw));
}

// ===================== CATEGORY CHIPS =====================
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.cat;
    renderFoods();
  });
});

// ===================== SEARCH =====================
searchInput.addEventListener('input', renderFoods);
refreshBtn.addEventListener('click', fetchFoods);

// ===================== EVENT DELEGATION (Order + Delete + Edit) =====================
foodGrid.addEventListener('click', async (e) => {

  // --- ORDER BUTTON ---
  const orderBtn = e.target.closest('.order-btn');
  if (orderBtn) {
    pendingOrderId = orderBtn.dataset.id;
    modalFood.innerHTML = `
      <strong>${orderBtn.dataset.name}</strong>
      <small style="display:block;color:var(--text-muted);margin:.2rem 0">${orderBtn.dataset.restaurant}</small>
      <span class="mf-price">₱${Number(orderBtn.dataset.price).toLocaleString()}</span>
    `;
    modalOverlay.classList.add('open');
    return;
  }

  // --- EDIT BUTTON ---
  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) {
    editFoodId.value    = editBtn.dataset.id;
    editFoodName.value  = editBtn.dataset.name;
    editFoodRest.value  = editBtn.dataset.restaurant;
    editFoodPrice.value = editBtn.dataset.price;
    editModalOverlay.classList.add('open');
    return;
  }

  // --- DELETE BUTTON ---
  const deleteBtn = e.target.closest('.delete-btn');
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    if (deleteBtn.disabled) return;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

    try {
      const res  = await fetch(`${API}/api/foods/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        allFoods = allFoods.filter(f => String(f.id) !== String(id));
        renderFoods();
        showToast('Food item removed from menu.');
      } else {
        showToast(data.message || 'Delete failed.', true);
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="fa fa-trash"></i> Remove';
      }
    } catch {
      showToast('Network error. Try again.', true);
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = '<i class="fa fa-trash"></i> Remove';
    }
  }

});

// ===================== ORDER MODAL =====================
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

function closeModal() {
  modalOverlay.classList.remove('open');
  pendingOrderId = null;
}

modalConfirm.addEventListener('click', async () => {
  if (!pendingOrderId) return;

  modalConfirm.disabled = true;
  modalConfirm.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Ordering…';

  try {
    const res  = await fetch(`${API}/api/buy/${pendingOrderId}`, { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      closeModal();
      showToast(`🎉 Order placed for ${data.order?.item || 'your item'}!`);
    } else {
      closeModal();
      showToast(data.message || 'Order failed.', true);
    }
  } catch {
    closeModal();
    showToast('Network error. Try again.', true);
  } finally {
    modalConfirm.disabled = false;
    modalConfirm.innerHTML = '<i class="fa fa-check"></i> Place Order';
  }
});

// ===================== EDIT FOOD MODAL =====================
editCancel.addEventListener('click', closeEditModal);
editModalOverlay.addEventListener('click', e => { if (e.target === editModalOverlay) closeEditModal(); });

function closeEditModal() {
  editModalOverlay.classList.remove('open');
  editForm.reset();
}

editForm.addEventListener('submit', async e => {
  e.preventDefault();

  const id         = editFoodId.value;
  const name       = editFoodName.value.trim();
  const restaurant = editFoodRest.value.trim();
  const price      = parseFloat(editFoodPrice.value);

  if (!name || !restaurant || isNaN(price) || price <= 0) {
    showToast('Please fill in all fields correctly.', true);
    return;
  }

  editSubmit.disabled = true;
  editSubmit.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';

  try {
    const res = await fetch(`${API}/api/foods/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, restaurant, price }),
    });
    const data = await res.json();

    if (res.ok) {
      const idx = allFoods.findIndex(f => String(f.id) === String(id));
      if (idx !== -1) allFoods[idx] = { ...allFoods[idx], name, restaurant, price };
      renderFoods();
      closeEditModal();
      showToast(`✏️ "${name}" updated successfully!`);
    } else {
      showToast(data.message || 'Update failed.', true);
    }
  } catch {
    showToast('Network error. Try again.', true);
  } finally {
    editSubmit.disabled = false;
    editSubmit.innerHTML = '<i class="fa fa-check"></i> Save Changes';
  }
});

// ===================== UPDATE ORDER MODAL =====================
updateOrderCancel.addEventListener('click', closeUpdateOrderModal);
updateOrderOverlay.addEventListener('click', e => { if (e.target === updateOrderOverlay) closeUpdateOrderModal(); });

function closeUpdateOrderModal() {
  updateOrderOverlay.classList.remove('open');
  updateOrderFoodId.value = '';
}

// "Update Order" button in Receipt tab
document.getElementById('update-order-btn').addEventListener('click', async () => {
  try {
    const res  = await fetch(`${API}/api/receipt`);
    const data = await res.json();

    if (data.message || !data.id) {
      showToast('No existing order to update.', true);
      return;
    }

    updateOrderFoodId.value = '';
    updateOrderCurrent.innerHTML = `
      <div class="update-order-info">
        <span class="update-label">Current order</span>
        <strong>${escHtml(data.item)}</strong>
        <small>${escHtml(data.restaurant)} &mdash; ₱${Number(data.price).toLocaleString()}</small>
      </div>
    `;

    const select = document.getElementById('update-order-select');
    select.innerHTML = `<option value="">— Select a new item —</option>` +
      allFoods.map(f => `<option value="${f.id}">${escHtml(f.name)} (₱${Number(f.price).toLocaleString()})</option>`).join('');

    updateOrderOverlay.classList.add('open');
  } catch {
    showToast('Could not fetch receipt data.', true);
  }
});

updateOrderConfirm.addEventListener('click', async () => {
  const select    = document.getElementById('update-order-select');
  const newFoodId = select.value;

  if (!newFoodId) {
    showToast('Please select a new item.', true);
    return;
  }

  updateOrderConfirm.disabled = true;
  updateOrderConfirm.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Updating…';

  try {
    const res  = await fetch(`${API}/api/receipt`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ foodId: newFoodId }),
    });
    const data = await res.json();

    if (res.ok) {
      closeUpdateOrderModal();
      showToast(`🔄 Order updated to "${data.order?.item || 'new item'}"!`);
      fetchReceipt();
    } else {
      showToast(data.message || 'Update failed.', true);
    }
  } catch {
    showToast('Network error. Try again.', true);
  } finally {
    updateOrderConfirm.disabled = false;
    updateOrderConfirm.innerHTML = '<i class="fa fa-rotate-right"></i> Update Order';
  }
});

// ===================== ADD FOOD FORM =====================
const fnInput = document.getElementById('food-name');
const frInput = document.getElementById('food-restaurant');
const fpInput = document.getElementById('food-price');

fnInput.addEventListener('input', () => { prevName.textContent = fnInput.value || 'Food Name'; });
frInput.addEventListener('input', () => { prevRest.innerHTML = `<i class="fa fa-store"></i> ${frInput.value || 'Restaurant'}`; });
fpInput.addEventListener('input', () => { prevPrice.textContent = fpInput.value ? `₱${Number(fpInput.value).toLocaleString()}` : '₱ —'; });

addForm.addEventListener('submit', async e => {
  e.preventDefault();

  const name       = fnInput.value.trim();
  const restaurant = frInput.value.trim();
  const price      = parseFloat(fpInput.value);

  if (!name || !restaurant || isNaN(price) || price <= 0) {
    showToast('Please fill in all fields correctly.', true);
    return;
  }

  addBtn.disabled = true;
  addBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Adding…';

  try {
    const res  = await fetch(`${API}/api/foods`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, restaurant, price }),
    });
    const data = await res.json();

    if (res.ok) {
      allFoods.push(data.food);
      addForm.reset();
      prevName.textContent  = 'Food Name';
      prevRest.innerHTML    = '<i class="fa fa-store"></i> Restaurant';
      prevPrice.textContent = '₱ —';
      showToast(`✅ "${data.food.name}" added to menu!`);
    } else {
      showToast(data.message || 'Could not add food.', true);
    }
  } catch {
    showToast('Network error. Try again.', true);
  } finally {
    addBtn.disabled = false;
    addBtn.innerHTML = '<i class="fa fa-plus"></i> Add to Menu';
  }
});

// ===================== RECEIPT =====================
async function fetchReceipt() {
  receiptWrap.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Fetching receipt…</p></div>`;

  try {
    const res  = await fetch(`${API}/api/receipt`);
    const data = await res.json();

    if (data.message) {
      receiptWrap.innerHTML = `<div class="empty-state"><span class="empty-icon">🧾</span><p>${data.message}</p></div>`;
      return;
    }

    const date = new Date(data.date);
    const dateStr = isNaN(date) ? data.date : date.toLocaleString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    receiptWrap.innerHTML = `
      <div class="receipt-card">
        <div class="receipt-header">
          <i class="fa fa-receipt"></i>
          <div class="receipt-header-text">
            <h3>Order Confirmed</h3>
            <p>Here's your latest transaction</p>
          </div>
        </div>
        <div class="receipt-body">
          <div class="receipt-row">
            <span class="r-label">Order ID</span>
            <span class="r-value">#${data.id}</span>
          </div>
          <div class="receipt-row">
            <span class="r-label">Item</span>
            <span class="r-value">${escHtml(data.item)}</span>
          </div>
          <div class="receipt-row">
            <span class="r-label">Restaurant</span>
            <span class="r-value">${escHtml(data.restaurant)}</span>
          </div>
          <div class="receipt-row">
            <span class="r-label">Date & Time</span>
            <span class="r-value">${dateStr}</span>
          </div>
          <div class="receipt-row total">
            <span class="r-label">Total</span>
            <span class="r-value">₱${Number(data.price).toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;
  } catch {
    receiptWrap.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>Could not fetch receipt.</p></div>`;
  }
}

fetchRecBtn.addEventListener('click', fetchReceipt);

// ===================== UTILITY =====================
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===================== INIT =====================
fetchFoods();