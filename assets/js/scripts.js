document.addEventListener('DOMContentLoaded', function() {
    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    const backToTop = document.querySelector('.back-to-top');
    
    // Active nav link
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navbarHeight = navbar.getBoundingClientRect().height;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Close mobile menu after clicking
                const navbarToggler = document.querySelector('.navbar-toggler');
                const navbarCollapse = document.querySelector('.navbar-collapse');
                if (navbarCollapse.classList.contains('show')) {
                    navbarToggler.click();
                }
            }
        });
    });
    
    // Scroll events
    window.addEventListener('scroll', function() {
        // Navbar bg change on scroll
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Back to top button visibility
        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
        
        // Active nav link based on scroll position
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            const sectionHeight = section.clientHeight;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
    
    // Alert function
    function showAlert(message, type, form) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = type === 'success' 
            ? 'alert alert-success alert-dismissible fade show' 
            : 'alert alert-danger alert-dismissible fade show';
        alertDiv.setAttribute('role', 'alert');
        
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Append the alert before the form
        form.parentNode.insertBefore(alertDiv, form);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => {
                alertDiv.remove();
            }, 150);
        }, 5000);
    }
    
    // Limitar envíos a 3 por hora
    function checkMessageLimit() {
        const MESSAGE_LIMIT = 3;
        const TIME_WINDOW = 60 * 60 * 1000; // 1 hora en milisegundos
        
        // Obtener el historial de mensajes del localStorage
        const messagesHistory = JSON.parse(localStorage.getItem('messagesHistory') || '[]');
        
        // Filtrar mensajes más recientes que una hora
        const now = new Date().getTime();
        const recentMessages = messagesHistory.filter(timestamp => {
            return now - timestamp < TIME_WINDOW;
        });
        
        // Verificar si se ha alcanzado el límite
        if (recentMessages.length >= MESSAGE_LIMIT) {
            return false;
        }
        
        // Si no se ha alcanzado el límite, registrar el nuevo mensaje
        recentMessages.push(now);
        localStorage.setItem('messagesHistory', JSON.stringify(recentMessages));
        return true;
    }
    
    // Form submission handlers
    const quotationForm = document.getElementById('quotationForm');
    if (quotationForm) {
        quotationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic form validation
            let isValid = true;
            const requiredFields = quotationForm.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-invalid');
                }
            });
            
            if (isValid) {
                // Verificar límite de mensajes
                if (!checkMessageLimit()) {
                    showAlert('Has superado el límite de 3 mensajes por hora. Por favor, inténtalo más tarde.', 'error', quotationForm);
                    return;
                }
                
                // Configurar los datos del formulario
                const formData = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    serviceType: document.getElementById('serviceType').value,
                    serviceArea: document.getElementById('serviceArea').value,
                    message: document.getElementById('message').value
                };
                
                // Deshabilitar el botón y mostrar estado de carga
                const submitBtn = quotationForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
                
                // Aquí iría el código para enviar al servidor (utilizando fetch o similar)
                // Por ahora, simulamos una respuesta exitosa después de un breve delay
                setTimeout(() => {
                    showAlert('Cotización enviada correctamente. Nos contactaremos a la brevedad.', 'success', quotationForm);
                    quotationForm.reset();
                    
                    // Restaurar el botón
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }, 1000);
            } else {
                showAlert('Por favor complete todos los campos requeridos.', 'error', quotationForm);
            }
        });
    }
    
    // Add hCaptcha script
    const hCaptchaScript = document.createElement('script');
    hCaptchaScript.src = 'https://js.hcaptcha.com/1/api.js';
    hCaptchaScript.async = true;
    hCaptchaScript.defer = true;
    document.head.appendChild(hCaptchaScript);
    
    // AWS SDK script
    const awsScript = document.createElement('script');
    awsScript.src = 'https://sdk.amazonaws.com/js/aws-sdk-2.1043.0.min.js';
    document.head.appendChild(awsScript);
    
    // Contact Form Handler
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        // Añadir hCaptcha
        const hCaptchaContainer = document.createElement('div');
        hCaptchaContainer.className = 'h-captcha mb-3';
        hCaptchaContainer.setAttribute('data-sitekey', '7d20173c-149c-4b4c-820e-b6365e527bd0');
        
        // Insertar hCaptcha antes del botón de envío
        const submitButton = contactForm.querySelector('button[type="submit"]').parentNode;
        contactForm.insertBefore(hCaptchaContainer, submitButton);
        
        // Configurar AWS cuando el script se cargue
        awsScript.onload = function() {
            // Configure AWS
            AWS.config.region = 'us-east-1'; 
            
            // Initialize Cognito identity pool
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: 'us-east-1:f062de21-1503-4810-89fa-438e9bb5933f',
            });
        };
        
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic form validation
            let isValid = true;
            const requiredFields = contactForm.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-invalid');
                }
            });
            
            if (!isValid) {
                showAlert('Por favor complete todos los campos requeridos.', 'error', contactForm);
                return;
            }
            
            // Verificar límite de mensajes
            if (!checkMessageLimit()) {
                showAlert('Has superado el límite de 3 mensajes por hora. Por favor, inténtalo más tarde.', 'error', contactForm);
                return;
            }
            
            // Verificar hCaptcha
            try {
                const hCaptchaResponse = hcaptcha.getResponse();
                if (!hCaptchaResponse) {
                    showAlert('Por favor complete el captcha para enviar el formulario.', 'error', contactForm);
                    return;
                }
                
                // Configurar los datos del formulario
                const formData = {
                    name: document.getElementById('contactName').value,
                    email: document.getElementById('contactEmail').value || 'No proporcionado',
                    phone: document.getElementById('contactPhone').value,
                    subject: document.getElementById('contactSubject').value,
                    message: document.getElementById('contactMessage').value,
                    hCaptchaResponse: hCaptchaResponse
                };
                
                // Deshabilitar el botón y mostrar estado de carga
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
                
                // Para verificar el captcha, debemos enviar los datos a nuestro servidor
                // El server debe verificar el captcha con la clave secreta
                // Por ahora, usaremos AWS SNS directamente asumiendo que el captcha es válido
                
                // Actualizar credenciales de AWS
                AWS.config.credentials.refresh((error) => {
                    if (error) {
                        console.error('Error al actualizar credenciales AWS:', error);
                        showAlert('Error al enviar el mensaje. Por favor intente nuevamente más tarde.', 'error', contactForm);
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                        return;
                    }
                    
                    // Crear objeto de servicio SNS
                    const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
                    
                    // Preparar parámetros del mensaje
                    const params = {
                        Message: `
                            Nombre: ${formData.name}
                            Email: ${formData.email}
                            Teléfono: ${formData.phone}
                            Asunto: ${formData.subject}
                            
                            Mensaje:
                            ${formData.message}
                        `,
                        Subject: `Contacto Web: ${formData.subject}`,
                        TopicArn: 'arn:aws:sns:us-east-1:183295419448:ContactForm_J-Avila'
                    };
                    
                    // Enviar mensaje
                    sns.publish(params, function(err, data) {
                        if (err) {
                            console.error('Error al enviar mensaje a SNS:', err);
                            showAlert('Error al enviar el mensaje. Por favor intente nuevamente más tarde.', 'error', contactForm);
                        } else {
                            console.log('Mensaje enviado a SNS:', data.MessageId);
                            showAlert('Mensaje enviado correctamente. Nos contactaremos a la brevedad.', 'success', contactForm);
                            contactForm.reset();
                            hcaptcha.reset();
                        }
                        
                        // Restaurar el botón
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    });
                });
                
            } catch (error) {
                console.error('Error en el proceso:', error);
                showAlert('Error al enviar el mensaje. Por favor intente nuevamente más tarde.', 'error', contactForm);
            }
        });
    }
    
    // Initialize any Bootstrap components
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
});