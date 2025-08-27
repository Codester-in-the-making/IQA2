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

// Global quiz data store
window.quizDataStore = window.quizDataStore || {};

// Global function to handle quiz answers
function handleQuizAnswer(optionElement, selectedOptionId, quizKey) {
    // Get quiz options from global store
    const quizOptions = window.quizDataStore[quizKey];
    
    if (!quizOptions) {
        console.error('Quiz data not found for key:', quizKey);
        return;
    }
    
    // Find if the selected option is correct
    const selectedOption = quizOptions.find(option => option.id === selectedOptionId);
    const isCorrect = selectedOption ? selectedOption.isCorrect : false;
    
    // Get parent quiz question container
    const quizContainer = optionElement.closest('.quiz-question');
    if (!quizContainer) return;
    
    // Find all options and disable further selection
    const allOptions = quizContainer.querySelectorAll('.quiz-option');
    allOptions.forEach(opt => {
        opt.classList.add('disabled');
        opt.onclick = null;
    });
    
    // Mark selected option
    optionElement.classList.add('selected');
    
    // Update option indicator based on correctness
    const indicator = optionElement.querySelector('.option-indicator');
    if (indicator) {
        indicator.textContent = isCorrect ? '✔' : '✖';
        indicator.style.color = isCorrect ? '#10b981' : '#ef4444';
    }
    
    // Show correct answers if wrong answer selected
    if (!isCorrect) {
        allOptions.forEach((opt, index) => {
            // Get the option ID from the onclick attribute
            const onclickAttr = opt.getAttribute('onclick');
            let optionId;
            
            if (onclickAttr) {
                // Extract option ID from onclick attribute
                const match = onclickAttr.match(/handleQuizAnswer\(this, '([^']*)'/);
                if (match && match[1]) {
                    optionId = match[1];
                }
            }
            
            const isOptCorrect = quizOptions.find(option => option.id === optionId)?.isCorrect;
            const optIndicator = opt.querySelector('.option-indicator');
            if (isOptCorrect && optIndicator) {
                optIndicator.textContent = '✔';
                optIndicator.style.color = '#10b981';
                opt.classList.add('correct-answer');
            }
        });
    }
    
    // Show feedback
    const feedback = quizContainer.querySelector('.quiz-feedback');
    if (feedback) {
        feedback.style.display = 'block';
        feedback.innerHTML = isCorrect ?
            '<div class="correct-feedback">✅ Correct! Well done.</div>' :
            '<div class="incorrect-feedback">❌ Incorrect. Review the correct answer.</div>';
    }
    
    // Show explanation if available
    const explanation = quizContainer.querySelector('.quiz-explanation');
    if (explanation) {
        explanation.style.display = 'block';
    }
    
    // Update progress for the lesson
    window.updateProgressBasedOnInteraction && window.updateProgressBasedOnInteraction();
}

// DOM Elements
let lessonTitle, courseTitle, lessonType, lessonDuration, lessonNumber, lessonDescription, lessonDescriptionText;
let lessonMaterials, lessonLoading, lessonNavFooter, progressDots;
let backToCourseBtn, prevLessonBtn, nextLessonBtn, completeLessonBtn;
let notesBtn, lessonSidebar, notesTextarea;
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
    lessonDescription = document.getElementById('lessonDescription');
    lessonDescriptionText = document.getElementById('lessonDescriptionText');
    lessonMaterials = document.getElementById('lessonMaterials');
    lessonLoading = document.getElementById('lessonLoading');
    lessonNavFooter = document.getElementById('lessonNavFooter');
    progressDots = document.getElementById('progressDots');
    
    backToCourseBtn = document.getElementById('backToCourse');
    prevLessonBtn = document.getElementById('prevLessonBtn');
    nextLessonBtn = document.getElementById('nextLessonBtn');
    completeLessonBtn = document.getElementById('completeLessonBtn');
    
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
            .single();

        if (lessonError) {
            console.error('Lesson query error:', lessonError);
            throw new Error(`Database error: ${lessonError.message}`);
        }

        if (!lesson) {
            throw new Error('Lesson not found');
        }

        // Check if lesson is published (allow admin preview if not published)
        if (!lesson.is_published) {
            console.warn('Lesson is not published - showing in preview mode');
        }

        currentLesson = lesson;
        currentCourse = lesson.course;
        lessonMaterialsData = lesson.lesson_materials || [];
        
        // Sort materials by order
        lessonMaterialsData.sort((a, b) => a.material_order - b.material_order);

        // Load all lessons in this course for navigation
        const { data: allLessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('id, title, lesson_order, is_published')
            .eq('course_id', currentCourse.id)
            .order('lesson_order', { ascending: true });

        if (!lessonsError) {
            courseLessons = allLessons || [];
        } else {
            console.warn('Could not load course lessons for navigation:', lessonsError);
            courseLessons = [lesson]; // At least show current lesson
        }

        // Display lesson content
        displayLessonHeader();
        displayLessonMaterials();
        setupLessonNavigation();
        updateProgressDots();

    } catch (error) {
        console.error('Error loading lesson:', error);
        showError(`Failed to load lesson: ${error.message}. Please try again.`);
        
        // Provide fallback navigation
        setTimeout(() => {
            if (confirm('Would you like to return to the courses page?')) {
                window.location.href = 'courses.html';
            }
        }, 3000);
    } finally {
        showLoading(false);
    }
}

function displayLessonHeader() {
    if (!currentLesson || !currentCourse) return;

    // Update header information
    lessonTitle.textContent = currentLesson.title;
    lessonDuration.textContent = `${currentLesson.duration_minutes} min`;
    lessonNumber.textContent = `Lesson ${currentLesson.lesson_order}`;

    // Show lesson description if it exists and is not the default placeholder
    if (currentLesson.content && 
        currentLesson.content.trim() && 
        currentLesson.content !== 'Lesson content is defined by materials') {
        lessonDescriptionText.textContent = currentLesson.content;
        lessonDescription.style.display = 'block';
    } else {
        lessonDescription.style.display = 'none';
    }

    // Update page title
    document.title = `${currentLesson.title} - ${currentCourse.title} - IQA`;

    // Hide the course title and lesson type elements completely
    courseTitle.style.display = 'none';
    lessonType.style.display = 'none';
}

function displayLessonMaterials() {
    if (!lessonMaterialsData || lessonMaterialsData.length === 0) {
        lessonMaterials.innerHTML = `
            <div class="no-materials">
                <div class="ornament-top">✦</div>
                <h3>Lesson Content</h3>
                <div class="sample-content">
                    <p class="lesson-intro">Welcome to this lesson! This lesson is currently being prepared with interactive materials.</p>
                    
                    <div class="content-preview">
                        <h4>What you'll learn:</h4>
                        <ul>
                            <li>🎯 Key Quranic Arabic concepts</li>
                            <li>📚 Essential vocabulary and grammar</li>
                            <li>EMPLARY Reading and comprehension skills</li>
                            <li>💡 Practical application exercises</li>
                        </ul>
                    </div>
                    
                    <div class="placeholder-message">
                        <p><em>Interactive materials and exercises are being added to this lesson. Please check back soon for the complete learning experience!</em></p>
                    </div>
                </div>
                <div class="ornament-bottom">✦</div>
            </div>
        `;
    } else {
        lessonMaterials.innerHTML = lessonMaterialsData.map((material, index) => {
            return renderMaterial(material, index);
        }).join('');
    }

    // Show materials and navigation
    lessonMaterials.style.display = 'block';
    lessonNavFooter.style.display = 'flex';
}

function renderMaterial(material, index) {
    const isActive = index === currentMaterialIndex;
    
    switch (material.material_type) {
        case 'text':
            const textContent = material.content && material.content.trim() ? 
                formatTextContent(material.content) : 
                `<p class="placeholder-text">📝 <em>${material.title || 'Text content'} is being prepared. This will contain important lesson information and explanations.</em></p>`;
            
            return `
                <div class="material-item text-material ${isActive ? 'active' : ''}" data-index="${index}">
                    <div class="material-content">
                        ${textContent}
                    </div>
                </div>
            `;
            
        case 'vocabulary':
            const vocabContent = material.content && material.content.trim() ? 
                renderVocabularyContent(material.content) : 
                `<div class="placeholder-vocab">
                    <p>📚 <em>Vocabulary list for "${material.title || 'this section'}" is being prepared.</em></p>
                    <div class="sample-vocab">
                        <div class="vocab-item sample">
                            <span class="arabic">Example: السَّلَامُ عَلَيْكُمْ</span>
                            <span class="translation">Peace be upon you</span>
                        </div>
                    </div>
                </div>`;
                
            return `
                <div class="material-item vocabulary-material ${isActive ? 'active' : ''}" data-index="${index}">
                    <h3 class="material-title">Vocabulary</h3>
                    <div class="vocabulary-list">
                        ${vocabContent}
                    </div>
                </div>
            `;
            
        case 'image':
            const hasValidImage = material.file_url && (material.file_url.startsWith('data:image') || material.file_url.startsWith('http'));
            console.log(`🖼️ Rendering image material on user side:`);
            console.log('  - Material:', material.title);
            console.log('  - Has file_url:', !!material.file_url);
            console.log('  - URL type:', material.file_url ? (material.file_url.startsWith('data:image') ? 'base64' : 'URL') : 'none');
            console.log('  - hasValidImage:', hasValidImage);
            
            // Get sizing information from metadata
            const imageSize = material.metadata?.imageSize || 100;
            const sizePreset = material.metadata?.sizePreset || 'medium';
            console.log('  - Image size:', imageSize + '%');
            console.log('  - Size preset:', sizePreset);
            
            let imageContent;
            
            if (hasValidImage) {
                // Apply sizing based on metadata
                let containerClass = 'lesson-image-container';
                let containerStyle = '';
                
                if (sizePreset && sizePreset !== 'custom') {
                    // Use preset classes
                    containerClass += ` size-${sizePreset}`;
                } else if (imageSize !== 100) {
                    // Use custom scale
                    const scale = imageSize / 100;
                    containerStyle = `transform: scale(${scale}); transform-origin: top left;`;
                }
                
                imageContent = `
                    <div class="${containerClass}" style="${containerStyle}">
                        <img src="${material.file_url}" 
                             alt="${escapeHtml(material.title || 'Lesson image')}" 
                             class="lesson-image"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block'; console.error('User-side image failed to load:', '${material.file_url}');"
                             onload="console.log('User-side image loaded successfully:', '${material.title}')">
                        <div class="image-fallback" style="display: none;">
                            <div class="image-placeholder-icon">🖼️</div>
                            <p><em>Image could not be loaded</em></p>
                        </div>
                    </div>
                `;
            } else {
                imageContent = `
                    <div class="placeholder-image">
                        <div class="image-placeholder-icon">🖼️</div>
                        <p><em>Image for "${escapeHtml(material.title || 'this section')}" will be added soon</em></p>
                    </div>
                `;
            }
                
            return `
                <div class="material-item image-material ${isActive ? 'active' : ''}" data-index="${index}">
                    <div class="image-container">
                        ${imageContent}
                        ${material.content && material.content.trim() ? `<p class="image-caption">${escapeHtml(material.content)}</p>` : ''}
                    </div>
                </div>
            `;
            
        case 'quiz_question':
            return `
                <div class="material-item quiz-material ${isActive ? 'active' : ''}" data-index="${index}">
                    <div class="quiz-content">
                        ${renderQuizContent(material.content, material.metadata)}
                    </div>
                </div>
            `;
            
        default:
            return `
                <div class="material-item generic-material ${isActive ? 'active' : ''}" data-index="${index}">
                    <div class="material-content">
                        <p>${escapeHtml(material.content || '📋 Content for this section is being prepared.')}</p>
                    </div>
                </div>
            `;
    }
}

function formatTextContent(content) {
    if (!content || !content.trim()) {
        return '<p class="no-content">📝 <em>Text content is being prepared for this section.</em></p>';
    }
    
    // Split content by paragraphs and format
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    if (paragraphs.length === 0) {
        return '<p class="no-content">📝 <em>Text content is being prepared for this section.</em></p>';
    }
    
    return paragraphs.map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith('بِسْمِ اللَّهِ') || /[\u0600-\u06FF]/.test(trimmed)) {
            // Arabic text
            return `<p class="arabic-text" dir="rtl">${escapeHtml(trimmed)}</p>`;
        } else {
            // English text
            return `<p class="english-text">${escapeHtml(trimmed)}</p>`;
        }
    }).join('');
}

function renderVocabularyContent(content) {
    if (!content || !content.trim()) {
        return `
            <div class="placeholder-vocab">
                <p>📚 <em>Vocabulary items for this lesson are being prepared.</em></p>
                <div class="sample-vocab-format">
                    <div class="vocab-note">
                        <small>Format: Arabic term | English meaning</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Parse vocabulary content into table format
    // Content is stored as alternating lines: Arabic, English, Arabic, English...
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        return renderVocabularyContent(''); // Use placeholder
    }
    
    let tableRows = '';
    
    // Process lines in pairs (Arabic, English)
    for (let i = 0; i < lines.length; i += 2) {
        const arabic = lines[i] ? lines[i].trim() : '';
        const english = lines[i + 1] ? lines[i + 1].trim() : '';
        
        // Only add row if we have at least one value
        if (arabic || english) {
            tableRows += `
                <tr>
                    <td class="vocab-arabic" dir="rtl">${escapeHtml(arabic)}</td>
                    <td class="vocab-english">${escapeHtml(english)}</td>
                </tr>
            `;
        }
    }
    
    // If no valid pairs found, show placeholder
    if (!tableRows) {
        return renderVocabularyContent(''); // Use placeholder
    }
    
    return `
        <div class="vocab-table-container">
            <table class="vocab-table">
                <thead>
                    <tr>
                        <th class="vocab-header-arabic">Arabic</th>
                        <th class="vocab-header-english">English</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

function renderQuizContent(content, metadata) {
    // Check if we have quiz data in the metadata
    let quizData;
    if (metadata && metadata.quizData) {
        quizData = metadata.quizData;
        console.log('🎯 Rendering user-side quiz from metadata:', quizData);
    } else {
        // Fallback to simple content text
        const questionText = content && content.trim() ? 
            escapeHtml(content) : 
            'Interactive quiz question will be added here';
            
        console.log('🎯 Rendering user-side quiz from content text (legacy):', content);
        
        return `
            <div class="quiz-question">
                <div class="question-content">
                    <p>❓ ${questionText}</p>
                </div>
                <div class="quiz-placeholder">
                    <div class="quiz-options-preview">
                        <div class="option-placeholder">○ Answer option A</div>
                        <div class="option-placeholder">○ Answer option B</div>
                        <div class="option-placeholder">○ Answer option C</div>
                    </div>
                    <div class="quiz-note">
                        <em>💡 Interactive quiz features will be fully implemented in the next update</em>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Generate quiz options markup based on question type
    let optionsHtml;
    
    // Store quiz data in a global object with a unique key
    const quizKey = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    window.quizDataStore = window.quizDataStore || {};
    window.quizDataStore[quizKey] = quizData.options;
    
    if (quizData.questionType === 'true_false') {
        optionsHtml = `
            <div class="quiz-options">
                <div class="quiz-option" onclick="handleQuizAnswer(this, 'T', '${quizKey}')">
                    <span class="option-indicator">○</span>
                    <span class="option-text">True</span>
                </div>
                <div class="quiz-option" onclick="handleQuizAnswer(this, 'F', '${quizKey}')">
                    <span class="option-indicator">○</span>
                    <span class="option-text">False</span>
                </div>
            </div>
        `;
    } else {
        // Multiple choice options
        optionsHtml = `
            <div class="quiz-options">
                ${quizData.options.filter(option => option.text.trim()).map((option, index) => `
                    <div class="quiz-option" onclick="handleQuizAnswer(this, '${option.id}', '${quizKey}')">
                        <span class="option-indicator">○</span>
                        <span class="option-text">${escapeHtml(option.text)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Add explanation for feedback (initially hidden)
    const explanationHtml = quizData.explanation ? `
        <div class="quiz-explanation" style="display: none;">
            <h4>Explanation:</h4>
            <p>${escapeHtml(quizData.explanation)}</p>
        </div>
    ` : '';
    
    return `
        <div class="quiz-question" data-quiz-id="quiz_${Date.now()}" data-quiz-key="${quizKey}">
            <div class="question-content">
                <p>❓ ${escapeHtml(quizData.question)}</p>
            </div>
            ${optionsHtml}
            ${explanationHtml}
            <div class="quiz-feedback" style="display: none;"></div>
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
    // Check if progressDots element exists (it may have been removed for cleaner layout)
    if (!progressDots || !courseLessons.length) return;
    
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
    // Removed per user request

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
    // Bookmark functionality removed per user request
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