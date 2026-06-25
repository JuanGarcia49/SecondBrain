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

    category_name = data['category'].lower()
    
    # Step 1: Find the existing category ID
    cur.execute("SELECT id FROM categories WHERE name = %s;", (category_name,))
    category_id = cur.fetchone()[0]

    # Step 2: Insert the transaction
    sql = """
        INSERT INTO transactions (vendor, amount, transaction_date, category_id, raw_sms)
        VALUES (%s, %s, %s, %s, %s);
    """
    
    cur.execute(sql, (data['vendor'], data['amount'], data['date'], category_id, raw_message))
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Transaction saved to database! (Category ID: {category_id})")


