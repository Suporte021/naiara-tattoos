import os
import sqlite3

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH = os.path.join(BASE_DIR, "naiara.db")

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

USE_POSTGRES = bool(DATABASE_URL)


def get_connection():
    if USE_POSTGRES:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


class DB:
    def __init__(self, conn):
        self.conn = conn
        self.use_pg = USE_POSTGRES

    def _sql(self, sql):
        if self.use_pg:
            return sql.replace("?", "%s")
        return sql

    def execute(self, sql, params=None):
        params = params or ()
        cur = self.conn.cursor()
        cur.execute(self._sql(sql), params)
        return cur

    def last_id(self, cur):
        """Funciona no SQLite e no PostgreSQL."""
        if self.use_pg:
            row = self.execute("SELECT LASTVAL() AS id").fetchone()
            return row["id"]
        return cur.lastrowid

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()


def get_db():
    return DB(get_connection())


def init_db():
    db = get_db()
    try:
        if USE_POSTGRES:
            _init_postgres(db)
        else:
            _init_sqlite(db)
        _seed(db)
        db.commit()
        print("Banco OK:", "PostgreSQL" if USE_POSTGRES else "SQLite")
    except Exception as e:
        db.rollback()
        print("Erro init_db:", e)
        raise
    finally:
        db.close()


def _init_sqlite(db):
    db.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            whatsapp TEXT NOT NULL,
            email TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            price TEXT,
            duration INTEGER DEFAULT 60,
            active INTEGER DEFAULT 1
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            service_id INTEGER,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            local TEXT,
            size TEXT,
            note TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            image TEXT NOT NULL,
            active INTEGER DEFAULT 1
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_of_week INTEGER NOT NULL UNIQUE,
            start_time TEXT,
            end_time TEXT,
            enabled INTEGER DEFAULT 1
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS blocked_dates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            reason TEXT
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)


def _init_postgres(db):
    db.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            whatsapp TEXT NOT NULL,
            email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            price TEXT,
            duration INTEGER DEFAULT 60,
            active INTEGER DEFAULT 1
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id SERIAL PRIMARY KEY,
            client_id INTEGER,
            service_id INTEGER,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            local TEXT,
            size TEXT,
            note TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS portfolio (
            id SERIAL PRIMARY KEY,
            category TEXT NOT NULL,
            image TEXT NOT NULL,
            active INTEGER DEFAULT 1
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS availability (
            id SERIAL PRIMARY KEY,
            day_of_week INTEGER NOT NULL UNIQUE,
            start_time TEXT,
            end_time TEXT,
            enabled INTEGER DEFAULT 1
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS blocked_dates (
            id SERIAL PRIMARY KEY,
            date TEXT NOT NULL UNIQUE,
            reason TEXT
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)


def _seed(db):
    for day in range(7):
        enabled = 0 if day in (0, 1) else 1
        if USE_POSTGRES:
            db.execute("""
                INSERT INTO availability (day_of_week, start_time, end_time, enabled)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (day_of_week) DO NOTHING
            """, (day, "09:00", "18:00", enabled))
        else:
            db.execute("""
                INSERT OR IGNORE INTO availability
                    (day_of_week, start_time, end_time, enabled)
                VALUES (?, ?, ?, ?)
            """, (day, "09:00", "18:00", enabled))

    defaults = {
        "artist_name": "Naiara",
        "whatsapp": "",
        "instagram": "",
        "default_duration": "60",
        "description": "Fine line tattoo",
    }
    for key, value in defaults.items():
        if USE_POSTGRES:
            db.execute("""
                INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT (key) DO NOTHING
            """, (key, value))
        else:
            db.execute("""
                INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
            """, (key, value))