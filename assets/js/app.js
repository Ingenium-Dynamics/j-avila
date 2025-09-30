let fuse;
let faqs = [];
let embeddings = [];
let keywordIndex = new Map();

// Cargar FAQs desde Firestore
async function loadFAQs() {
  try {
    const snapshot = await db.collection("faq").get();
    
    faqs = [];
    embeddings = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      data.id = doc.id;
      faqs.push(data);
      
      // Generar embedding local para esta FAQ
      const embedding = generateEmbedding(data.pregunta);
      embeddings.push(embedding);
    });

    console.log(`✅ FAQs cargadas: ${faqs.length}`);

    // Configurar Fuse.js
    const options = {
      includeScore: true,
      threshold: 0.3,
      keys: ['pregunta'],
      findAllMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
      includeMatches: true
    };
    fuse = new Fuse(faqs, options);
    
    // Construir índice de keywords para búsqueda semántica mejorada
    buildKeywordIndex();
    
    console.log('✅ Chatbot completamente inicializado');
    
  } catch (error) {
    console.error('❌ Error cargando FAQs:', error);
  }
}

// Normalizar texto
function normalizar(texto) {
  if (typeof texto !== 'string') {
    return String(texto || '').toLowerCase();
  }
  
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(el|la|lo|de|que|y|en|a|con|por|para|sin|sobre|bajo|entre|hacia|desde|se|un|una|unos|unas|su|sus|al|del|es|son|como|mas)\b/g, " ")
    .replace(/\s+/g, ' ')
    .trim();
}

// Construir índice de keywords para búsqueda semántica
function buildKeywordIndex() {
  keywordIndex.clear();
  
  faqs.forEach((faq, index) => {
    const palabras = extractKeywords(faq.pregunta);
    
    palabras.forEach(palabra => {
      if (!keywordIndex.has(palabra)) {
        keywordIndex.set(palabra, []);
      }
      keywordIndex.get(palabra).push({
        faqIndex: index,
        pregunta: faq.pregunta
      });
    });
  });
  
  console.log(`✅ Índice de keywords construido: ${keywordIndex.size} palabras`);
}

// Extraer keywords importantes
function extractKeywords(texto) {
  const normalizado = normalizar(texto);
  return normalizado
    .split(' ')
    .filter(palabra => palabra.length > 3) // Palabras de más de 3 letras
    .filter(palabra => !/[0-9]/.test(palabra)) // Excluir números
    .slice(0, 10); // Máximo 10 palabras por pregunta
}

// Generar embedding local mejorado
function generateEmbedding(texto) {
  const normalizado = normalizar(texto);
  const palabras = extractKeywords(normalizado);
  const dimension = 100; // Dimensión reducida para eficiencia
  
  const embedding = new Float32Array(dimension).fill(0);
  
  palabras.forEach(palabra => {
    const hash = advancedHash(palabra);
    // Distribuir la palabra en múltiples posiciones del embedding
    for (let i = 0; i < 5; i++) {
      const pos = (hash + i * 13) % dimension;
      embedding[pos] += 0.2;
    }
  });
  
  // Normalizar
  return normalizeVector(embedding);
}

// Hash más avanzado
function advancedHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32-bit
  }
  return Math.abs(hash);
}

// Normalizar vector
function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    return vector.map(val => val / norm);
  }
  return vector;
}

// Similaridad coseno
function coseno(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dot = 0.0, normA = 0.0, normB = 0.0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return isNaN(similarity) ? 0 : Math.max(0, similarity);
}

// Búsqueda semántica local MEJORADA
function semanticSearch(userEmbedding, threshold = 0.6) {
  if (!userEmbedding || embeddings.length === 0) return null;
  
  let bestScore = -1;
  let bestFaq = null;
  
  embeddings.forEach((emb, i) => {
    const score = coseno(userEmbedding, emb);
    if (score > bestScore) {
      bestScore = score;
      bestFaq = faqs[i];
    }
  });
  
  console.log(`📊 Mejor score semántico: ${bestScore.toFixed(4)}`);
  
  return bestScore >= threshold ? { faq: bestFaq, score: bestScore } : null;
}

// Búsqueda por keywords (alternativa semántica)
function keywordSearch(query) {
  const queryKeywords = extractKeywords(query);
  if (queryKeywords.length === 0) return null;
  
  const faqScores = new Array(faqs.length).fill(0);
  
  // Calcular scores basados en coincidencias de keywords
  queryKeywords.forEach(keyword => {
    if (keywordIndex.has(keyword)) {
      keywordIndex.get(keyword).forEach(({ faqIndex }) => {
        faqScores[faqIndex] += 1;
      });
    }
  });
  
  // Encontrar el mejor score
  let bestScore = 0;
  let bestIndex = -1;
  
  faqScores.forEach((score, index) => {
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  
  // Normalizar score (0-1)
  const normalizedScore = bestScore / queryKeywords.length;
  
  if (bestIndex !== -1 && normalizedScore > 0.3) {
    console.log(`✅ Encontrado con keywords: "${faqs[bestIndex].pregunta}" (score: ${normalizedScore.toFixed(2)})`);
    return { 
      faq: faqs[bestIndex], 
      score: normalizedScore 
    };
  }
  
  return null;
}

// Búsqueda con Fuse.js
function fuseSearch(query) {
  if (!fuse) return null;
  
  const normalizedQuery = normalizar(query);
  const results = fuse.search(normalizedQuery);
  
  if (results.length > 0 && results[0].score < 0.4) {
    console.log(`✅ Encontrado con Fuse: "${results[0].item.pregunta}" (score: ${results[0].score.toFixed(4)})`);
    return { 
      faq: results[0].item, 
      score: results[0].score 
    };
  }
  
  return null;
}

// Función principal mejorada
async function sendMessage() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  
  if (!text || text.length < 2) {
    appendMessage("Bot", "Por favor, escribe una pregunta más específica.", true);
    return;
  }

  appendMessage("Tú", text);
  input.value = "";
  
  showTypingIndicator();

  // Pequeño delay para mejor UX
  await new Promise(resolve => setTimeout(resolve, 800));

  try {
    console.log('🔍 Buscando respuesta...');
    
    // ESTRATEGIA EN 3 NIVELES:
    
    // 1. Búsqueda exacta con Fuse.js (más rápida)
    const fuseResult = fuseSearch(text);
    if (fuseResult) {
      appendMessage("Bot", fuseResult.faq.respuesta, true);
      hideTypingIndicator();
      return;
    }

    // 2. Búsqueda por keywords (semántica básica)
    const keywordResult = keywordSearch(text);
    if (keywordResult) {
      appendMessage("Bot", keywordResult.faq.respuesta, true);
      hideTypingIndicator();
      return;
    }

    // 3. Búsqueda semántica con embeddings locales
    const userEmbedding = generateEmbedding(text);
    const semanticResult = semanticSearch(userEmbedding, 0.55);
    
    if (semanticResult) {
      appendMessage("Bot", semanticResult.faq.respuesta, true);
      hideTypingIndicator();
      return;
    }

    // Si no encuentra en ninguna estrategia
    console.log('💾 Guardando pregunta pendiente...');
    
    await db.collection("pendientes").add({
      pregunta: text,
      fecha: new Date().toISOString(),
      timestamp: new Date(),
      procesado: false
    });

    const whatsappText = `Hola, tengo esta consulta: "${text}"`;
    appendMessage("Bot", 
      `No encontré una respuesta específica en mi base de conocimientos. ¿Te gustaría que un ejecutivo te contacte?`, 
      true
    );
    appendMessage("Bot", 
      `👉 <a href="https://wa.me/1234567890?text=${encodeURIComponent(whatsappText)}" target="_blank" class="whatsapp-link">Contactar por WhatsApp</a>`, 
      true
    );

  } catch (error) {
    console.error('❌ Error:', error);
    appendMessage("Bot", "Lo siento, hubo un error. Por favor, intenta nuevamente.", true);
  } finally {
    hideTypingIndicator();
  }
}

// Funciones de UI (sin cambios)
function showTypingIndicator() {
  const chatBody = document.getElementById("chat-body");
  const typing = document.createElement("div");
  typing.id = "typing-indicator";
  typing.className = "msg-bot typing";
  typing.innerHTML = "Bot: <em>Escribiendo...</em>";
  chatBody.appendChild(typing);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function hideTypingIndicator() {
  const typing = document.getElementById("typing-indicator");
  if (typing) typing.remove();
}

function appendMessage(sender, text, html = false) {
  const chatBody = document.getElementById("chat-body");
  const msg = document.createElement("div");
  msg.className = sender === "Tú" ? "msg-user" : "msg-bot";
  
  if (html) {
    msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  } else {
    msg.textContent = `${sender}: ${text}`;
  }
  
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function toggleChat() {
  const chat = document.getElementById("chat-window");
  chat.style.display = (chat.style.display === "none" || chat.style.display === "") ? "block" : "none";
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando chatbot inteligente...');
  loadFAQs();
});