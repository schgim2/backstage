// Custom Keycloak Login JavaScript

(function() {
    'use strict';

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeCustomFeatures();
    });

    function initializeCustomFeatures() {
        // Add loading states to forms
        addLoadingStates();
        
        // Add form validation
        addFormValidation();
        
        // Add accessibility improvements
        addAccessibilityFeatures();
        
        // Add password strength indicator
        addPasswordStrengthIndicator();
        
        // Add remember me functionality
        addRememberMeFeatures();
        
        // Add keyboard navigation
        addKeyboardNavigation();
    }

    function addLoadingStates() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(function(form) {
            form.addEventListener('submit', function(e) {
                const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
                
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="loading"></span> ' + submitButton.innerHTML;
                    
                    // Re-enable after 10 seconds as fallback
                    setTimeout(function() {
                        submitButton.disabled = false;
                        submitButton.innerHTML = submitButton.innerHTML.replace('<span class="loading"></span> ', '');
                    }, 10000);
                }
            });
        });
    }

    function addFormValidation() {
        const emailInputs = document.querySelectorAll('input[type="email"]');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        // Email validation
        emailInputs.forEach(function(input) {
            input.addEventListener('blur', function() {
                validateEmail(input);
            });
        });
        
        // Password validation
        passwordInputs.forEach(function(input) {
            input.addEventListener('input', function() {
                validatePassword(input);
            });
        });
    }

    function validateEmail(input) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(input.value);
        
        toggleValidationClass(input, isValid);
        
        if (!isValid && input.value.length > 0) {
            showValidationMessage(input, 'Please enter a valid email address');
        } else {
            hideValidationMessage(input);
        }
    }

    function validatePassword(input) {
        const password = input.value;
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        const isValid = password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
        
        toggleValidationClass(input, isValid);
        
        if (password.length > 0 && !isValid) {
            let message = 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character';
            showValidationMessage(input, message);
        } else {
            hideValidationMessage(input);
        }
    }

    function toggleValidationClass(input, isValid) {
        input.classList.remove('valid', 'invalid');
        if (input.value.length > 0) {
            input.classList.add(isValid ? 'valid' : 'invalid');
        }
    }

    function showValidationMessage(input, message) {
        hideValidationMessage(input); // Remove existing message
        
        const messageElement = document.createElement('div');
        messageElement.className = 'validation-message';
        messageElement.textContent = message;
        messageElement.style.color = '#dc3545';
        messageElement.style.fontSize = '0.875rem';
        messageElement.style.marginTop = '0.25rem';
        
        input.parentNode.appendChild(messageElement);
    }

    function hideValidationMessage(input) {
        const existingMessage = input.parentNode.querySelector('.validation-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    function addAccessibilityFeatures() {
        // Add ARIA labels to form elements
        const inputs = document.querySelectorAll('input');
        inputs.forEach(function(input) {
            if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
                const label = input.parentNode.querySelector('label');
                if (label) {
                    const labelId = 'label-' + Math.random().toString(36).substr(2, 9);
                    label.id = labelId;
                    input.setAttribute('aria-labelledby', labelId);
                }
            }
        });
        
        // Add skip link
        addSkipLink();
        
        // Improve focus management
        improveFocusManagement();
    }

    function addSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            z-index: 1000;
            border-radius: 4px;
        `;
        
        skipLink.addEventListener('focus', function() {
            this.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', function() {
            this.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Add main content ID
        const mainContent = document.querySelector('.card-pf, .login-pf');
        if (mainContent) {
            mainContent.id = 'main-content';
        }
    }

    function improveFocusManagement() {
        // Focus first input on page load
        const firstInput = document.querySelector('input[type="text"], input[type="email"], input[type="password"]');
        if (firstInput) {
            setTimeout(function() {
                firstInput.focus();
            }, 100);
        }
        
        // Trap focus in modal dialogs
        const modals = document.querySelectorAll('.modal, .dialog');
        modals.forEach(function(modal) {
            trapFocus(modal);
        });
    }

    function trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }

    function addPasswordStrengthIndicator() {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        passwordInputs.forEach(function(input) {
            // Skip if this is a confirm password field
            if (input.name && input.name.toLowerCase().includes('confirm')) {
                return;
            }
            
            const strengthIndicator = document.createElement('div');
            strengthIndicator.className = 'password-strength';
            strengthIndicator.innerHTML = `
                <div class="strength-bar">
                    <div class="strength-fill"></div>
                </div>
                <div class="strength-text">Password strength: <span class="strength-level">Weak</span></div>
            `;
            
            strengthIndicator.style.cssText = `
                margin-top: 0.5rem;
                font-size: 0.875rem;
            `;
            
            input.parentNode.appendChild(strengthIndicator);
            
            input.addEventListener('input', function() {
                updatePasswordStrength(input, strengthIndicator);
            });
        });
    }

    function updatePasswordStrength(input, indicator) {
        const password = input.value;
        const strength = calculatePasswordStrength(password);
        
        const fill = indicator.querySelector('.strength-fill');
        const text = indicator.querySelector('.strength-level');
        
        fill.style.width = strength.percentage + '%';
        fill.style.backgroundColor = strength.color;
        text.textContent = strength.label;
    }

    function calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score += 20;
        if (password.length >= 12) score += 10;
        if (/[a-z]/.test(password)) score += 20;
        if (/[A-Z]/.test(password)) score += 20;
        if (/[0-9]/.test(password)) score += 20;
        if (/[^A-Za-z0-9]/.test(password)) score += 20;
        
        if (score < 40) {
            return { percentage: score, color: '#dc3545', label: 'Weak' };
        } else if (score < 70) {
            return { percentage: score, color: '#ffc107', label: 'Fair' };
        } else if (score < 90) {
            return { percentage: score, color: '#17a2b8', label: 'Good' };
        } else {
            return { percentage: score, color: '#28a745', label: 'Strong' };
        }
    }

    function addRememberMeFeatures() {
        const rememberMeCheckbox = document.querySelector('input[name="rememberMe"]');
        
        if (rememberMeCheckbox) {
            // Load saved preference
            const savedPreference = localStorage.getItem('keycloak-remember-me');
            if (savedPreference === 'true') {
                rememberMeCheckbox.checked = true;
            }
            
            // Save preference on change
            rememberMeCheckbox.addEventListener('change', function() {
                localStorage.setItem('keycloak-remember-me', this.checked);
            });
        }
    }

    function addKeyboardNavigation() {
        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Alt + L to focus login field
            if (e.altKey && e.key === 'l') {
                const loginField = document.querySelector('input[name="username"], input[name="email"]');
                if (loginField) {
                    loginField.focus();
                    e.preventDefault();
                }
            }
            
            // Alt + P to focus password field
            if (e.altKey && e.key === 'p') {
                const passwordField = document.querySelector('input[name="password"]');
                if (passwordField) {
                    passwordField.focus();
                    e.preventDefault();
                }
            }
            
            // Enter to submit form (if not already handled)
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                const form = e.target.closest('form');
                if (form) {
                    const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
                    if (submitButton && !submitButton.disabled) {
                        submitButton.click();
                    }
                }
            }
        });
    }

    // Add CSS for validation states
    const style = document.createElement('style');
    style.textContent = `
        .form-control.valid {
            border-color: #28a745;
            box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
        }
        
        .form-control.invalid {
            border-color: #dc3545;
            box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
        }
        
        .password-strength .strength-bar {
            width: 100%;
            height: 4px;
            background-color: #e9ecef;
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 0.25rem;
        }
        
        .password-strength .strength-fill {
            height: 100%;
            width: 0%;
            transition: width 0.3s ease, background-color 0.3s ease;
        }
        
        .skip-link:focus {
            top: 6px !important;
        }
    `;
    
    document.head.appendChild(style);

})();