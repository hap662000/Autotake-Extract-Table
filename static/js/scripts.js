document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (uploadForm) {
        console.log('Upload form found, attaching event listener');
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
            }
            const formData = new FormData(uploadForm);
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                console.log('Response status:', response.status);
                if (response.redirected) {
                    console.log('Redirecting to:', response.url);
                    window.location.href = response.url;
                } else {
                    console.log('Upload failed:', await response.text());
                    if (loadingOverlay) {
                        loadingOverlay.style.display = 'none';
                    }
                    alert('Upload failed. Please try again.');
                }
            } catch (error) {
                console.error('Upload error:', error);
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
                alert('An error occurred during upload.');
            }
        });
    } else {
        console.error('Upload form not found');
    }

    // Handle delete project buttons
    const deleteButtons = document.querySelectorAll('.delete-project');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const projectId = e.target.dataset.projectId;
            if (confirm('Are you sure you want to delete this project?')) {
                try {
                    const response = await fetch(`/delete/${projectId}`, {
                        method: 'DELETE'
                    });
                    if (response.redirected) {
                        console.log('Redirecting to:', response.url);
                        window.location.href = response.url;
                    } else {
                        alert('Failed to delete project. Please try again.');
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('An error occurred while deleting the project.');
                }
            }
        });
    });
});