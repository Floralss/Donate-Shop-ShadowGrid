import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Твои конфигурационные данные Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCDdPwaB8mH9TsM5hyXFbF0fNpFaWXjmV0",
  authDomain: "novus-roleplay.firebaseapp.com",
  projectId: "novus-roleplay",
  storageBucket: "novus-roleplay.firebasestorage.app",
  messagingSenderId: "207082104048",
  appId: "1:207082104048:web:bbf438aba78c9a7e79ce35",
  measurementId: "G-V0LK42BXRT"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Переменные состояния текущего пользователя
let currentUserData = null;
let selectedCategoryId = null;

// Элементы DOM
const authSection = document.getElementById('auth-section');
const mainSection = document.getElementById('main-section');
const forumSection = document.getElementById('forum-section');
const adminSection = document.getElementById('admin-section');
const navAdmin = document.getElementById('nav-admin');
const btnLogout = document.getElementById('btn-logout');

// Навигация переключатели
document.getElementById('nav-main').addEventListener('click', () => showSection('main'));
document.getElementById('nav-forum').addEventListener('click', () => { showSection('forum'); loadCategories(); });
navAdmin.addEventListener('click', () => { showSection('admin'); loadAdminUsers(); });

function showSection(section) {
    [mainSection, forumSection, adminSection, authSection].forEach(s => s.classList.add('hidden'));
    if (!auth.currentUser) {
        authSection.classList.remove('hidden');
        return;
    }
    if (section === 'main') mainSection.classList.remove('hidden');
    if (section === 'forum') forumSection.classList.remove('hidden');
    if (section === 'admin') adminSection.classList.remove('hidden');
}

// Переключение табов Вход / Регистрация
document.getElementById('tab-login').addEventListener('click', (e) => {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    e.target.classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
});

document.getElementById('tab-register').addEventListener('click', (e) => {
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
    e.target.classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
});

// РЕГИСТРАЦИЯ ИГРОКА / АДМИНА
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const adminCode = document.getElementById('reg-admin-code').value;

    // Сверяем секретный код FloralMemesense
    let role = "Игрок";
    if (adminCode === "FloralMemesense") {
        role = "Администратор";
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Сохраняем профиль в Firestore
        await setDoc(doc(db, "users", user.uid), {
            username: username,
            email: email,
            role: role,
            avatar: "https://via.placeholder.com/150"
        });

        alert(`Успешная регистрация! Ваша роль: ${role}`);
        location.reload();
    } catch (error) {
        alert("Ошибка регистрации: " + error.message);
    }
});

// ВХОД В СИСТЕМУ
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Вы успешно вошли!");
    } catch (error) {
        alert("Ошибка входа: " + error.message);
    }
});

// ВЫХОД
btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});

// СЛУШАТЕЛЬ АВТОРИЗАЦИИ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Получаем данные юзера из Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentUserData = docSnap.data();
            
            // Настройка элементов интерфейса под роль
            document.getElementById('profile-name').innerText = currentUserData.username;
            document.getElementById('profile-role').innerText = currentUserData.role;
            document.getElementById('user-avatar').src = currentUserData.avatar;
            
            btnLogout.classList.remove('hidden');
            authSection.classList.add('hidden');
            mainSection.classList.remove('hidden');

            if (currentUserData.role === "Администратор") {
                navAdmin.classList.remove('hidden');
                document.getElementById('admin-category-zone').classList.remove('hidden');
            } else {
                // Обычный игрок видит зону отправки жалоб/тем
                document.getElementById('player-thread-zone').classList.remove('hidden');
            }
        }
    } else {
        showSection('auth');
    }
});

// СМЕНА АВАТАРКИ (Сохранение картинки прямо в Firestore как Base64)
document.getElementById('btn-change-avatar').addEventListener('click', () => {
    document.getElementById('avatar-input').click();
});

document.getElementById('avatar-input').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async function() {
            const base64Avatar = reader.result;
            document.getElementById('user-avatar').src = base64Avatar;
            
            // Обновляем в Firestore
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, { avatar: base64Avatar });
            alert("Аватар успешно обновлен!");
        }
        reader.readAsDataURL(file);
    }
});

// ================= ФОРУМ ЛОГИКА =================

// Создание вкладки/категории (ТОЛЬКО АДМИНЫ)
document.getElementById('btn-create-category').addEventListener('click', async () => {
    const title = document.getElementById('new-category-title').value;
    if (!title) return alert("Введите название раздела!");

    if (currentUserData.role !== "Администратор") return alert("У вас нет прав!");

    await addDoc(collection(db, "categories"), { title: title });
    document.getElementById('new-category-title').value = "";
    alert("Раздел форума создан!");
    loadCategories();
});

// Загрузка категорий на экран
async function loadCategories() {
    const querySnapshot = await getDocs(collection(db, "categories"));
    const listContainer = document.getElementById('categories-list');
    listContainer.innerHTML = "";

    querySnapshot.forEach((doc) => {
        const cat = doc.data();
        const div = document.createElement('div');
        div.className = 'category-item';
        div.innerText = cat.title;
        div.onclick = () => selectCategory(doc.id, cat.title);
        listContainer.appendChild(div);
    });
}

// Выбор конкретной вкладки на форуме
function selectCategory(id, title) {
    selectedCategoryId = id;
    document.getElementById('current-category-title').innerText = title;
    
    // Если зашел админ, прячем форму написания обычных игроков (так как пишут только игроки)
    if (currentUserData && currentUserData.role === "Администратор") {
        document.getElementById('player-thread-zone').classList.add('hidden');
    } else {
        document.getElementById('player-thread-zone').classList.remove('hidden');
    }

    loadThreads(id);
}

// Создание темы/жалобы в выбранную вкладку (Обычные игроки)
document.getElementById('btn-create-thread').addEventListener('click', async () => {
    const title = document.getElementById('thread-title').value;
    const text = document.getElementById('thread-text').value;

    if (!selectedCategoryId) return alert("Сначала выберите раздел форума слева!");
    if (!title || !text) return alert("Заполните все поля темы!");

    await addDoc(collection(db, "threads"), {
        categoryId: selectedCategoryId,
        title: title,
        text: text,
        author: currentUserData.username,
        authorAvatar: currentUserData.avatar,
        createdAt: new Date().toLocaleString()
    });

    document.getElementById('thread-title').value = "";
    document.getElementById('thread-text').value = "";
    alert("Ваше обращение/жалоба опубликована!");
    loadThreads(selectedCategoryId);
});

// Показ тем внутри выбранной вкладки
async function loadThreads(categoryId) {
    const q = query(collection(db, "threads"), where("categoryId", "==", categoryId));
    const querySnapshot = await getDocs(q);
    const threadsList = document.getElementById('threads-list');
    threadsList.innerHTML = "";

    querySnapshot.forEach((doc) => {
        const thread = doc.data();
        const div = document.createElement('div');
        div.className = 'thread-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                <img src="${thread.authorAvatar}" style="width:30px; height:30px; border-radius:50%;">
                <b>${thread.author}</b> <span style="color:gray; font-size:12px;">(${thread.createdAt})</span>
            </div>
            <h4>Тема: ${thread.title}</h4>
            <p style="margin-top:5px; color:#d1d1d1;">${thread.text}</p>
        `;
        threadsList.appendChild(div);
    });
}

// ================= АДМИН ПАНЕЛЬ ЛОГИКА =================
async function loadAdminUsers() {
    if (currentUserData.role !== "Администратор") return;

    const querySnapshot = await getDocs(collection(db, "users"));
    const tableBody = document.getElementById('admin-users-table');
    tableBody.innerHTML = "";

    querySnapshot.forEach((userDoc) => {
        const u = userDoc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.username}</td>
            <td>${u.email}</td>
            <td><b>${u.role}</b></td>
            <td>
                ${u.role !== 'Администратор' ? `<button onclick="alert('Права игрока изменены на сервере!')">Удалить/Забанить</button>` : 'Главный админ'}
            </td>
        `;
        tableBody.appendChild(tr);
    });
}
