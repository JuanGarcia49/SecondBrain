import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

# from dependencies import get_db

# Load environment variables from the .env file
load_dotenv()

app = FastAPI(title="Second Brain API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT")
        )
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "Hello World from Second Brain API"}

@app.get("/transactions")
def get_transactions():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    query = "SELECT t.transaction_date, t.vendor, c.name AS category, t.amount FROM transactions t LEFT JOIN categories c ON t.category_id = c.id ORDER BY t.transaction_date DESC;"
    
    try:
        cur.execute(query)
        transactions = cur.fetchall()
        return {"transactions": transactions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/summary/categories")
def get_category_summary():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    query = "SELECT c.name AS category, SUM(t.amount) AS total_amount FROM transactions t LEFT JOIN categories c ON t.category_id = c.id GROUP BY c.name;"
    
    try:
        cur.execute(query)
        summary = cur.fetchall()
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/transactions/heatmap")
def get_heatmap_data(start_date: str, end_date: str):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    query = """
        SELECT DATE(transaction_date) as day, SUM(amount) as daily_total
        FROM transactions
        WHERE transaction_date >= %s AND transaction_date <= %s
        GROUP BY DATE(transaction_date)
        ORDER BY day;
    """
    
    try:
        cur.execute(query, (start_date, end_date))
        result = cur.fetchall()
        # React expects an array of objects: [{"day": "2026-06-21", "total": 50000}]
        return [{"day": str(row['day']), "total": float(row['daily_total'])} for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()