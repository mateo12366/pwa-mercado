// Inicializar IndexedDB
let db;
const request = indexedDB.open('MercadoDB', 1);

request.onerror = (event) => {
  console.log('Error al abrir la base de datos', event);
};

request.onupgradeneeded = (event) => {
  db = event.target.result;
  const objectStore = db.createObjectStore('productos', { keyPath: 'id', autoIncrement: true });
  objectStore.createIndex('purchased', 'purchased', { unique: false });
};

request.onsuccess = (event) => {
  db = event.target.result;
  mostrarProductos();
  actualizarPresupuestoRestante();
};

// Gestión de presupuesto
function obtenerPresupuesto() {
  return Number(localStorage.getItem('budget')) || 0;
}

function guardarPresupuesto() {
  const presupuesto = Number(document.getElementById('budgetInput').value) || 0;
  localStorage.setItem('budget', presupuesto);
  actualizarPresupuestoRestante();
}

document.getElementById('saveBudget').addEventListener('click', guardarPresupuesto);
document.getElementById('budgetInput').value = obtenerPresupuesto();

// Agregar productos
const form = document.getElementById('productForm');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('productName').value;
  const brand = document.getElementById('productBrand').value;
  const quantity = Number(document.getElementById('productQty').value);
  const unitPrice = Number(document.getElementById('productPrice').value);
  const subtotal = quantity * unitPrice;

  const transaction = db.transaction(['productos'], 'readwrite');
  const store = transaction.objectStore('productos');
  const request = store.add({ name, brand, quantity, unitPrice, subtotal, purchased: false });
  request.onsuccess = () => {
    form.reset();
    mostrarProductos();
  };
});

// Mostrar productos
function mostrarProductos() {
  const list = document.getElementById('productList');
  list.innerHTML = '';
  const transaction = db.transaction(['productos'], 'readonly');
  const store = transaction.objectStore('productos');
  store.openCursor().onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const prod = cursor.value;
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded shadow flex items-start justify-between';
      const textClass = prod.purchased ? 'line-through text-gray-400' : '';
      card.innerHTML = `
        <div class="${textClass}">
          <h3 class="font-bold">${prod.name}</h3>
          <p>Marca: ${prod.brand}</p>
          <p>Cant: ${prod.quantity} - $${prod.unitPrice}</p>
          <p>Subtotal: $${prod.subtotal.toFixed(2)}</p>
        </div>
        <input type="checkbox" class="h-6 w-6 mt-2" data-id="${prod.id}" ${prod.purchased ? 'checked' : ''} />
      `;
      list.appendChild(card);
      cursor.continue();
    }
  };
}

// Actualizar estado de compra
const productList = document.getElementById('productList');
productList.addEventListener('change', (event) => {
  if (event.target.matches('input[type="checkbox"]')) {
    const id = Number(event.target.dataset.id);
    const purchased = event.target.checked;
    const transaction = db.transaction(['productos'], 'readwrite');
    const store = transaction.objectStore('productos');
    const request = store.get(id);
    request.onsuccess = () => {
      const data = request.result;
      data.purchased = purchased;
      store.put(data).onsuccess = () => {
        mostrarProductos();
        actualizarPresupuestoRestante();
      };
    };
  }
});

// Presupuesto restante
function actualizarPresupuestoRestante() {
  const presupuesto = obtenerPresupuesto();
  const transaction = db.transaction(['productos'], 'readonly');
  const store = transaction.objectStore('productos');
  let gastado = 0;
  store.openCursor().onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      if (cursor.value.purchased) {
        gastado += cursor.value.subtotal;
      }
      cursor.continue();
    } else {
      const restante = presupuesto - gastado;
      document.getElementById('remaining').textContent = restante.toFixed(2);
    }
  };
}

// Menú lateral
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');
  document.body.classList.toggle('menu-open');
});
overlay.addEventListener('click', () => {
  sidebar.classList.add('-translate-x-full');
  overlay.classList.add('hidden');
  document.body.classList.remove('menu-open');
});

// Registro de Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .then((registration) => {
        console.log('Service Worker registrado:', registration);
      })
      .catch((error) => {
        console.log('Error al registrar el Service Worker:', error);
      });
  });
}
