// Lesson Page JavaScript with Supabase Integration

// Initialize Supabase client
const SUPABASE_URL = 'https://dzrfanpquocakcoxvbta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cmZhbnBxdW9jYWtjb3h2YnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY0MTIsImV4cCI6MjA3MTUyMjQxMn0.CzcEUtpJ_g2oEZQ2quTRbiiwzacdHNPYk9dtWj_7ozE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentLesson = null;
let currentCourse = null;
let lessonMaterialsData = [];
let courseLessons = [];
let currentMaterialIndex = 0;
let userNotes = '';
let lessonProgress = 0;

// DOM Elements
let lessonTitle, courseTitle, lessonType, lessonDuration, lessonNumber;
let lessonMaterials, lessonLoading, lessonNavFooter, progressDots;
let backToCourseBtn, prevLessonBtn, nextLessonBtn, completeLessonBtn;
let bookmarkBtn, notesBtn, lessonSidebar, notesTextarea;
let progressCircle, progressPercent, errorMessage, successMessage;

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    // Get DOM elements
    getDOMElements();
    
    // Get lesson data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');
    const courseId = urlParams.get('course_id');
    const lessonTitleParam = urlParams.get('title');

    if (!lessonId) {
        showError('No lesson ID provided. Redirecting to courses page...');
        setTimeout(() => {
            window.location.href = 'courses.html';
        }, 2000);
        return;
    }

    // Set up event listeners
    setupEventListeners();
    
    // Load lesson data
    loadLessonData(lessonId, courseId);
    
    // Initialize progress tracking
    initializeProgressTracking();
}

function getDOMElements() {
    lessonTitle = document.getElementById('lessonTitle');
    courseTitle = document.getElementById('courseTitle');
    lessonType = document.getElementById('lessonType');
    lessonDuration = document.getElementById('lessonDuration');
    lessonNumber = document.getElementById('lessonNumber');
    lessonMaterials = document.getElementById('lessonMaterials');
    lessonLoading = document.getElementById('lessonLoading');
    lessonNavFooter = document.getElementById('lessonNavFooter');
    progressDots = document.getElementById('progressDots');
    
    backToCourseBtn = document.getElementById('backToCourse');
    prevLessonBtn = document.getElementById('prevLessonBtn');
    nextLessonBtn = document.getElementById('nextLessonBtn');
    completeLessonBtn = document.getElementById('completeLessonBtn');
    
    bookmarkBtn = document.getElementById('bookmarkBtn');
    notesBtn = document.getElementById('notesBtn');
    lessonSidebar = document.getElementById('lessonSidebar');
    notesTextarea = document.getElementById('notesTextarea');
    
    progressCircle = document.getElementById('progressCircle');
    progressPercent = document.getElementById('progressPercent');
    errorMessage = document.getElementById('errorMessage');
    successMessage = document.getElementById('successMessage');
}

async function loadLessonData(lessonId, courseId) {
    try {
        showLoading(true);

        // Load lesson details with materials
        const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .select(`
                *,
                course:courses(*),
                lesson_materials (*)
            `)
            .eq('id', lessonId)
            .eq('is_published', true)
            .single();

        if (lessonError) {
            throw lessonError;
        }

        if (!lesson) {
            throw new Error('Lesson not found or not published');
        }

        currentLesson = lesson;
        currentCourse = lesson.course;
        lessonMaterialsData = lesson.lesson_materials || [];
        
        // Sort materials by order
        lessonMaterialsData.sort((a, b) => a.material_order - b.material_order);

        // Load all lessons in this course for navigation
        const { data: allLessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('id, title, lesson_order')
            .eq('course_id', currentCourse.id)
            .eq('is_published', true)
            .order('lesson_order', { ascending: true });

        if (!lessonsError) {
            courseLessons = allLessons || [];
        }

        // Display lesson content
        displayLessonHeader();
        displayLessonMaterials();
        setupLessonNavigation();
        updateProgressDots();

    } catch (error) {
        console.error('Error loading lesson:', error);
        showError('Failed to load lesson content. Please try again.');
    } finally {
        showLoading(false);
    }
}

function displayLessonHeader() {
    if (!currentLesson || !currentCourse) return;

    // Update header information
    lessonTitle.textContent = currentLesson.title;
    courseTitle.textContent = currentCourse.title;
    lessonType.textContent = lessonMaterialsData.length > 0 ? 
        `${lessonMaterialsData.length} Materials` : 'Content';
    lessonDuration.textContent = `${currentLesson.duration_minutes} min`;
    lessonNumber.textContent = `Lesson ${currentLesson.lesson_order}`;

    // Update page title
    document.title = `${currentLesson.title} - ${currentCourse.title} - IQA`;

    // Style lesson type badge to show material count
    lessonType.className = `lesson-type content`;
}

function displayLessonMaterials() {
    if (!lessonMaterialsData || lessonMaterialsData.length === 0) {
        lessonMaterials.innerHTML = `
            <div class="no-materials">
                <h3>No materials available</h3>
                <p>This lesson content is being prepared. Please check back later.</p>
            </div>
        `;
        return;
    }

    lessonMaterials.innerHTML = lessonMaterialsData.map((material, index) => {
        return renderMaterial(material, index);
    }).join('');

    // Show materials and navigation
    lessonMaterials.style.display = 'block';
    lessonNavFooter.style.display = 'flex';
}

function renderMaterial(material, index) {
    const isActive = index === currentMaterialIndex;
    
    switch (material.material_type) {
        case 'text':
            return `
                <div class="material-item text-material ${isActive ? 'active' : ''}" data-index="${index}">
                    ${material.title ? `<h3 class="material-title">${escapeHtml(material.title)}</h3>` : ''}
                    <div class="material-content">
                        ${formatTextContent(material.content)}
                    </div>
                </div>
            `;
            
        case 'vocabulary':
            return `
                <div class="material-item vocabulary-material ${isActive ? 'active' : ''}" data-index="${index}">
                    <h3 class="material-title">${material.title || 'Vocabulary'}</h3>
                    <div class="vocabulary-list">
                        ${renderVocabularyContent(material.content)}
                    </div>
                </div>
            `;
            
        case 'image':
            return `
                <div class="material-item image-material ${isActive ? 'active' : ''}" data-index="${index}">
                    ${material.title ? `<h3 class="material-title">${escapeHtml(material.title)}</h3>` : ''}
                    <div class="image-container">
                        ${material.file_url ? 
                            `<img src="${material.file_url}" alt="${escapeHtml(material.title || 'Lesson image')}" class="lesson-image">` :
                            `<div class="placeholder-image">📷 Image not available</div>`
                        }
                        ${material.content ? `<p class="image-caption">${escapeHtml(material.content)}</p>` : ''}
                    </div>
                </div>
            `;
            
        case 'quiz_question':
            return `
                <div class="material-item quiz-material ${isActive ? 'active' : ''}" data-index="${index}">
                    <h3 class="material-title">${material.title || 'Quiz Question'}</h3>
                    <div class="quiz-content">
                        ${renderQuizContent(material.content, material.metadata)}
                    </div>
                </div>
            `;
            
        default:
            return `
                <div class="material-item generic-material ${isActive ? 'active' : ''}" data-index="${index}">
                    ${material.title ? `<h3 class="material-title">${escapeHtml(material.title)}</h3>` : ''}
                    <div class="material-content">
                        <p>${escapeHtml(material.content || 'Content not available')}</p>
                    </div>
                </div>
            `;
    }
}

function formatTextContent(content) {
    if (!content) return '<p>No content available</p>';
    
    // Split content by paragraphs and format
    const paragraphs = content.split('\n\n');
    return paragraphs.map(p => {
        if (p.trim().startsWith('بِسْمِ اللَّهِ') || /[\u0600-\u06FF]/.test(p)) {
            // Arabic text
            return `<p class="arabic-text" dir="rtl">${escapeHtml(p.trim())}</p>`;
        } else {
            // English text
            return `<p class="english-text">${escapeHtml(p.trim())}</p>`;
        }
    }).join('');
}

function renderVocabularyContent(content) {
    if (!content) return '<p>No vocabulary items available</p>';
    
    // For now, display as formatted text
    // In a full implementation, this could parse JSON vocabulary data
    return `
        <div class="vocab-item">
            <div class="vocab-content">${formatTextContent(content)}</div>
        </div>
    `;
}

function renderQuizContent(content, metadata) {
    // Simple quiz rendering - could be enhanced with interactive features
    return `
        <div class="quiz-question">
            <p>${escapeHtml(content || 'Quiz question content not available')}</p>
            <div class="quiz-note">
                <em>Interactive quiz features will be added in future updates</em>
            </div>
        </div>
    `;
}

function setupLessonNavigation() {
    const currentLessonIndex = courseLessons.findIndex(l => l.id === currentLesson.id);
    
    // Configure previous lesson button
    if (currentLessonIndex > 0) {
        prevLessonBtn.disabled = false;
        prevLessonBtn.onclick = () => {
            const prevLesson = courseLessons[currentLessonIndex - 1];
            navigateToLesson(prevLesson.id, prevLesson.title);
        };
    } else {
        prevLessonBtn.disabled = true;
    }
    
    // Configure next lesson button
    if (currentLessonIndex < courseLessons.length - 1) {
        nextLessonBtn.disabled = false;
        nextLessonBtn.onclick = () => {
            const nextLesson = courseLessons[currentLessonIndex + 1];
            navigateToLesson(nextLesson.id, nextLesson.title);
        };
    } else {
        nextLessonBtn.disabled = true;
        nextLessonBtn.querySelector('.nav-text').textContent = 'Course Complete';
    }
}

function updateProgressDots() {
    if (!courseLessons.length) return;
    
    const currentIndex = courseLessons.findIndex(l => l.id === currentLesson.id);
    
    progressDots.innerHTML = courseLessons.map((lesson, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex; // Mock completion logic
        
        return `
            <div class="progress-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                 title="Lesson ${lesson.lesson_order}: ${lesson.title}">
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    // Back to course button
    backToCourseBtn.addEventListener('click', () => {
        if (currentCourse) {
            window.location.href = `course-detail.html?id=${currentCourse.id}&level=${currentCourse.level}`;
        } else {
            window.location.href = 'courses.html';
        }
    });

    // Complete lesson button
    completeLessonBtn.addEventListener('click', () => {
        markLessonComplete();
    });

    // Restart lesson button
    document.getElementById('restartLessonBtn').addEventListener('click', () => {
        currentMaterialIndex = 0;
        lessonProgress = 0;
        updateProgress();
        displayLessonMaterials();
    });

    // Notes functionality
    notesBtn.addEventListener('click', () => {
        lessonSidebar.classList.toggle('active');
    });

    document.getElementById('closeSidebar').addEventListener('click', () => {
        lessonSidebar.classList.remove('active');
    });

    document.getElementById('saveNotes').addEventListener('click', () => {
        saveNotes();
    });

    document.getElementById('clearNotes').addEventListener('click', () => {
        notesTextarea.value = '';
        userNotes = '';
    });

    // Bookmark functionality
    bookmarkBtn.addEventListener('click', () => {
        toggleBookmark();
    });

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function initializeProgressTracking() {
    // Update progress as user scrolls through materials
    updateProgress();
    
    // Auto-advance through materials based on scroll or time
    window.addEventListener('scroll', () => {
        updateProgressBasedOnScroll();
    });
}

function markLessonComplete() {
    lessonProgress = 100;
    updateProgress();
    showSuccess('Lesson completed successfully!');
    
    // Enable next lesson button if available
    if (!nextLessonBtn.disabled) {
        setTimeout(() => {
            if (confirm('Would you like to proceed to the next lesson?')) {
                nextLessonBtn.click();
            }
        }, 2000);
    }
}

function updateProgress() {
    progressPercent.textContent = `${Math.round(lessonProgress)}%`;
    progressCircle.style.setProperty('--progress', `${lessonProgress}%`);
}

function updateProgressBasedOnScroll() {
    const scrolled = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    
    if (maxScroll > 0) {
        lessonProgress = Math.min(100, (scrolled / maxScroll) * 100);
        updateProgress();
    }
}

function navigateToLesson(lessonId, lessonTitle) {
    window.location.href = `lesson.html?id=${lessonId}&course_id=${currentCourse.id}&title=${encodeURIComponent(lessonTitle)}`;
}

function saveNotes() {
    userNotes = notesTextarea.value;
    // In a real app, this would save to database
    console.log('Notes saved:', userNotes);
    showSuccess('Notes saved successfully!');
}

function toggleBookmark() {
    bookmarkBtn.classList.toggle('active');
    const isBookmarked = bookmarkBtn.classList.contains('active');
    console.log('Lesson bookmarked:', isBookmarked);
    showSuccess(isBookmarked ? 'Lesson bookmarked!' : 'Bookmark removed!');
}

function handleKeyboardNavigation(e) {
    switch (e.key) {
        case 'ArrowLeft':
            if (!prevLessonBtn.disabled) prevLessonBtn.click();
            break;
        case 'ArrowRight':
            if (!nextLessonBtn.disabled) nextLessonBtn.click();
            break;
        case ' ':
            e.preventDefault();
            completeLessonBtn.click();
            break;
        case 'Escape':
            lessonSidebar.classList.remove('active');
            break;
    }
}

// Utility functions
function showLoading(show) {
    lessonLoading.style.display = show ? 'flex' : 'none';
    lessonMaterials.style.display = show ? 'none' : 'block';
    lessonNavFooter.style.display = show ? 'none' : 'flex';
}

function showError(message) {
    errorMessage.querySelector('.message-text').textContent = message;
    errorMessage.style.display = 'flex';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    successMessage.querySelector('.message-text').textContent = message;
    successMessage.style.display = 'flex';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Console message for debugging
console.log('📖 Lesson Page loaded successfully');
console.log('🔗 Supabase connected:', SUPABASE_URL);