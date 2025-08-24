// Courses Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
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

    // Add scroll effect to navbar (same as homepage)
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(245, 242, 237, 0.98)';
        } else {
            navbar.style.background = '#f5f2ed';
        }
    });

    // Enhanced course card interactions
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

        // Add hover sound effect simulation
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
                
                // Simulate course selection (for demo purposes)
                console.log(`Course selected: ${card.querySelector('.course-title').textContent}`);
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

    // Course level filtering (basic implementation)
    function filterCourses(level) {
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

    // Console welcome message
    console.log('🎓 Welcome to IQA Courses Page!');
    console.log('📚 Choose your learning path and start your Quranic Arabic journey!');
    
    // Add subtle parallax effect to background
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        document.body.style.backgroundPosition = `0 ${rate}px`;
    });
});

// Utility function for future course progress tracking
function updateCourseProgress(courseLevel, progress) {
    const courseCard = document.querySelector(`[data-level="${courseLevel}"]`);
    if (courseCard) {
        const progressBar = courseCard.querySelector('.progress-fill');
        const progressText = courseCard.querySelector('.progress-text');
        
        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}% Complete`;
        }
    }
}

// Utility function for adding course completion badges
function addCompletionBadge(courseLevel) {
    const courseCard = document.querySelector(`[data-level="${courseLevel}"]`);
    if (courseCard) {
        const badge = document.createElement('div');
        badge.className = 'completion-badge';
        badge.innerHTML = '✓ Completed';
        badge.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #22c55e;
            color: white;
            padding: 0.3rem 0.8rem;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 600;
        `;
        courseCard.appendChild(badge);
    }
}