function toggleChat() {
    const chat = document.getElementById("chat-window");
    chat.style.display = (chat.style.display === "none") ? "block" : "none";
  }
  
  function appendMessage(sender, text) {
    const chatBody = document.getElementById("chat-body");
    const msg = document.createElement("div");
    msg.textContent = `${sender}: ${text}`;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
  
  function sendMessage() {
    const input = document.getElementById("user-input");
    const text = input.value;
    if (!text) return;
  
    appendMessage("Tú", text);
    input.value = "";
  
    // Buscar en Firebase si existe respuesta
    db.collection("faq").where("pregunta", "==", text).get().then(snapshot => {
      if (!snapshot.empty) {
        snapshot.forEach(doc => appendMessage("Bot", doc.data().respuesta));
      } else {
        // Guardar en "pendientes"
        db.collection("pendientes").add({ pregunta: text, fecha: new Date() });
        
        // Respuesta fallback con WhatsApp
        appendMessage("Bot", "Lo siento, esa información no está disponible. ¿Quieres enviarla por WhatsApp?");
        appendMessage("Bot", "👉 <a href='https://wa.me/1234567890?text=" + encodeURIComponent(text) + "' target='_blank'>Enviar por WhatsApp</a>", true);

       // appendMessage("Bot", "👉 <a href='https://wa.me/1234567890?text=" + encodeURIComponent(text) + "' target='_blank'>Enviar por WhatsApp</a>");
      }
    });
  }

  function appendMessage(sender, text, html=false) {
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