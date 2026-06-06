import { auth } from "./firebase.js";
import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");

if(registerBtn){
registerBtn.onclick = async () => {
const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

await createUserWithEmailAndPassword(auth, email, password);

alert("Аккаунт создан");
};
}

if(loginBtn){
loginBtn.onclick = async () => {
const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

await signInWithEmailAndPassword(auth, email, password);

alert("Вы вошли");
};
}
