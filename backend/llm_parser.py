import json
import ollama
from datetime import datetime

def extract_transaction(text):
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Moving the rules and examples to the System Prompt
    system_prompt = f"""You are a financial data extraction API. Extract the vendor, amount, date, and category into a strict JSON object.
System time: {current_time}

Rules:
1. Output strictly a valid JSON object.
2. Keys must be exactly: "vendor", "amount", "date", "category".
3. "amount" must be a pure number. Ignore currency symbols.
4. "date" must be formatted as "YYYY-MM-DD HH:MM:SS". Use the System time if the exact date is missing.
5. "category" MUST be chosen from this exact list: [Food, Transport, Utilities, Entertainment, Health, Shopping, Bank Commitments, Debt, Other].
6. Do not output any explanations.

Example 1:
Input: "Bancolombia: Pagaste $6,524,119 en la tarjeta de credito 4055 desde la cuenta3025, el 25/05/2026 12:09. Bank"
Output: {{"vendor": "tarjeta de credito 4055", "amount": 6524119, "date": "2026-05-25 12:09:00", "category": "Bank Commitments"}}

Example 2:
Input: "Bancolombia: Compraste COP19.986,00 en UBER RIDES con tu T.Cred *4055, el 14/06/2026 a las 11:39. Transport"
Output: {{"vendor": "UBER RIDES", "amount": 19986, "date": "2026-06-14 11:39:00", "category": "Transport"}}
"""
    
    # Passing format='json' forces strict JSON output at the API level
    response = ollama.chat(
        model='hermes3:8b',
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': f"Message Input: {text}"}
        ],
        format='json' 
    )
    
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