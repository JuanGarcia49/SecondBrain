import psycopg2
import getpass

try:
    db_user = input("Enter database username: ")
    db_password = getpass.getpass("Enter database password: ")

    conn = psycopg2.connect(
        dbname="finances",
        user=db_user,
        password=db_password,
        host="localhost",
        port="5432"
    )
    print("Connection successful!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
