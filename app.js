import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Твой проверенный конфиг Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCDdPwaB8mH9TsM5hyXFbF0fNpFaWXjmV0",
  authDomain: "novus-roleplay.firebaseapp.com",
  projectId: "novus-roleplay",
  storageBucket: "novus-roleplay.firebasestorage.app",
  messagingSenderId: "207082104048",
  appId: "1:207082104048:web:bbf438aba78c9a7e79ce35",
  measurementId: "G-V0LK42BXRT"
};

// Инициализация сервисов с проверкой связи
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (configError) {
    alert("Критическая ошибка конфигурации Firebase! Проверь интернеты или ключи доступа: " + configError.message);
}

let userData = null;
let activeCategoryId = null;

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

// Улучшенная система уведомлений (Тосты)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        // Если контейнер еще не прогрузился, используем обычный алерт, чтоб не терять инфу
        alert(`${type.toUpperCase()}: ${message}`);
        return;
    }
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
    }, 5000);
}

function routeTo(targetSection) {
    Object.keys(sections).forEach(key => {
        if(sections[key]) sections[key].classList.add('hidden');
    });
    Object.keys(navLinks).forEach(key => {
        if(navLinks[key]) navLinks[key].classList.remove('active');
    });

    if (!auth || !auth.currentUser) {
        if(sections.auth) sections.auth.classList.remove('hidden');
        return;
    }

    if(sections[targetSection]) sections[targetSection].classList.remove('hidden');
    if (navLinks[targetSection]) navLinks[targetSection].classList.add('active');
}

// Навигация
if(navLinks.main) navLinks.main.addEventListener('click', () => routeTo('main'));
if(navLinks.forum) navLinks.forum.addEventListener('click', () => { routeTo('forum'); renderCategories(); });
if(navLinks.admin) navLinks.admin.addEventListener('click', () => { routeTo('admin'); renderAdminDashboard(); });

// Переключение табов Вход / Регистрация
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
if(tabLogin && tabRegister) {
    tabLogin.addEventListener('click', (e) => {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
        e.target.classList.add('active');
        tabRegister.classList.remove('active');
    });

    tabRegister.addEventListener('click', (e) => {
        document.getElementById('register-form').classList.remove('hidden');
        document.getElementById('login-form').classList.add('hidden');
        e.target.classList.add('active');
        tabLogin.classList.remove('active');
    });
}

// РЕГИСТРАЦИЯ С РАСШИФРОВКОЙ ОШИБОК
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const adminCode = document.getElementById('reg-admin-code').value.trim();

    let assignedRole = "Игрок";
    if (adminCode === "FloralMemesense") {
        assignedRole = "Администратор";
    }

    try {
        // Шаг 1: Создание учетки в Authentication
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const user = credentials.user;

        // Шаг 2: Запись профиля в базу данных Firestore
        try {
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username: username,
                email: email,
                role: assignedRole,
                avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"
            });
            showToast(`Аккаунт успешно создан! Роль: ${assignedRole}`);
            setTimeout(() => location.reload(), 1000);
        } catch (firestoreError) {
            console.error(firestoreError);
            showToast("Аккаунт создан в Auth, но БД Firestore заблокировала запись профиля! Проверь вкладку Rules (Правила) в Firestore.", "error");
        }

    } catch (err) {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
            showToast("Этот Email уже занят другим игроком!", "error");
        } else if (err.code === 'auth/weak-password') {
            showToast("Слишком простой пароль! Сделай минимум 6 символов.", "error");
        } else if (err.code === 'auth/invalid-email') {
            showToast("Неверный формат Email адреса.", "error");
        } else if (err.code === 'auth/operation-not-allowed') {
            showToast("Авторизация по Email/Паролю ОТКЛЮЧЕНА в твоей панели Firebase Console!", "error");
        } else {
            showToast(`Ошибка Firebase Auth: ${err.message}`, "error");
        }
    }
});

// ВХОД В СИСТЕМУ С РАСШИФРОВКОЙ ОШИБОК
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Авторизация прошла успешно!");
    } catch (err) {
        console.error(err);
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            showToast("Неверный Email или Пароль!", "error");
        } else {
            showToast(`Ошибка входа: ${err.message}`, "error");
        }
    }
});

// РАЗЛОГИН
if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth).then(() => {
            showToast("Вы вышли из системы.");
            setTimeout(() => location.reload(), 500);
        });
    });
}

// НАБЛЮДАТЕЛЬ ЗА СТАТУСОМ
if(auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    userData = userDoc.data();
                    
                    document.getElementById('profile-name').innerText = userData.username;
                    document.getElementById('user-avatar').src = userData.avatar;
                    
                    const badge = document.getElementById('profile-badge');
                    badge.innerText = userData.role;
                    if (userData.role === "Администратор") {
                        badge.className = "badge badge-admin";
                        if(navLinks.admin) navLinks.admin.classList.remove('hidden');
                        document.getElementById('admin-category-zone').classList.remove('hidden');
                        document.getElementById('player-thread-trigger').classList.add('hidden');
                    } else {
                        badge.className = "badge badge-player";
                        if(navLinks.admin) navLinks.admin.classList.add('hidden');
                        document.getElementById('admin-category-zone').classList.add('hidden');
                        document.getElementById('player-thread-trigger').classList.remove('hidden');
                    }

                    if(btnLogout) btnLogout.classList.remove('hidden');
                    routeTo('main');
                } else {
                    showToast("Профиль авторизован, но данные игрока в Firestore не найдены.", "info");
                }
            } catch(e) {
                showToast("Ошибка чтения профиля из Firestore: " + e.message, "error");
            }
        } else {
            if(btnLogout) btnLogout.classList.add('hidden');
            if(navLinks.admin) navLinks.admin.classList.add('hidden');
            routeTo('auth');
        }
    });
}

// СМЕНА АВАТАРА
const avatarInput = document.getElementById('avatar-input');
if(avatarInput) {
    avatarInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if(file.size > 1048576) {
                showToast("Файл слишком тяжелый! Нужна картинка до 1 МБ.", "error");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async function() {
                const base64Str = reader.result;
                document.getElementById('user-avatar').src = base64Str;
                try {
                    await updateDoc(doc(db, "users", auth.currentUser.uid), { avatar: base64Str });
                    showToast("Аватар успешно изменен!");
                } catch(e) {
                    showToast("База данных отклонила сохранение аватара: " + e.message, "error");
                }
            }
            reader.readAsDataURL(file);
        }
    });
}

// ================= ФОРУМ =================
const btnCreateCategory = document.getElementById('btn-create-category');
if(btnCreateCategory) {
    btnCreateCategory.addEventListener('click', async () => {
        const title = document.getElementById('new-category-title').value.trim();
        if (!title) return showToast("Укажите название раздела!", "error");

        try {
            await addDoc(collection(db, "categories"), { title: title, createdAt: Date.now() });
            document.getElementById('new-category-title').value = "";
            showToast("Новый раздел форума успешно создан!");
            renderCategories();
        } catch(err) {
            showToast("Не удалось создать раздел: " + err.message, "error");
        }
    });
}

async function renderCategories() {
    const listContainer = document.getElementById('categories-list');
    if(!listContainer) return;
    listContainer.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">Синхронизация...</div>';
    
    try {
        const snap = await getDocs(collection(db, "categories"));
        listContainer.innerHTML = "";
        if(snap.empty) {
            listContainer.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">Разделов пока нет.</div>';
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
        listContainer.innerHTML = "Ошибка чтения категорий: " + err.message;
    }
}

function selectCategory(id, title, element) {
    activeCategoryId = id;
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('current-category-title').innerText = title;
    
    if (userData && userData.role === "Администратор") {
        document.getElementById('player-thread-trigger').classList.add('hidden');
    } else {
        document.getElementById('player-thread-trigger').classList.remove('hidden');
    }
    renderThreads(id);
}

const modalOverlay = document.getElementById('modal-overlay');
const playerThreadTrigger = document.getElementById('player-thread-trigger');
if(playerThreadTrigger) {
    playerThreadTrigger.addEventListener('click', () => {
        if(!activeCategoryId) return showToast("Сначала выберите категорию форума справа!", "info");
        if(modalOverlay) modalOverlay.classList.remove('hidden');
    });
}
const btnCloseModal = document.getElementById('btn-close-modal');
if(btnCloseModal && modalOverlay) {
    btnCloseModal.addEventListener('click', () => modalOverlay.classList.add('hidden'));
}

const btnSubmitThread = document.getElementById('btn-submit-thread');
if(btnSubmitThread) {
    btnSubmitThread.addEventListener('click', async () => {
        const title = document.getElementById('thread-title').value.trim();
        const text = document.getElementById('thread-text').value.trim();

        if(!title || !text) return showToast("Заполните все поля жалобы!", "error");

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
            if(modalOverlay) modalOverlay.classList.add('hidden');
            showToast("Обращение успешно отправлено!");
            renderThreads(activeCategoryId);
        } catch(err) {
            showToast("Ошибка отправки темы: " + err.message, "error");
        }
    });
}

async function renderThreads(catId) {
    const container = document.getElementById('threads-list');
    if(!container) return;
    container.innerHTML = '<div style="color:var(--text-muted); padding: 20px 0; font-size:14px;">Загрузка топиков...</div>';

    try {
        const q = query(collection(db, "threads"), where("categoryId", "==", catId));
        const snap = await getDocs(q);
        container.innerHTML = "";

        if(snap.empty) {
            container.innerHTML = `
                <div class="forum-empty-state">
                    <p>В этом разделе еще не создано ни одного обращения.</p>
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
        container.innerHTML = "Ошибка базы данных форума: " + err.message;
    }
}

// ================= АДМИНКА =================
async function renderAdminDashboard() {
    if(!userData || userData.role !== "Администратор") return;
    const tableBody = document.getElementById('admin-users-table');
    if(!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted); text-align:center;">Загрузка списка...</td></tr>';

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
                    `<button class="btn-secondary" style="padding: 6px 12px; font-size:12px; border-color:rgba(255,51,68,0.3); color:var(--accent-red);" onclick="alert('Игрок заблокирован!')">Забанить</button>`}
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch(err) {
        tableBody.innerHTML = `<tr><td colspan="5" style="color:var(--accent-red); text-align:center;">Ошибка Firestore: ${err.message}</td></tr>`;
    }
}

const linkDownload = document.getElementById('link-download');
if(linkDownload) {
    linkDownload.addEventListener('click', () => {
        showToast("Началось скачивание лаунчера! Выберите место сохранения.", "info");
    });
}
