// Admin Dashboard JavaScript with Supabase Integration

// Initialize Supabase client
const SUPABASE_URL = 'https://dzrfanpquocakcoxvbta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cmZhbnBxdW9jYWtjb3h2YnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY0MTIsImV4cCI6MjA3MTUyMjQxMn0.CzcEUtpJ_g2oEZQ2quTRbiiwzacdHNPYk9dtWj_7ozE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
let courseForm, coursesList, loadingMessage, successMessage, errorMessage;
let lessonForm, lessonManagementSection, courseManagementSection, selectedCourseInfo;
let existingLessons, materialsList;
let currentSelectedCourse = null;
let lessonMaterials = [];
let currentEditingLesson = null; // Track if we're in edit mode
let currentEditingCourse = null; // Track if we're editing a course

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    courseForm = document.getElementById('courseForm');
    coursesList = document.getElementById('coursesList');
    loadingMessage = document.getElementById('loadingMessage');
    successMessage = document.getElementById('successMessage');
    errorMessage = document.getElementById('errorMessage');
    
    // Lesson management elements
    lessonForm = document.getElementById('lessonForm');
    lessonManagementSection = document.getElementById('lessonManagementSection');
    courseManagementSection = document.getElementById('courseManagementSection');
    selectedCourseInfo = document.getElementById('selectedCourseInfo');
    existingLessons = document.getElementById('existingLessons');
    materialsList = document.getElementById('materialsList');

    // Set up event listeners
    setupEventListeners();

    // Load existing courses
    loadCourses();
});

function setupEventListeners() {
    // Course form submission
    courseForm.addEventListener('submit', handleCourseSubmission);

    // Reset form button
    document.getElementById('resetForm').addEventListener('click', resetForm);
    
    // Cancel course edit button
    const cancelCourseEditBtn = document.getElementById('cancelCourseEditBtn');
    if (cancelCourseEditBtn) {
        cancelCourseEditBtn.addEventListener('click', cancelCourseEdit);
    }
    
    // Lesson management event listeners
    setupLessonEventListeners();
}

async function handleCourseSubmission(e) {
    e.preventDefault();
    
    showLoading(true);
    hideMessages();

    try {
        // Get form data
        const formData = new FormData(courseForm);
        const courseData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            level: formData.get('level'),
            lesson_count: parseInt(formData.get('lesson_count')),
            duration_weeks: formData.get('duration_weeks').trim(),
            is_published: formData.get('is_published') === 'on'
        };

        // Validate data
        if (!validateCourseData(courseData)) {
            return;
        }

        if (isCourseEditMode()) {
            // Update existing course
            await updateExistingCourse(currentEditingCourse.id, courseData);
        } else {
            // Create new course
            await createNewCourse(courseData);
        }

    } catch (error) {
        console.error('Error handling course submission:', error);
        showErrorMessage('Failed to save course. Please try again.');
    } finally {
        showLoading(false);
    }
}

async function createNewCourse(courseData) {
    // Insert course into Supabase
    const { data, error } = await supabase
        .from('courses')
        .insert([courseData])
        .select();

    if (error) {
        throw error;
    }

    // Success
    showSuccessMessage('Course created successfully!');
    resetForm();
    loadCourses(); // Refresh the courses list
}

async function updateExistingCourse(courseId, courseData) {
    // Update course in Supabase
    const { error } = await supabase
        .from('courses')
        .update(courseData)
        .eq('id', courseId);

    if (error) {
        throw error;
    }

    // Success
    showSuccessMessage('Course updated successfully!');
    currentEditingCourse = null;
    resetForm();
    updateCourseFormForEditMode(false);
    loadCourses(); // Refresh the courses list
}

function validateCourseData(data) {
    if (!data.title || data.title.length < 3) {
        showErrorMessage('Course title must be at least 3 characters long.');
        return false;
    }

    if (!data.description || data.description.length < 10) {
        showErrorMessage('Course description must be at least 10 characters long.');
        return false;
    }

    if (!data.level) {
        showErrorMessage('Please select a course level.');
        return false;
    }

    if (!data.lesson_count || data.lesson_count < 1) {
        showErrorMessage('Number of lessons must be at least 1.');
        return false;
    }

    if (!data.duration_weeks) {
        showErrorMessage('Please specify the course duration.');
        return false;
    }

    return true;
}

async function loadCourses() {
    showLoading(true);

    try {
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        displayCourses(courses);

    } catch (error) {
        console.error('Error loading courses:', error);
        showErrorMessage('Failed to load courses.');
    } finally {
        showLoading(false);
    }
}

function displayCourses(courses) {
    if (!courses || courses.length === 0) {
        coursesList.innerHTML = `
            <div class="no-courses">
                <p>No courses created yet. Create your first course above!</p>
            </div>
        `;
        return;
    }

    coursesList.innerHTML = courses.map(course => `
        <div class="course-item" data-course-id="${course.id}">
            <div class="course-header">
                <div class="course-title-section">
                    <h3 class="course-title">${escapeHtml(course.title)}</h3>
                    <div class="course-meta">
                        <span class="course-level ${course.level}">${capitalizeFirst(course.level)}</span>
                        <span class="course-lessons">${course.lesson_count} lessons</span>
                        <span class="course-duration">${escapeHtml(course.duration_weeks)}</span>
                    </div>
                </div>
                <div class="course-status">
                    <span class="status-badge ${course.is_published ? 'published' : 'draft'}">
                        ${course.is_published ? 'Published' : 'Draft'}
                    </span>
                </div>
            </div>
            <div class="course-description">
                <p>${escapeHtml(course.description)}</p>
            </div>
            <div class="course-actions">
                <button class="btn-action manage-lessons" onclick="manageLessons('${course.id}', '${escapeHtml(course.title)}')">
                    <span>Manage Lessons</span>
                </button>
                <button class="btn-action edit" onclick="editCourse('${course.id}')">
                    <span>Edit</span>
                </button>
                <button class="btn-action ${course.is_published ? 'unpublish' : 'publish'}" 
                        onclick="togglePublishStatus('${course.id}', ${!course.is_published})">
                    <span>${course.is_published ? 'Unpublish' : 'Publish'}</span>
                </button>
                <button class="btn-action delete" onclick="deleteCourse('${course.id}', '${escapeHtml(course.title)}')">
                    <span>Delete</span>
                </button>
            </div>
            <div class="course-timestamps">
                <small>Created: ${formatDate(course.created_at)}</small>
                ${course.updated_at !== course.created_at ? 
                    `<small>Updated: ${formatDate(course.updated_at)}</small>` : ''}
            </div>
        </div>
    `).join('');
}

async function togglePublishStatus(courseId, isPublished) {
    showLoading(true);

    try {
        const { error } = await supabase
            .from('courses')
            .update({ is_published: isPublished })
            .eq('id', courseId);

        if (error) {
            throw error;
        }

        showSuccessMessage(`Course ${isPublished ? 'published' : 'unpublished'} successfully!`);
        loadCourses(); // Refresh the list

    } catch (error) {
        console.error('Error updating course status:', error);
        showErrorMessage('Failed to update course status.');
    } finally {
        showLoading(false);
    }
}

async function deleteCourse(courseId, courseTitle) {
    const confirmed = confirm(`Are you sure you want to delete "${courseTitle}"?\n\nThis action cannot be undone.`);
    
    if (!confirmed) return;

    showLoading(true);

    try {
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', courseId);

        if (error) {
            throw error;
        }

        showSuccessMessage('Course deleted successfully!');
        loadCourses(); // Refresh the list

    } catch (error) {
        console.error('Error deleting course:', error);
        showErrorMessage('Failed to delete course.');
    } finally {
        showLoading(false);
    }
}

async function editCourse(courseId) {
    showLoading(true);
    
    try {
        // Load course data
        const { data: course, error } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();
            
        if (error) {
            throw error;
        }
        
        if (!course) {
            throw new Error('Course not found');
        }
        
        // Enter edit mode
        currentEditingCourse = course;
        populateCourseFormForEdit(course);
        
        showSuccessMessage('Course loaded for editing. Make your changes and click "Update Course".');
        
        // Scroll to form
        courseForm.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error loading course for edit:', error);
        showErrorMessage('Failed to load course for editing.');
    } finally {
        showLoading(false);
    }
}

function populateCourseFormForEdit(course) {
    // Populate course form fields
    document.getElementById('courseTitle').value = course.title;
    document.getElementById('courseDescription').value = course.description;
    document.getElementById('courseLevel').value = course.level;
    document.getElementById('lessonCount').value = course.lesson_count;
    document.getElementById('duration').value = course.duration_weeks;
    document.getElementById('isPublished').checked = course.is_published;
    
    // Update form submit button text and show cancel button
    updateCourseFormForEditMode(true);
}

function updateCourseFormForEditMode(isEditing) {
    const submitBtn = courseForm.querySelector('button[type="submit"]');
    const cancelBtn = document.getElementById('cancelCourseEditBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    
    if (isEditing) {
        if (btnText) btnText.textContent = 'Update Course';
        submitBtn.className = 'btn-primary update-course';
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }
    } else {
        if (btnText) btnText.textContent = 'Create Course';
        submitBtn.className = 'btn-primary';
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    }
}

function cancelCourseEdit() {
    if (confirm('Are you sure you want to cancel editing? Any unsaved changes will be lost.')) {
        currentEditingCourse = null;
        resetForm();
        updateCourseFormForEditMode(false);
        showSuccessMessage('Edit cancelled.');
    }
}

function isCourseEditMode() {
    return currentEditingCourse !== null;
}

// ===========================================
// VOCABULARY TABLE BUILDER FUNCTIONALITY
// ===========================================

function renderVocabularyTable(material, materialIndex) {
    // Initialize vocabulary data if not exists
    if (!material.vocabularyData) {
        material.vocabularyData = [{ arabic: '', english: '' }];
    }
    
    let tableHTML = `
        <table class="vocab-builder-table">
            <thead>
                <tr>
                    <th class="vocab-header-arabic">Arabic</th>
                    <th class="vocab-header-english">English</th>
                    <th class="vocab-header-actions">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    material.vocabularyData.forEach((row, rowIndex) => {
        tableHTML += `
            <tr class="vocab-row" data-row="${rowIndex}">
                <td class="vocab-cell-arabic">
                    <input type="text" 
                           class="vocab-input arabic-input" 
                           value="${escapeHtml(row.arabic || '')}" 
                           placeholder="Enter Arabic text" 
                           dir="rtl"
                           onchange="updateVocabularyRow(${materialIndex}, ${rowIndex}, 'arabic', this.value)">
                </td>
                <td class="vocab-cell-english">
                    <input type="text" 
                           class="vocab-input english-input" 
                           value="${escapeHtml(row.english || '')}" 
                           placeholder="Enter English translation" 
                           onchange="updateVocabularyRow(${materialIndex}, ${rowIndex}, 'english', this.value)">
                </td>
                <td class="vocab-cell-actions">
                    <button type="button" 
                            class="btn-small delete-vocab-row" 
                            onclick="removeVocabularyRow(${materialIndex}, ${rowIndex})"
                            ${material.vocabularyData.length <= 1 ? 'disabled' : ''}>
                        ×
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    return tableHTML;
}

function addVocabularyRow(materialIndex) {
    if (lessonMaterials[materialIndex] && lessonMaterials[materialIndex].type === 'vocabulary') {
        const material = lessonMaterials[materialIndex];
        
        // Initialize vocabulary data if not exists
        if (!material.vocabularyData) {
            material.vocabularyData = [];
        }
        
        // Add new empty row
        material.vocabularyData.push({ arabic: '', english: '' });
        
        // Convert to content format and update material
        updateMaterialContentFromTable(materialIndex);
        
        // Re-render the material builder
        renderMaterialBuilder();
        
        showSuccessMessage('Vocabulary row added successfully!');
    }
}

function removeVocabularyRow(materialIndex, rowIndex) {
    if (lessonMaterials[materialIndex] && lessonMaterials[materialIndex].type === 'vocabulary') {
        const material = lessonMaterials[materialIndex];
        
        if (material.vocabularyData && material.vocabularyData.length > 1) {
            // Remove the row
            material.vocabularyData.splice(rowIndex, 1);
            
            // Convert to content format and update material
            updateMaterialContentFromTable(materialIndex);
            
            // Re-render the material builder
            renderMaterialBuilder();
            
            showSuccessMessage('Vocabulary row removed successfully!');
        }
    }
}

function updateVocabularyRow(materialIndex, rowIndex, field, value) {
    if (lessonMaterials[materialIndex] && lessonMaterials[materialIndex].type === 'vocabulary') {
        const material = lessonMaterials[materialIndex];
        
        // Initialize vocabulary data if not exists
        if (!material.vocabularyData) {
            material.vocabularyData = [];
        }
        
        // Ensure row exists
        if (!material.vocabularyData[rowIndex]) {
            material.vocabularyData[rowIndex] = { arabic: '', english: '' };
        }
        
        // Update the specific field
        material.vocabularyData[rowIndex][field] = value;
        
        // Convert to content format and update material
        updateMaterialContentFromTable(materialIndex);
    }
}

function updateMaterialContentFromTable(materialIndex) {
    const material = lessonMaterials[materialIndex];
    
    if (material.type === 'vocabulary' && material.vocabularyData) {
        // Convert vocabulary data to content format for storage
        let contentLines = [];
        
        material.vocabularyData.forEach(row => {
            if (row.arabic && row.english) {
                contentLines.push(row.arabic);
                contentLines.push(row.english);
                contentLines.push(''); // Empty line separator
            }
        });
        
        material.content = contentLines.join('\n');
    }
}

function parseVocabularyContent(content) {
    // Parse existing content into vocabulary data format
    if (!content || !content.trim()) {
        return [{ arabic: '', english: '' }];
    }
    
    const lines = content.split('\n').filter(line => line.trim());
    const vocabularyData = [];
    
    // Parse pairs: Arabic line followed by English line
    for (let i = 0; i < lines.length; i += 2) {
        const arabic = lines[i] ? lines[i].trim() : '';
        const english = lines[i + 1] ? lines[i + 1].trim() : '';
        
        if (arabic || english) {
            vocabularyData.push({ arabic, english });
        }
    }
    
    // Ensure at least one row
    if (vocabularyData.length === 0) {
        vocabularyData.push({ arabic: '', english: '' });
    }
    
    return vocabularyData;
}

function resetForm() {
    courseForm.reset();
    currentEditingCourse = null;
    updateCourseFormForEditMode(false);
    hideMessages();
}

// Utility functions
function showLoading(show) {
    loadingMessage.style.display = show ? 'flex' : 'none';
}

function showSuccessMessage(message) {
    successMessage.querySelector('.message-text').textContent = message;
    successMessage.style.display = 'flex';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 5000);
}

function showErrorMessage(message) {
    errorMessage.querySelector('.message-text').textContent = message;
    errorMessage.style.display = 'flex';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 7000);
}

function hideMessages() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Console message for debugging
console.log('🔧 Admin Dashboard loaded successfully');
console.log('📊 Supabase connected:', SUPABASE_URL);

// ===========================================
// LESSON MANAGEMENT FUNCTIONALITY
// ===========================================

function setupLessonEventListeners() {
    // Back to courses button
    const backToCoursesBtn = document.getElementById('backToCoursesBtn');
    if (backToCoursesBtn) {
        backToCoursesBtn.addEventListener('click', showCourseManagement);
    }
    
    // Lesson form submission
    if (lessonForm) {
        lessonForm.addEventListener('submit', handleLessonSubmission);
    }
    
    // Reset lesson form
    const resetLessonFormBtn = document.getElementById('resetLessonForm');
    if (resetLessonFormBtn) {
        resetLessonFormBtn.addEventListener('click', resetLessonFormData);
    }
    
    // Cancel edit button
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', cancelLessonEdit);
    }
    
    // Material builder buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('material-btn')) {
            const materialType = e.target.getAttribute('data-type');
            addMaterial(materialType);
        }
    });
}

async function manageLessons(courseId, courseTitle) {
    currentSelectedCourse = { id: courseId, title: courseTitle };
    
    // Hide course management, show lesson management
    showLessonManagement();
    
    // Update header
    document.getElementById('mainPageTitle').textContent = 'Lesson Management';
    document.getElementById('mainPageSubtitle').textContent = `Managing lessons for: ${courseTitle}`;
    
    // Display selected course info
    displaySelectedCourseInfo();
    
    // Load existing lessons
    await loadCourseLessons(courseId);
}

function showLessonManagement() {
    courseManagementSection.style.display = 'none';
    document.querySelector('.courses-section').style.display = 'none';
    lessonManagementSection.style.display = 'block';
}

function showCourseManagement() {
    lessonManagementSection.style.display = 'none';
    courseManagementSection.style.display = 'block';
    document.querySelector('.courses-section').style.display = 'block';
    
    // Reset header
    document.getElementById('mainPageTitle').textContent = 'Course Management';
    document.getElementById('mainPageSubtitle').textContent = 'Create and manage courses for the IQA learning platform';
    
    // Clear current selection
    currentSelectedCourse = null;
    lessonMaterials = [];
}

function displaySelectedCourseInfo() {
    if (!currentSelectedCourse) return;
    
    selectedCourseInfo.innerHTML = `
        <div class="selected-course-card">
            <h3>Selected Course: ${escapeHtml(currentSelectedCourse.title)}</h3>
            <p>Course ID: ${currentSelectedCourse.id}</p>
        </div>
    `;
}

async function loadCourseLessons(courseId) {
    showLoading(true);
    
    try {
        const { data: lessons, error } = await supabase
            .from('lessons')
            .select(`
                *,
                lesson_materials (count)
            `)
            .eq('course_id', courseId)
            .order('lesson_order', { ascending: true });
            
        if (error) {
            throw error;
        }
        
        displayExistingLessons(lessons);
        
        // Update lesson order field to next available
        const nextOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.lesson_order)) + 1 : 1;
        document.getElementById('lessonOrder').value = nextOrder;
        
    } catch (error) {
        console.error('Error loading lessons:', error);
        showErrorMessage('Failed to load lessons.');
    } finally {
        showLoading(false);
    }
}

function displayExistingLessons(lessons) {
    if (!lessons || lessons.length === 0) {
        existingLessons.innerHTML = `
            <div class="no-lessons">
                <p>No lessons created yet. Create your first lesson above!</p>
            </div>
        `;
        return;
    }
    
    existingLessons.innerHTML = lessons.map(lesson => `
        <div class="lesson-item" data-lesson-id="${lesson.id}">
            <div class="lesson-header">
                <div class="lesson-title-section">
                    <h4 class="lesson-title">Lesson ${lesson.lesson_order}: ${escapeHtml(lesson.title)}</h4>
                    ${lesson.description && lesson.description.trim() ? `<p class="lesson-description">${escapeHtml(lesson.description.length > 100 ? lesson.description.substring(0, 100) + '...' : lesson.description)}</p>` : ''}
                    <div class="lesson-meta">
                        <span class="lesson-duration">${lesson.duration_minutes} min</span>
                        <span class="material-count">${lesson.lesson_materials ? lesson.lesson_materials.length : 0} materials</span>
                    </div>
                </div>
                <div class="lesson-status">
                    <span class="status-badge ${lesson.is_published ? 'published' : 'draft'}">
                        ${lesson.is_published ? 'Published' : 'Draft'}
                    </span>
                </div>
            </div>
            <div class="lesson-content-preview" style="display: none;">
                <p>${escapeHtml(lesson.content && lesson.content.trim() && lesson.content !== 'Lesson content is defined by materials' ? lesson.content.substring(0, 150) + '...' : '')}</p>
            </div>
            <div class="lesson-actions">
                <button class="btn-action preview-lesson" onclick="previewLesson('${lesson.id}')">
                    <span>👁️ Preview</span>
                </button>
                <button class="btn-action edit-lesson" onclick="editLesson('${lesson.id}')">
                    <span>Edit</span>
                </button>
                <button class="btn-action ${lesson.is_published ? 'unpublish' : 'publish'}" 
                        onclick="toggleLessonPublishStatus('${lesson.id}', ${!lesson.is_published})">
                    <span>${lesson.is_published ? 'Unpublish' : 'Publish'}</span>
                </button>
                <button class="btn-action delete-lesson" onclick="deleteLesson('${lesson.id}', '${escapeHtml(lesson.title)}')">
                    <span>Delete</span>
                </button>
            </div>
        </div>
    `).join('');
}

async function handleLessonSubmission(e) {
    e.preventDefault();
    
    if (!currentSelectedCourse) {
        showErrorMessage('No course selected.');
        return;
    }
    
    showLoading(true);
    hideMessages();
    
    try {
        // Get form data
        const formData = new FormData(lessonForm);
        const lessonData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            lesson_order: parseInt(formData.get('lesson_order')),
            duration_minutes: parseInt(formData.get('duration_minutes')),
            lesson_type: 'content',
            content: '',
            is_published: formData.get('is_published') === 'on'
        };
        
        // Validate data
        if (!validateLessonData(lessonData)) {
            return;
        }
        
        if (isEditMode()) {
            // Update existing lesson
            await updateExistingLesson(currentEditingLesson.id, lessonData);
        } else {
            // Create new lesson
            lessonData.course_id = currentSelectedCourse.id;
            await createNewLesson(lessonData);
        }
        
    } catch (error) {
        console.error('Error handling lesson submission:', error);
        showErrorMessage('Failed to save lesson. Please try again.');
    } finally {
        showLoading(false);
    }
}

async function createNewLesson(lessonData) {
    // Insert lesson into Supabase
    const { data, error } = await supabase
        .from('lessons')
        .insert([lessonData])
        .select();
        
    if (error) {
        throw error;
    }
    
    // Create materials if any
    if (lessonMaterials.length > 0) {
        await createLessonMaterials(data[0].id);
    }
    
    // Success
    showSuccessMessage('Lesson created successfully!');
    resetLessonFormData();
    await loadCourseLessons(currentSelectedCourse.id);
}

async function updateExistingLesson(lessonId, lessonData) {
    // Update lesson in Supabase
    const { error: lessonError } = await supabase
        .from('lessons')
        .update(lessonData)
        .eq('id', lessonId);
        
    if (lessonError) {
        throw lessonError;
    }
    
    // Handle materials update
    await updateLessonMaterials(lessonId);
    
    // Success
    showSuccessMessage('Lesson updated successfully!');
    currentEditingLesson = null;
    resetLessonFormData();
    updateFormForEditMode(false);
    await loadCourseLessons(currentSelectedCourse.id);
}

async function updateLessonMaterials(lessonId) {
    // Get existing materials from database
    const { data: existingMaterials, error: fetchError } = await supabase
        .from('lesson_materials')
        .select('id')
        .eq('lesson_id', lessonId);
        
    if (fetchError) {
        console.error('Error fetching existing materials:', fetchError);
    }
    
    const existingIds = existingMaterials ? existingMaterials.map(m => m.id) : [];
    const currentIds = lessonMaterials.filter(m => m.isExisting && m.dbId).map(m => m.dbId);
    
    // Delete materials that were removed
    const toDelete = existingIds.filter(id => !currentIds.includes(id));
    if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
            .from('lesson_materials')
            .delete()
            .in('id', toDelete);
            
        if (deleteError) {
            console.error('Error deleting materials:', deleteError);
        }
    }
    
    // Update or create materials
    for (const [index, material] of lessonMaterials.entries()) {
        const materialData = {
            lesson_id: lessonId,
            material_type: material.type,
            title: material.title,
            content: material.content,
            file_url: material.file_url || null,
            material_order: index + 1,
            metadata: {
                ...material.metadata,
                // Add image sizing information for image materials
                ...(material.type === 'image' && {
                    imageSize: material.imageSize || 100,
                    sizePreset: material.sizePreset || 'medium'
                })
            }
        };
        
        console.log(`💾 Processing material ${index + 1}: ${material.type} - ${material.title}`);
        if (material.type === 'image') {
            console.log('🖼️ Image material update data:');
            console.log('  - Has file_url:', !!material.file_url);
            console.log('  - file_url length:', material.file_url ? material.file_url.length : 0);
            console.log('  - isExisting:', material.isExisting);
        }
        
        if (material.isExisting && material.dbId) {
            // Update existing material
            const { error } = await supabase
                .from('lesson_materials')
                .update(materialData)
                .eq('id', material.dbId);
                
            if (error) {
                console.error('Error updating material:', error);
            }
        } else {
            // Create new material
            const { error } = await supabase
                .from('lesson_materials')
                .insert([materialData]);
                
            if (error) {
                console.error('Error creating material:', error);
            }
        }
    }
}

function validateLessonData(data) {
    if (!data.title || data.title.length < 3) {
        showErrorMessage('Lesson title must be at least 3 characters long.');
        return false;
    }
    
    if (!data.lesson_order || data.lesson_order < 1) {
        showErrorMessage('Lesson order must be a positive number.');
        return false;
    }
    
    if (!data.duration_minutes || data.duration_minutes < 5) {
        showErrorMessage('Lesson duration must be at least 5 minutes.');
        return false;
    }
    
    // Check if at least one material is added
    if (lessonMaterials.length === 0) {
        showErrorMessage('Please add at least one material to the lesson.');
        return false;
    }
    
    return true;
}

async function createLessonMaterials(lessonId) {
    console.log('💾 Starting to create lesson materials for lesson:', lessonId);
    console.log('🖼️ Materials to create:', lessonMaterials);
    
    for (const material of lessonMaterials) {
        const materialData = {
            lesson_id: lessonId,
            material_type: material.type,
            title: material.title,
            content: material.content,
            file_url: material.file_url || null, // Include file_url for images
            material_order: material.order,
            metadata: {
                ...material.metadata,
                // Add image sizing information for image materials
                ...(material.type === 'image' && {
                    imageSize: material.imageSize || 100,
                    sizePreset: material.sizePreset || 'medium'
                })
            }
        };
        
        console.log(`💾 Creating material: ${material.type} - ${material.title}`);
        if (material.type === 'image') {
            console.log('🖼️ Image material data:');
            console.log('  - Has file_url:', !!material.file_url);
            console.log('  - URL:', material.file_url);
            console.log('  - Storage path:', material.storagePath);
            
            // Validate image data
            const isValid = validateImageData(material);
            console.log('  - Image validation result:', isValid);
        }
        
        const { error } = await supabase
            .from('lesson_materials')
            .insert([materialData]);
            
        if (error) {
            console.error('❌ Error creating material:', error);
        } else {
            console.log('✅ Material created successfully');
        }
    }
}

function addMaterial(materialType) {
    const materialOrder = lessonMaterials.length + 1;
    const materialId = `material_${Date.now()}`;
    
    const material = {
        id: materialId,
        type: materialType,
        title: `${capitalizeFirst(materialType)} ${materialOrder}`,
        content: '',
        order: materialOrder,
        metadata: {},
        isExisting: false, // New material
        dbId: null // No database ID yet
    };
    
    // Initialize vocabulary data for vocabulary materials
    if (materialType === 'vocabulary') {
        material.vocabularyData = [{ arabic: '', english: '' }];
    }
    
    // Initialize quiz data for quiz materials
    if (materialType === 'quiz_question') {
        material.quizData = {
            questionType: 'multiple_choice', // 'multiple_choice' or 'true_false'
            question: '',
            options: [
                { id: 'A', text: '', isCorrect: false },
                { id: 'B', text: '', isCorrect: false },
                { id: 'C', text: '', isCorrect: false },
                { id: 'D', text: '', isCorrect: false }
            ],
            explanation: ''
        };
        // Store quiz data in metadata for database compatibility
        material.metadata.quizData = material.quizData;
    }
    
    lessonMaterials.push(material);
    renderMaterialBuilder();
    
    // Scroll to the new material for better UX
    setTimeout(() => {
        const materialElements = document.querySelectorAll('.material-editor');
        if (materialElements.length > 0) {
            const lastMaterial = materialElements[materialElements.length - 1];
            lastMaterial.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

// ========================================
//   Quiz Builder Functions
// ========================================

/**
 * Renders quiz options based on question type
 * @param {Object} quizData - The quiz data object
 * @param {number} materialIndex - Material index
 * @returns {string} HTML for quiz options
 */
function renderQuizOptions(quizData, materialIndex) {
    if (quizData.questionType === 'true_false') {
        // For True/False questions, just show True and False options
        return `
            <div class="quiz-option-item">
                <span class="option-label">T</span>
                <input type="text" class="option-input" value="True" disabled>
                <label class="option-correct-checkbox">
                    <input type="checkbox" ${quizData.options.find(o => o.id === 'T')?.isCorrect ? 'checked' : ''}
                           onchange="setQuizCorrectOption(${materialIndex}, 'T', this.checked)">
                    <span class="checkmark"></span>
                </label>
            </div>
            <div class="quiz-option-item">
                <span class="option-label">F</span>
                <input type="text" class="option-input" value="False" disabled>
                <label class="option-correct-checkbox">
                    <input type="checkbox" ${quizData.options.find(o => o.id === 'F')?.isCorrect ? 'checked' : ''}
                           onchange="setQuizCorrectOption(${materialIndex}, 'F', this.checked)">
                    <span class="checkmark"></span>
                </label>
            </div>
        `;
    } else {
        // For Multiple Choice questions, show all options with add/remove capabilities
        return quizData.options.map((option, optionIndex) => {
            return `
                <div class="quiz-option-item" id="quizOption${materialIndex}_${optionIndex}">
                    <span class="option-label">${option.id}</span>
                    <input type="text" class="option-input" 
                           value="${escapeHtml(option.text)}" 
                           placeholder="Enter answer option..."
                           onchange="updateQuizOptionText(${materialIndex}, ${optionIndex}, this.value)">
                    <label class="option-correct-checkbox">
                        <input type="checkbox" ${option.isCorrect ? 'checked' : ''}
                               onchange="setQuizCorrectOption(${materialIndex}, ${optionIndex}, this.checked)">
                        <span class="checkmark"></span>
                    </label>
                    ${optionIndex > 3 ? `
                        <button type="button" class="remove-option-btn" 
                                onclick="removeQuizOption(${materialIndex}, ${optionIndex})">
                            ×
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
}

/**
 * Updates the question type (multiple choice or true/false)
 * @param {number} index - Material index
 * @param {string} type - Question type ('multiple_choice' or 'true_false')
 */
function updateQuizType(index, type) {
    const material = lessonMaterials[index];
    if (!material || material.type !== 'quiz_question') return;
    
    console.log(`🎯 Updating quiz type for material ${index}:`, type);
    
    // Update quiz data
    material.quizData.questionType = type;
    
    // Update UI to reflect type change
    const typeOptions = document.querySelectorAll(`[name="quizType${index}"]`);
    typeOptions.forEach(option => {
        const label = option.closest('.quiz-type-option');
        if (label) {
            label.classList.toggle('active', option.checked);
        }
    });
    
    // Reset options based on question type
    if (type === 'true_false') {
        material.quizData.options = [
            { id: 'T', text: 'True', isCorrect: false },
            { id: 'F', text: 'False', isCorrect: false }
        ];
    } else {
        // Always reset to default multiple choice options when switching to multiple choice
        material.quizData.options = [
            { id: 'A', text: '', isCorrect: false },
            { id: 'B', text: '', isCorrect: false },
            { id: 'C', text: '', isCorrect: false },
            { id: 'D', text: '', isCorrect: false }
        ];
    }
    
    // Store in metadata for database compatibility
    material.metadata.quizData = material.quizData;
    
    // Re-render the options section
    const optionsContainer = document.getElementById(`quizOptionsList${index}`);
    if (optionsContainer) {
        optionsContainer.innerHTML = renderQuizOptions(material.quizData, index);
    }
    
    // Show/hide the add option button based on type
    const optionsHeader = document.querySelector(`#quizBuilder${index} .quiz-options-header`);
    if (optionsHeader) {
        optionsHeader.innerHTML = `
            <h6 class="quiz-options-title">Answer Options:</h6>
            ${type === 'multiple_choice' ? `
                <button type="button" class="add-option-btn" onclick="addQuizOption(${index})">
                    <span>+</span> Add Option
                </button>
            ` : ''}
        `;
    }
}

/**
 * Updates the quiz question text
 * @param {number} index - Material index
 * @param {string} question - Question text
 */
function updateQuizQuestion(index, question) {
    const material = lessonMaterials[index];
    if (!material || material.type !== 'quiz_question') return;
    
    material.quizData.question = question;
    material.content = question; // Store in content for backward compatibility
    material.metadata.quizData = material.quizData;
    
    console.log(`📝 Updated quiz question for material ${index}:`, question);
}

/**
 * Updates quiz option text
 * @param {number} materialIndex - Material index
 * @param {number|string} optionIndex - Option index or ID for T/F
 * @param {string} text - Option text
 */
function updateQuizOptionText(materialIndex, optionIndex, text) {
    const material = lessonMaterials[materialIndex];
    if (!material || material.type !== 'quiz_question') return;
    
    if (typeof optionIndex === 'string' && material.quizData.questionType === 'true_false') {
        // Handle true/false options by ID
        const option = material.quizData.options.find(o => o.id === optionIndex);
        if (option) {
            option.text = text;
        }
    } else if (typeof optionIndex === 'number') {
        // Handle multiple choice options by index
        if (material.quizData.options[optionIndex]) {
            material.quizData.options[optionIndex].text = text;
        }
    }
    
    // Store in metadata for database compatibility
    material.metadata.quizData = material.quizData;
}

/**
 * Sets the correct answer for a quiz option
 * @param {number} materialIndex - Material index
 * @param {number|string} optionIndex - Option index or ID for T/F
 * @param {boolean} isCorrect - Whether option is correct
 */
function setQuizCorrectOption(materialIndex, optionIndex, isCorrect) {
    const material = lessonMaterials[materialIndex];
    if (!material || material.type !== 'quiz_question') return;
    
    let targetOption;
    
    if (typeof optionIndex === 'string' && material.quizData.questionType === 'true_false') {
        // Handle true/false options by ID
        targetOption = material.quizData.options.find(o => o.id === optionIndex);
        
        // For T/F, ensure only one is correct (radio button behavior)
        if (isCorrect && targetOption) {
            material.quizData.options.forEach(opt => {
                opt.isCorrect = (opt.id === optionIndex);
            });
            
            // Update the other checkbox in the UI
            const otherOptionId = optionIndex === 'T' ? 'F' : 'T';
            const otherCheckbox = document.querySelector(`#quizBuilder${materialIndex} input[onchange*="setQuizCorrectOption(${materialIndex}, '${otherOptionId}'"]`);
            if (otherCheckbox) {
                otherCheckbox.checked = false;
            }
        }
    } else if (typeof optionIndex === 'number') {
        // Handle multiple choice options by index
        targetOption = material.quizData.options[optionIndex];
        if (targetOption) {
            targetOption.isCorrect = isCorrect;
        }
    }
    
    // Store in metadata for database compatibility
    material.metadata.quizData = material.quizData;
    
    console.log(`✅ Updated correct answer for option ${optionIndex} to ${isCorrect}`, material.quizData.options);
}

/**
 * Adds a new option to a multiple choice quiz
 * @param {number} index - Material index
 */
function addQuizOption(index) {
    const material = lessonMaterials[index];
    if (!material || material.type !== 'quiz_question' || material.quizData.questionType !== 'multiple_choice') return;
    
    const options = material.quizData.options;
    const newOptionId = String.fromCharCode(65 + options.length); // A, B, C, D, E, etc.
    
    options.push({
        id: newOptionId,
        text: '',
        isCorrect: false
    });
    
    // Store in metadata for database compatibility
    material.metadata.quizData = material.quizData;
    
    // Re-render the options section
    const optionsContainer = document.getElementById(`quizOptionsList${index}`);
    if (optionsContainer) {
        optionsContainer.innerHTML = renderQuizOptions(material.quizData, index);
    }
    
    console.log(`➕ Added new quiz option ${newOptionId} to material ${index}`);
}

/**
 * Removes an option from a multiple choice quiz
 * @param {number} materialIndex - Material index
 * @param {number} optionIndex - Option index
 */
function removeQuizOption(materialIndex, optionIndex) {
    const material = lessonMaterials[materialIndex];
    if (!material || material.type !== 'quiz_question' || material.quizData.questionType !== 'multiple_choice') return;
    
    // Don't allow removing if we only have 2 options left
    if (material.quizData.options.length <= 2) {
        showErrorMessage('Quiz questions must have at least 2 options.');
        return;
    }
    
    // Remove the option
    material.quizData.options.splice(optionIndex, 1);
    
    // Re-assign option IDs (A, B, C, etc.)
    material.quizData.options.forEach((option, idx) => {
        option.id = String.fromCharCode(65 + idx);
    });
    
    // Store in metadata for database compatibility
    material.metadata.quizData = material.quizData;
    
    // Re-render the options section
    const optionsContainer = document.getElementById(`quizOptionsList${materialIndex}`);
    if (optionsContainer) {
        optionsContainer.innerHTML = renderQuizOptions(material.quizData, materialIndex);
    }
    
    console.log(`➖ Removed quiz option from material ${materialIndex}`);
}

/**
 * Updates the explanation text for a quiz
 * @param {number} index - Material index
 * @param {string} explanation - Explanation text
 */
function updateQuizExplanation(index, explanation) {
    const material = lessonMaterials[index];
    if (!material || material.type !== 'quiz_question') return;
    
    material.quizData.explanation = explanation;
    material.metadata.quizData = material.quizData;
    
    console.log(`📝 Updated quiz explanation for material ${index}`);
}

/**
 * Shows a preview of the quiz
 * @param {number} index - Material index
 */
function previewQuiz(index) {
    const material = lessonMaterials[index];
    if (!material || material.type !== 'quiz_question') return;
    
    console.log(`👁️ Previewing quiz for material ${index}:`, material.quizData);
    
    // Create modal if it doesn't exist
    let previewModal = document.getElementById('quizPreviewModal');
    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'quizPreviewModal';
        previewModal.className = 'quiz-preview-modal';
        previewModal.style.display = 'none';
        document.body.appendChild(previewModal);
    }
    
    // Generate the preview content
    const quizData = material.quizData;
    const hasValidQuestion = quizData.question && quizData.question.trim();
    const hasValidOptions = quizData.options.some(opt => opt.text && opt.text.trim());
    
    let optionsHtml = '';
    
    if (quizData.questionType === 'true_false') {
        optionsHtml = `
            <div class="quiz-options">
                <label class="quiz-option ${quizData.options.find(o => o.id === 'T')?.isCorrect ? 'correct-answer' : ''}">
                    <input type="radio" name="previewQuiz${index}" disabled>
                    <span>True</span>
                    ${quizData.options.find(o => o.id === 'T')?.isCorrect ? '<span class="correct-marker">✓</span>' : ''}
                </label>
                <label class="quiz-option ${quizData.options.find(o => o.id === 'F')?.isCorrect ? 'correct-answer' : ''}">
                    <input type="radio" name="previewQuiz${index}" disabled>
                    <span>False</span>
                    ${quizData.options.find(o => o.id === 'F')?.isCorrect ? '<span class="correct-marker">✓</span>' : ''}
                </label>
            </div>
        `;
    } else {
        optionsHtml = `
            <div class="quiz-options">
                ${quizData.options.map(option => {
                    const optionText = option.text.trim() || `Option ${option.id}`;
                    return `
                        <label class="quiz-option ${option.isCorrect ? 'correct-answer' : ''}">
                            <input type="radio" name="previewQuiz${index}" disabled>
                            <span>${escapeHtml(optionText)}</span>
                            ${option.isCorrect ? '<span class="correct-marker">✓</span>' : ''}
                        </label>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    const explanationHtml = quizData.explanation ? `
        <div class="quiz-explanation">
            <h4>Explanation:</h4>
            <p>${escapeHtml(quizData.explanation)}</p>
        </div>
    ` : '';
    
    // Set the modal content
    previewModal.innerHTML = `
        <div class="quiz-preview-content">
            <div class="quiz-preview-header">
                <h3 class="quiz-preview-title">Quiz Preview</h3>
                <button class="quiz-preview-close" onclick="closeQuizPreview()">&times;</button>
            </div>
            <div class="quiz-preview-body">
                <div class="quiz-question">
                    <h4>${hasValidQuestion ? escapeHtml(quizData.question) : 'Your question will appear here'}</h4>
                    ${hasValidOptions ? optionsHtml : '<p class="placeholder-text">Your answer options will appear here</p>'}
                </div>
                ${explanationHtml}
            </div>
        </div>
    `;
    
    // Show the modal
    previewModal.style.display = 'flex';
    
    // Close when clicking outside
    previewModal.addEventListener('click', function(e) {
        if (e.target === previewModal) {
            closeQuizPreview();
        }
    });
}

/**
 * Closes the quiz preview modal
 */
function closeQuizPreview() {
    const previewModal = document.getElementById('quizPreviewModal');
    if (previewModal) {
        previewModal.style.display = 'none';
    }
}

function renderMaterialBuilder() {
    if (lessonMaterials.length === 0) {
        materialsList.innerHTML = '<p class="no-materials">No materials added yet. Use the buttons above to build your lesson content.</p>';
        return;
    }
    
    materialsList.innerHTML = lessonMaterials.map((material, index) => {
        let materialInputs = '';
        
        if (material.type === 'vocabulary') {
            materialInputs = `
                <input type="text" class="material-title-input" value="${escapeHtml(material.title)}" 
                       onchange="updateMaterial(${index}, 'title', this.value)" placeholder="Vocabulary section title...">
                <div class="vocabulary-table-builder">
                    <div class="vocab-table-header">
                        <h5>Vocabulary Table</h5>
                        <button type="button" class="btn-small add-vocab-row" onclick="addVocabularyRow(${index})">
                            + Add Row
                        </button>
                    </div>
                    <div class="vocab-table-container" id="vocabTable${index}">
                        ${renderVocabularyTable(material, index)}
                    </div>
                </div>
            `;
        } else if (material.type === 'image') {
            const hasImage = material.file_url && (material.file_url.startsWith('data:image') || material.file_url.startsWith('http'));
            materialInputs = `
                <input type="text" class="material-title-input" value="${escapeHtml(material.title)}" 
                       onchange="updateMaterial(${index}, 'title', this.value)" placeholder="Image title...">
                <div class="image-upload-section">
                    <input type="file" class="material-image-input" id="imageInput${index}" 
                           accept="image/*" onchange="handleImageUpload(${index}, this)">
                    <label for="imageInput${index}" class="image-upload-label">
                        <span class="upload-icon">🖼️</span>
                        <span class="upload-text">${hasImage ? 'Change Image' : 'Choose Image File'}</span>
                    </label>
                    ${hasImage ? `
                        <div class="image-preview" style="display: block;">
                            <div class="responsive-image-container" id="imageContainer${index}">
                                <img src="${material.file_url}" alt="Preview" class="preview-image resizable-image" id="previewImage${index}">
                            </div>
                            <span class="image-name">${escapeHtml(material.fileName || 'Current image')}</span>
                            <div class="image-info">
                                <small>${material.file_url.startsWith('http') ? '🌐 Stored in cloud' : '💾 Embedded data'}</small>
                            </div>
                            
                            <!-- Image Sizing Controls -->
                            <div class="image-sizing-controls" id="sizingControls${index}">
                                <!-- Slider Control -->
                                <div class="sizing-section">
                                    <label class="sizing-label">🔧 Custom Size</label>
                                    <div class="size-slider-container">
                                        <input type="range" class="size-slider" id="sizeSlider${index}" 
                                               min="25" max="200" value="${material.imageSize || 100}" 
                                               oninput="updateImageSize(${index}, this.value, 'slider')">
                                        <span class="size-value" id="sizeValue${index}">${material.imageSize || 100}%</span>
                                    </div>
                                </div>
                                
                                <!-- Preset Buttons -->
                                <div class="sizing-section">
                                    <label class="sizing-label">📐 Quick Presets</label>
                                    <div class="size-presets">
                                        <button type="button" class="size-preset-btn" data-size="small" 
                                                onclick="updateImageSize(${index}, 'small', 'preset')">Small</button>
                                        <button type="button" class="size-preset-btn" data-size="medium" 
                                                onclick="updateImageSize(${index}, 'medium', 'preset')">Medium</button>
                                        <button type="button" class="size-preset-btn" data-size="large" 
                                                onclick="updateImageSize(${index}, 'large', 'preset')">Large</button>
                                        <button type="button" class="size-preset-btn" data-size="full" 
                                                onclick="updateImageSize(${index}, 'full', 'preset')">Full Width</button>
                                    </div>
                                </div>
                            </div>
                            
                            <button type="button" class="btn-small delete" onclick="clearImageUpload(${index})">
                                Clear Image
                            </button>
                        </div>
                    ` : '<div class="image-preview" style="display: none;"></div>'}
                </div>
                <textarea class="material-content-input" rows="2" 
                          onchange="updateMaterial(${index}, 'content', this.value)" 
                          placeholder="Image caption or description...">${escapeHtml(material.content)}</textarea>
            `;
        } else if (material.type === 'quiz_question') {
            const quizData = material.quizData || {
                questionType: 'multiple_choice',
                question: '',
                options: [
                    { id: 'A', text: '', isCorrect: false },
                    { id: 'B', text: '', isCorrect: false },
                    { id: 'C', text: '', isCorrect: false },
                    { id: 'D', text: '', isCorrect: false }
                ],
                explanation: ''
            };
            
            materialInputs = `
                <input type="text" class="material-title-input" value="${escapeHtml(material.title)}" 
                       onchange="updateMaterial(${index}, 'title', this.value)" placeholder="Quiz title...">
                
                <!-- Interactive Quiz Builder -->
                <div class="quiz-builder" id="quizBuilder${index}">
                    <!-- Quiz Type Selector -->
                    <div class="quiz-builder-header">
                        <h5 style="margin: 0; color: #6b5b4a;">🎯 Interactive Quiz Builder</h5>
                        <div class="quiz-type-selector">
                            <label class="quiz-type-option ${quizData.questionType === 'multiple_choice' ? 'active' : ''}">
                                <input type="radio" name="quizType${index}" value="multiple_choice" 
                                       class="quiz-type-radio" ${quizData.questionType === 'multiple_choice' ? 'checked' : ''}
                                       onchange="updateQuizType(${index}, this.value)">
                                Multiple Choice
                            </label>
                            <label class="quiz-type-option ${quizData.questionType === 'true_false' ? 'active' : ''}">
                                <input type="radio" name="quizType${index}" value="true_false" 
                                       class="quiz-type-radio" ${quizData.questionType === 'true_false' ? 'checked' : ''}
                                       onchange="updateQuizType(${index}, this.value)">
                                True/False
                            </label>
                        </div>
                    </div>
                    
                    <!-- Question Input -->
                    <textarea class="quiz-question-input" id="quizQuestion${index}" 
                              placeholder="Enter your quiz question here..." 
                              onchange="updateQuizQuestion(${index}, this.value)">${escapeHtml(quizData.question)}</textarea>
                    
                    <!-- Answer Options -->
                    <div class="quiz-options-section">
                        <div class="quiz-options-header">
                            <h6 class="quiz-options-title">Answer Options:</h6>
                            ${quizData.questionType === 'multiple_choice' ? `
                                <button type="button" class="add-option-btn" onclick="addQuizOption(${index})">
                                    <span>+</span> Add Option
                                </button>
                            ` : ''}
                        </div>
                        
                        <div class="quiz-options-list" id="quizOptionsList${index}">
                            ${renderQuizOptions(quizData, index)}
                        </div>
                    </div>
                    
                    <!-- Explanation Section -->
                    <div class="quiz-explanation-section">
                        <label class="quiz-explanation-label">💡 Explanation (optional):</label>
                        <textarea class="quiz-explanation-input" id="quizExplanation${index}" 
                                  placeholder="Provide feedback or explanation for the answer..." 
                                  onchange="updateQuizExplanation(${index}, this.value)">${escapeHtml(quizData.explanation)}</textarea>
                    </div>
                    
                    <!-- Preview Button -->
                    <button type="button" class="quiz-preview-btn" onclick="previewQuiz(${index})">
                        <span>👁️</span> Preview Quiz
                    </button>
                </div>
            `;
        } else {
            materialInputs = `
                <input type="text" class="material-title-input" value="${escapeHtml(material.title)}" 
                       onchange="updateMaterial(${index}, 'title', this.value)" placeholder="Material title...">
                <textarea class="material-content-input" rows="3" 
                          onchange="updateMaterial(${index}, 'content', this.value)" 
                          placeholder="${getMaterialPlaceholder(material.type)}">${escapeHtml(material.content)}</textarea>
            `;
        }
        
        // Add status indicator for existing vs new materials
        const statusIndicator = material.isExisting ? 
            '<span class="material-status existing">📁 Existing</span>' : 
            '<span class="material-status new">✨ New</span>';
        
        return `
            <div class="material-editor ${material.isExisting ? 'existing-material' : 'new-material'}" data-material-id="${material.id}">
                <div class="material-header">
                    <h4>${capitalizeFirst(material.type)} - ${escapeHtml(material.title)} ${statusIndicator}</h4>
                    <div class="material-controls">
                        <button type="button" class="btn-small" onclick="moveMaterial(${index}, 'up')" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button type="button" class="btn-small" onclick="moveMaterial(${index}, 'down')" ${index === lessonMaterials.length - 1 ? 'disabled' : ''}>↓</button>
                        <button type="button" class="btn-small delete" onclick="removeMaterial(${index})">×</button>
                    </div>
                </div>
                <div class="material-inputs">
                    ${materialInputs}
                </div>
            </div>
        `;
    }).join('');
}

function clearImageUpload(index) {
    if (lessonMaterials[index]) {
        const material = lessonMaterials[index];
        
        // Clean up storage if it exists
        if (material.storagePath) {
            console.log('🗑️ Cleaning up storage for cleared image:', material.storagePath);
            
            // Delete from storage (async, don't wait)
            supabase.storage
                .from('lesson-images')
                .remove([material.storagePath])
                .then(({ error }) => {
                    if (error) {
                        console.warn('⚠️ Storage cleanup warning:', error);
                    } else {
                        console.log('✅ Storage cleaned up successfully');
                    }
                });
        }
        
        // Clear the material data
        lessonMaterials[index].file_url = null;
        lessonMaterials[index].fileName = null;
        lessonMaterials[index].storagePath = null;
        
        // Clear the file input
        const fileInput = document.getElementById(`imageInput${index}`);
        if (fileInput) {
            fileInput.value = '';
        }
        
        renderMaterialBuilder();
        showSuccessMessage('Image cleared successfully!');
    }
}

function getMaterialPlaceholder(materialType) {
    switch (materialType) {
        case 'text':
            return 'Enter text content here...';
        case 'vocabulary':
            return 'Enter vocabulary items (Arabic - English pairs)...';
        case 'quiz_question':
            return 'Enter quiz question and answer options...';
        default:
            return 'Enter content...';
    }
}

function updateMaterial(index, field, value) {
    if (lessonMaterials[index]) {
        lessonMaterials[index][field] = value;
    }
}

function moveMaterial(index, direction) {
    if (direction === 'up' && index > 0) {
        [lessonMaterials[index], lessonMaterials[index - 1]] = [lessonMaterials[index - 1], lessonMaterials[index]];
    } else if (direction === 'down' && index < lessonMaterials.length - 1) {
        [lessonMaterials[index], lessonMaterials[index + 1]] = [lessonMaterials[index + 1], lessonMaterials[index]];
    }
    
    // Update orders
    lessonMaterials.forEach((material, i) => {
        material.order = i + 1;
    });
    
    renderMaterialBuilder();
}

function removeMaterial(index) {
    const material = lessonMaterials[index];
    
    // Clean up storage if it's an image with storage path
    if (material && material.type === 'image' && material.storagePath) {
        console.log('🗑️ Cleaning up storage for removed image:', material.storagePath);
        
        // Delete from storage (async, don't wait)
        supabase.storage
            .from('lesson-images')
            .remove([material.storagePath])
            .then(({ error }) => {
                if (error) {
                    console.warn('⚠️ Storage cleanup warning:', error);
                } else {
                    console.log('✅ Storage cleaned up successfully');
                }
            });
    }
    
    lessonMaterials.splice(index, 1);
    
    // Update orders
    lessonMaterials.forEach((material, i) => {
        material.order = i + 1;
    });
    
    renderMaterialBuilder();
}

function validateImageData(material) {
    console.log('🔍 Validating image data for material:');
    console.log('  - Material type:', material.type);
    console.log('  - Has file_url:', !!material.file_url);
    
    if (!material.file_url) {
        console.log('⚠️ No file_url found');
        return false;
    }
    
    const isHttpUrl = material.file_url.startsWith('http');
    const isStorageUrl = material.file_url.includes('supabase') || material.file_url.includes('storage');
    
    console.log('  - Is HTTP URL:', isHttpUrl);
    console.log('  - Is Storage URL:', isStorageUrl);
    console.log('  - URL:', material.file_url);
    
    return isHttpUrl;
}

async function handleImageUpload(index, input) {
    const file = input.files[0];
    if (!file) return;
    
    console.log('🖼️ Starting image upload to storage:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showErrorMessage('Please select a valid image file.');
        input.value = '';
        return;
    }
    
    // Validate file size (max 10MB for storage)
    if (file.size > 10 * 1024 * 1024) {
        showErrorMessage('Image file size must be less than 10MB.');
        input.value = '';
        return;
    }
    
    showSuccessMessage('Uploading image to storage...');
    
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `lessons/${timestamp}-${sanitizedFileName}`;
        
        console.log('📁 Uploading to storage path:', fileName);
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('lesson-images')
            .upload(fileName, file, {
                contentType: file.type,
                upsert: true
            });
            
        if (uploadError) {
            console.error('❌ Storage upload error:', uploadError);
            throw uploadError;
        }
        
        console.log('✅ Upload successful:', uploadData);
        
        // Get public URL
        const { data: urlData } = supabase.storage
            .from('lesson-images')
            .getPublicUrl(fileName);
            
        if (!urlData?.publicUrl) {
            throw new Error('Failed to get public URL');
        }
        
        console.log('🔗 Public URL generated:', urlData.publicUrl);
        
        // Store the public URL and metadata
        if (lessonMaterials[index]) {
            lessonMaterials[index].file_url = urlData.publicUrl;
            lessonMaterials[index].fileName = file.name;
            lessonMaterials[index].storagePath = fileName; // Store for cleanup
            
            console.log('💾 Material updated with storage data');
            console.log('📦 Material object:', lessonMaterials[index]);
            
            renderMaterialBuilder();
            
            // Initialize image sizing controls
            initializeImageSizing(index);
            
            showSuccessMessage(`Image "${file.name}" uploaded successfully!`);
        }
        
    } catch (error) {
        console.error('❌ Error uploading image:', error);
        showErrorMessage(`Failed to upload image: ${error.message}`);
        input.value = '';
    }
}

function resetLessonFormData() {
    lessonForm.reset();
    lessonMaterials = [];
    currentEditingLesson = null;
    updateFormForEditMode(false);
    renderMaterialBuilder();
    hideMessages();
}

async function toggleLessonPublishStatus(lessonId, isPublished) {
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('lessons')
            .update({ is_published: isPublished })
            .eq('id', lessonId);
            
        if (error) {
            throw error;
        }
        
        showSuccessMessage(`Lesson ${isPublished ? 'published' : 'unpublished'} successfully!`);
        await loadCourseLessons(currentSelectedCourse.id);
        
    } catch (error) {
        console.error('Error updating lesson status:', error);
        showErrorMessage('Failed to update lesson status.');
    } finally {
        showLoading(false);
    }
}

async function deleteLesson(lessonId, lessonTitle) {
    const confirmed = confirm(`Are you sure you want to delete "${lessonTitle}"?\n\nThis will also delete all associated materials. This action cannot be undone.`);
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('lessons')
            .delete()
            .eq('id', lessonId);
            
        if (error) {
            throw error;
        }
        
        showSuccessMessage('Lesson deleted successfully!');
        await loadCourseLessons(currentSelectedCourse.id);
        
    } catch (error) {
        console.error('Error deleting lesson:', error);
        showErrorMessage('Failed to delete lesson.');
    } finally {
        showLoading(false);
    }
}

async function editLesson(lessonId) {
    if (!currentSelectedCourse) {
        showErrorMessage('No course selected.');
        return;
    }
    
    showLoading(true);
    
    try {
        // Load lesson data with materials
        const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .select(`
                *,
                lesson_materials (*)
            `)
            .eq('id', lessonId)
            .single();
            
        if (lessonError) {
            throw lessonError;
        }
        
        if (!lesson) {
            throw new Error('Lesson not found');
        }
        
        // Enter edit mode
        currentEditingLesson = lesson;
        populateLessonFormForEdit(lesson);
        
        showSuccessMessage('Lesson loaded for editing. Make your changes and click "Update Lesson".');
        
        // Scroll to form
        lessonForm.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error loading lesson for edit:', error);
        showErrorMessage('Failed to load lesson for editing.');
    } finally {
        showLoading(false);
    }
}

function populateLessonFormForEdit(lesson) {
    // Populate basic lesson form fields
    document.getElementById('lessonTitle').value = lesson.title;
    document.getElementById('lessonDescription').value = lesson.description || '';
    document.getElementById('lessonOrder').value = lesson.lesson_order;
    document.getElementById('lessonDuration').value = lesson.duration_minutes;
    document.getElementById('lessonPublished').checked = lesson.is_published;
    
    // Load existing materials
    lessonMaterials = [];
    if (lesson.lesson_materials && lesson.lesson_materials.length > 0) {
        console.log('💾 Loading existing materials:', lesson.lesson_materials);
        
        lessonMaterials = lesson.lesson_materials
            .sort((a, b) => a.material_order - b.material_order)
            .map(material => {
                const materialObj = {
                    id: material.id,
                    type: material.material_type,
                    title: material.title,
                    content: material.content || '',
                    file_url: material.file_url,
                    order: material.material_order,
                    metadata: material.metadata || {},
                    isExisting: true, // Flag to track existing materials
                    dbId: material.id // Store database ID for updates
                };
                
                if (material.material_type === 'image') {
                    console.log(`🖼️ Loading image material: ${material.title}`);
                    console.log('  - Has file_url:', !!material.file_url);
                    console.log('  - URL:', material.file_url);
                    
                    // Load image sizing data from metadata
                    if (material.metadata) {
                        materialObj.imageSize = material.metadata.imageSize || 100;
                        materialObj.sizePreset = material.metadata.sizePreset || 'medium';
                        console.log('  - Image size:', materialObj.imageSize + '%');
                        console.log('  - Size preset:', materialObj.sizePreset);
                    }
                }
                
                // Parse vocabulary content into table format
                if (material.material_type === 'vocabulary') {
                    materialObj.vocabularyData = parseVocabularyContent(material.content);
                }
                
                // Load quiz data from metadata
                if (material.material_type === 'quiz_question') {
                    console.log(`🎯 Loading quiz material: ${material.title}`);
                    
                    if (material.metadata && material.metadata.quizData) {
                        // Use stored quiz data structure from metadata
                        materialObj.quizData = material.metadata.quizData;
                        console.log('  - Loaded quiz data from metadata');
                    } else {
                        // Create default quiz data if none exists
                        materialObj.quizData = {
                            questionType: 'multiple_choice',
                            question: material.content || '',
                            options: [
                                { id: 'A', text: '', isCorrect: false },
                                { id: 'B', text: '', isCorrect: false },
                                { id: 'C', text: '', isCorrect: false },
                                { id: 'D', text: '', isCorrect: false }
                            ],
                            explanation: ''
                        };
                        console.log('  - Created default quiz data structure');
                    }
                    
                    // Ensure metadata is updated
                    materialObj.metadata = materialObj.metadata || {};
                    materialObj.metadata.quizData = materialObj.quizData;
                }
                
                return materialObj;
            });
    }
    
    renderMaterialBuilder();
    
    // Initialize image sizing controls for any existing image materials
    setTimeout(() => {
        lessonMaterials.forEach((material, index) => {
            if (material.type === 'image' && material.file_url) {
                initializeImageSizing(index);
            }
        });
    }, 200);
    
    // Update form submit button text and show cancel button
    updateFormForEditMode(true);
}

function updateFormForEditMode(isEditing) {
    const submitBtn = lessonForm.querySelector('button[type="submit"]');
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    if (isEditing) {
        submitBtn.textContent = 'Update Lesson';
        submitBtn.className = 'btn-primary update-lesson';
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }
    } else {
        submitBtn.textContent = 'Create Lesson';
        submitBtn.className = 'btn-primary';
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    }
}

function cancelLessonEdit() {
    if (confirm('Are you sure you want to cancel editing? Any unsaved changes will be lost.')) {
        currentEditingLesson = null;
        resetLessonFormData();
        updateFormForEditMode(false);
        showSuccessMessage('Edit cancelled.');
    }
}

function isEditMode() {
    return currentEditingLesson !== null;
}

// ===========================================
// LESSON PREVIEW FUNCTIONALITY
// ===========================================

// Preview modal elements
let previewModal = null;
let previewLessonMaterials = null;
let previewLessonLoading = null;
let previewLessonTitle = null;
let previewCourseTitle = null;
let previewLessonDuration = null;
let previewLessonDescription = null;
let previewLessonDescriptionText = null;

// Initialize preview modal elements when DOM is ready
function initializePreviewElements() {
    // Get preview modal elements
    previewModal = document.getElementById('lessonPreviewModal');
    previewLessonMaterials = document.getElementById('previewLessonMaterials');
    previewLessonLoading = document.getElementById('previewLessonLoading');
    previewLessonTitle = document.getElementById('previewLessonTitle');
    previewCourseTitle = document.getElementById('previewCourseTitle');
    previewLessonDuration = document.getElementById('previewLessonDuration');
    previewLessonDescription = document.getElementById('previewLessonDescription');
    previewLessonDescriptionText = document.getElementById('previewLessonDescriptionText');
}

// Call initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Delay initialization to ensure all elements are loaded
    setTimeout(initializePreviewElements, 100);
});

async function previewLesson(lessonId) {
    if (!lessonId) {
        showErrorMessage('No lesson ID provided for preview.');
        return;
    }
    
    try {
        // Initialize preview elements if not already done
        if (!previewModal) {
            initializePreviewElements();
        }
        
        // Show the preview modal
        showPreviewModal();
        showPreviewLoading(true);
        
        // Load lesson data with materials and course info
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
            console.error('Preview lesson query error:', lessonError);
            throw new Error(`Database error: ${lessonError.message}`);
        }
        
        if (!lesson) {
            throw new Error('Lesson not found');
        }
        
        // Display the lesson preview
        displayLessonPreview(lesson);
        
    } catch (error) {
        console.error('Error loading lesson preview:', error);
        showErrorMessage(`Failed to load lesson preview: ${error.message}`);
        closeLessonPreview();
    } finally {
        showPreviewLoading(false);
    }
}

function showPreviewModal() {
    if (previewModal) {
        previewModal.style.display = 'flex';
        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }
}

function closeLessonPreview() {
    if (previewModal) {
        previewModal.style.display = 'none';
        // Restore body scrolling
        document.body.style.overflow = 'auto';
        
        // Clear preview content
        clearPreviewContent();
    }
}

function showPreviewLoading(show) {
    if (previewLessonLoading && previewLessonMaterials) {
        previewLessonLoading.style.display = show ? 'block' : 'none';
        previewLessonMaterials.style.display = show ? 'none' : 'block';
    }
}

function clearPreviewContent() {
    if (previewLessonMaterials) {
        previewLessonMaterials.innerHTML = '';
    }
    if (previewLessonTitle) {
        previewLessonTitle.textContent = 'Lesson Title';
    }
    if (previewCourseTitle) {
        previewCourseTitle.textContent = 'Course Name';
    }
    if (previewLessonDuration) {
        previewLessonDuration.textContent = '15 min';
    }
    if (previewLessonDescription) {
        previewLessonDescription.style.display = 'none';
    }
}

function displayLessonPreview(lesson) {
    const course = lesson.course;
    const materials = lesson.lesson_materials || [];
    
    // Sort materials by order
    materials.sort((a, b) => a.material_order - b.material_order);
    
    // Update lesson header information
    if (previewLessonTitle) {
        previewLessonTitle.textContent = lesson.title;
    }
    
    if (previewCourseTitle) {
        previewCourseTitle.textContent = course ? course.title : 'Course';
    }
    
    if (previewLessonDuration) {
        previewLessonDuration.textContent = `${lesson.duration_minutes} min`;
    }
    
    // Show lesson description if it exists
    if (lesson.description && lesson.description.trim()) {
        if (previewLessonDescriptionText) {
            previewLessonDescriptionText.textContent = lesson.description;
        }
        if (previewLessonDescription) {
            previewLessonDescription.style.display = 'block';
        }
    } else {
        if (previewLessonDescription) {
            previewLessonDescription.style.display = 'none';
        }
    }
    
    // Display lesson materials
    displayPreviewMaterials(materials);
}

function displayPreviewMaterials(materials) {
    if (!previewLessonMaterials) return;
    
    if (!materials || materials.length === 0) {
        previewLessonMaterials.innerHTML = `
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
                            <li>🔤 Reading and comprehension skills</li>
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
        previewLessonMaterials.innerHTML = materials.map((material, index) => {
            return renderPreviewMaterial(material, index);
        }).join('');
    }
}

// This function reuses the exact same logic as the user-side lesson.js renderMaterial function
function renderPreviewMaterial(material, index) {
    switch (material.material_type) {
        case 'text':
            const textContent = material.content && material.content.trim() ? 
                formatPreviewTextContent(material.content) : 
                `<p class="placeholder-text">📝 <em>${material.title || 'Text content'} is being prepared. This will contain important lesson information and explanations.</em></p>`;
            
            return `
                <div class="material-item text-material" data-index="${index}">
                    <div class="material-content">
                        ${textContent}
                    </div>
                </div>
            `;
            
        case 'vocabulary':
            const vocabContent = material.content && material.content.trim() ? 
                renderPreviewVocabularyContent(material.content) : 
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
                <div class="material-item vocabulary-material" data-index="${index}">
                    <h3 class="material-title">Vocabulary</h3>
                    <div class="vocabulary-list">
                        ${vocabContent}
                    </div>
                </div>
            `;
            
        case 'image':
            const hasValidImage = material.file_url && (material.file_url.startsWith('data:image') || material.file_url.startsWith('http'));
            console.log(`🖼️ Rendering image material in preview:`);
            console.log('  - Material:', material.title);
            console.log('  - Has file_url:', !!material.file_url);
            console.log('  - URL type:', material.file_url ? (material.file_url.startsWith('data:image') ? 'base64' : 'URL') : 'none');
            console.log('  - hasValidImage:', hasValidImage);
            
            let imageContent;
            
            if (hasValidImage) {
                imageContent = `
                    <div class="lesson-image-container">
                        <img src="${material.file_url}" 
                             alt="${escapeHtml(material.title || 'Lesson image')}" 
                             class="lesson-image"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block'; console.error('Preview image failed to load:', '${material.file_url}');"
                             onload="console.log('Preview image loaded successfully:', '${material.title}')">
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
                <div class="material-item image-material" data-index="${index}">
                    <div class="image-container">
                        ${imageContent}
                        ${material.content && material.content.trim() ? `<p class="image-caption">${escapeHtml(material.content)}</p>` : ''}
                    </div>
                </div>
            `;
            
        case 'quiz_question':
            return `
                <div class="material-item quiz-material" data-index="${index}">
                    <div class="quiz-content">
                        ${renderPreviewQuizContent(material.content, material.metadata)}
                    </div>
                </div>
            `;
            
        default:
            return `
                <div class="material-item generic-material" data-index="${index}">
                    <div class="material-content">
                        <p>${escapeHtml(material.content || '📋 Content for this section is being prepared.')}</p>
                    </div>
                </div>
            `;
    }
}

// Helper functions for preview content formatting (reuse from lesson.js logic)

function formatPreviewTextContent(content) {
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

function renderPreviewVocabularyContent(content) {
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
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        return renderPreviewVocabularyContent(''); // Use placeholder
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
        return renderPreviewVocabularyContent(''); // Use placeholder
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

function renderPreviewQuizContent(content, metadata) {
    // Check if we have quiz data in the metadata
    let quizData;
    if (metadata && metadata.quizData) {
        quizData = metadata.quizData;
        console.log('🎯 Rendering quiz from metadata:', quizData);
    } else {
        // Fallback to simple content text
        const questionText = content && content.trim() ? 
            escapeHtml(content) : 
            'Interactive quiz question will be added here';
            
        console.log('🎯 Rendering quiz from content text (legacy):', content);
        
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
    
    // Generate options markup
    let optionsHtml = '';
    
    if (quizData.questionType === 'true_false') {
        optionsHtml = `
            <div class="quiz-options-preview">
                <div class="option-item ${quizData.options.find(o => o.id === 'T')?.isCorrect ? 'correct-option' : ''}">
                    <span class="option-marker">${quizData.options.find(o => o.id === 'T')?.isCorrect ? '✔' : '○'}</span>
                    <span class="option-text">True</span>
                </div>
                <div class="option-item ${quizData.options.find(o => o.id === 'F')?.isCorrect ? 'correct-option' : ''}">
                    <span class="option-marker">${quizData.options.find(o => o.id === 'F')?.isCorrect ? '✔' : '○'}</span>
                    <span class="option-text">False</span>
                </div>
            </div>
        `;
    } else {
        // Handle multiple choice questions
        optionsHtml = `
            <div class="quiz-options-preview">
                ${quizData.options.map(option => {
                    return `
                        <div class="option-item ${option.isCorrect ? 'correct-option' : ''}">
                            <span class="option-marker">${option.isCorrect ? '✔' : '○'}</span>
                            <span class="option-text">${escapeHtml(option.text || `Option ${option.id}`)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    // Add explanation if available
    const explanationHtml = quizData.explanation ? `
        <div class="quiz-explanation">
            <p><strong>Explanation:</strong> ${escapeHtml(quizData.explanation)}</p>
        </div>
    ` : '';
    
    return `
        <div class="quiz-question">
            <div class="question-content">
                <p>❓ ${escapeHtml(quizData.question)}</p>
            </div>
            ${optionsHtml}
            ${explanationHtml}
        </div>
    `;
}

// Close preview modal when Escape key is pressed
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && previewModal && previewModal.style.display === 'flex') {
        closeLessonPreview();
    }
});

// Prevent modal content clicks from closing the modal
document.addEventListener('click', function(e) {
    if (previewModal && e.target.classList.contains('preview-modal-content')) {
        e.stopPropagation();
    }
});

// Console message for debugging
console.log('🔧 Admin Dashboard loaded successfully');
console.log('🔗 Supabase connected:', SUPABASE_URL);
console.log('👁️ Lesson Preview functionality enabled');

// ========================================
//   Image Sizing Control Functions
// ========================================

/**
 * Update image size based on slider or preset selection
 * @param {number} index - Material index
 * @param {string|number} value - Size value (percentage for slider, preset name for buttons)
 * @param {string} type - 'slider' or 'preset'
 */
function updateImageSize(index, value, type) {
    const material = lessonMaterials[index];
    if (!material || material.type !== 'image') return;
    
    console.log(`🖼️ Updating image size for material ${index}:`, { value, type });
    
    const container = document.getElementById(`imageContainer${index}`);
    const image = document.getElementById(`previewImage${index}`);
    const slider = document.getElementById(`sizeSlider${index}`);
    const sizeValue = document.getElementById(`sizeValue${index}`);
    const presetButtons = container?.parentElement.querySelectorAll('.size-preset-btn');
    
    if (!container || !image || !slider || !sizeValue) return;
    
    let sizePercentage;
    let presetClass = '';
    
    if (type === 'slider') {
        // Handle slider input (25-200%)
        sizePercentage = parseInt(value);
        
        // Clear preset classes and button states
        container.className = 'responsive-image-container custom-size-container';
        presetButtons?.forEach(btn => btn.classList.remove('active'));
        
        // Apply custom scale transform
        const scale = sizePercentage / 100;
        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = 'top left';
        
    } else if (type === 'preset') {
        // Handle preset button selection
        const presetSizes = {
            'small': 50,
            'medium': 100,
            'large': 150,
            'full': 200
        };
        
        sizePercentage = presetSizes[value] || 100;
        presetClass = `size-${value}`;
        
        // Update container class for preset
        container.className = `responsive-image-container ${presetClass}`;
        container.style.transform = ''; // Clear custom transform
        
        // Update button states
        presetButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === value);
        });
        
        // Update slider to match preset
        slider.value = sizePercentage;
    }
    
    // Update the size value display
    sizeValue.textContent = `${sizePercentage}%`;
    
    // Store the size preference in the material object
    material.imageSize = sizePercentage;
    material.sizePreset = type === 'preset' ? value : 'custom';
    
    console.log(`✅ Image size updated to ${sizePercentage}% (${type}:${value})`);
    console.log('📦 Material sizing data:', { 
        imageSize: material.imageSize, 
        sizePreset: material.sizePreset 
    });
}

/**
 * Initialize image sizing controls after image upload
 * @param {number} index - Material index
 */
function initializeImageSizing(index) {
    const material = lessonMaterials[index];
    if (!material || material.type !== 'image') return;
    
    // Set default size if not already set
    if (!material.imageSize) {
        material.imageSize = 100;
        material.sizePreset = 'medium';
    }
    
    // Wait for DOM to be ready, then apply saved settings
    setTimeout(() => {
        const container = document.getElementById(`imageContainer${index}`);
        const slider = document.getElementById(`sizeSlider${index}`);
        const sizeValue = document.getElementById(`sizeValue${index}`);
        const presetButtons = container?.parentElement.querySelectorAll('.size-preset-btn');
        
        if (container && slider && sizeValue) {
            // Apply saved size
            if (material.sizePreset && material.sizePreset !== 'custom') {
                updateImageSize(index, material.sizePreset, 'preset');
            } else {
                updateImageSize(index, material.imageSize, 'slider');
            }
            
            console.log(`🎛️ Image sizing controls initialized for material ${index}`);
        }
    }, 100);
}