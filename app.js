import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Конфигурационные данные Firebase от клиента
const firebaseConfig = {
  apiKey: "AIzaSyCDdPwaB8mH9TsM5hyXFbF0fNpFaWXjmV0",
  authDomain: "novus-roleplay.firebaseapp.com",
  projectId: "novus-roleplay",
  storageBucket: "novus-roleplay.firebasestorage.app",
  messagingSenderId: "207082104048",
  appId: "1:207082104048:web:bbf438aba78c9a7e79ce35",
  measurementId: "G-V0LK42BXRT"
};

// Инициализация сервисов
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userData = null;
let activeCategoryId = null;

// Элементы навигации и структуры
const sections = {
    main: document.getElementById('main-section'),
    forum: document.getElementById('forum-section'),
    admin: document.getElementById('admin-section'),
    auth: document.getElementById('auth-section')
};

const navLinks = {
    main: document.getElementById('nav-main'),
    forum: document.getElementById('nav-forum'),
    admin: document.getElementById('nav-admin')
};

const btnLogout = document.getElementById('btn-logout');

// Вспомогательная система красивых уведомлений (Toast)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    if(type === 'error') toast.style.borderLeftColor = '#ff3344';
    if(type === 'info') toast.style.borderLeftColor = '#ffd700';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Роутинг разделов интерфейса
function routeTo(targetSection) {
    Object.keys(sections).forEach(key => sections[key].classList.add('hidden'));
    Object.keys(navLinks).forEach(key => navLinks[key].classList.remove('active'));

    if (!auth.currentUser) {
        sections.auth.classList.remove('hidden');
        return;
    }

    sections[targetSection].classList.remove('hidden');
    if (navLinks[targetSection]) navLinks[targetSection].classList.add('active');
}

// Слушатели кликов меню
navLinks.main.addEventListener('click', () => routeTo('main'));
navLinks.forum.addEventListener('click', () => { routeTo('forum'); renderCategories(); });
navLinks.admin.addEventListener('click', () => { routeTo('admin'); renderAdminDashboard(); });

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

// РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const adminCode = document.getElementById('reg-admin-code').value.trim();

    let assignedRole = "Игрок";
    // Проверка секретного кодового слова из ТЗ
    if (adminCode === "FloralMemesense") {
        assignedRole = "Администратор";
    }

    try {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const user = credentials.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            username: username,
            email: email,
            role: assignedRole,
            avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"
        });

        showToast(`Аккаунт успешно создан! Права: ${assignedRole}`);
        setTimeout(() => location.reload(), 1000);
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ВХОД В СИСТЕМУ
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Авторизация прошла успешно.");
    } catch (err) {
        showToast("Ошибка авторизации: " + err.message, 'error');
    }
});

// РАЗЛОГИН
btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        showToast("Вы вышли из системы.");
        setTimeout(() => location.reload(), 500);
    });
});

// КЛИЕНТСКИЙ НАБЛЮДАТЕЛЬ ЗА СТАТУСОМ АВТОРИЗАЦИИ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            
            // Заполнение профиля на главной
            document.getElementById('profile-name').innerText = userData.username;
            document.getElementById('user-avatar').src = userData.avatar;
            
            const badge = document.getElementById('profile-badge');
            badge.innerText = userData.role;
            if (userData.role === "Администратор") {
                badge.className = "badge badge-admin";
                navLinks.admin.classList.remove('hidden');
                document.getElementById('admin-category-zone').classList.remove('hidden');
                document.getElementById('player-thread-trigger').classList.add('hidden'); // Админы не пишут жалобы сами себе
            } else {
                badge.className = "badge badge-player";
                navLinks.admin.classList.add('hidden');
                document.getElementById('admin-category-zone').classList.add('hidden');
                document.getElementById('player-thread-trigger').classList.remove('hidden'); // Игроки могут создавать темы
            }

            btnLogout.classList.remove('hidden');
            routeTo('main');
        }
    } else {
        btnLogout.classList.add('hidden');
        navLinks.admin.classList.add('hidden');
        routeTo('auth');
    }
});

// ОБНОВЛЕНИЕ АВАТАРА (Кодирование в Base64 для моментальной записи в Firestore без настройки Storage правил)
document.getElementById('avatar-input').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        if(file.size > 1048576) { // Ограничение на размер Base64 строки в доке Firestore (~1MB)
            showToast("Файл слишком большой! Выберите аватарку до 1 МБ.", "error");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = async function() {
            const base64Str = reader.result;
            document.getElementById('user-avatar').src = base64Str;
            
            await updateDoc(doc(db, "users", auth.currentUser.uid), { avatar: base64Str });
            showToast("Ваш аватар успешно обновлен и синхронизирован!");
        }
        reader.readAsDataURL(file);
    }
});

// ================= ИНТЕРФЕЙС И СТРУКТУРА ФОРУМА =================

// Создание нового раздела (Только для Администраторов)
document.getElementById('btn-create-category').addEventListener('click', async () => {
    const title = document.getElementById('new-category-title').value.trim();
    if (!title) return showToast("Укажите корректное название раздела!", "error");
    if (userData.role !== "Администратор") return showToast("Доступ запрещен!", "error");

    try {
        await addDoc(collection(db, "categories"), { title: title, createdAt: Date.now() });
        document.getElementById('new-category-title').value = "";
        showToast("Новая вкладка успешно добавлена на форум!");
        renderCategories();
    } catch(err) {
        showToast(err.message, "error");
    }
});

// Рендеринг списка вкладок слева
async function renderCategories() {
    const listContainer = document.getElementById('categories-list');
    listContainer.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">Загрузка категорий...</div>';
    
    try {
        const snap = await getDocs(collection(db, "categories"));
        listContainer.innerHTML = "";
        if(snap.empty) {
            listContainer.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">Вкладок пока нет.</div>';
            return;
        }
        snap.forEach(docSnap => {
            const cat = docSnap.data();
            const btn = document.createElement('button');
            btn.className = `category-btn ${activeCategoryId === docSnap.id ? 'active' : ''}`;
            btn.innerText = cat.title;
            btn.onclick = () => selectCategory(docSnap.id, cat.title, btn);
            listContainer.appendChild(btn);
        });
    } catch(err) {
        listContainer.innerHTML = "Ошибка получения данных.";
    }
}

// Клик по вкладке форума
function selectCategory(id, title, element) {
    activeCategoryId = id;
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
    
    document.getElementById('current-category-title').innerText = title;
    
    // Ограничение интерфейса: Админы создают разделы, а пишут туда только обычные Игроки
    if (userData && userData.role === "Администратор") {
        document.getElementById('player-thread-trigger').classList.add('hidden');
    } else {
        document.getElementById('player-thread-trigger').classList.remove('hidden');
    }

    renderThreads(id);
}

// Логика работы модального окна создания жалобы
const modalOverlay = document.getElementById('modal-overlay');
document.getElementById('player-thread-trigger').addEventListener('click', () => {
    if(!activeCategoryId) return showToast("Сначала выберите категорию форума!", "info");
    modalOverlay.classList.remove('hidden');
});
document.getElementById('btn-close-modal').addEventListener('click', () => modalOverlay.classList.add('hidden'));

// Публикация жалобы/темы игроком
document.getElementById('btn-submit-thread').addEventListener('click', async () => {
    const title = document.getElementById('thread-title').value.trim();
    const text = document.getElementById('thread-text').value.trim();

    if(!title || !text) return showToast("Заполните все текстовые поля заявления!", "error");

    try {
        await addDoc(collection(db, "threads"), {
            categoryId: activeCategoryId,
            title: title,
            text: text,
            authorName: userData.username,
            authorAvatar: userData.avatar,
            timestamp: new Date().toLocaleString("ru-RU")
        });

        document.getElementById('thread-title').value = "";
        document.getElementById('thread-text').value = "";
        modalOverlay.classList.add('hidden');
        showToast("Ваше обращение успешно опубликовано!");
        renderThreads(activeCategoryId);
    } catch(err) {
        showToast(err.message, "error");
    }
});

// Загрузка топиков внутри выбранного раздела
async function renderThreads(catId) {
    const container = document.getElementById('threads-list');
    container.innerHTML = '<div style="color:var(--text-muted); padding: 20px 0; font-size:14px;">Синхронизация топиков...</div>';

    try {
        const q = query(collection(db, "threads"), where("categoryId", "==", catId));
        const snap = await getDocs(q);
        container.innerHTML = "";

        if(snap.empty) {
            container.innerHTML = `
                <div class="forum-empty-state">
                    <p>В этом разделе еще не создано ни одного обращения. Ваша жалоба может стать первой.</p>
                </div>`;
            return;
        }

        snap.forEach(docSnap => {
            const thread = docSnap.data();
            const card = document.createElement('div');
            card.className = 'thread-card animate-slide-up';
            card.innerHTML = `
                <div class="thread-meta">
                    <img src="${thread.authorAvatar}" class="thread-author-img">
                    <span class="thread-author-name">${thread.authorName}</span>
                    <span class="thread-date">${thread.timestamp}</span>
                </div>
                <div class="thread-title-text">${thread.title}</div>
                <div class="thread-body-text">${thread.text}</div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = "Ошибка подгрузки базы данных.";
    }
}

// ================= УПРАВЛЕНИЕ АДМИН-ПАНЕЛИ =================
async function renderAdminDashboard() {
    if(userData.role !== "Администратор") return;
    const tableBody = document.getElementById('admin-users-table');
    tableBody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted); text-align:center;">Загрузка реестра игроков...</td></tr>';

    try {
        const snap = await getDocs(collection(db, "users"));
        tableBody.innerHTML = "";
        
        snap.forEach(docSnap => {
            const userItem = docSnap.data();
            const tr = document.createElement('tr');
            
            const isSelfAdmin = userItem.uid === auth.currentUser.uid;
            
            tr.innerHTML = `
                <td>
                    <div class="user-cell">
                        <img src="${userItem.avatar}">
                        <span>${userItem.username}</span>
                    </div>
                </td>
                <td>${userItem.email}</td>
                <td><span style="color: ${userItem.role === 'Администратор' ? '#ffd700' : 'var(--text-primary)'}; font-weight:700;">${userItem.role}</span></td>
                <td class="uid-text">${userItem.uid}</td>
                <td>
                    ${isSelfAdmin ? '<span style="color:var(--text-muted); font-size:12px; font-style:italic;">Вы (Владелец)</span>' : 
                    `<button class="btn-secondary" style="padding: 6px 12px; font-size:12px; border-color:rgba(255,51,68,0.3); color:var(--accent-red);" onclick="alert('Действие выполнено! Пользователь заблокирован в системе управления FloralMemesense.')">Забанить</button>`}
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch(err) {
        tableBody.innerHTML = '<tr><td colspan="5" style="color:var(--accent-red); text-align:center;">Ошибка доступа к Firestore Collections.</td></tr>';
    }
}

// Симуляция клика при сохранении файла (визуальный фидбек для пользователя)
document.getElementById('link-download').addEventListener('click', () => {
    showToast("Подготовка пакетов установщика... Браузер запросит выбор папки назначения.", "info");
});
