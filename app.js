import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSpM4HLZgvvg-DguvQ9W_LUh1nj0HpNao",
  authDomain: "selene-store.firebaseapp.com",
  projectId: "selene-store",
  storageBucket: "selene-store.appspot.com",
  messagingSenderId: "1026621933672",
  appId: "1:1026621933672:web:33c5d05f6959b187c293dd",
  measurementId: "G-ND7Y9N8WFF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let cart = [];
let isLoginMode = true;
const ADMIN_EMAIL = "selenestoreofc@gmail.com"; 

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('btnAuth').classList.add('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');
        if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            btnAdmin.classList.remove('hidden');
        }
    } else {
        document.getElementById('btnAuth').classList.remove('hidden');
        document.getElementById('btnLogout').classList.add('hidden');
        btnAdmin.classList.add('hidden');
        switchView(storeSection);
    }
});

document.getElementById('btnAddProduct').onclick = async () => {
    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const imgUrl = document.getElementById('prodImgUrl').value; 

    if(!name || isNaN(price)) return alert("Por favor ingresa un nombre y precio válido");

    const btnSave = document.getElementById('btnAddProduct');
    btnSave.innerText = "Guardando producto...";
    btnSave.disabled = true;

    let finalImgUrl = imgUrl ? imgUrl : 'https://via.placeholder.com/250x200?text=Selene+Store';

    try {
        await addDoc(collection(db, "products"), { name, price, img: finalImgUrl });
        alert("¡Producto agregado con éxito!");
        
        loadProducts();
        
        document.getElementById('prodName').value = '';
        document.getElementById('prodPrice').value = '';
        document.getElementById('prodImgUrl').value = '';
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

document.getElementById('btnCheckout').onclick = () => {
    if (cart.length === 0) return alert("Tu carrito está vacío.");
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

loadProducts();
