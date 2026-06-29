import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import date

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
    
    query = "SELECT t.id, t.transaction_date, t.vendor, c.name AS category, t.amount, t.raw_sms FROM transactions t LEFT JOIN categories c ON t.category_id = c.id ORDER BY t.transaction_date DESC;"
    
    try:
        cur.execute(query)
        transactions = cur.fetchall()
        return {"transactions": transactions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

class TransactionUpdate(BaseModel):
    vendor: str
    amount: float
    category: str
    raw_sms: str

@app.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: int, tx: TransactionUpdate):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("SELECT id FROM categories WHERE name = %s;", (tx.category,))
        cat_result = cur.fetchone()
        
        if not cat_result:
            raise HTTPException(status_code=400, detail="Category not found")
            
        category_id = cat_result['id']
        
        update_query = """
            UPDATE transactions 
            SET vendor = %s, amount = %s, category_id = %s, raw_sms = %s 
            WHERE id = %s
        """
        cur.execute(update_query, (tx.vendor, tx.amount, category_id, tx.raw_sms, transaction_id))
        conn.commit()
        
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
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
def get_heatmap_data(start_date: str, end_date: str, category: str = "All"):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if category != "All":
        query = """
            SELECT DATE(t.transaction_date) as day, SUM(t.amount) as daily_total
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.transaction_date >= %s AND t.transaction_date <= %s AND c.name = %s
            GROUP BY DATE(t.transaction_date)
            ORDER BY day;
        """
        params = (start_date, end_date, category)
    else:
        query = """
            SELECT DATE(transaction_date) as day, SUM(amount) as daily_total
            FROM transactions
            WHERE transaction_date >= %s AND transaction_date <= %s
            GROUP BY DATE(transaction_date)
            ORDER BY day;
        """
        params = (start_date, end_date)
        
    try:
        cur.execute(query, params)
        result = cur.fetchall()
        return [{"day": str(row['day']), "total": float(row['daily_total'])} for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

class MealCreate(BaseModel):
    dish_name: str
    meal_type: str
    cook_date: date
    has_leftovers: bool
    transaction_id: Optional[int] = None
    ingredients: list[str]

@app.post("/meals")
def create_meal(meal: MealCreate):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Insert the main meal record
        meal_query = """
            INSERT INTO meals (dish_name, meal_type, cook_date, has_leftovers, transaction_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id;
        """
        cur.execute(meal_query, (meal.dish_name, meal.meal_type, meal.cook_date, meal.has_leftovers, meal.transaction_id))
        new_meal = cur.fetchone()
        meal_id = new_meal['id']
        
        # Process the list of ingredient strings
        for ingredient_name in meal.ingredients:
            cur.execute("SELECT id FROM ingredients WHERE name = %s;", (ingredient_name,))
            ing_result = cur.fetchone()
            
            if ing_result:
                ingredient_id = ing_result['id']
            else:
                cur.execute("INSERT INTO ingredients (name) VALUES (%s) RETURNING id;", (ingredient_name,))
                new_ing = cur.fetchone()
                ingredient_id = new_ing['id']
                
            # Link the meal and the ingredient
            cur.execute("INSERT INTO meal_ingredients (meal_id, ingredient_id) VALUES (%s, %s);", (meal_id, ingredient_id))
        
        conn.commit()
        return {"status": "success", "meal_id": meal_id}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/meals")
def get_meals():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    query = """
        SELECT 
            m.id, 
            m.dish_name, 
            m.meal_type, 
            m.cook_date, 
            m.has_leftovers, 
            m.transaction_id,
            array_agg(i.name) AS ingredients
        FROM meals m
        LEFT JOIN meal_ingredients mi ON m.id = mi.meal_id
        LEFT JOIN ingredients i ON mi.ingredient_id = i.id
        GROUP BY m.id
        ORDER BY m.cook_date DESC;
    """
    
    try:
        cur.execute(query)
        meals = cur.fetchall()
        return {"meals": meals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()