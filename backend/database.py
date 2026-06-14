import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )
    return conn

def insert_transaction(data, raw_message):
    conn = get_db_connection()
    cur = conn.cursor()

    # Standardize the category to lowercase
    category_name = data['category'].lower()
    
    # Step 1: Check if the category already exists
    cur.execute("SELECT id FROM categories WHERE name = %s;", (category_name,))
    category_row = cur.fetchone()
    
    if category_row:
        category_id = category_row[0]
    else:
        # Insert the new category and immediately get its generated ID
        cur.execute("INSERT INTO categories (name) VALUES (%s) RETURNING id;", (category_name,))
        category_id = cur.fetchone()[0]

    # Step 2: Insert the transaction using the correct column name and the category_id
    sql = """
        INSERT INTO transactions (vendor, amount, transaction_date, category_id, raw_sms)
        VALUES (%s, %s, %s, %s, %s);
    """
    
    # We still use data['date'] here because that is the key the LLM dictionary provided
    cur.execute(sql, (data['vendor'], data['amount'], data['date'], category_id, raw_message))
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Transaction saved to database! (Category ID: {category_id})")
