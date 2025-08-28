// Shared utilities for IQA Interactive Quranic Arabic Learning Platform
// All JavaScript files should import required functions from window.IQAUtils

(function() {
    'use strict';

    // Supabase Configuration (moved from individual files for security and DRY)
    const SUPABASE_CONFIG = {
        url: 'https://dzrfanpquocakcoxvbta.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cmZhbnBxdW9jYWtjb3h2YnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY0MTIsImV4cCI6MjA3MTUyMjQxMn0.CzcEUtpJ_g2oEZQ2quTRbiiwzacdHNPYk9dtWj_7ozE'
    };

    // Initialize Supabase client (singleton pattern)
    let supabaseClient = null;

    // Utility Functions
    const IQAUtils = {
        
        // Supabase Client Management
        getSupabaseClient: function() {
            if (!supabaseClient && window.supabase) {
                supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            }
            return supabaseClient;
        },

        // HTML Escaping for XSS Prevention
        escapeHtml: function(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // String Utilities
        capitalizeFirst: function(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        // Date Formatting
        formatDate: function(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // Loading State Management
        showLoading: function(element, show = true) {
            if (!element) return;
            element.style.display = show ? 'flex' : 'none';
        },

        // Message Display Utilities
        showMessage: function(messageElement, text, type = 'info', duration = 5000) {
            if (!messageElement) return;
            
            const textElement = messageElement.querySelector('.message-text');
            if (textElement) {
                textElement.textContent = text;
            }
            
            // Remove existing type classes
            messageElement.classList.remove('success-message', 'error-message', 'loading-message');
            
            // Add appropriate type class
            if (type === 'success') {
                messageElement.classList.add('success-message');
            } else if (type === 'error') {
                messageElement.classList.add('error-message');
            } else if (type === 'loading') {
                messageElement.classList.add('loading-message');
                duration = 0; // Don't auto-hide loading messages
            }
            
            messageElement.style.display = 'flex';
            
            // Auto-hide after duration (except loading messages)
            if (duration > 0) {
                setTimeout(() => {
                    messageElement.style.display = 'none';
                }, duration);
            }
        },

        showSuccess: function(messageElement, text, duration = 3000) {
            this.showMessage(messageElement, text, 'success', duration);
        },

        showError: function(messageElement, text, duration = 7000) {
            this.showMessage(messageElement, text, 'error', duration);
        },

        hideMessages: function(...messageElements) {
            messageElements.forEach(element => {
                if (element) {
                    element.style.display = 'none';
                }
            });
        },

        // Form Validation Utilities
        validateEmail: function(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        validateRequired: function(value, fieldName) {
            if (!value || !value.trim()) {
                return `${fieldName} is required.`;
            }
            return null;
        },

        validateMinLength: function(value, minLength, fieldName) {
            if (value && value.length < minLength) {
                return `${fieldName} must be at least ${minLength} characters long.`;
            }
            return null;
        },

        validateMaxLength: function(value, maxLength, fieldName) {
            if (value && value.length > maxLength) {
                return `${fieldName} must not exceed ${maxLength} characters.`;
            }
            return null;
        },

        validateRange: function(value, min, max, fieldName) {
            const num = parseInt(value);
            if (isNaN(num) || num < min || num > max) {
                return `${fieldName} must be between ${min} and ${max}.`;
            }
            return null;
        },

        // Local Storage Utilities
        saveToStorage: function(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
                return false;
            }
        },

        loadFromStorage: function(key, defaultValue = null) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
                return defaultValue;
            }
        },

        removeFromStorage: function(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Failed to remove from localStorage:', error);
                return false;
            }
        },

        // URL Parameter Utilities
        getUrlParameter: function(name) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        },

        setUrlParameter: function(name, value) {
            const url = new URL(window.location);
            url.searchParams.set(name, value);
            window.history.replaceState({}, '', url);
        },

        // Navigation Utilities
        navigateToLesson: function(lessonId, lessonTitle, courseId) {
            const url = `lesson.html?id=${lessonId}&course_id=${courseId}&title=${encodeURIComponent(lessonTitle)}`;
            window.location.href = url;
        },

        navigateToCourse: function(courseId, courseLevel) {
            const url = `course-detail.html?id=${courseId}&level=${courseLevel}`;
            window.location.href = url;
        },

        // Smooth Scrolling Utility
        smoothScrollTo: function(element, behavior = 'smooth') {
            if (element) {
                element.scrollIntoView({
                    behavior: behavior,
                    block: 'start'
                });
            }
        },

        // Debounce Utility for Performance
        debounce: function(func, wait, immediate = false) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func.apply(this, args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(this, args);
            };
        },

        // Simple Event Emitter for Component Communication
        createEventEmitter: function() {
            const events = {};
            return {
                on: function(event, callback) {
                    if (!events[event]) events[event] = [];
                    events[event].push(callback);
                },
                off: function(event, callback) {
                    if (events[event]) {
                        events[event] = events[event].filter(cb => cb !== callback);
                    }
                },
                emit: function(event, data) {
                    if (events[event]) {
                        events[event].forEach(callback => callback(data));
                    }
                }
            };
        },

        // Console Logging Utility
        log: function(message, type = 'info') {
            const timestamp = new Date().toISOString();
            const prefix = `[IQA ${timestamp}]`;
            
            switch (type) {
                case 'error':
                    console.error(prefix, message);
                    break;
                case 'warn':
                    console.warn(prefix, message);
                    break;
                case 'success':
                    console.log(`%c${prefix} ${message}`, 'color: green; font-weight: bold;');
                    break;
                default:
                    console.log(prefix, message);
            }
        }
    };

    // Expose utilities globally as specified in project memory
    window.IQAUtils = IQAUtils;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            IQAUtils.log('IQA Utilities initialized successfully', 'success');
        });
    } else {
        IQAUtils.log('IQA Utilities initialized successfully', 'success');
    }

})();