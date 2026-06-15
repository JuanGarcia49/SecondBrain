import json
import ollama
from datetime import datetime

def extract_transaction(text):
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    current_date = current_time.split(" ")[0]
    
    prompt = f"""You are a financial data extraction tool. Extract the vendor, amount, date, and category from the message into a strict JSON object.
System time: {current_time}

Rules:
1. Output strictly a valid JSON object.
2. Keys must be exactly: "vendor", "amount", "date", "category".
3. "amount" must be a pure number. Ignore currency symbols.
4. "date" must be calculated using the System time and formatted as "YYYY-MM-DD HH:MM:SS".
5. "category" MUST be chosen from this exact list: [Food, Transport, Utilities, Entertainment, Health, Shopping, Bank Commitments, Other]. Do not invent new categories.
6. Do not output any explanations, conversational text, or markdown blocks. Output only the raw JSON.

Example Input: "Bancolombia: Pagaste $6,524,119 en la tarjeta de credito 0923 desde la cuenta6076, el 25/05/2026 12:09. Bank"
Example Output: {{"vendor": "tarjeta de credito 0923", "amount": 6524119, "date": "2026-05-25 12:09:00", "category": "Bank Commitments"}}

Example Input: "Bancolombia: Compraste COP19.986,00 en UBER RIDES con tu T.Cred *0923, el 14/06/2026 a las 11:39. Transport"
Example Output: {{"vendor": "UBER RIDES", "amount": 19986, "date": "2026-06-14 11:39:00", "category": "Transport"}}

Message Input: "{text}"
Output:"""
    
    response = ollama.chat(model='hermes3:3b', messages=[
        {
            'role': 'user',
            'content': prompt,
        },
    ])
    
    result_text = response['message']['content'].strip()
    print(f"🤖 Raw LLM Output:\n{result_text}")
    
    try:
        raw_data = json.loads(result_text)
        # Remove spaces from the keys
        transaction_data = {key.strip(): value for key, value in raw_data.items()}
        print(f"✅ Parsed Dictionary:\n{transaction_data}")
        return transaction_data
    except json.JSONDecodeError:
        print("❌ Error: The LLM did not return valid JSON.")
        return None
