"""
NLP Preprocessing Module for FAQ Chatbot
Handles tokenization, stopword removal, lemmatization, and text cleaning.
"""

import re
import string
from typing import List

try:
    import nltk
    # Quietly download required NLTK packages if not already present
    for _pkg in ['punkt', 'punkt_tab', 'stopwords', 'wordnet', 'omw-1.4']:
        try:
            nltk.download(_pkg, quiet=True)
        except Exception:
            pass

    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk.stem import WordNetLemmatizer

    _lemmatizer = WordNetLemmatizer()
    _stop_words = set(stopwords.words('english'))
    _NLTK_AVAILABLE = True
except Exception:
    _NLTK_AVAILABLE = False
    _lemmatizer = None
    _stop_words = set()


# Comprehensive fallback stopwords if NLTK corpus is unavailable
_FALLBACK_STOPWORDS = {
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're",
    "you've", "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he',
    'him', 'his', 'himself', 'she', "she's", 'her', 'hers', 'herself', 'it',
    "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these', 'those',
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and',
    'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by',
    'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in',
    'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can',
    'will', 'just', 'don', "don't", 'should', "should've", 'now'
}


class TextPreprocessor:
    """Preprocesses text for NLP matching: clean, tokenize, remove stopwords, lemmatize."""

    def __init__(self, use_lemmatization: bool = True, remove_stopwords: bool = True):
        self.use_lemmatization = use_lemmatization
        self.remove_stopwords = remove_stopwords

        if _NLTK_AVAILABLE:
            try:
                self.lemmatizer = WordNetLemmatizer()
                self.stopwords = _stop_words
            except Exception:
                self.lemmatizer = None
                self.stopwords = _FALLBACK_STOPWORDS
        else:
            self.lemmatizer = None
            self.stopwords = _FALLBACK_STOPWORDS

    def clean_text(self, text: str) -> str:
        """Lowercase, remove special characters and punctuation, strip excessive whitespace."""
        if not text:
            return ""
        # Convert to lowercase
        text = text.lower().strip()
        # Remove URLs and emails if any
        text = re.sub(r'https?://\S+|www\.\S+', '', text)
        text = re.sub(r'\S+@\S+', '', text)
        # Remove punctuation
        text = text.translate(str.maketrans('', '', string.punctuation))
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def tokenize(self, text: str) -> List[str]:
        """Tokenize text into words."""
        cleaned = self.clean_text(text)
        if not cleaned:
            return []

        if _NLTK_AVAILABLE:
            try:
                return word_tokenize(cleaned)
            except Exception:
                return cleaned.split()
        return cleaned.split()

    def lemmatize_token(self, token: str) -> str:
        """Lemmatize a single token to its base/root form."""
        if self.lemmatizer:
            try:
                # Lemmatize as noun, then verb
                lemma = self.lemmatizer.lemmatize(token, pos='n')
                lemma = self.lemmatizer.lemmatize(lemma, pos='v')
                return lemma
            except Exception:
                pass
        
        # Simple rule-based fallback stemmer
        if token.endswith('ies') and len(token) > 4:
            return token[:-3] + 'y'
        if token.endswith('ing') and len(token) > 4:
            return token[:-3]
        if token.endswith('ed') and len(token) > 3:
            return token[:-2]
        if token.endswith('es') and len(token) > 3:
            return token[:-2]
        if token.endswith('s') and len(token) > 2 and not token.endswith('ss'):
            return token[:-1]
        return token

    def preprocess(self, text: str) -> str:
        """
        Complete preprocessing pipeline:
        1. Tokenize & clean
        2. Filter stopwords (optional)
        3. Lemmatize tokens (optional)
        4. Reconstruct normalized string
        """
        tokens = self.tokenize(text)
        processed_tokens = []

        for token in tokens:
            if not token.strip():
                continue
            if self.remove_stopwords and token in self.stopwords:
                continue
            if self.use_lemmatization:
                token = self.lemmatize_token(token)
            processed_tokens.append(token)

        return " ".join(processed_tokens) if processed_tokens else self.clean_text(text)
