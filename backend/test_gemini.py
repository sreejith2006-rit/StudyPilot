import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print(f"Using API Key: {api_key}")

genai.configure(api_key=api_key)

try:
    print("Listing available models...")
    for m in genai.list_models():
        if "generateContent" in m.supported_generation_methods:
            print(f"Model: {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")

try:
    print("\nTrying simple generation with gemini-1.5-flash...")
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Say hello")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error generating with gemini-1.5-flash: {e}")

try:
    print("\nTrying simple generation with gemini-1.5-pro...")
    model = genai.GenerativeModel('gemini-1.5-pro')
    response = model.generate_content("Say hello")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error generating with gemini-1.5-pro: {e}")
