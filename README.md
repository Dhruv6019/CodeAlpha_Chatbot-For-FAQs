# 🤖 Astra - AI-Powered FAQ Assistant (Project Astra)

**Developer & Author**: Dhruv Teli  
**Project**: Astra  
**Engine**: Natural Language Processing (NLP), NLTK Lemmatization, TF-IDF Vectorization, and Cosine Similarity Matching.

Astra is an intelligent, responsive FAQ Chatbot assistant designed for **Project Astra**, featuring both an interactive **Modern Web Chat UI** and a **Terminal CLI interface**.

---

## 🌟 Key Features

1. **Structured FAQ Dataset**: Categorized knowledge base in `data/faqs.json` covering:
   - Orders & Package Tracking
   - Shipping & Delivery
   - Returns & Refunds
   - Payments & Billing
   - Account & Security (2FA, Password Reset)
   - Warranty & Technical Support
   - Customer Support Contact

2. **NLP Preprocessing Engine (`nlp_processor.py`)**:
   - Case normalization and text cleaning.
   - Word tokenization (NLTK `word_tokenize`).
   - Stopword filtering with query-preserving exemptions.
   - Morphological lemmatization (NLTK `WordNetLemmatizer`).

3. **TF-IDF + Cosine Similarity Matching (`chatbot.py`)**:
   - Builds sublinear TF-IDF matrices with unigram & bigram features (`ngram_range=(1, 2)`).
   - Computes Cosine Similarity scores against all canonical questions and alternative paraphrased patterns.
   - Calculates percentage confidence scores with uncertainty handling and smart "Did you mean?" suggestions.

4. **Dynamic FAQ Import & Real-Time Retraining (`/api/import-faqs`)**:
   - Upload new FAQs via **JSON** or **CSV** files, or paste raw JSON.
   - Choose between **Append** mode or **Replace** mode.
   - Triggers the NLP preprocessing pipeline (Tokenization + Lemmatization) on-the-fly and instantly re-fits the TF-IDF vectorizer and cosine similarity index.

5. **Modern, Responsive Web UI (`app.py`, `templates/index.html`, `static/`)**:
   - Dark / Light mode toggle.
   - Interactive FAQ category explorer with real-time knowledge base search.
   - Quick-reply suggestion chips.
   - Voice text-to-speech audio narration.
   - Voice input (Speech-to-Text).
   - User feedback collection (Thumbs up/down).
   - Conversation export to text file.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Web Application
```bash
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

### 3. Run in Interactive Terminal (CLI) Mode
```bash
python chatbot.py
```

### 4. Run Unit Tests
```bash
python -m unittest discover -s tests
```

---

## 📁 Project Structure

```
Task-2/
├── data/
│   └── faqs.json             # FAQ dataset with questions, patterns, and answers
├── templates/
│   └── index.html            # Web UI layout
├── static/
│   ├── css/
│   │   └── style.css         # Modern styling & themes
│   └── js/
│       └── chat.js           # Client messaging, voice, and interactivity
├── tests/
│   └── test_chatbot.py       # Unit test suite
├── app.py                    # Flask server & REST API
├── chatbot.py                # FAQ matching engine & CLI
├── nlp_processor.py          # NLP tokenization, stopwords, lemmatization
├── requirements.txt          # Python package dependencies
└── README.md                 # Documentation
```
