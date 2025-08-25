// Course Detail Page JavaScript with Supabase Integration

// Initialize Supabase client
const SUPABASE_URL = 'https://dzrfanpquocakcoxvbta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cmZhbnBxdW9jYWtjb3h2YnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY0MTIsImV4cCI6MjA3MTUyMjQxMn0.CzcEUtpJ_g2oEZQ2quTRbiiwzacdHNPYk9dtWj_7ozE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentCourse = null;
let courseLessons = [];
let userProgress = {}; // Mock user progress - in real app this would come from user session

// DOM Elements
let courseTitle, courseDescription, courseLevelBadge, lessonCount, courseDuration;
let courseProgress, progressFill, progressPercentage, lessonsList;
let startCourseBtn, continueCourseBtn, loadingMessage, errorMessage;

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    // Get DOM elements
    courseTitle = document.getElementById('courseTitle');
    courseDescription = document.getElementById('courseDescription');
    courseLevelBadge = document.getElementById('courseLevelBadge');
    lessonCount = document.getElementById('lessonCount');
    courseDuration = document.getElementById('courseDuration');
    courseProgress = document.getElementById('courseProgress');
    progressFill = document.getElementById('progressFill');
    progressPercentage = document.getElementById('progressPercentage');
    lessonsList = document.getElementById('lessonsList');
    startCourseBtn = document.getElementById('startCourseBtn');
    continueCourseBtn = document.getElementById('continueCourseBtn');
    loadingMessage = document.getElementById('loadingMessage');
    errorMessage = document.getElementById('errorMessage');

    // Get course ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    const courseLevel = urlParams.get('level');

    if (!courseId) {
        showError('No course ID provided. Redirecting to courses page...');
        setTimeout(() => {
            window.location.href = 'courses.html';
        }, 2000);
        return;
    }

    // Load course data
    loadCourseDetails(courseId);
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize filter functionality
    initializeFilters();

    // Mock some user progress for demo
    initializeMockProgress();
}

async function loadCourseDetails(courseId) {
    showLoading(true);

    try {
        // Load course details
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .eq('is_published', true)
            .single();

        if (courseError) {
            throw courseError;
        }

        if (!course) {
            throw new Error('Course not found or not published');
        }

        currentCourse = course;

        // Load lessons for this course
        const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select(`
                *,
                lesson_materials (
                    id,
                    material_type,
                    title,
                    content,
                    material_order
                )
            `)
            .eq('course_id', courseId)
            .eq('is_published', true)
            .order('lesson_order', { ascending: true });

        if (lessonsError) {
            throw lessonsError;
        }

        courseLessons = lessons || [];

        // Display course details
        displayCourseDetails();
        displayLessons();

    } catch (error) {
        console.error('Error loading course details:', error);
        showError('Failed to load course details. Please try again.');
    } finally {
        showLoading(false);
    }
}

function displayCourseDetails() {
    if (!currentCourse) return;

    // Update course information
    courseTitle.textContent = currentCourse.title;
    courseDescription.textContent = currentCourse.description;
    courseLevelBadge.textContent = capitalizeFirst(currentCourse.level);
    courseLevelBadge.className = `course-level-badge ${currentCourse.level}`;
    lessonCount.textContent = courseLessons.length;
    courseDuration.textContent = currentCourse.duration_weeks;

    // Calculate and update progress
    updateProgressDisplay();

    // Update page title
    document.title = `${currentCourse.title} - IQA Interactive Quranic Arabic`;
}

function displayLessons() {
    if (!courseLessons || courseLessons.length === 0) {
        lessonsList.innerHTML = `
            <div class="no-lessons">
                <p>No lessons available for this course yet.</p>
                <a href="courses.html" class="back-to-courses">← Back to Courses</a>
            </div>
        `;
        return;
    }

    lessonsList.innerHTML = courseLessons.map((lesson, index) => {
        const isCompleted = userProgress[lesson.id] === 'completed';
        const isInProgress = userProgress[lesson.id] === 'in_progress';
        const isLocked = index > 0 && !userProgress[courseLessons[index - 1].id];

        return `
            <div class="lesson-item ${isCompleted ? 'completed' : ''} ${isInProgress ? 'in-progress' : ''} ${isLocked ? 'locked' : ''}" 
                 data-lesson-id="${lesson.id}" 
                 data-status="${isCompleted ? 'completed' : isInProgress ? 'in-progress' : 'not-started'}">
                
                <div class="lesson-number">
                    ${isCompleted ? '✓' : isLocked ? '🔒' : lesson.lesson_order}
                </div>
                
                <div class="lesson-content">
                    <div class="lesson-header">
                        <h3 class="lesson-title">${escapeHtml(lesson.title)}</h3>
                        <div class="lesson-meta">
                            <span class="lesson-duration">${lesson.duration_minutes} min</span>
                        </div>
                    </div>
                    
                    <div class="lesson-description">
                        <p>${escapeHtml(lesson.content && lesson.content !== 'Lesson content is defined by materials' ? lesson.content : 'Click to view lesson content.')}</p>
                    </div>
                    
                    <div class="lesson-progress">
                        <div class="progress-bar small">
                            <div class="progress-fill" style="width: ${isCompleted ? '100' : isInProgress ? '50' : '0'}%"></div>
                        </div>
                        <span class="progress-text">
                            ${isCompleted ? 'Completed' : isInProgress ? 'In Progress' : isLocked ? 'Locked' : 'Not Started'}
                        </span>
                    </div>
                </div>
                
                <div class="lesson-actions">
                    ${!isLocked ? `
                        <button class="lesson-btn ${isCompleted ? 'review' : 'start'}" 
                                onclick="openLesson('${lesson.id}', '${lesson.title}')">
                            <span class="btn-text">${isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}</span>
                            <span class="btn-arrow">→</span>
                        </button>
                    ` : `
                        <div class="locked-message">
                            <span>Complete previous lessons to unlock</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function updateProgressDisplay() {
    const completedLessons = courseLessons.filter(lesson => userProgress[lesson.id] === 'completed').length;
    const totalLessons = courseLessons.length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    progressFill.style.width = `${progressPercent}%`;
    progressPercentage.textContent = `${progressPercent}%`;
    courseProgress.textContent = `${progressPercent}%`;

    // Update action buttons
    if (completedLessons === 0) {
        startCourseBtn.style.display = 'block';
        continueCourseBtn.style.display = 'none';
    } else if (completedLessons < totalLessons) {
        startCourseBtn.style.display = 'none';
        continueCourseBtn.style.display = 'block';
    } else {
        startCourseBtn.style.display = 'none';
        continueCourseBtn.style.display = 'block';
        continueCourseBtn.querySelector('.btn-text').textContent = 'Review Course';
    }
}

function setupEventListeners() {
    // Start/Continue course buttons
    startCourseBtn.addEventListener('click', function() {
        if (courseLessons.length > 0) {
            openLesson(courseLessons[0].id, courseLessons[0].title);
        }
    });

    continueCourseBtn.addEventListener('click', function() {
        // Find next incomplete lesson
        const nextLesson = courseLessons.find(lesson => 
            userProgress[lesson.id] !== 'completed'
        );
        
        if (nextLesson) {
            openLesson(nextLesson.id, nextLesson.title);
        } else if (courseLessons.length > 0) {
            // All completed, go to first lesson for review
            openLesson(courseLessons[0].id, courseLessons[0].title);
        }
    });
}

function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active filter
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter lessons
            const filter = this.getAttribute('data-filter');
            filterLessons(filter);
        });
    });
}

function filterLessons(filter) {
    const lessonItems = document.querySelectorAll('.lesson-item');
    
    lessonItems.forEach(item => {
        const status = item.getAttribute('data-status');
        let shouldShow = true;
        
        switch (filter) {
            case 'completed':
                shouldShow = status === 'completed';
                break;
            case 'upcoming':
                shouldShow = status === 'not-started' || status === 'in-progress';
                break;
            case 'all':
            default:
                shouldShow = true;
                break;
        }
        
        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

function initializeMockProgress() {
    // Mock user progress - in real app this would come from database
    if (courseLessons.length > 0) {
        // Mark first lesson as completed for demo
        userProgress[courseLessons[0].id] = 'completed';
        
        // Mark second lesson as in progress if it exists
        if (courseLessons.length > 1) {
            userProgress[courseLessons[1].id] = 'in_progress';
        }
    }
}

function openLesson(lessonId, lessonTitle) {
    // Navigate to lesson page
    window.location.href = `lesson.html?id=${lessonId}&course_id=${currentCourse.id}&title=${encodeURIComponent(lessonTitle)}`;
}

// Utility functions
function showLoading(show) {
    loadingMessage.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    errorMessage.querySelector('.message-text').textContent = message;
    errorMessage.style.display = 'flex';
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
console.log('📖 Course Detail Page loaded successfully');
console.log('🔗 Supabase connected:', SUPABASE_URL);