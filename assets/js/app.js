let fuse;
let faqs = [];
let embeddings = [];
let keywordIndex = new Map();
let synonymMap = new Map();

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

        // Configurar Fuse.js con opciones mejoradas
        const options = {
            includeScore: true,
            threshold: 0.4,
            keys: ['pregunta'],
            findAllMatches: true,
            minMatchCharLength: 2,
            ignoreLocation: true,
            includeMatches: true,
            shouldSort: true
        };
        fuse = new Fuse(faqs, options);
        
        // Construir índices mejorados
        buildEnhancedIndex();
        
        console.log('✅ Chatbot completamente inicializado');
        
    } catch (error) {
        console.error('❌ Error cargando FAQs:', error);
    }
}

// MEJORA: Construir índice mejorado con sinónimos y expansión semántica
function buildEnhancedIndex() {
    keywordIndex.clear();
    synonymMap.clear();
    
    // Definir sinónimos comunes en el dominio de limpieza
    const synonymGroups = [
        ['limpiar', 'limpian', 'limpieza', 'lavar', 'lavado', 'aseo', 'asear', 'higiene'],
        ['restaurante', 'restaurantes', 'comida rápida', 'cafetería', 'bar', 'hotel', 'cocina'],
        ['campana', 'campanas', 'extractor', 'extracción', 'ventilación'],
        ['freidora', 'freidoras', 'fryer', 'cocina', 'equipo'],
        ['desengrase', 'desengrasar', 'grasa', 'grasoso', 'aceite'],
        ['vapor', 'vaporizado', 'limpieza con vapor', 'vaporeta'],
        ['superficie', 'superficies', 'mesa', 'mesas', 'mostrador', 'piso'],
        ['servicio', 'servicios', 'ofrecen', 'ofrecemos', 'proveemos', 'brindamos'],
        ['empresa', 'compañía', 'negocio', 'empresas'],
        ['trabajo', 'trabajan', 'labor', 'servicio']
    ];
    
    // Construir mapa de sinónimos
    synonymGroups.forEach(group => {
        group.forEach(word => {
            synonymMap.set(word, group);
        });
    });
    
    // Construir índice de keywords expandido
    faqs.forEach((faq, index) => {
        const palabrasBase = extractKeywords(faq.pregunta);
        const palabrasExpandidas = expandirConSinonimos(palabrasBase);
        
        palabrasExpandidas.forEach(palabra => {
            if (!keywordIndex.has(palabra)) {
                keywordIndex.set(palabra, []);
            }
            keywordIndex.get(palabra).push({
                faqIndex: index,
                pregunta: faq.pregunta,
                peso: 1.0
            });
        });
    });
    
    console.log(`✅ Índice mejorado construido: ${keywordIndex.size} palabras`);
}

// MEJORA: Expandir palabras con sinónimos
function expandirConSinonimos(palabras) {
    const expandidas = new Set();
    
    palabras.forEach(palabra => {
        expandidas.add(palabra);
        
        // Agregar sinónimos si existen
        if (synonymMap.has(palabra)) {
            synonymMap.get(palabra).forEach(sinonimo => {
                expandidas.add(sinonimo);
            });
        }
    });
    
    return Array.from(expandidas);
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
        .replace(/\b(el|la|lo|de|que|y|en|a|con|por|para|sin|sobre|bajo|entre|hacia|desde|se|un|una|unos|unas|su|sus|al|del|es|son|como|mas|más)\b/g, " ")
        .replace(/\s+/g, ' ')
        .trim();
}

// MEJORA: Extracción de keywords más inteligente
function extractKeywords(texto) {
    const normalizado = normalizar(texto);
    const palabras = normalizado.split(' ');
    
    return palabras
        .filter(palabra => palabra.length > 2)
        .filter(palabra => !/[0-9]/.test(palabra))
        .filter(palabra => !esPalabraComun(palabra))
        .slice(0, 8);
}

// MEJORA: Lista de palabras comunes a excluir
function esPalabraComun(palabra) {
    const comunes = [
        'para', 'con', 'los', 'las', 'del', 'que', 'como', 'mas', 'más',
        'este', 'esta', 'esto', 'ese', 'esa', 'eso', 'aqui', 'alli',
        'donde', 'cuando', 'como', 'porque', 'tambien', 'ademas',
        'pero', 'aunque', 'mientras', 'despues', 'antes', 'siempre',
        'nunca', 'puede', 'pueden', 'debe', 'deben', 'quiero', 'necesito'
    ];
    return comunes.includes(palabra);
}

// MEJORA: Generación de embeddings más contextual
function generateEmbedding(texto) {
    const normalizado = normalizar(texto);
    const palabras = extractKeywords(normalizado);
    const palabrasExpandidas = expandirConSinonimos(palabras);
    const dimension = 128;
    
    const embedding = new Float32Array(dimension).fill(0);
    
    // Ponderar palabras por importancia
    palabrasExpandidas.forEach((palabra, index) => {
        const hash = advancedHash(palabra);
        const peso = 1.0 / (index + 1);
        
        for (let i = 0; i < 4; i++) {
            const pos = (hash + i * 17) % dimension;
            embedding[pos] += 0.3 * peso;
        }
    });
    
    return normalizeVector(embedding);
}

function advancedHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

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

// MEJORA: Búsqueda semántica con embeddings locales
function semanticSearch(userEmbedding, threshold = 0.5) {
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

// MEJORA: Búsqueda por keywords con puntuación semántica
function semanticKeywordSearch(query) {
    const queryKeywords = extractKeywords(query);
    const queryKeywordsExpandidas = expandirConSinonimos(queryKeywords);
    
    if (queryKeywordsExpandidas.length === 0) return null;
    
    const faqScores = new Array(faqs.length).fill(0);
    const faqMatches = new Array(faqs.length).fill(0);
    
    // Calcular scores basados en coincidencias expandidas
    queryKeywordsExpandidas.forEach(keyword => {
        if (keywordIndex.has(keyword)) {
            keywordIndex.get(keyword).forEach(({ faqIndex, peso }) => {
                faqScores[faqIndex] += peso;
                faqMatches[faqIndex]++;
            });
        }
    });
    
    // Encontrar el mejor match considerando múltiples factores
    let bestScore = 0;
    let bestIndex = -1;
    
    faqScores.forEach((score, index) => {
        const normalizedScore = score / queryKeywordsExpandidas.length;
        const matchBonus = faqMatches[index] > 1 ? 0.2 : 0;
        const finalScore = normalizedScore + matchBonus;
        
        if (finalScore > bestScore) {
            bestScore = finalScore;
            bestIndex = index;
        }
    });
    
    console.log(`🔍 Mejor score keywords: ${bestScore.toFixed(3)}`);
    
    if (bestIndex !== -1 && bestScore > 0.2) {
        console.log(`✅ Encontrado con keywords: "${faqs[bestIndex].pregunta}"`);
        return { 
            faq: faqs[bestIndex], 
            score: bestScore,
            type: 'keywords'
        };
    }
    
    return null;
}

// MEJORA: Búsqueda con Fuse.js más permisiva
function fuseSearch(query) {
    if (!fuse) return null;
    
    const normalizedQuery = normalizar(query);
    const results = fuse.search(normalizedQuery);
    
    if (results.length > 0) {
        console.log(`📊 Mejor resultado Fuse - Score: ${results[0].score.toFixed(4)}`);
        
        if (results[0].score < 0.5) {
            console.log(`✅ Encontrado con Fuse: "${results[0].item.pregunta}"`);
            return { 
                faq: results[0].item, 
                score: results[0].score,
                type: 'fuse'
            };
        }
    }
    
    // MEJORA: Intentar búsqueda parcial si no hay resultados exactos
    if (results.length === 0) {
        return fusePartialSearch(query);
    }
    
    return null;
}

// NUEVO: Búsqueda parcial para captar preguntas relacionadas
function fusePartialSearch(query) {
    const normalizedQuery = normalizar(query);
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 3);
    
    let bestResult = null;
    let bestScore = Infinity;
    
    // Buscar por cada palabra individualmente
    queryWords.forEach(word => {
        const results = fuse.search(word);
        if (results.length > 0 && results[0].score < bestScore) {
            bestResult = results[0];
            bestScore = results[0].score;
        }
    });
    
    if (bestResult && bestScore < 0.6) {
        console.log(`✅ Encontrado con búsqueda parcial: "${bestResult.item.pregunta}"`);
        return {
            faq: bestResult.item,
            score: bestScore,
            type: 'partial'
        };
    }
    
    return null;
}

// NUEVO: Búsqueda de emergencia - última opción
function emergencySearch(query) {
    const normalizedQuery = normalizar(query);
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 3);
    
    let bestMatch = null;
    let maxMatches = 0;
    
    faqs.forEach(faq => {
        const faqNormalized = normalizar(faq.pregunta);
        let matches = 0;
        
        queryWords.forEach(word => {
            if (faqNormalized.includes(word)) {
                matches++;
            }
        });
        
        if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = faq;
        }
    });
    
    if (bestMatch && maxMatches >= 1) {
        console.log(`🆘 Encontrado con búsqueda de emergencia: "${bestMatch.pregunta}" (${maxMatches} coincidencias)`);
        return { 
            faq: bestMatch, 
            score: maxMatches / queryWords.length,
            type: 'emergency'
        };
    }
    
    return null;
}

// MEJORA: Función principal con estrategia mejorada
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
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
        console.log('🔍 Iniciando búsqueda mejorada...');
        
        // ESTRATEGIA MEJORADA EN 4 NIVELES:
        
        // 1. Búsqueda exacta con Fuse.js
        const fuseResult = fuseSearch(text);
        if (fuseResult) {
            console.log(`🎯 Respondiendo con Fuse (${fuseResult.type})`);
            appendMessage("Bot", fuseResult.faq.respuesta, true);
            hideTypingIndicator();
            return;
        }

        // 2. Búsqueda semántica con keywords expandidos
        const keywordResult = semanticKeywordSearch(text);
        if (keywordResult) {
            console.log(`🎯 Respondiendo con Keywords (score: ${keywordResult.score.toFixed(3)})`);
            appendMessage("Bot", keywordResult.faq.respuesta, true);
            hideTypingIndicator();
            return;
        }

        // 3. Búsqueda semántica con embeddings locales
        const userEmbedding = generateEmbedding(text);
        const semanticResult = semanticSearch(userEmbedding, 0.5);
        
        if (semanticResult) {
            console.log(`🎯 Respondiendo con Embeddings (score: ${semanticResult.score.toFixed(3)})`);
            appendMessage("Bot", semanticResult.faq.respuesta, true);
            hideTypingIndicator();
            return;
        }

        // 4. Búsqueda de emergencia: coincidencia de cualquier palabra
        const emergencyResult = emergencySearch(text);
        if (emergencyResult) {
            console.log(`🎯 Respondiendo con Búsqueda de Emergencia (${emergencyResult.score.toFixed(3)})`);
            appendMessage("Bot", emergencyResult.faq.respuesta, true);
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

// Funciones de UI
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