"""
FAQ Chatbot Engine using NLP & Cosine Similarity
Matches user questions against FAQ dataset using TF-IDF and Cosine Similarity.
"""

import os
import json
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from nlp_processor import TextPreprocessor


class FAQChatbot:
    """Intelligent FAQ Chatbot engine utilizing NLP preprocessing and TF-IDF Cosine Similarity."""

    def __init__(self, data_path: Optional[str] = None, confidence_threshold: float = 0.35):
        self.data_path = data_path or os.path.join(os.path.dirname(__file__), 'data', 'faqs.json')
        self.confidence_threshold = confidence_threshold
        self.preprocessor = TextPreprocessor(use_lemmatization=True, remove_stopwords=True)
        
        self.faqs: List[Dict[str, Any]] = []
        self.corpus_entries: List[Dict[str, Any]] = []
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None

        self.load_faqs()
        self.build_index()

    def load_faqs(self) -> None:
        """Load FAQs from JSON data file."""
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"FAQ data file not found at: {self.data_path}")
        
        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.faqs = json.load(f)

    def save_faqs(self) -> None:
        """Persist current FAQ dataset to disk."""
        os.makedirs(os.path.dirname(self.data_path), exist_ok=True)
        with open(self.data_path, 'w', encoding='utf-8') as f:
            json.dump(self.faqs, f, indent=2, ensure_ascii=False)

    def import_faqs(self, new_faqs: List[Dict[str, Any]], mode: str = 'append') -> Dict[str, Any]:
        """
        Import new FAQs, preprocess text with NLP, re-build TF-IDF matrix, and persist.
        Mode: 'append' (adds to existing) or 'replace' (replaces dataset).
        """
        if not isinstance(new_faqs, list) or len(new_faqs) == 0:
            raise ValueError("Import payload must be a non-empty list of FAQ objects.")

        valid_entries = []
        next_id = 1 if mode == 'replace' else (max([f.get("id", 0) for f in self.faqs], default=0) + 1)

        for item in new_faqs:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question", "")).strip()
            answer = str(item.get("answer", "")).strip()
            
            if not question or not answer:
                continue

            category = str(item.get("category", "General")).strip() or "General"
            
            # Extract pattern phrases
            raw_patterns = item.get("patterns", [])
            patterns = []
            if isinstance(raw_patterns, list):
                patterns = [str(p).strip() for p in raw_patterns if str(p).strip()]
            elif isinstance(raw_patterns, str) and raw_patterns.strip():
                patterns = [p.strip() for p in raw_patterns.split(",") if p.strip()]

            valid_entries.append({
                "id": next_id,
                "category": category,
                "question": question,
                "patterns": patterns,
                "answer": answer
            })
            next_id += 1

        if not valid_entries:
            raise ValueError("No valid FAQ items found. Each FAQ must contain 'question' and 'answer'.")

        if mode == 'replace':
            self.faqs = valid_entries
        else:
            self.faqs.extend(valid_entries)

        # Save to file
        self.save_faqs()

        # Re-run NLP preprocessing & TF-IDF indexing across full corpus
        self.build_index()

        return {
            "status": "success",
            "imported_count": len(valid_entries),
            "total_faqs": len(self.faqs),
            "categories": self.get_all_categories(),
            "indexed_documents": len(self.corpus_entries)
        }

    def build_index(self) -> None:
        """
        Build TF-IDF search index from FAQ questions and patterns.
        Every question and pattern variation is preprocessed and indexed.
        """
        self.corpus_entries = []
        processed_documents = []

        for faq in self.faqs:
            faq_id = faq["id"]
            
            # Primary question
            primary_q = faq["question"]
            proc_primary = self.preprocessor.preprocess(primary_q)
            self.corpus_entries.append({
                "faq_id": faq_id,
                "text": primary_q,
                "is_primary": True,
                "faq": faq
            })
            processed_documents.append(proc_primary)

            # Patterns (alternative phrasings)
            for pattern in faq.get("patterns", []):
                proc_pattern = self.preprocessor.preprocess(pattern)
                self.corpus_entries.append({
                    "faq_id": faq_id,
                    "text": pattern,
                    "is_primary": False,
                    "faq": faq
                })
                processed_documents.append(proc_pattern)

        if not processed_documents:
            self.vectorizer = None
            self.tfidf_matrix = None
            return

        # Initialize TF-IDF Vectorizer with unigrams and bigrams
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(processed_documents)

    def get_response(self, user_query: str) -> Dict[str, Any]:
        """
        Process user query and find the best matching FAQ response.
        Returns detailed response object including matched answer, confidence, and suggestions.
        """
        if not user_query or not user_query.strip():
            return {
                "success": False,
                "response": "Please enter a question so I can assist you.",
                "confidence": 0.0,
                "matched_question": None,
                "category": None,
                "faq_id": None,
                "suggestions": self.get_popular_questions(3)
            }

        cleaned_query = self.preprocessor.clean_text(user_query)
        processed_query = self.preprocessor.preprocess(user_query)

        # Conversational Intent Handling (Greetings, Gratitude, Goodbyes, Creator, Bot Identity)
        greetings = {"hi", "hello", "hey", "hola", "greetings", "good morning", "good afternoon", "good evening", "howdy", "sup", "hi there", "hello there"}
        gratitude = {"thank you", "thanks", "thanks a lot", "thank you so much", "thx", "appreciate it", "much appreciated"}
        goodbyes = {"bye", "goodbye", "see you", "see ya", "cya", "have a good day", "have a nice day", "good night", "farewell"}
        
        creator_intents = {
            "who made you", "who made u", "who created you", "who created u",
            "who is your creator", "who developed you", "who built you",
            "who is your developer", "who designed you", "who programmed you",
            "who is dhruv", "who is dhruv teli", "who made this"
        }
        identity_intents = {
            "who are you", "who are u", "what is your name", "whats your name",
            "what is this chatbot", "what is this bot", "what are you", "what is project astra",
            "tell me about project astra", "what can you do", "help me"
        }

        # Check for creator inquiry
        if cleaned_query in creator_intents or any(phrase in cleaned_query for phrase in ["who made you", "who made u", "who created you", "who developed you", "who built you", "your creator", "dhruv teli"]):
            return {
                "success": True,
                "response": "I was created and developed by **Dhruv Teli** as part of project **Astra**!",
                "confidence": 100.0,
                "matched_question": "Who made you?",
                "category": "General",
                "faq_id": 16,
                "suggestions": self.get_popular_questions(3)
            }

        # Check for bot & project identity inquiry
        if cleaned_query in identity_intents or any(phrase in cleaned_query for phrase in ["who are you", "who are u", "your name", "project astra"]):
            return {
                "success": True,
                "response": "I am **Astra**, an intelligent AI FAQ Assistant built for project **Astra**! I'm powered by Natural Language Processing (NLP), tokenization, lemmatization, and TF-IDF Cosine Similarity to assist with questions about orders, tracking, shipping, returns, payments, security, and warranties. How can I help you today?",
                "confidence": 100.0,
                "matched_question": "Who are you and what can you help with?",
                "category": "General",
                "faq_id": 15,
                "suggestions": self.get_popular_questions(3)
            }

        if cleaned_query in greetings:
            greeting_faq = next((f for f in self.faqs if f.get("id") == 15 or "astra" in f.get("answer", "").lower()), None)
            answer_text = greeting_faq["answer"] if greeting_faq else "Hello! I am Astra, your AI FAQ Assistant for project Astra. What can I help you with today?"
            return {
                "success": True,
                "response": answer_text,
                "confidence": 100.0,
                "matched_question": greeting_faq["question"] if greeting_faq else "Greeting",
                "category": greeting_faq["category"] if greeting_faq else "General",
                "faq_id": greeting_faq["id"] if greeting_faq else 15,
                "suggestions": self.get_popular_questions(3)
            }

        if cleaned_query in gratitude:
            return {
                "success": True,
                "response": "You're very welcome! If there is anything else you need help with, please let me know.",
                "confidence": 100.0,
                "matched_question": "Thank you",
                "category": "General",
                "faq_id": None,
                "suggestions": self.get_popular_questions(3)
            }

        if cleaned_query in goodbyes:
            return {
                "success": True,
                "response": "Goodbye! Have a wonderful day ahead. Feel free to come back whenever you have any questions.",
                "confidence": 100.0,
                "matched_question": "Goodbye",
                "category": "General",
                "faq_id": None,
                "suggestions": self.get_popular_questions(3)
            }

        if self.vectorizer is None or self.tfidf_matrix is None or not processed_query.strip():
            return {
                "success": False,
                "response": "I'm sorry, I couldn't find an answer to your question. You can browse suggested topics below or rephrase your question.",
                "confidence": 0.0,
                "matched_question": None,
                "category": None,
                "faq_id": None,
                "suggestions": self.get_popular_questions(3)
            }

        # Vectorize user query
        query_vec = self.vectorizer.transform([processed_query])
        similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        # Aggregate top similarity scores per FAQ
        faq_scores: Dict[int, float] = {}
        faq_matched_text: Dict[int, str] = {}

        for idx, score in enumerate(similarities):
            entry = self.corpus_entries[idx]
            faq_id = entry["faq_id"]
            if faq_id not in faq_scores or score > faq_scores[faq_id]:
                faq_scores[faq_id] = float(score)
                faq_matched_text[faq_id] = entry["text"]

        # Sort FAQs by score descending
        sorted_faqs = sorted(faq_scores.items(), key=lambda item: item[1], reverse=True)

        if not sorted_faqs or sorted_faqs[0][1] == 0.0:
            return {
                "success": False,
                "response": "I'm sorry, I couldn't find an answer to your question. You can browse suggested topics below or rephrase your question.",
                "confidence": 0.0,
                "matched_question": None,
                "category": None,
                "faq_id": None,
                "suggestions": self.get_popular_questions(3)
            }

        best_faq_id, best_score = sorted_faqs[0]
        best_faq = next(f for f in self.faqs if f["id"] == best_faq_id)

        # Build suggestions from subsequent top candidates
        suggestions = []
        for f_id, score in sorted_faqs[1:4]:
            if score > 0.05:
                cand_faq = next(f for f in self.faqs if f["id"] == f_id)
                suggestions.append(cand_faq["question"])

        if not suggestions:
            suggestions = [f["question"] for f in self.faqs if f["id"] != best_faq_id][:3]

        # Case 1: High Confidence Match
        if best_score >= self.confidence_threshold:
            return {
                "success": True,
                "response": best_faq["answer"],
                "confidence": round(best_score * 100, 1),
                "matched_question": best_faq["question"],
                "matched_pattern": faq_matched_text.get(best_faq_id),
                "category": best_faq["category"],
                "faq_id": best_faq["id"],
                "suggestions": suggestions
            }

        # Case 2: Borderline / Partial Match (Suggest top candidates)
        elif best_score >= 0.15:
            return {
                "success": True,
                "response": f"I'm not entirely certain, but here is what might help regarding **{best_faq['question']}**:\n\n{best_faq['answer']}",
                "confidence": round(best_score * 100, 1),
                "matched_question": best_faq["question"],
                "matched_pattern": faq_matched_text.get(best_faq_id),
                "category": best_faq["category"],
                "faq_id": best_faq["id"],
                "is_uncertain": True,
                "suggestions": [best_faq["question"]] + suggestions[:2]
            }

        # Case 3: Low Confidence / No good match
        else:
            return {
                "success": False,
                "response": "I'm not sure I understand your question. Could you try asking in a different way? Here are some topics I can help with:",
                "confidence": round(best_score * 100, 1),
                "matched_question": None,
                "category": None,
                "faq_id": None,
                "suggestions": self.get_popular_questions(3)
            }

    def get_popular_questions(self, count: int = 4) -> List[str]:
        """Return a selection of popular default FAQ questions."""
        return [faq["question"] for faq in self.faqs[:count]]

    def get_all_categories(self) -> List[str]:
        """Return unique list of FAQ categories."""
        return sorted(list(set(faq["category"] for faq in self.faqs)))


def run_cli():
    """Interactive command-line interface for testing the FAQ Chatbot."""
    print("=" * 65)
    print("[*] NLP FAQ CHATBOT (Interactive CLI Mode)")
    print("Preprocessed with NLTK | TF-IDF Vectorization | Cosine Similarity")
    print("=" * 65)
    print("Type your questions below. Type 'exit', 'quit', or 'q' to end.\n")

    bot = FAQChatbot()

    while True:
        try:
            user_input = input("\n[User]: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ('exit', 'quit', 'q'):
                print("\nGoodbye! Have a great day.\n")
                break

            result = bot.get_response(user_input)
            print(f"\n[Bot] (Confidence: {result['confidence']}% | Category: {result['category'] or 'N/A'}):")
            print(f"   {result['response']}")

            if result.get("suggestions"):
                print("\n>> Related Suggestions:")
                for idx, sugg in enumerate(result["suggestions"], 1):
                    print(f"   {idx}. {sugg}")

        except KeyboardInterrupt:
            print("\n\nSession terminated by user.")
            break
        except Exception as e:
            print(f"\n[!] Error: {e}")


if __name__ == "__main__":
    run_cli()
