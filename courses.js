// Courses Page JavaScript with Supabase Integration

// Import utilities from shared utils
const { getSupabaseClient, escapeHtml } = window.IQAUtils;

// Initialize Supabase client using shared utility
const supabase = getSupabaseClient();

// Course icon mapping
const courseIcons = {
    beginner: '🌱',
    intermediate: '🌿',
    advanced: '🌳'
};

document.addEventListener('DOMContentLoaded', function() {
    // Load courses from Supabase
    loadCourses();
    
    // Initialize other features
    initializeScrollEffects();
    initializeKeyboardNavigation();
});

async function loadCourses() {
    try {
        // Show loading state
        showLoadingState();
        
        // Fetch published courses from Supabase
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .eq('is_published', true)
            .order('level', { ascending: true }); // Order: beginner, intermediate, advanced

        if (error) {
            throw error;
        }

        // Display courses
        displayCourses(courses);
        
        // Initialize interactions after courses are loaded
        initializeCourseInteractions();
        
    } catch (error) {
        console.error('Error loading courses:', error);
        showErrorState();
    }
}

function showLoadingState() {
    const coursesGrid = document.querySelector('.courses-grid');
    if (coursesGrid) {
        coursesGrid.innerHTML = `
            <div class="loading-courses">
                <div class="loading-spinner">⟳</div>
                <p>Loading courses...</p>
            </div>
        `;
    }
}

function showErrorState() {
    const coursesGrid = document.querySelector('.courses-grid');
    if (coursesGrid) {
        coursesGrid.innerHTML = `
            <div class="error-courses">
                <p>Unable to load courses. Please try again later.</p>
                <button onclick="loadCourses()" class="retry-btn">Retry</button>
            </div>
        `;
    }
}

function displayCourses(courses) {
    const coursesGrid = document.querySelector('.courses-grid');
    if (!coursesGrid) return;
    
    if (!courses || courses.length === 0) {
        coursesGrid.innerHTML = `
            <div class="no-courses">
                <p>No courses available at the moment.</p>
            </div>
        `;
        return;
    }
    
    coursesGrid.innerHTML = courses.map(course => `
        <div class="course-card" data-level="${course.level}" data-course-id="${course.id}">
            <div class="course-icon ${course.level}-plant">${courseIcons[course.level] || '📚'}</div>
            <h3 class="course-title">${escapeHtml(course.title)}</h3>
            <p class="course-description">
                ${escapeHtml(course.description)}
            </p>
            <div class="course-stats">
                <div class="stat-item">
                    <span class="stat-icon">📚</span>
                    <span class="stat-text">${course.lesson_count} Lessons</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">⏱️</span>
                    <span class="stat-text">${escapeHtml(course.duration_weeks)}</span>
                </div>
            </div>
            <div class="progress-section">
                <div class="progress-label">Your Progress</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text">0% Complete</div>
            </div>
            <a href="course-detail.html?id=${course.id}&level=${course.level}" class="course-btn">
                <span class="btn-text">Start Course</span>
                <span class="btn-arrow">→</span>
            </a>
        </div>
    `).join('');
}

function initializeScrollEffects() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(245, 242, 237, 0.98)';
        } else {
            navbar.style.background = '#f5f2ed';
        }
    });

    // Add subtle parallax effect to background
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        document.body.style.backgroundPosition = `0 ${rate}px`;
    });
}

function initializeCourseInteractions() {
    const courseCards = document.querySelectorAll('.course-card');
    
    courseCards.forEach((card, index) => {
        // Add staggered animation on scroll
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.animationDelay = `${index * 0.2}s`;
                        entry.target.classList.add('animate-in');
                    }
                });
            },
            { threshold: 0.1 }
        );
        
        observer.observe(card);

        // Add hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
            
            // Add subtle glow effect
            this.style.boxShadow = `
                0 25px 60px rgba(0, 0, 0, 0.12),
                0 10px 30px rgba(107, 91, 74, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.9),
                0 0 40px rgba(200, 168, 130, 0.15)
            `;
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });

        // Add click effect for course buttons
        const courseBtn = card.querySelector('.course-btn');
        if (courseBtn) {
            courseBtn.addEventListener('click', function(e) {
                // Add ripple effect
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                this.appendChild(ripple);
                
                // Remove ripple after animation
                setTimeout(() => {
                    ripple.remove();
                }, 600);
                
                // Log course selection
                const courseId = card.getAttribute('data-course-id');
                const courseTitle = card.querySelector('.course-title').textContent;
                console.log(`Course selected: ${courseTitle} (ID: ${courseId})`);
            });
        }
    });

    // Progress bar animation on hover
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => {
        const parentCard = bar.closest('.course-card');
        if (parentCard) {
            parentCard.addEventListener('mouseenter', function() {
                // Simulate progress animation
                bar.style.width = Math.random() * 20 + '%';
            });
            
            parentCard.addEventListener('mouseleave', function() {
                bar.style.width = '0%';
            });
        }
    });

    // Enhanced CTA button interaction
    const ctaBtn = document.querySelector('.cta-btn');
    if (ctaBtn) {
        ctaBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.02)';
        });
        
        ctaBtn.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    }
}

function initializeKeyboardNavigation() {
    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        const focusedElement = document.activeElement;
        const courseButtons = Array.from(document.querySelectorAll('.course-btn'));
        const currentIndex = courseButtons.indexOf(focusedElement);

        if (e.key === 'ArrowRight' && currentIndex < courseButtons.length - 1) {
            e.preventDefault();
            courseButtons[currentIndex + 1].focus();
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
            e.preventDefault();
            courseButtons[currentIndex - 1].focus();
        }
    });
}

// Course level filtering
function filterCourses(level) {
    const courseCards = document.querySelectorAll('.course-card');
    courseCards.forEach(card => {
        const cardLevel = card.getAttribute('data-level');
        if (level === 'all' || cardLevel === level) {
            card.style.display = 'block';
            card.style.animation = 'cardSlideUp 0.5s ease-out';
        } else {
            card.style.display = 'none';
        }
    });
}

// Console welcome message
console.log('🎓 Welcome to IQA Courses Page!');
console.log('📚 Courses loaded from Supabase database');