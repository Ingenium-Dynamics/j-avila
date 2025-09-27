let fuse;

db.collection("faq").get().then(snapshot => {
  const faqs = [];
  snapshot.forEach(doc => faqs.push(doc.data()));
  
  const options = {
    keys: ["pregunta"], // campo donde buscar
    threshold: 0.4      // tolerancia (0 exacto, 1 muy laxo)
  };

  fuse = new Fuse(faqs, options);
});






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
  /*
  function sendMessage() {
    const input = document.getElementById("user-input");
    const text = input.value.trim();
    if (!text) return;
  
    appendMessage("Tú", text);
    input.value = "";
  
    // Traer todas las FAQs
    db.collection("faq").get().then(snapshot => {
      let found = false;
      snapshot.forEach(doc => {
        const faq = doc.data();
        // Coincidencia flexible: si la pregunta contiene alguna parte
        if (text.toLowerCase().includes(faq.pregunta.toLowerCase()) || faq.pregunta.toLowerCase().includes(text.toLowerCase())) {
          appendMessage("Bot", faq.respuesta);
          found = true;
        }
      });
  
      if (!found) {
        // Guardar como pendiente
        db.collection("pendientes").add({ 
          pregunta: text, 
          fecha: new Date().toISOString() 
        });
  
        // Respuesta fallback con WhatsApp clickeable
        appendMessage("Bot", "Lo siento, esa información no está disponible. ¿Quieres enviarla por WhatsApp?");
        appendMessage("Bot", `👉 <a href="https://wa.me/1234567890?text=${encodeURIComponent(text)}" target="_blank">Enviar por WhatsApp</a>`, true);
      }
    });
  }*/
 
    function sendMessage() {
      const input = document.getElementById("user-input");
      const text = input.value.trim();
      if (!text) return;
    
      appendMessage("Tú", text);
      input.value = "";
    
      if (fuse) {
        const result = fuse.search(text);
    
        if (result.length > 0 && result[0].score < 0.5) {
          // 👉 encontramos una coincidencia decente
          appendMessage("Bot", result[0].item.respuesta);
          return;
        }
      }
    
      // Si no encontró nada convincente → mandar a pendientes
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
  