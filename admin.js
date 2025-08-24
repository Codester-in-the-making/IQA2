// Admin Dashboard JavaScript with Supabase Integration

// Initialize Supabase client
const SUPABASE_URL = 'https://dzrfanpquocakcoxvbta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cmZhbnBxdW9jYWtjb3h2YnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY0MTIsImV4cCI6MjA3MTUyMjQxMn0.CzcEUtpJ_g2oEZQ2quTRbiiwzacdHNPYk9dtWj_7ozE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
let courseForm, coursesList, loadingMessage, successMessage, errorMessage;

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    courseForm = document.getElementById('courseForm');
    coursesList = document.getElementById('coursesList');
    loadingMessage = document.getElementById('loadingMessage');
    successMessage = document.getElementById('successMessage');
    errorMessage = document.getElementById('errorMessage');

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