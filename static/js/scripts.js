document.addEventListener('DOMContentLoaded', () => {
    initializeUploadForm();
    initializeDeleteButtons();
    initializeFileInput();
    initializeModals();
    initializePageViewer();
});

function initializeUploadForm() {
    const uploadForm = document.getElementById('upload-form');
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (uploadForm) {
        console.log('Upload form found, attaching event listener');
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted');
            
            // Show progress container and loading overlay
            if (progressContainer) {
                progressContainer.classList.add('active');
            }
            if (loadingOverlay) {
                loadingOverlay.classList.add('active');
            }

            // Simulate progress for better UX
            simulateProgress(progressFill, progressText);

            const formData = new FormData(uploadForm);
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                console.log('Response status:', response.status);
                
                if (response.redirected) {
                    // Complete the progress bar
                    if (progressFill) progressFill.style.width = '100%';
                    if (progressText) progressText.textContent = 'Processing complete! Redirecting...';
                    
                    setTimeout(() => {
                        console.log('Redirecting to:', response.url);
                        window.location.href = response.url;
                    }, 1000);
                } else {
                    console.log('Upload failed:', await response.text());
                    hideProgress();
                    showNotification('Upload failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Upload error:', error);
                hideProgress();
                showNotification('An error occurred during upload.', 'error');
            }
        });
    }
}

function simulateProgress(progressFill, progressText) {
    if (!progressFill || !progressText) return;
    
    const steps = [
        { progress: 20, text: 'Uploading file...' },
        { progress: 40, text: 'Analyzing document...' },
        { progress: 60, text: 'Extracting pages...' },
        { progress: 80, text: 'Processing content...' },
        { progress: 95, text: 'Finalizing results...' }
    ];
    
    let currentStep = 0;
    
    const updateProgress = () => {
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            progressFill.style.width = step.progress + '%';
            progressText.textContent = step.text;
            currentStep++;
            setTimeout(updateProgress, 800 + Math.random() * 400);
        }
    };
    
    updateProgress();
}

function hideProgress() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressContainer = document.getElementById('progress-container');
    
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
    if (progressContainer) {
        progressContainer.classList.remove('active');
    }
}

function initializeDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-project');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const projectId = e.target.dataset.projectId;
            const projectName = e.target.dataset.projectName || 'this project';
            
            if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
                try {
                    // Show loading state
                    button.disabled = true;
                    button.textContent = 'Deleting...';
                    
                    const response = await fetch(`/delete/${projectId}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.redirected) {
                        showNotification('Project deleted successfully!', 'success');
                        setTimeout(() => {
                            window.location.href = response.url;
                        }, 1000);
                    } else {
                        button.disabled = false;
                        button.textContent = 'Delete';
                        showNotification('Failed to delete project. Please try again.', 'error');
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    button.disabled = false;
                    button.textContent = 'Delete';
                    showNotification('An error occurred while deleting the project.', 'error');
                }
            }
        });
    });
}

function initializeFileInput() {
    const fileInput = document.getElementById('file');
    const fileInputDisplay = document.querySelector('.file-input-display');
    const fileInputText = document.getElementById('file-input-text');
    
    if (fileInput && fileInputDisplay) {
        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileInputText.innerHTML = `
                    <div class="flex items-center gap-3">
                        <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div>
                            <div class="font-semibold text-gray-800">${file.name}</div>
                            <div class="text-sm text-gray-500">${formatFileSize(file.size)}</div>
                        </div>
                    </div>
                `;
                fileInputDisplay.style.borderColor = 'var(--success-green)';
                fileInputDisplay.style.background = 'rgba(16, 185, 129, 0.05)';
            }
        });
        
        // Handle drag and drop
        fileInputDisplay.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileInputDisplay.classList.add('dragover');
        });
        
        fileInputDisplay.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileInputDisplay.classList.remove('dragover');
        });
        
        fileInputDisplay.addEventListener('drop', (e) => {
            e.preventDefault();
            fileInputDisplay.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change'));
            } else {
                showNotification('Please drop a valid PDF file.', 'error');
            }
        });
    }
}

function initializeModals() {
    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                closeModal(activeModal.id);
            }
        }
    });
}

function initializePageViewer() {
    const viewPageButtons = document.querySelectorAll('.view-page-btn');
    viewPageButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const projectId = e.target.dataset.projectId;
            const pageNumber = e.target.dataset.pageNumber;
            const sheetNumber = e.target.dataset.sheetNumber;
            const sheetTitle = e.target.dataset.sheetTitle;
            
            openPageModal(projectId, pageNumber, sheetNumber, sheetTitle);
        });
    });
}

function openPageModal(projectId, pageNumber, sheetNumber, sheetTitle) {
    const modal = document.getElementById('page-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalImage = document.getElementById('modal-image');
    const modalLoading = document.getElementById('modal-loading');
    
    if (modal && modalTitle && modalImage && modalLoading) {
        modalTitle.textContent = `${sheetNumber} - ${sheetTitle}`;
        modalImage.style.display = 'none';
        modalLoading.style.display = 'block';
        
        // Show modal
        modal.classList.add('active');
        
        // Load image
        const imageUrl = `/page-image/${projectId}/${pageNumber}`;
        const img = new Image();
        
        img.onload = () => {
            modalImage.src = imageUrl;
            modalImage.style.display = 'block';
            modalLoading.style.display = 'none';
        };
        
        img.onerror = () => {
            modalLoading.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p>Failed to load page image</p>
                </div>
            `;
        };
        
        img.src = imageUrl;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                ${getNotificationIcon(type)}
            </div>
            <div class="notification-message">${message}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        z-index: 1100;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        border-left: 4px solid ${getNotificationColor(type)};
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    const contentStyle = `
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
    `;
    
    notification.querySelector('.notification-content').style.cssText = contentStyle;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        error: '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        info: '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);