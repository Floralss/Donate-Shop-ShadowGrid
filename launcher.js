document.getElementById("sendMessage").onclick = () => {
const msg = document.getElementById("message").value;

const div = document.createElement("div");
div.innerHTML = "<p>"+msg+"</p>";

document.getElementById("messages").appendChild(div);
};
