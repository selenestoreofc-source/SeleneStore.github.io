// Importar funciones modulares de Firebase v10
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// === 1. TU CONFIGURACIÓN DE FIREBASE AQUÍ ===
// Reemplaza esto con la configuración que te da Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDSpM4HLZgvvg-DguvQ9W_LUh1nj0HpNao",
  authDomain: "selene-store.firebaseapp.com",
  projectId: "selene-store",
  storageBucket: "selene-store.firebasestorage.app",
  messagingSenderId: "1026621933672",
  appId: "1:1026621933672:web:33c5d05f6959b187c293dd",
  measurementId: "G-ND7Y9N8WFF"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === VARIABLES DE ESTADO ===
let cart = [];
let isLoginMode = true;

// Para fines de prueba, designaremos un correo como administrador
const ADMIN_EMAIL = "selenestoreofc@gmail.com"; 

// === ELEMENTOS DEL DOM ===
const productsGrid = document.getElementById('productsGrid');
const cartCount = document.getElementById('cartCount');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalValue = document.getElementById('cartTotalValue');

// Navegación y Vistas
const btnInicio = document.getElementById('btnInicio');
const btnAdmin = document.getElementById('btnAdmin');
const storeSection = document.getElementById('storeSection');
const adminSection = document.getElementById('adminSection');

// Modales
const authModal = document.getElementById('authModal');
const cartModal = document.getElementById('cartModal');

// === LÓGICA DE NAVEGACIÓN ===
btnInicio.onclick = () => switchView(storeSection);
btnAdmin.onclick = () => switchView(adminSection);

function switchView(view) {
    // Ocultamos ambas secciones por defecto
    storeSection.classList.add('hidden');
    storeSection.classList.remove('active');
    adminSection.classList.add('hidden');
    adminSection.classList.remove('active');
    
    // Mostramos únicamente la sección seleccionada
    view.classList.remove('hidden');
    view.classList.add('active');
}

// === LÓGICA DE AUTENTICACIÓN ===
document.getElementById('btnAuth').onclick = () => authModal.classList.remove('hidden');
document.getElementById('closeAuth').onclick = () => authModal.classList.add('hidden');
document.getElementById('btnLogout').onclick = () => signOut(auth);

document.getElementById('toggleAuthMode').onclick = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').innerText = isLoginMode ? "Iniciar Sesión" : "Registrarse";
    document.getElementById('btnSubmitAuth').innerText = isLoginMode ? "Entrar" : "Crear Cuenta";
    document.getElementById('toggleAuthMode').innerText = isLoginMode ? "Regístrate" : "Inicia Sesión";
};

document.getElementById('btnSubmitAuth').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
            alert("Sesión iniciada");
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("Cuenta creada y sesión iniciada");
        }
        authModal.classList.add('hidden');
    } catch (error) {
        alert("Error: " + error.message);
    }
};

// Monitor de estado de sesión
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('btnAuth').classList.add('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');
        // Mostrar panel de admin si es el correo designado
        if (user.email === ADMIN_EMAIL) {
            btnAdmin.classList.remove('hidden');
        }
    } else {
        document.getElementById('btnAuth').classList.remove('hidden');
        document.getElementById('btnLogout').classList.add('hidden');
        btnAdmin.classList.add('hidden');
        switchView(storeSection); // Forzar vista tienda si sale el admin
    }
});

// === LÓGICA DEL PANEL ADMIN (FIRESTORE) ===
document.getElementById('btnAddProduct').onclick = async () => {
    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const img = document.getElementById('prodImg').value || 'https://via.placeholder.com/250x200?text=Selene+Store';

    if(!name || isNaN(price)) return alert("Por favor ingresa nombre y precio válido");

    try {
        await addDoc(collection(db, "products"), { name, price, img });
        alert("Producto agregado");
        loadProducts(); // Recargar productos
        document.getElementById('prodName').value = '';
        document.getElementById('prodPrice').value = '';
        document.getElementById('prodImg').value = '';
    } catch (e) {
        alert("Error al agregar: " + e);
    }
};

async function deleteProduct(id) {
    if(confirm("¿Seguro que deseas eliminar este producto?")) {
        await deleteDoc(doc(db, "products", id));
        loadProducts();
    }
}
// Hacer función global para poder llamarla desde el HTML generado
window.deleteProduct = deleteProduct; 

// === CARGAR PRODUCTOS A LA TIENDA Y ADMIN ===
async function loadProducts() {
    const querySnapshot = await getDocs(collection(db, "products"));
    productsGrid.innerHTML = '';
    const adminList = document.getElementById('adminProductsList');
    adminList.innerHTML = '';

    if (querySnapshot.empty) {
        productsGrid.innerHTML = '<p>No hay productos disponibles aún.</p>';
        return;
    }

    querySnapshot.forEach((doc) => {
        const prod = doc.data();
        const id = doc.id;

        // Render para la Tienda
        productsGrid.innerHTML += `
            <div class="product-card">
                <img src="${prod.img}" alt="${prod.name}">
                <h3>${prod.name}</h3>
                <p class="price">$${prod.price.toFixed(2)}</p>
                <button class="btn-primary" onclick="addToCart('${id}', '${prod.name}', ${prod.price})">Agregar al Carrito</button>
            </div>
        `;

        // Render para el Admin
        adminList.innerHTML += `
            <div class="admin-item">
                <span>${prod.name} - $${prod.price}</span>
                <button class="btn-danger" onclick="deleteProduct('${id}')">Eliminar</button>
            </div>
        `;
    });
}

// === LÓGICA DEL CARRITO DE COMPRAS ===
window.addToCart = (id, name, price) => {
    cart.push({ id, name, price });
    updateCart();
    alert(`¡${name} agregado al carrito!`);
};

function updateCart() {
    cartCount.innerText = cart.length;
    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price;
        cartItemsContainer.innerHTML += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price.toFixed(2)} <button onclick="removeFromCart(${index})" style="color:red; background:none; border:none; cursor:pointer;">X</button></span>
            </div>
        `;
    });
    cartTotalValue.innerText = total.toFixed(2);
}

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    updateCart();
};

// Mostrar/Ocultar Carrito
document.getElementById('btnCart').onclick = () => cartModal.classList.remove('hidden');
document.getElementById('closeCart').onclick = () => cartModal.classList.add('hidden');

// === LÓGICA DE CHECKOUT POR WHATSAPP ===
document.getElementById('btnCheckout').onclick = () => {
    if (cart.length === 0) return alert("Tu carrito está vacío.");

    // CAMBIA ESTE NÚMERO POR EL TUYO (Ej. 51 para Perú + tu número)
    const numeroWhatsApp = "51982239117"; 
    
    let mensaje = "🌸 *Hola Selene Store, quiero realizar el siguiente pedido:* 🌸\n\n";
    let total = 0;
    
    cart.forEach(item => {
        mensaje += `🛍️ 1x ${item.name} - $${item.price.toFixed(2)}\n`;
        total += item.price;
    });

    mensaje += `\n💰 *Total a pagar: $${total.toFixed(2)}*`;
    
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
};

// Carga inicial
loadProducts();
