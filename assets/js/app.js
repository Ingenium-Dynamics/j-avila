let fuse;

// Cargar FAQs desde Firebase y crear índice Fuse
db.collection("faq").get().then(snapshot => {
  const faqs = [];
  snapshot.forEach(doc => faqs.push(doc.data()));
  
  const options = {
    includeScore: true,
    threshold: 0.4,  // mientras más alto, más tolerante (0.3–0.6 suele funcionar bien)
    keys: ['pregunta']
  };

  /*const options = {
    keys: ["pregunta"],
    threshold: 0.4,  // tolerancia (0 exacto, 1 laxo)
  };*/

  fuse = new Fuse(faqs, options);
});

function sendMessage() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text) return;

  appendMessage("Tú", text);
  input.value = "";
/*
  if (fuse) {
    const result = fuse.search(text);

    if (result.length > 0) {
      const mejor = result[0]; // mejor coincidencia
      appendMessage("Bot", mejor.item.respuesta);
      return;
    }
  }*/
    if (fuse) {
      const normalizada = normalizar(text);
      const result = fuse.search(normalizada);
      //const result = fuse.search(text);
    
      if (result.length > 0) {
        const mejor = result[0];
        console.log("Mejor coincidencia:", mejor);
    
        // Fuse devuelve un score (0 perfecto, 1 muy malo).
        if (mejor.score < 0.4) {  
          appendMessage("Bot", mejor.item.respuesta,true);
          return;
        }
      }
    }

  // Si no se encuentra nada → guardar en pendientes
  db.collection("pendientes").add({
    pregunta: text,
    fecha: new Date().toISOString()
  });

  appendMessage("Bot", "Lo siento, esa información no está disponible. ¿Quieres enviarla por WhatsApp?");
  appendMessage("Bot", `👉 <a href="https://wa.me/1234567890?text=${encodeURIComponent(text)}" target="_blank">Enviar por WhatsApp</a>`, true);
}

function appendMessage(sender, text, html = false) {
  const chatBody = document.getElementById("chat-body");
  const msg = document.createElement("div");
  msg.className = sender === "Tú" ? "msg-user" : "msg-bot";
  if (html) {
    msg.innerHTML = `${sender}: ${text}`;
  } else {
    msg.textContent = `${sender}: ${text}`;
  }
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function toggleChat() {
  const chat = document.getElementById("chat-window");
  chat.style.display = (chat.style.display === "none") ? "block" : "none";
}

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/\b(en|que|estan|esta|es|la|el)\b/g, "") // stopwords básicas
    .trim();
}