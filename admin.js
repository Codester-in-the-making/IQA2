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
            <div class="lesson-content-preview">
                <p>${escapeHtml(lesson.content ? lesson.content.substring(0, 150) + '...' : 'No content')}</p>
            </div>
            <div class="lesson-actions">
                <button class="btn-action edit-lesson" onclick="editLesson('${lesson.id}')">
                    <span>Edit</span>
                </button>
                <button class="btn-action manage-materials" onclick="manageMaterials('${lesson.id}')">
                    <span>Materials</span>
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
            lesson_order: parseInt(formData.get('lesson_order')),
            duration_minutes: parseInt(formData.get('duration_minutes')),
            lesson_type: 'content',
            content: 'Lesson content is defined by materials',
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
            metadata: material.metadata || {}
        };
        
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
    for (const material of lessonMaterials) {
        const materialData = {
            lesson_id: lessonId,
            material_type: material.type,
            title: material.title,
            content: material.content,
            file_url: material.file_url || null, // Include file_url for images
            material_order: material.order,
            metadata: material.metadata || {}
        };
        
        const { error } = await supabase
            .from('lesson_materials')
            .insert([materialData]);
            
        if (error) {
            console.error('Error creating material:', error);
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
                            <img src="${material.file_url}" alt="Preview" class="preview-image">
                            <span class="image-name">${escapeHtml(material.fileName || 'Current image')}</span>
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
        lessonMaterials[index].file_url = null;
        lessonMaterials[index].fileName = null;
        
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
    lessonMaterials.splice(index, 1);
    
    // Update orders
    lessonMaterials.forEach((material, i) => {
        material.order = i + 1;
    });
    
    renderMaterialBuilder();
}

function handleImageUpload(index, input) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showErrorMessage('Please select a valid image file.');
        input.value = '';
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showErrorMessage('Image file size must be less than 5MB.');
        input.value = '';
        return;
    }
    
    showSuccessMessage('Processing image...');
    
    // Convert to base64 for storage
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            if (lessonMaterials[index]) {
                lessonMaterials[index].file_url = e.target.result;
                lessonMaterials[index].fileName = file.name;
                console.log('Image uploaded successfully:', file.name);
                console.log('Base64 length:', e.target.result.length);
                renderMaterialBuilder();
                showSuccessMessage(`Image "${file.name}" uploaded successfully!`);
            }
        } catch (error) {
            console.error('Error processing image:', error);
            showErrorMessage('Failed to process image.');
        }
    };
    
    reader.onerror = function() {
        showErrorMessage('Failed to read image file.');
        input.value = '';
    };
    
    reader.readAsDataURL(file);
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
    document.getElementById('lessonOrder').value = lesson.lesson_order;
    document.getElementById('lessonDuration').value = lesson.duration_minutes;
    document.getElementById('lessonPublished').checked = lesson.is_published;
    
    // Load existing materials
    lessonMaterials = [];
    if (lesson.lesson_materials && lesson.lesson_materials.length > 0) {
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
                
                // Parse vocabulary content into table format
                if (material.material_type === 'vocabulary') {
                    materialObj.vocabularyData = parseVocabularyContent(material.content);
                }
                
                return materialObj;
            });
    }
    
    renderMaterialBuilder();
    
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