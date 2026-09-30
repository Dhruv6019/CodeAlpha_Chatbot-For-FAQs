"""
Unit and Integration Tests for FAQ Chatbot, NLP Preprocessor & REST API
"""

import os
import sys
import json
import shutil
import tempfile
import unittest

# Ensure Task-2 directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from nlp_processor import TextPreprocessor
from chatbot import FAQChatbot
from app import app


class TestNLPPreprocessor(unittest.TestCase):
    """Test text cleaning, tokenization, stopword removal, and lemmatization."""

    def setUp(self):
        self.preprocessor = TextPreprocessor(use_lemmatization=True, remove_stopwords=True)

    def test_clean_text(self):
        raw = "   Hello! Where is MY package??? https://tracking.com/123   "
        cleaned = self.preprocessor.clean_text(raw)
        self.assertEqual(cleaned, "hello where is my package")

    def test_tokenization_and_lemmatization(self):
        query = "tracking orders and deliveries"
        tokens = self.preprocessor.tokenize(query)
        self.assertTrue(len(tokens) >= 3)
        processed = self.preprocessor.preprocess(query)
        self.assertTrue(len(processed) > 0)
        # Verify root words like 'track', 'order', 'deliver' or similar lemmas
        self.assertIn("track", processed)
        self.assertIn("order", processed)


class TestFAQChatbot(unittest.TestCase):
    """Test FAQ similarity matching and edge case handling with isolated temp storage."""

    def setUp(self):
        # Create an isolated temporary directory for test FAQ data so production faqs.json is never mutated
        self.temp_dir = tempfile.mkdtemp()
        self.temp_data_path = os.path.join(self.temp_dir, 'test_faqs.json')
        canonical_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'faqs.json')
        shutil.copyfile(canonical_path, self.temp_data_path)
        self.bot = FAQChatbot(data_path=self.temp_data_path)

    def tearDown(self):
        # Clean up temporary test files
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_exact_question_match(self):
        query = "How can I track my order?"
        result = self.bot.get_response(query)
        self.assertTrue(result["success"])
        self.assertEqual(result["faq_id"], 1)
        self.assertGreater(result["confidence"], 80.0)

    def test_paraphrased_matching(self):
        query = "where is my parcel currently?"
        result = self.bot.get_response(query)
        self.assertTrue(result["success"])
        self.assertEqual(result["category"], "Orders & Tracking")
        self.assertGreater(result["confidence"], 30.0)

    def test_return_policy_matching(self):
        query = "can I get a refund if product is broken?"
        result = self.bot.get_response(query)
        self.assertTrue(result["success"])
        self.assertIn(result["category"], ["Returns & Refunds", "Warranty & Technical"])

    def test_payment_methods_matching(self):
        query = "Do you take credit cards and Apple Pay?"
        result = self.bot.get_response(query)
        self.assertTrue(result["success"])
        self.assertEqual(result["category"], "Payments & Billing")

    def test_greeting_handling(self):
        for q in ["hello", "hi", "hey", "good morning", "hi there"]:
            result = self.bot.get_response(q)
            self.assertTrue(result["success"])
            self.assertGreaterEqual(result["confidence"], 90.0)

    def test_gratitude_handling(self):
        for q in ["thank you", "thanks", "thanks a lot"]:
            result = self.bot.get_response(q)
            self.assertTrue(result["success"])
            self.assertIn("welcome", result["response"].lower())

    def test_goodbye_handling(self):
        for q in ["bye", "goodbye", "have a nice day"]:
            result = self.bot.get_response(q)
            self.assertTrue(result["success"])
            self.assertIn("goodbye", result["response"].lower())

    def test_who_are_you_identity(self):
        for q in ["who are you", "who are u", "what is your name", "what is project astra"]:
            result = self.bot.get_response(q)
            self.assertTrue(result["success"])
            self.assertIn("astra", result["response"].lower())
            self.assertEqual(result["confidence"], 100.0)

    def test_who_made_you_creator(self):
        for q in ["who made you", "who made u", "who created you", "who is your developer"]:
            result = self.bot.get_response(q)
            self.assertTrue(result["success"])
            self.assertIn("dhruv teli", result["response"].lower())
            self.assertIn("astra", result["response"].lower())
            self.assertEqual(result["confidence"], 100.0)

    def test_empty_query(self):
        result = self.bot.get_response("   ")
        self.assertFalse(result["success"])
        self.assertEqual(result["confidence"], 0.0)

    def test_out_of_scope_query(self):
        out_of_scope_queries = [
            "xyz quantum astrophysics equation 998",
            "what is the capital of France?",
            "how do I bake a chocolate cake?",
            "where is the Eiffel tower?"
        ]
        for q in out_of_scope_queries:
            result = self.bot.get_response(q)
            self.assertFalse(result["success"], f"Expected '{q}' to be classified as out of scope")
            self.assertLess(result["confidence"], 35.0)

    def test_import_faqs_and_retrain(self):
        new_faqs = [
            {
                "category": "Robotics Lab",
                "question": "Where is the Autonomous Drone Laboratory located?",
                "patterns": ["Find drone lab location", "Where are autonomous quadcopters tested?"],
                "answer": "The Autonomous Drone Laboratory is situated in Engineering Building B, Room 402."
            }
        ]
        res = self.bot.import_faqs(new_faqs, mode='append')
        self.assertEqual(res["status"], "success")
        self.assertGreaterEqual(res["imported_count"], 1)

        # Test querying the newly imported FAQ
        query_res = self.bot.get_response("Where can I find the drone lab?")
        self.assertTrue(query_res["success"])
        self.assertEqual(query_res["category"], "Robotics Lab")
        self.assertIn("Engineering Building B", query_res["response"])


class TestFlaskAPI(unittest.TestCase):
    """Test Flask Web Application Endpoints."""

    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_index_route(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Smart FAQ Assistant', response.data)

    def test_get_faqs_endpoint(self):
        response = self.client.get('/api/faqs')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('categories', data)
        self.assertIn('faqs', data)
        self.assertTrue(len(data['faqs']) >= 15)

    def test_chat_endpoint_valid(self):
        response = self.client.post('/api/chat', json={'message': 'How do I track my package?'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertIn('track', data['response'].lower())

    def test_chat_endpoint_empty(self):
        response = self.client.post('/api/chat', json={'message': '   '})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data['success'])

    def test_feedback_endpoint(self):
        response = self.client.post('/api/feedback', json={'faq_id': 1, 'helpful': True})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['status'], 'success')


if __name__ == "__main__":
    unittest.main()
