// Importar funciones modulares de Firebase v10 (Añadido Storage)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// === 1. TU CONFIGURACIÓN REAL DE FIREBASE ===
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
const storage = getStorage(app); // Inicializar el almacenamiento de fotos

// === VARIABLES DE ESTADO ===
let cart = [];
let isLoginMode = true;
const ADMIN_EMAIL = "selenestoreofc@gmail.com"; 

// === ELEMENTOS DEL DOM ===
const productsGrid = document.getElementById('productsGrid');
const cartCount = document.getElementById('cartCount');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalValue = document.getElementById('cartTotalValue');

const btnInicio = document.getElementById('btnInicio');
const btnAdmin = document.getElementById('btnAdmin');
const storeSection = document.getElementById('storeSection');
const adminSection = document.getElementById('adminSection');

const authModal = document.getElementById('authModal');
const cartModal = document.getElementById('cartModal');

// === LÓGICA DE NAVEGACIÓN ===
btnInicio.onclick = () => switchView(storeSection);
btnAdmin.onclick = () => switchView(adminSection);

function switchView(view) {
    storeSection.classList.add('hidden');
    storeSection.classList.remove('active');
    adminSection.classList.add('hidden');
    adminSection.classList.remove('active');
    
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
        if (user.email === ADMIN_EMAIL) {
            btnAdmin.classList.remove('hidden');
        }
    } else {
        document.getElementById('btnAuth').classList.remove('hidden');
        document.getElementById('btnLogout').classList.add('hidden');
        btnAdmin.classList.add('hidden');
        switchView(storeSection);
    }
});

// === LÓGICA DEL PANEL ADMIN (CON SUBIDA DE ARCHIVOS) ===
document.getElementById('btnAddProduct').onclick = async () => {
    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const imgFile = document.getElementById('prodImg').files[0]; // Capturar el archivo seleccionado

    if(!name || isNaN(price)) return alert("Por favor ingresa un nombre y precio válido");

    const btnSave = document.getElementById('btnAddProduct');
    btnSave.innerText = "Subiendo imagen...";
    btnSave.disabled = true;

    let finalImgUrl = 'https://via.placeholder.com/250x200?text=Selene+Store';

    try {
        // Si el usuario seleccionó una foto, la subimos a Firebase Storage
        if (imgFile) {
            const fileRef = ref(storage, 'productos/' + Date.now() + '_' + imgFile.name);
            const snapshot = await uploadBytes(fileRef, imgFile);
            finalImgUrl = await getDownloadURL(snapshot.ref); // Obtenemos el link de la foto subida
        }

        // Guardamos todo en la base de datos de Firestore
        await addDoc(collection(db, "products"), { name, price, img: finalImgUrl });
        alert("¡Producto agregado con éxito con su imagen real!");
        
        loadProducts();
        
        // Limpiar el formulario
        document.getElementById('prodName').value = '';
        document.getElementById('prodPrice').value = '';
        document.getElementById('prodImg').value = '';
    } catch (e) {
        alert("Error al guardar el producto: " + e.message);
    } finally {
        btnSave.innerText = "Guardar Producto";
        btnSave.disabled = false;
    }
};

async function deleteProduct(id) {
    if(confirm("¿Seguro que deseas eliminar este producto?")) {
        await deleteDoc(doc(db, "products", id));
        loadProducts();
    }
}
window.deleteProduct = deleteProduct; 

// === CARGAR PRODUCTOS ===
async function loadProducts() {
    try {
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

            productsGrid.innerHTML += `
                <div class="product-card">
                    <img src="${prod.img}" alt="${prod.name}">
                    <h3>${prod.name}</h3>
                    <p class="price">$${prod.price.toFixed(2)}</p>
                    <button class="btn-primary" onclick="addToCart('${id}', '${prod.name}', ${prod.price})">Agregar al Carrito</button>
                </div>
            `;

            adminList.innerHTML += `
                <div class="admin-item">
                    <span>${prod.name} - $${prod.price}</span>
                    <button class="btn-danger" onclick="deleteProduct('${id}')">Eliminar</button>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error cargando productos: ", error);
    }
}

// === LÓGICA DEL CARRITO ===
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

document.getElementById('btnCart').onclick = () => cartModal.classList.remove('hidden');
document.getElementById('closeCart').onclick = () => cartModal.classList.add('hidden');

// === CHECKOUT WHATSAPP ===
document.getElementById('btnCheckout').onclick = () => {
    if (cart.length === 0) return alert("Tu carrito está vacío.");
    const numeroWhatsApp = "51982239117"; // Cambia por tu número real
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
