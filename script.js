document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthYear = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const selectedDateEl = document.getElementById('selected-date');
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const tasksList = document.getElementById('tasks-list');
    const linkPreviewModal = document.getElementById('link-preview-modal');
    const closeModalBtn = document.querySelectorAll('.close-modal');
    const linkPreviewContent = document.getElementById('link-preview-content');
    const linkDetailsModal = document.getElementById('link-details-modal');
    const linkUrlInput = document.getElementById('link-url');
    const linkTitleInput = document.getElementById('link-title');
    const saveLinkDetailsBtn = document.getElementById('save-link-details');

    // State
    let currentDate = new Date();
    let selectedDate = null;
    let tasks = JSON.parse(localStorage.getItem('tasks')) || {};
    let draggedTask = null;
    let dragGhost = null;
    let dragStartIndex;

    // Initialize the app
    function init() {
        renderCalendar();
        updateSelectedDate(new Date());
        
        // Event listeners
        prevMonthBtn.addEventListener('click', goToPreviousMonth);
        nextMonthBtn.addEventListener('click', goToNextMonth);
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask();
        });
        
        closeModalBtn.forEach(btn => {
            btn.addEventListener('click', function() {
                linkPreviewModal.style.display = 'none';
                linkDetailsModal.style.display = 'none';
            });
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === linkPreviewModal) {
                linkPreviewModal.style.display = 'none';
            }
            if (e.target === linkDetailsModal) {
                linkDetailsModal.style.display = 'none';
            }
        });
        
        // Document-wide drag events
        document.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        document.addEventListener('drop', function(e) {
            e.preventDefault();
            if (dragGhost) {
                dragGhost.remove();
                dragGhost = null;
            }
        });
    }

    // Calendar functions
    function renderCalendar() {
        // Clear the calendar
        calendarGrid.innerHTML = '';
        
        // Set the month and year header
        currentMonthYear.textContent = new Intl.DateTimeFormat('en-US', {
            month: 'long',
            year: 'numeric'
        }).format(currentDate);
        
        // Get the first day of the month and the total days in the month
        const firstDayOfMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
        );
        const daysInMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
        ).getDate();
        
        // Get the day of the week for the first day of the month (0-6)
        const startingDayOfWeek = firstDayOfMonth.getDay();
        
        // Get the last day of the previous month
        const prevMonthLastDay = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            0
        ).getDate();
        
        // Render day headers (Sun, Mon, Tue, etc.)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('day-header');
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });
        
        // Render days from the previous month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day', 'other-month');
            dayElement.textContent = prevMonthLastDay - startingDayOfWeek + i + 1;
            calendarGrid.appendChild(dayElement);
        }
        
        // Render days of the current month
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            dayElement.textContent = i;
            
            // Check if this day is today
            if (
                currentDate.getFullYear() === today.getFullYear() &&
                currentDate.getMonth() === today.getMonth() &&
                i === today.getDate()
            ) {
                dayElement.classList.add('today');
            }
            
            // Check if this day is selected
            if (
                selectedDate &&
                currentDate.getFullYear() === selectedDate.getFullYear() &&
                currentDate.getMonth() === selectedDate.getMonth() &&
                i === selectedDate.getDate()
            ) {
                dayElement.classList.add('selected');
            }
            
            // Check if this day has tasks
            const dateKey = formatDateKey(
                new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
            );
            if (tasks[dateKey] && tasks[dateKey].length > 0) {
                dayElement.classList.add('has-tasks');
            }
            
            // Click to select date
            dayElement.addEventListener('click', () => {
                const clickedDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    i
                );
                updateSelectedDate(clickedDate);
                renderCalendar();
            });
            
            // Drag and drop events for calendar days
            dayElement.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-target');
            });
            
            dayElement.addEventListener('dragleave', function() {
                this.classList.remove('drop-target');
            });
            
            dayElement.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drop-target');
                
                if (draggedTask) {
                    const dropDate = new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        i
                    );
                    moveTaskToDate(draggedTask.index, dropDate);
                    draggedTask = null;
                }
            });
            
            calendarGrid.appendChild(dayElement);
        }
        
        // Render days from the next month to fill the grid
        const totalDaysShown = startingDayOfWeek + daysInMonth;
        const remainingDays = 42 - totalDaysShown;
        
        for (let i = 1; i <= remainingDays; i++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day', 'other-month');
            dayElement.textContent = i;
            calendarGrid.appendChild(dayElement);
        }
    }
    
    function goToPreviousMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
        );
        renderCalendar();
    }
    
    function goToNextMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1
        );
        renderCalendar();
    }
    
    // Task functions
    function updateSelectedDate(date) {
        selectedDate = date;
        selectedDateEl.textContent = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
        renderTasks();
    }
    
    function renderTasks() {
        tasksList.innerHTML = '';
        
        if (!selectedDate) return;
        
        const dateKey = formatDateKey(selectedDate);
        const dateTasks = tasks[dateKey] || [];
        
        if (dateTasks.length === 0) {
            tasksList.innerHTML = '<p class="no-tasks">No tasks for this day. Add one above!</p>';
            return;
        }
        
        dateTasks.forEach((task, index) => {
            const taskElement = document.createElement('div');
            taskElement.classList.add('task-item');
            taskElement.setAttribute('draggable', 'true');
            taskElement.dataset.index = index;
            
            if (task.completed) {
                taskElement.classList.add('completed');
            }
            
            let taskContent;
            if (task.isLink) {
                const url = ensureHttpPrefix(task.text);
                const displayText = task.title || task.text;
                
                taskContent = `
                    <div class="link-with-remarks">
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="task-link">
                            ${displayText}
                        </a>
                        ${task.title ? `<div class="link-remarks">${task.text}</div>` : ''}
                    </div>
                `;
            } else {
                taskContent = task.text;
            }
            
            taskElement.innerHTML = `
                <div class="task-text">${taskContent}</div>
                <div class="task-actions">
                    <button class="complete-btn" data-index="${index}">
                        <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button class="delete-btn" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${task.isLink ? `<button class="preview-btn" data-index="${index}">
                        <i class="fas fa-eye"></i>
                    </button>` : ''}
                </div>
            `;
            
            // Drag events for task reordering
            taskElement.addEventListener('dragstart', (e) => {
                dragStartIndex = index;
                taskElement.classList.add('dragging');
                draggedTask = {
                    index: index,
                    element: taskElement,
                    dateKey: dateKey
                };
                
                // Create drag ghost
                dragGhost = document.createElement('div');
                dragGhost.classList.add('drag-ghost');
                dragGhost.innerHTML = `
                    <div class="task-text">${taskContent}</div>
                    <div class="task-actions">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                `;
                document.body.appendChild(dragGhost);
                
                e.dataTransfer.setDragImage(dragGhost, 0, 0);
                e.dataTransfer.effectAllowed = 'move';
            });
            
            taskElement.addEventListener('dragover', function(e) {
                e.preventDefault();
                const dragOverIndex = parseInt(this.dataset.index);
                if (dragStartIndex !== dragOverIndex) {
                    swapTasks(dragStartIndex, dragOverIndex);
                    dragStartIndex = dragOverIndex;
                }
            });
            
            taskElement.addEventListener('dragend', () => {
                taskElement.classList.remove('dragging');
                if (dragGhost) {
                    dragGhost.remove();
                    dragGhost = null;
                }
                draggedTask = null;
            });
            
            // Event listeners for action buttons
            const completeBtn = taskElement.querySelector('.complete-btn');
            const deleteBtn = taskElement.querySelector('.delete-btn');
            const previewBtn = taskElement.querySelector('.preview-btn');
            
            completeBtn?.addEventListener('click', toggleTaskComplete);
            deleteBtn?.addEventListener('click', deleteTask);
            previewBtn?.addEventListener('click', showLinkPreview);
            
            tasksList.appendChild(taskElement);
        });
    }
    
    function addTask() {
        const taskText = taskInput.value.trim();
        if (!taskText || !selectedDate) return;

        const dateKey = formatDateKey(selectedDate);
        
        if (!tasks[dateKey]) {
            tasks[dateKey] = [];
        }

        if (isURL(taskText)) {
            // Show modal to add link details
            linkUrlInput.value = taskText;
            linkTitleInput.value = '';
            linkDetailsModal.style.display = 'flex';
            
            // Save the context for when they click "Save Details"
            saveLinkDetailsBtn.onclick = function() {
                const title = linkTitleInput.value.trim();
                tasks[dateKey].push({
                    text: taskText,
                    isLink: true,
                    title: title || null,
                    completed: false,
                    createdAt: new Date().toISOString()
                });
                
                saveTasks();
                taskInput.value = '';
                linkDetailsModal.style.display = 'none';
                renderCalendar();
                renderTasks();
            };
        } else {
            // Regular task
            tasks[dateKey].push({
                text: taskText,
                isLink: false,
                completed: false,
                createdAt: new Date().toISOString()
            });
            
            saveTasks();
            taskInput.value = '';
            renderCalendar();
            renderTasks();
        }
    }
    
    function toggleTaskComplete(e) {
        const index = e.target.closest('button').dataset.index;
        const dateKey = formatDateKey(selectedDate);
        
        if (tasks[dateKey] && tasks[dateKey][index]) {
            tasks[dateKey][index].completed = !tasks[dateKey][index].completed;
            saveTasks();
            renderTasks();
        }
    }
    
    function deleteTask(e) {
        const index = e.target.closest('button').dataset.index;
        const dateKey = formatDateKey(selectedDate);
        
        if (tasks[dateKey] && tasks[dateKey][index]) {
            tasks[dateKey].splice(index, 1);
            
            // If no more tasks for this date, remove the date key
            if (tasks[dateKey].length === 0) {
                delete tasks[dateKey];
            }
            
            saveTasks();
            renderCalendar();
            renderTasks();
        }
    }
    
    function swapTasks(fromIndex, toIndex) {
        const dateKey = formatDateKey(selectedDate);
        if (fromIndex === toIndex) return;
        
        const temp = tasks[dateKey][fromIndex];
        tasks[dateKey][fromIndex] = tasks[dateKey][toIndex];
        tasks[dateKey][toIndex] = temp;
        
        saveTasks();
        renderTasks();
    }
    
    function moveTaskToDate(taskIndex, newDate) {
        const oldDateKey = formatDateKey(selectedDate);
        const newDateKey = formatDateKey(newDate);
        
        if (!tasks[oldDateKey] || !tasks[oldDateKey][taskIndex]) return;
        
        // Create new date array if it doesn't exist
        if (!tasks[newDateKey]) {
            tasks[newDateKey] = [];
        }
        
        // Move the task
        const taskToMove = tasks[oldDateKey][taskIndex];
        tasks[newDateKey].push(taskToMove);
        tasks[oldDateKey].splice(taskIndex, 1);
        
        // Clean up if old date has no tasks
        if (tasks[oldDateKey].length === 0) {
            delete tasks[oldDateKey];
        }
        
        saveTasks();
        renderCalendar();
        
        // Only re-render tasks if we're still viewing the old date
        if (formatDateKey(selectedDate) === oldDateKey) {
            renderTasks();
        }
    }
    
    async function showLinkPreview(e) {
        const index = e.target.closest('button').dataset.index;
        const dateKey = formatDateKey(selectedDate);
        const task = tasks[dateKey][index];
        
        if (!task || !task.isLink) return;
        
        try {
            const url = ensureHttpPrefix(task.text);
            
            linkPreviewContent.innerHTML = `
                <h3>Link Details</h3>
                ${task.title ? `<h4>${task.title}</h4>` : ''}
                <p><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>
                <div class="link-preview">
                    <p>In a full implementation, this would show a preview of:</p>
                    <p><strong>URL:</strong> ${url}</p>
                    ${task.title ? `<p><strong>Description:</strong> ${task.title}</p>` : ''}
                </div>
            `;
            
            linkPreviewModal.style.display = 'flex';
        } catch (error) {
            console.error('Error showing link preview:', error);
            linkPreviewContent.innerHTML = `<p>Could not load preview for this link.</p>`;
            linkPreviewModal.style.display = 'flex';
        }
    }
    
    // Helper functions
    function formatDateKey(date) {
        return date.toISOString().split('T')[0];
    }
    
    function isURL(str) {
        const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
            '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
        return pattern.test(str);
    }
    
    function ensureHttpPrefix(url) {
        if (!/^https?:\/\//i.test(url)) {
            return 'https://' + url;
        }
        return url;
    }
    
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Initialize the app
    init();
});