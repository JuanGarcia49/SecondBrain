import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.middleware.cors import CORSMiddleware

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
    
    query = "SELECT * FROM transactions ORDER BY date DESC;"
    
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
    
    query = "SELECT category, SUM(amount) AS total_amount FROM transactions GROUP BY category;"
    
    try:
        cur.execute(query)
        summary = cur.fetchall()
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
