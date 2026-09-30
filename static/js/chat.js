/**
 * AI FAQ Assistant - High-Speed, Crystal-Clear Interactive Client Script
 * Handles real-time streaming, Web Audio FX, NLP API communication, FAQ Importing & Preprocessing, and UI state.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Chat & Header
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const categoriesList = document.getElementById('categoriesList');
    const faqSearchInput = document.getElementById('faqSearchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const categoryTotalBadge = document.getElementById('categoryTotalBadge');
    const categoryPillsBar = document.getElementById('categoryPillsBar');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    const voiceIcon = document.getElementById('voiceIcon');
    const speechInputBtn = document.getElementById('speechInputBtn');
    const exportChatBtn = document.getElementById('exportChatBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');
    const toast = document.getElementById('toast');

    // DOM Elements - Import Modal
    const importModal = document.getElementById('importModal');
    const openImportModalBtn = document.getElementById('openImportModalBtn');
    const headerImportBtn = document.getElementById('headerImportBtn');
    const closeImportModalBtn = document.getElementById('closeImportModalBtn');
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    const executeImportBtn = document.getElementById('executeImportBtn');
    const fileDropzone = document.getElementById('fileDropzone');
    const faqFileInput = document.getElementById('faqFileInput');
    const browseFileBtn = document.getElementById('browseFileBtn');
    const selectedFileBadge = document.getElementById('selectedFileBadge');
    const selectedFileName = document.getElementById('selectedFileName');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const rawFaqInput = document.getElementById('rawFaqInput');
    const loadSampleBtn = document.getElementById('loadSampleBtn');
    const preprocessProgress = document.getElementById('preprocessProgress');
    const progressStatusText = document.getElementById('progressStatusText');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');

    // App State
    let isSoundEnabled = true;
    let isVoiceEnabled = false;
    let isListening = false;
    let speechRecognition = null;
    let allFaqsData = [];
    let audioCtx = null;
    let activeImportFile = null;
    let activeTab = 'fileTab';

    // Initialize
    initTheme();
    loadFaqsAndCategories();
    setupSpeechRecognition();
    setupEventListeners();
    setupImportModal();

    // ==========================================================================
    // Event Listeners & Keyboard Shortcuts
    // ==========================================================================
    function setupEventListeners() {
        // Send button
        sendBtn.addEventListener('click', handleSendMessage);

        // Textarea auto-expand & enter key
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        });

        // Global shortcuts (Ctrl+K for search, Ctrl+L for clear, Esc to dismiss)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (sidebar) sidebar.classList.add('open');
                faqSearchInput.focus();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                clearChatHistory();
            } else if (e.key === 'Escape') {
                if (importModal && importModal.classList.contains('open')) {
                    closeImportModal();
                } else if (sidebar && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
                chatInput.blur();
                faqSearchInput.blur();
            }
        });

        // Click on quick prompt chips anywhere in chat
        document.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (chip && chip.dataset.query) {
                const query = chip.dataset.query;
                chatInput.value = query;
                handleSendMessage();
            }
        });

        // Category Pills Navigation Bar
        if (categoryPillsBar) {
            categoryPillsBar.addEventListener('click', (e) => {
                const btn = e.target.closest('.pill-btn');
                if (!btn) return;

                categoryPillsBar.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const selectedCategory = btn.dataset.category;
                handleCategoryPillSelect(selectedCategory);
            });
        }

        // Search Knowledge Base with Clear Button
        faqSearchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            searchClearBtn.style.display = val ? 'flex' : 'none';
            handleFaqSearch(e);
        });

        searchClearBtn.addEventListener('click', () => {
            faqSearchInput.value = '';
            searchClearBtn.style.display = 'none';
            renderCategories(allFaqsData);
            faqSearchInput.focus();
        });

        // Header Action Toggles
        soundToggleBtn.addEventListener('click', toggleSoundFX);
        voiceToggleBtn.addEventListener('click', toggleVoiceNarration);
        themeToggleBtn.addEventListener('click', toggleTheme);
        speechInputBtn.addEventListener('click', toggleSpeechInput);

        // Export & Clear
        exportChatBtn.addEventListener('click', exportChatHistory);
        clearChatBtn.addEventListener('click', clearChatHistory);

        // Mobile Sidebar Drawer
        openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
        closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    // ==========================================================================
    // Web Audio FX (Synthesized, Zero Latency)
    // ==========================================================================
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playSound(type) {
        if (!isSoundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;
            if (type === 'send') {
                // Crisp pop tone
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'receive') {
                // Soft dual-tone chime
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.setValueAtTime(880, now + 0.06);   // A5
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
                osc.start(now);
                osc.stop(now + 0.16);
            } else if (type === 'success') {
                // High triple chime on model retrain
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
                osc.start(now);
                osc.stop(now + 0.28);
            }
        } catch (err) {
            // Ignore audio context errors silently
        }
    }

    function toggleSoundFX() {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
            soundIcon.className = 'fa-solid fa-bell';
            soundToggleBtn.classList.add('active');
            playSound('send');
            showToast('Sound Effects Enabled');
        } else {
            soundIcon.className = 'fa-solid fa-bell-slash';
            soundToggleBtn.classList.remove('active');
            showToast('Sound Effects Muted');
        }
    }

    // ==========================================================================
    // Messaging & Bot API Calls
    // ==========================================================================
    async function handleSendMessage() {
        const query = chatInput.value.trim();
        if (!query) return;

        // Reset input
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Append User Message
        appendMessage('user', query);
        playSound('send');

        // Show typing indicator
        showTyping(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: query })
            });

            const data = await response.json();
            showTyping(false);

            if (data.response) {
                appendBotMessage(data);
                playSound('receive');

                // Voice narration if enabled
                if (isVoiceEnabled && data.response) {
                    speakText(data.response);
                }
            } else {
                appendMessage('bot', "I'm having trouble processing that question right now. Please try again.");
            }
        } catch (error) {
            showTyping(false);
            console.error('Chat error:', error);
            appendMessage('bot', "Connection error. Please make sure the server is running.");
        }
    }

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const avatarIcon = sender === 'user' ? 'fa-user' : 'fa-robot';

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fa-solid ${avatarIcon}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">${escapeHtml(text)}</div>
                <span class="message-time">${timeStr}</span>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function appendBotMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const confidence = data.confidence || 0;

        let confClass = 'confidence-low';
        let confIcon = 'fa-circle-exclamation';
        if (confidence >= 70) {
            confClass = 'confidence-high';
            confIcon = 'fa-circle-check';
        } else if (confidence >= 35) {
            confClass = 'confidence-med';
            confIcon = 'fa-circle-question';
        }

        // Header Bar for Card
        const intentText = data.matched_question ? escapeHtml(data.matched_question) : 'General FAQ';
        const cardHeaderHtml = `
            <div class="card-header-bar">
                <span class="intent-tag"><i class="fa-solid fa-sparkles"></i> ${intentText}</span>
                <button class="copy-btn" title="Copy answer" onclick="copyBotAnswer(this)">
                    <i class="fa-regular fa-copy"></i> Copy
                </button>
            </div>
        `;

        // Suggestions block
        let suggestionsHtml = '';
        if (data.suggestions && data.suggestions.length > 0) {
            suggestionsHtml = `
                <div class="quick-prompts-label">
                    <i class="fa-solid fa-lightbulb"></i> Suggested Related Topics:
                </div>
                <div class="quick-chips">
                    ${data.suggestions.map(q => `<button class="chip" data-query="${escapeHtml(q)}"><i class="fa-regular fa-comment-dots"></i> ${escapeHtml(q)}</button>`).join('')}
                </div>
            `;
        }

        // Meta tags (Category, confidence, feedback)
        let metaHtml = '';
        if (data.category || confidence > 0) {
            metaHtml = `
                <div class="message-meta">
                    ${data.category ? `<span class="category-tag"><i class="fa-solid fa-tag"></i> ${escapeHtml(data.category)}</span>` : ''}
                    <span class="confidence-pill ${confClass}" title="TF-IDF Cosine Similarity confidence score">
                        <i class="fa-solid ${confIcon}"></i> ${confidence}% match
                    </span>
                    <div class="feedback-actions">
                        <button class="feedback-btn" title="Helpful" onclick="submitFeedback(${data.faq_id}, true, this)">
                            <i class="fa-regular fa-thumbs-up"></i>
                        </button>
                        <button class="feedback-btn" title="Not helpful" onclick="submitFeedback(${data.faq_id}, false, this)">
                            <i class="fa-regular fa-thumbs-down"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${cardHeaderHtml}
                    <div class="bot-text-target"></div>
                    ${suggestionsHtml}
                    ${metaHtml}
                </div>
                <span class="message-time">${timeStr}</span>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        scrollToBottom();

        // Stream typewriter effect for rapid readability
        const textTarget = messageDiv.querySelector('.bot-text-target');
        streamFormattedText(textTarget, data.response);
    }

    function streamFormattedText(targetEl, fullText) {
        const formatted = formatMarkdown(fullText);
        targetEl.innerHTML = formatted;
        targetEl.style.animation = 'fadeIn 0.15s ease forwards';
        scrollToBottom();
    }

    // ==========================================================================
    // Sidebar FAQ Categories & Knowledge Base
    // ==========================================================================
    async function loadFaqsAndCategories() {
        try {
            const res = await fetch('/api/faqs');
            const data = await res.json();
            allFaqsData = data.faqs || [];

            if (categoryTotalBadge) {
                categoryTotalBadge.textContent = `${allFaqsData.length} FAQs`;
            }

            renderCategories(allFaqsData);
            updateCategoryPills(data.categories || []);
        } catch (err) {
            console.error('Failed to load FAQs:', err);
            categoriesList.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); padding:10px;">Failed to load knowledge base.</div>`;
        }
    }

    function updateCategoryPills(categories) {
        if (!categoryPillsBar) return;
        const currentActive = categoryPillsBar.querySelector('.pill-btn.active')?.dataset.category || 'all';
        
        let html = `
            <button class="pill-btn ${currentActive === 'all' ? 'active' : ''}" data-category="all">
                <i class="fa-solid fa-border-all"></i> All Topics
            </button>
        `;

        categories.forEach(cat => {
            const isActive = currentActive === cat ? 'active' : '';
            html += `
                <button class="pill-btn ${isActive}" data-category="${escapeHtml(cat)}">
                    <i class="fa-solid fa-folder"></i> ${escapeHtml(cat)}
                </button>
            `;
        });

        categoryPillsBar.innerHTML = html;
    }

    function renderCategories(faqs) {
        if (!faqs.length) {
            categoriesList.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); padding:10px;">No matching FAQs found.</div>`;
            return;
        }

        // Group by category
        const groups = {};
        faqs.forEach(faq => {
            const cat = faq.category || 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(faq);
        });

        categoriesList.innerHTML = Object.keys(groups).map((category, index) => {
            const items = groups[category];
            const isOpen = index === 0 ? 'open' : '';
            return `
                <div class="category-group ${isOpen}">
                    <div class="category-header" onclick="this.parentElement.classList.toggle('open')">
                        <span><i class="fa-solid fa-folder-open"></i> ${escapeHtml(category)} <span class="category-count">${items.length}</span></span>
                        <i class="fa-solid fa-chevron-down chevron"></i>
                    </div>
                    <div class="category-items">
                        ${items.map(item => `
                            <div class="category-faq-item" data-query="${escapeHtml(item.question)}">
                                <i class="fa-solid fa-angle-right"></i>
                                <span>${escapeHtml(item.question)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Add click listener to sidebar questions
        categoriesList.querySelectorAll('.category-faq-item').forEach(el => {
            el.addEventListener('click', () => {
                const query = el.getAttribute('data-query');
                chatInput.value = query;
                if (window.innerWidth <= 900) {
                    sidebar.classList.remove('open');
                }
                handleSendMessage();
            });
        });
    }

    function handleFaqSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderCategories(allFaqsData);
            return;
        }

        const filtered = allFaqsData.filter(faq => 
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query) ||
            (faq.patterns && faq.patterns.some(p => p.toLowerCase().includes(query)))
        );

        renderCategories(filtered);
    }

    function handleCategoryPillSelect(category) {
        if (category === 'all') {
            renderCategories(allFaqsData);
            showToast('Showing all knowledge topics');
            return;
        }

        const filtered = allFaqsData.filter(f => f.category.toLowerCase() === category.toLowerCase());
        renderCategories(filtered);
        showToast(`Filtered by: ${category}`);

        // Open sidebar on mobile if clicked
        if (window.innerWidth <= 900) {
            sidebar.classList.add('open');
        }
    }

    // ==========================================================================
    // Import & Preprocessing Modal Logic
    // ==========================================================================
    function setupImportModal() {
        if (!importModal) return;

        // Open Modal
        if (openImportModalBtn) openImportModalBtn.addEventListener('click', openImportModal);
        if (headerImportBtn) headerImportBtn.addEventListener('click', openImportModal);

        // Close Modal
        closeImportModalBtn.addEventListener('click', closeImportModal);
        cancelImportBtn.addEventListener('click', closeImportModal);
        importModal.addEventListener('click', (e) => {
            if (e.target === importModal) closeImportModal();
        });

        // Tab Switching
        const tabBtns = importModal.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTab = btn.dataset.tab;

                importModal.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                const targetContent = document.getElementById(activeTab);
                if (targetContent) targetContent.classList.add('active');
            });
        });

        // Dropzone & File Input
        browseFileBtn.addEventListener('click', () => faqFileInput.click());
        fileDropzone.addEventListener('click', (e) => {
            if (e.target !== removeFileBtn && !removeFileBtn.contains(e.target)) {
                faqFileInput.click();
            }
        });

        faqFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });

        fileDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDropzone.classList.add('dragover');
        });

        fileDropzone.addEventListener('dragleave', () => {
            fileDropzone.classList.remove('dragover');
        });

        fileDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            activeImportFile = null;
            faqFileInput.value = '';
            selectedFileBadge.style.display = 'none';
        });

        // Load Sample Data Button
        loadSampleBtn.addEventListener('click', () => {
            const sampleData = [
                {
                    "category": "University & Admissions",
                    "question": "What are the admission requirements for graduate programs?",
                    "patterns": ["Master degree admission criteria", "How to apply for graduate school", "Grad admissions GPA requirement"],
                    "answer": "Graduate admission requires a recognized Bachelor's degree with a minimum 3.0 GPA, 2 letters of recommendation, a statement of purpose, and official GRE/TOEFL scores where applicable."
                },
                {
                    "category": "University & Admissions",
                    "question": "How do I apply for financial aid and scholarships?",
                    "patterns": ["Scholarship application process", "FAFSA and student loans", "How to get grant or tuition waiver"],
                    "answer": "Submit your FAFSA application by March 1st. Merit scholarships are automatically considered upon program admission, and departmental fellowships require a separate application via the student portal."
                },
                {
                    "category": "Campus IT Support",
                    "question": "How do I connect to Campus High-Speed Wi-Fi?",
                    "patterns": ["Connect to eduroam wireless", "Student Wi-Fi network password", "Login to campus internet"],
                    "answer": "Select the 'Eduroam' network on your device, log in using your student email (e.g., student@campus.edu) and campus password, and trust the security certificate."
                },
                {
                    "category": "Campus IT Support",
                    "question": "Where can I download Microsoft Office and MATLAB student licenses?",
                    "patterns": ["Free software for students", "Download office 365 student key", "Get matlab software license"],
                    "answer": "All enrolled students can download Office 365, MATLAB, and Adobe Creative Cloud for free by visiting it.campus.edu/software and signing in with single sign-on (SSO)."
                }
            ];

            rawFaqInput.value = JSON.stringify(sampleData, null, 2);
            showToast('Sample university FAQ data loaded!');
        });

        // Execute Import & NLP Retrain Button
        executeImportBtn.addEventListener('click', executeImportAndPreprocess);
    }

    function openImportModal() {
        importModal.classList.add('open');
        preprocessProgress.style.display = 'none';
        resetProgressSteps();
    }

    function closeImportModal() {
        importModal.classList.remove('open');
    }

    function handleFileSelect(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'json' && ext !== 'csv') {
            showToast('Please select a valid .json or .csv file');
            return;
        }

        activeImportFile = file;
        selectedFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        selectedFileBadge.style.display = 'inline-flex';
    }

    function resetProgressSteps() {
        step1.className = 'step';
        step2.className = 'step';
        step3.className = 'step';
    }

    async function executeImportAndPreprocess() {
        const mode = importModal.querySelector('input[name="importMode"]:checked').value;
        let payload = null;
        let isFormData = false;

        if (activeTab === 'fileTab') {
            if (!activeImportFile) {
                showToast('Please select or drop a .json or .csv file first.');
                return;
            }
            const fd = new FormData();
            fd.append('file', activeImportFile);
            fd.append('mode', mode);
            payload = fd;
            isFormData = true;
        } else {
            const rawVal = rawFaqInput.value.trim();
            if (!rawVal) {
                showToast('Please paste or load JSON FAQ data.');
                return;
            }
            try {
                const parsed = JSON.parse(rawVal);
                if (!Array.isArray(parsed)) {
                    showToast('JSON input must be an array of FAQ objects.');
                    return;
                }
                payload = { faqs: parsed, mode: mode };
            } catch (err) {
                showToast('Invalid JSON format: ' + err.message);
                return;
            }
        }

        // Show animated progress
        preprocessProgress.style.display = 'block';
        executeImportBtn.disabled = true;
        executeImportBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

        // Animate Step 1: Validating
        step1.className = 'step active';
        progressStatusText.textContent = '1/3: Validating FAQ dataset schema...';
        await new Promise(r => setTimeout(r, 400));
        step1.className = 'step done';

        // Animate Step 2: NLP Preprocessing
        step2.className = 'step active';
        progressStatusText.textContent = '2/3: NLTK Tokenization, Stopwords & Lemmatization...';
        await new Promise(r => setTimeout(r, 400));
        step2.className = 'step done';

        // Animate Step 3: TF-IDF Matrix & Cosine Similarity
        step3.className = 'step active';
        progressStatusText.textContent = '3/3: Fitting TF-IDF Vectorizer & Cosine Index...';

        try {
            const fetchOptions = {
                method: 'POST',
                body: isFormData ? payload : JSON.stringify(payload)
            };
            if (!isFormData) {
                fetchOptions.headers = { 'Content-Type': 'application/json' };
            }

            const res = await fetch('/api/import-faqs', {
                ...fetchOptions
            });

            const data = await res.json();
            step3.className = 'step done';

            if (data.status === 'success') {
                progressStatusText.textContent = 'Retraining Complete! Ready to answer questions.';
                playSound('success');
                showToast(`Successfully imported ${data.imported_count} FAQs!`);

                // Refresh knowledge base & sidebar
                await loadFaqsAndCategories();

                // Post announcement message in chat
                appendBotAnnouncement(data);

                setTimeout(() => {
                    closeImportModal();
                    executeImportBtn.disabled = false;
                    executeImportBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Preprocess &amp; Train Model`;
                }, 1000);
            } else {
                throw new Error(data.message || 'Import failed');
            }
        } catch (err) {
            console.error('Import error:', err);
            progressStatusText.textContent = 'Error: ' + err.message;
            showToast('Import Error: ' + err.message);
            executeImportBtn.disabled = false;
            executeImportBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Preprocess &amp; Train Model`;
        }
    }

    function appendBotAnnouncement(data) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble" style="border-left: 3px solid var(--accent-emerald);">
                    <div class="card-header-bar">
                        <span class="intent-tag" style="color:var(--accent-emerald); background:rgba(16,185,129,0.12);">
                            <i class="fa-solid fa-circle-check"></i> Knowledge Base Updated
                        </span>
                    </div>
                    <p>
                        🎉 <strong>Retraining Complete!</strong> Successfully imported <strong>${data.imported_count} FAQs</strong>. 
                        The knowledge base now contains <strong>${data.total_faqs} total FAQs</strong> across <strong>${data.categories.length} categories</strong>.
                    </p>
                    <p style="margin-top:6px; font-size:0.82rem; color:var(--text-secondary);">
                        NLP tokenization and lemmatization have been applied to all new entries, and the TF-IDF vector matrix has been re-indexed. You can now ask questions about the imported topics!
                    </p>
                </div>
                <span class="message-time">${timeStr}</span>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // ==========================================================================
    // Speech & Voice Narration (Web Speech API)
    // ==========================================================================
    function setupSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            speechRecognition = new SpeechRec();
            speechRecognition.continuous = false;
            speechRecognition.lang = 'en-US';
            speechRecognition.interimResults = false;

            speechRecognition.onstart = () => {
                isListening = true;
                speechInputBtn.classList.add('listening');
                showToast('Listening... Speak now.');
            };

            speechRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                chatInput.value = transcript;
                speechInputBtn.classList.remove('listening');
                isListening = false;
                handleSendMessage();
            };

            speechRecognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error);
                speechInputBtn.classList.remove('listening');
                isListening = false;
                showToast('Speech recognition error: ' + event.error);
            };

            speechRecognition.onend = () => {
                speechInputBtn.classList.remove('listening');
                isListening = false;
            };
        } else {
            speechInputBtn.style.display = 'none';
        }
    }

    function toggleSpeechInput() {
        if (!speechRecognition) {
            showToast('Speech recognition not supported in this browser.');
            return;
        }

        if (isListening) {
            speechRecognition.stop();
        } else {
            speechRecognition.start();
        }
    }

    function toggleVoiceNarration() {
        isVoiceEnabled = !isVoiceEnabled;
        if (isVoiceEnabled) {
            voiceIcon.className = 'fa-solid fa-volume-high';
            voiceToggleBtn.classList.add('active');
            showToast('Voice Narration Enabled');
        } else {
            voiceIcon.className = 'fa-solid fa-volume-xmark';
            voiceToggleBtn.classList.remove('active');
            window.speechSynthesis.cancel();
            showToast('Voice Narration Disabled');
        }
    }

    function speakText(text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const clean = text.replace(/[*_#`]/g, '');
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    // ==========================================================================
    // Theme Management
    // ==========================================================================
    function initTheme() {
        const savedTheme = localStorage.getItem('faq_chat_theme') || 'dark';
        setTheme(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }

    function setTheme(theme) {
        if (theme === 'light') {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
            themeIcon.className = 'fa-solid fa-moon';
            localStorage.setItem('faq_chat_theme', 'light');
        } else {
            document.body.classList.remove('theme-light');
            document.body.classList.add('theme-dark');
            themeIcon.className = 'fa-solid fa-sun';
            localStorage.setItem('faq_chat_theme', 'dark');
        }
    }

    // ==========================================================================
    // Utilities: Copy, Feedback, Export, Toast
    // ==========================================================================
    window.copyBotAnswer = function(btn) {
        const bubble = btn.closest('.message-bubble');
        const textEl = bubble.querySelector('.bot-text-target');
        const text = textEl ? textEl.innerText : '';

        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
            btn.classList.add('copied');
            showToast('Answer copied to clipboard!');
            setTimeout(() => {
                btn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy`;
                btn.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            showToast('Failed to copy to clipboard.');
        });
    };

    window.submitFeedback = async function(faqId, helpful, btnElement) {
        const parent = btnElement.parentElement;
        parent.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('active-positive', 'active-negative'));
        
        btnElement.classList.add(helpful ? 'active-positive' : 'active-negative');
        showToast(helpful ? 'Thanks for the positive feedback!' : 'Feedback received. We will improve!');

        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ faq_id: faqId, helpful: helpful })
            });
        } catch (e) {
            console.error('Feedback error:', e);
        }
    };

    function showTyping(show) {
        if (show) {
            typingIndicator.classList.add('active');
            scrollToBottom();
        } else {
            typingIndicator.classList.remove('active');
        }
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2400);
    }

    function exportChatHistory() {
        const messages = Array.from(chatMessages.querySelectorAll('.message'));
        if (messages.length <= 1) {
            showToast('No conversation history to export.');
            return;
        }

        let output = "=== AI FAQ Chatbot Conversation Log ===\n\n";
        messages.forEach(msg => {
            const sender = msg.classList.contains('user') ? 'User' : 'Bot';
            const bubble = msg.querySelector('.message-bubble');
            const text = bubble?.querySelector('.bot-text-target')?.innerText || bubble?.innerText || '';
            const time = msg.querySelector('.message-time')?.innerText || '';
            output += `[${time}] ${sender}:\n${text}\n\n`;
        });

        const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `faq_chat_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Chat history exported!');
    }

    function clearChatHistory() {
        const welcome = chatMessages.querySelector('.welcome-message');
        chatMessages.innerHTML = '';
        if (welcome) chatMessages.appendChild(welcome);
        showToast('Conversation cleared.');
        chatInput.focus();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function formatMarkdown(text) {
        if (!text) return '';
        let escaped = escapeHtml(text);
        // Replace **bold** with <strong>
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Replace newlines with <br>
        escaped = escaped.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
        return `<p>${escaped}</p>`;
    }
});
