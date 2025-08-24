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

    } catch (error) {
        console.error('Error creating course:', error);
        showErrorMessage('Failed to create course. Please try again.');
    } finally {
        showLoading(false);
    }
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

function editCourse(courseId) {
    // For now, show an alert. In a full implementation, this would open an edit form
    alert('Edit functionality will be implemented in the next phase. For now, you can delete and recreate the course.');
}

function resetForm() {
    courseForm.reset();
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
            course_id: currentSelectedCourse.id,
            title: formData.get('title').trim(),
            lesson_order: parseInt(formData.get('lesson_order')),
            duration_minutes: parseInt(formData.get('duration_minutes')),
            lesson_type: 'content', // Default type since materials define the actual content type
            content: 'Lesson content is defined by materials', // Placeholder since materials contain the actual content
            is_published: formData.get('is_published') === 'on'
        };
        
        // Validate data
        if (!validateLessonData(lessonData)) {
            return;
        }
        
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
        
    } catch (error) {
        console.error('Error creating lesson:', error);
        showErrorMessage('Failed to create lesson. Please try again.');
    } finally {
        showLoading(false);
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
        metadata: {}
    };
    
    lessonMaterials.push(material);
    renderMaterialBuilder();
}

function renderMaterialBuilder() {
    if (lessonMaterials.length === 0) {
        materialsList.innerHTML = '<p class="no-materials">No materials added yet. Use the buttons above to build your lesson content.</p>';
        return;
    }
    
    materialsList.innerHTML = lessonMaterials.map((material, index) => {
        let materialInputs = '';
        
        if (material.type === 'image') {
            const hasImage = material.file_url && material.file_url.startsWith('data:image');
            materialInputs = `
                <input type="text" class="material-title-input" value="${escapeHtml(material.title)}" 
                       onchange="updateMaterial(${index}, 'title', this.value)" placeholder="Image title...">
                <div class="image-upload-section">
                    <input type="file" class="material-image-input" id="imageInput${index}" 
                           accept="image/*" onchange="handleImageUpload(${index}, this)">
                    <label for="imageInput${index}" class="image-upload-label">
                        <span class="upload-icon">🖼️</span>
                        <span class="upload-text">Choose Image File</span>
                    </label>
                    ${hasImage ? `
                        <div class="image-preview" style="display: block;">
                            <img src="${material.file_url}" alt="Preview" class="preview-image">
                            <span class="image-name">${escapeHtml(material.fileName || 'Uploaded image')}</span>
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
        
        return `
            <div class="material-editor" data-material-id="${material.id}">
                <div class="material-header">
                    <h4>${capitalizeFirst(material.type)} - ${escapeHtml(material.title)}</h4>
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

function editLesson(lessonId) {
    // For now, show an alert. In a full implementation, this would populate the form
    alert('Edit functionality will be enhanced in future updates. For now, you can delete and recreate the lesson.');
}

function manageMaterials(lessonId) {
    // For now, show an alert. In a full implementation, this would open a material editor
    alert('Material management interface will be enhanced in future updates.');
}