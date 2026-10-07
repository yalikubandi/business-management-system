import os
from datetime import datetime
from decimal import Decimal, InvalidOperation
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv


load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


# ============================================================
# FLASK APPLICATION
# ============================================================

app = Flask(__name__)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
CORS(app, origins=CORS_ORIGINS)


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME")
}

DEFAULT_SETTINGS = {
    "business_name": "Business Management System",
    "business_phone": "",
    "business_email": "",
    "business_address": "",
    "default_minimum_stock": "5",
}


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db_connection():

    try:
        connection = mysql.connector.connect(**DB_CONFIG)

        if connection.is_connected():
            return connection

    except Error as e:
        print("Database connection error:", e)

    return None


# ============================================================
# INITIALIZE DATABASE TABLES
# ============================================================

def initialize_database():

    connection = get_db_connection()

    if not connection:
        print("WARNING: Database connection failed.")
        return

    cursor = None

    try:

        cursor = connection.cursor()

        # ====================================================
        # PRODUCTS TABLE
        # ====================================================

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS products (

                id INT AUTO_INCREMENT PRIMARY KEY,

                product_code VARCHAR(100),

                name VARCHAR(150) NOT NULL,

                category VARCHAR(100),

                unit VARCHAR(50) DEFAULT 'Piece',

                quantity INT DEFAULT 0,

                minimum_stock INT DEFAULT 5,

                supplier VARCHAR(150),

                buying_price DECIMAL(10,2) DEFAULT 0,

                selling_price DECIMAL(10,2) DEFAULT 0,

                description TEXT,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ====================================================
        # PURCHASES TABLE
        # ====================================================

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS purchases (

                id INT AUTO_INCREMENT PRIMARY KEY,

                product_id INT NOT NULL,

                quantity INT NOT NULL,

                buying_price DECIMAL(10,2) NOT NULL,

                total_cost DECIMAL(12,2) NOT NULL,

                supplier VARCHAR(150),

                purchase_date DATE NOT NULL,

                notes TEXT,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (product_id)
                    REFERENCES products(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gifts (

                id INT AUTO_INCREMENT PRIMARY KEY,

                product_id INT NOT NULL,

                quantity INT NOT NULL,

                recipient_name VARCHAR(150),

                gift_date DATE NOT NULL,

                notes TEXT,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (product_id)
                    REFERENCES products(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expenses (

                id INT AUTO_INCREMENT PRIMARY KEY,

                description VARCHAR(255) NOT NULL,

                category VARCHAR(100),

                amount DECIMAL(10,2) NOT NULL,

                expense_date DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("SHOW COLUMNS FROM expenses")
        expense_columns = {column[0] for column in cursor.fetchall()}

        if "category" not in expense_columns:
            cursor.execute(
                "ALTER TABLE expenses ADD COLUMN category VARCHAR(100) NULL AFTER description"
            )

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        # ====================================================
        # SALES TABLE
        # ====================================================

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales (

                id INT AUTO_INCREMENT PRIMARY KEY,

                product_id INT NOT NULL,

                quantity INT NOT NULL,

                selling_price DECIMAL(10,2) NOT NULL,

                total_amount DECIMAL(12,2) NOT NULL,

                customer_name VARCHAR(150),

                sale_date DATE NOT NULL,

                notes TEXT,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (product_id)
                    REFERENCES products(id)
            )
        """)

        cursor.execute("SHOW COLUMNS FROM sales")
        sales_columns = {column[0] for column in cursor.fetchall()}
        missing_sales_columns = {
            "selling_price": "DECIMAL(10,2) NOT NULL DEFAULT 0",
            "customer_name": "VARCHAR(150) NULL",
            "notes": "TEXT NULL",
            "created_at": "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
        }

        for column_name, column_definition in missing_sales_columns.items():
            if column_name not in sales_columns:
                cursor.execute(
                    f"ALTER TABLE sales ADD COLUMN {column_name} {column_definition}"
                )

        if "selling_price" not in sales_columns:
            cursor.execute("""
                UPDATE sales
                SET selling_price = total_amount / quantity
                WHERE quantity > 0
            """)

        connection.commit()

        print("Database tables are ready.")

    except Error as e:

        connection.rollback()

        print("Database initialization error:", e)

    finally:

        if cursor:
            cursor.close()

        connection.close()


# ============================================================
# HOME
# ============================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "message": "Business Management System API is running"
    })


# ============================================================
# TEST DATABASE
# ============================================================

@app.route("/api/test-db", methods=["GET"])
def test_database():

    connection = get_db_connection()

    if connection:

        connection.close()

        return jsonify({
            "success": True,
            "message": "Database connected successfully",
            "database": "business_management"
        })

    return jsonify({
        "success": False,
        "message": "Database connection failed"
    }), 500


# ============================================================
# PRODUCTS - GET ALL
# ============================================================

@app.route("/api/products", methods=["GET"])
def get_products():

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                product_code,
                name,
                category,
                unit,
                quantity,
                minimum_stock,
                supplier,
                buying_price,
                selling_price,
                description,
                created_at
            FROM products
            ORDER BY id DESC
        """)

        products = cursor.fetchall()

        return jsonify(products), 200

    except Error as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        connection.close()


# ============================================================
# PRODUCTS - ADD
# ============================================================

@app.route("/api/products", methods=["POST"])
def add_product():

    data = request.get_json(silent=True)

    if not data:

        return jsonify({
            "success": False,
            "error": "No product data received"
        }), 400

    name = str(data.get("name", "")).strip()

    if not name:

        return jsonify({
            "success": False,
            "error": "Product name is required"
        }), 400

    try:

        quantity = int(data.get("quantity", 0) or 0)

        minimum_stock = int(
            data.get("minimum_stock", 5) or 5
        )

        buying_price = float(
            data.get("buying_price", 0) or 0
        )

        selling_price = float(
            data.get("selling_price", 0) or 0
        )

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "error":
                "Quantity, minimum stock and prices must be valid numbers"
        }), 400

    if quantity < 0:

        return jsonify({
            "success": False,
            "error": "Quantity cannot be negative"
        }), 400

    if minimum_stock < 0:

        return jsonify({
            "success": False,
            "error": "Minimum stock cannot be negative"
        }), 400

    if buying_price < 0 or selling_price < 0:

        return jsonify({
            "success": False,
            "error": "Prices cannot be negative"
        }), 400

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO products (

                product_code,
                name,
                category,
                unit,
                quantity,
                minimum_stock,
                supplier,
                buying_price,
                selling_price,
                description

            )

            VALUES (

                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s

            )
        """, (

            data.get("product_code"),

            name,

            data.get("category", ""),

            data.get("unit", "Piece"),

            quantity,

            minimum_stock,

            data.get("supplier", ""),

            buying_price,

            selling_price,

            data.get("description", "")
        ))

        connection.commit()

        return jsonify({

            "success": True,

            "message": "Product added successfully",

            "id": cursor.lastrowid

        }), 201

    except Error as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        connection.close()


# ============================================================
# PRODUCTS - UPDATE
# ============================================================

@app.route("/api/products/<int:product_id>", methods=["PUT"])
def update_product(product_id):

    data = request.get_json(silent=True)

    if not data:

        return jsonify({
            "success": False,
            "error": "No product data received"
        }), 400

    name = str(data.get("name", "")).strip()

    if not name:

        return jsonify({
            "success": False,
            "error": "Product name is required"
        }), 400

    try:

        quantity = int(data.get("quantity", 0) or 0)

        minimum_stock = int(
            data.get("minimum_stock", 5) or 5
        )

        buying_price = float(
            data.get("buying_price", 0) or 0
        )

        selling_price = float(
            data.get("selling_price", 0) or 0
        )

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "error": "Invalid product numbers"
        }), 400

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute("""
            UPDATE products

            SET

                product_code = %s,
                name = %s,
                category = %s,
                unit = %s,
                quantity = %s,
                minimum_stock = %s,
                supplier = %s,
                buying_price = %s,
                selling_price = %s,
                description = %s

            WHERE id = %s
        """, (

            data.get("product_code"),

            name,

            data.get("category", ""),

            data.get("unit", "Piece"),

            quantity,

            minimum_stock,

            data.get("supplier", ""),

            buying_price,

            selling_price,

            data.get("description", ""),

            product_id
        ))

        if cursor.rowcount == 0:

            connection.rollback()

            return jsonify({
                "success": False,
                "error": "Product not found"
            }), 404

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Product updated successfully"
        }), 200

    except Error as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        connection.close()


# ============================================================
# PRODUCTS - DELETE
# ============================================================

@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute("""
            DELETE FROM products
            WHERE id = %s
        """, (product_id,))

        if cursor.rowcount == 0:

            connection.rollback()

            return jsonify({
                "success": False,
                "error": "Product not found"
            }), 404

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Product deleted successfully"
        }), 200

    except Error as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        connection.close()


# ============================================================
# GIFTS - GET ALL
# ============================================================

@app.route("/api/gifts", methods=["GET"])
def get_gifts():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                g.id,
                g.product_id,
                p.name AS product_name,
                p.product_code,
                g.quantity,
                g.recipient_name,
                g.gift_date,
                g.notes,
                g.created_at
            FROM gifts g
            INNER JOIN products p ON p.id = g.product_id
            ORDER BY g.gift_date DESC, g.id DESC
        """)

        return jsonify(cursor.fetchall()), 200

    except Error as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# ============================================================
# GIFTS - RECORD
# ============================================================

@app.route("/api/gifts", methods=["POST"])
def add_gift():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "No gift data received"
        }), 400

    try:
        product_id = int(data.get("product_id"))
        quantity = int(data.get("quantity"))
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "error": "Select a product and enter a valid quantity"
        }), 400

    if product_id <= 0 or quantity <= 0:
        return jsonify({
            "success": False,
            "error": "Product and quantity must be greater than zero"
        }), 400

    gift_date = data.get("gift_date")

    if not gift_date:
        return jsonify({
            "success": False,
            "error": "Gift date is required"
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, name, quantity
            FROM products
            WHERE id = %s
            FOR UPDATE
        """, (product_id,))
        product = cursor.fetchone()

        if not product:
            connection.rollback()
            return jsonify({
                "success": False,
                "error": "Product not found"
            }), 404

        current_stock = int(product["quantity"] or 0)

        if quantity > current_stock:
            connection.rollback()
            return jsonify({
                "success": False,
                "error": f"Insufficient stock. Available stock: {current_stock}"
            }), 400

        cursor.execute("""
            INSERT INTO gifts (
                product_id,
                quantity,
                recipient_name,
                gift_date,
                notes
            )
            VALUES (%s, %s, %s, %s, %s)
        """, (
            product_id,
            quantity,
            str(data.get("recipient_name", "")).strip() or None,
            gift_date,
            str(data.get("notes", "")).strip() or None,
        ))
        gift_id = cursor.lastrowid

        cursor.execute("""
            UPDATE products
            SET quantity = quantity - %s
            WHERE id = %s
        """, (quantity, product_id))

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Gift recorded successfully",
            "gift_id": gift_id,
            "product_name": product["name"],
            "quantity": quantity,
            "remaining_stock": current_stock - quantity,
        }), 201

    except Error as e:
        connection.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# ============================================================
# SETTINGS - GET
# ============================================================

@app.route("/api/settings", methods=["GET"])
def get_settings():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT setting_key, setting_value FROM business_settings")
        settings = dict(DEFAULT_SETTINGS)
        settings.update(dict(cursor.fetchall()))
        settings["default_minimum_stock"] = int(
            settings["default_minimum_stock"]
        )

        return jsonify(settings), 200

    except (Error, ValueError) as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# ============================================================
# SETTINGS - UPDATE
# ============================================================

@app.route("/api/settings", methods=["PUT"])
def update_settings():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": "Settings must be sent as a JSON object"
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT setting_key, setting_value FROM business_settings")
        settings = dict(DEFAULT_SETTINGS)
        settings.update(dict(cursor.fetchall()))

        for key in (
            "business_name",
            "business_phone",
            "business_email",
            "business_address",
        ):
            if key in data:
                if not isinstance(data[key], str):
                    return jsonify({
                        "success": False,
                        "error": f"{key} must be text"
                    }), 400
                settings[key] = data[key].strip()

        limits = {
            "business_name": 150,
            "business_phone": 40,
            "business_email": 254,
            "business_address": 255,
        }

        if not settings["business_name"]:
            return jsonify({
                "success": False,
                "error": "Business name is required"
            }), 400

        for key, maximum_length in limits.items():
            if len(settings[key]) > maximum_length:
                return jsonify({
                    "success": False,
                    "error": f"{key.replace('_', ' ').capitalize()} is too long"
                }), 400

        if "business_email" in data and settings["business_email"]:
            email = settings["business_email"]
            if "@" not in email or email.startswith("@") or email.endswith("@"):
                return jsonify({
                    "success": False,
                    "error": "Enter a valid business email"
                }), 400

        if "default_minimum_stock" in data:
            try:
                threshold = Decimal(str(data["default_minimum_stock"]))
            except (InvalidOperation, TypeError, ValueError):
                return jsonify({
                    "success": False,
                    "error": "Default minimum stock must be a whole number"
                }), 400

            if (
                not threshold.is_finite()
                or threshold != threshold.to_integral_value()
                or threshold < 0
                or threshold > 100000
            ):
                return jsonify({
                    "success": False,
                    "error": "Default minimum stock must be a whole number from 0 to 100000"
                }), 400

            settings["default_minimum_stock"] = str(int(threshold))

        cursor.executemany("""
            INSERT INTO business_settings (setting_key, setting_value)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        """, list(settings.items()))
        connection.commit()

        settings["default_minimum_stock"] = int(
            settings["default_minimum_stock"]
        )
        return jsonify({
            "success": True,
            "message": "Settings saved successfully",
            "settings": settings,
        }), 200

    except (Error, ValueError) as e:
        connection.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# ============================================================
# EXPENSES - GET ALL
# ============================================================

@app.route("/api/expenses", methods=["GET"])
def get_expenses():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                id,
                description,
                category,
                amount,
                DATE_FORMAT(expense_date, '%Y-%m-%d') AS expense_date
            FROM expenses
            ORDER BY expense_date DESC, id DESC
        """)

        return jsonify(cursor.fetchall()), 200

    except Error as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# ============================================================
# EXPENSES - ADD
# ============================================================

@app.route("/api/expenses", methods=["POST"])
def add_expense():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "No expense data received"
        }), 400

    description = str(data.get("description", "")).strip()
    category = str(data.get("category", "")).strip() or None
    expense_date = str(data.get("expense_date", "")).strip()

    if not description:
        return jsonify({
            "success": False,
            "error": "Expense description is required"
        }), 400

    if len(description) > 255:
        return jsonify({
            "success": False,
            "error": "Expense description must be 255 characters or fewer"
        }), 400

    try:
        amount = Decimal(str(data.get("amount", "")))
    except (InvalidOperation, TypeError, ValueError):
        return jsonify({
            "success": False,
            "error": "Amount must be a valid number"
        }), 400

    if not amount.is_finite() or amount <= 0:
        return jsonify({
            "success": False,
            "error": "Amount must be greater than zero"
        }), 400

    try:
        datetime.strptime(expense_date, "%Y-%m-%d")
    except ValueError:
        return jsonify({
            "success": False,
            "error": "A valid expense date is required"
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO expenses (description, category, amount, expense_date)
            VALUES (%s, %s, %s, %s)
        """, (description, category, amount, expense_date))
        expense_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "success": True,
            "message": "Expense recorded successfully",
            "expense_id": expense_id,
            "amount": float(amount),
        }), 201

    except Error as e:
        connection.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# ============================================================
# PURCHASES - GET ALL
# ============================================================

@app.route("/api/purchases", methods=["GET"])
def get_purchases():

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT

                p.id,
                p.product_id,
                pr.product_code,
                pr.name AS product_name,
                p.quantity,
                p.buying_price,
                p.total_cost,
                p.supplier,
                p.purchase_date,
                p.notes,
                p.created_at

            FROM purchases p

            INNER JOIN products pr
                ON p.product_id = pr.id

            ORDER BY p.id DESC
        """)

        purchases = cursor.fetchall()

        return jsonify(purchases), 200

    except Error as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        connection.close()


# ============================================================
# PURCHASES - ADD
# ============================================================

@app.route("/api/purchases", methods=["POST"])
def add_purchase():

    data = request.get_json(silent=True)

    if not data:

        return jsonify({
            "success": False,
            "error": "No purchase data received"
        }), 400

    product_id = data.get("product_id")

    quantity = data.get("quantity")

    buying_price = data.get("buying_price")

    supplier = data.get("supplier", "")

    purchase_date = data.get("purchase_date")

    notes = data.get("notes", "")

    if not product_id:

        return jsonify({
            "success": False,
            "error": "Product is required"
        }), 400

    try:

        quantity = int(quantity)

        buying_price = float(buying_price)

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "error":
                "Quantity and buying price must be valid numbers"
        }), 400

    if quantity <= 0:

        return jsonify({
            "success": False,
            "error": "Quantity must be greater than 0"
        }), 400

    if buying_price < 0:

        return jsonify({
            "success": False,
            "error": "Buying price cannot be negative"
        }), 400

    if not purchase_date:

        return jsonify({
            "success": False,
            "error": "Purchase date is required"
        }), 400

    total_cost = quantity * buying_price

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                name,
                quantity
            FROM products
            WHERE id = %s
            FOR UPDATE
        """, (int(product_id),))

        product = cursor.fetchone()

        if not product:

            connection.rollback()

            return jsonify({
                "success": False,
                "error": "Product not found"
            }), 404

        cursor.execute("""
            INSERT INTO purchases (

                product_id,
                quantity,
                buying_price,
                total_cost,
                supplier,
                purchase_date,
                notes

            )

            VALUES (

                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s

            )
        """, (

            int(product_id),

            quantity,

            buying_price,

            total_cost,

            supplier,

            purchase_date,

            notes
        ))

        purchase_id = cursor.lastrowid

        cursor.execute("""
            UPDATE products

            SET quantity = quantity + %s

            WHERE id = %s
        """, (

            quantity,

            int(product_id)
        ))

        connection.commit()

        return jsonify({

            "success": True,

            "message":
                "Purchase added successfully",

            "purchase_id":
                purchase_id,

            "quantity_added":
                quantity,

            "total_cost":
                total_cost,

            "new_stock":
                int(product["quantity"]) + quantity

        }), 201

    except Error as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        connection.close()


# ============================================================
# SALES - GET ALL
# ============================================================

@app.route("/api/sales", methods=["GET"])
def get_sales():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        # Get all sales
        cursor.execute("""
            SELECT
                s.id,
                s.product_id,
                p.name AS product_name,
                s.quantity,
                p.selling_price,
                s.total_amount,
                s.sale_date
            FROM sales s
            INNER JOIN products p
                ON s.product_id = p.id
            ORDER BY s.id DESC
        """)

        sales = cursor.fetchall()

        # Get total profit
        cursor.execute("""
            SELECT
                COALESCE(
                    SUM(
                        (
                            p.selling_price
                            -
                            p.buying_price
                        ) * s.quantity
                    ),
                    0
                ) AS total_profit
            FROM sales s
            INNER JOIN products p
                ON s.product_id = p.id
        """)

        profit_result = cursor.fetchone()

        total_profit = profit_result["total_profit"] or 0

        return jsonify({
            "success": True,
            "sales": sales,
            "total_profit": total_profit
        }), 200

    except Error as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        connection.close()

# ============================================================
# SALES - ADD SALE
# ============================================================

@app.route("/api/sales", methods=["POST"])
def add_sale():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "No sale data received"
        }), 400

    product_id = data.get("product_id")
    quantity = data.get("quantity")
    sale_date = data.get("sale_date")
    customer_name = data.get("customer_name", "")
    notes = data.get("notes", "")

    if not product_id:
        return jsonify({
            "success": False,
            "error": "Product is required"
        }), 400

    # --------------------------------------------------------
    # VALIDATE QUANTITY
    # --------------------------------------------------------

    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "error": "Quantity must be a valid number"
        }), 400

    if quantity <= 0:
        return jsonify({
            "success": False,
            "error": "Quantity must be greater than 0"
        }), 400

    # --------------------------------------------------------
    # SALE DATE
    # --------------------------------------------------------

    if not sale_date:
        return jsonify({
            "success": False,
            "error": "Sale date is required"
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        # ----------------------------------------------------
        # GET PRODUCT
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                id,
                name,
                quantity,
                buying_price,
                selling_price
            FROM products
            WHERE id = %s
            FOR UPDATE
        """, (
            int(product_id),
        ))

        product = cursor.fetchone()

        if not product:

            connection.rollback()

            return jsonify({
                "success": False,
                "error": "Product not found"
            }), 404

        # ----------------------------------------------------
        # CHECK STOCK
        # ----------------------------------------------------

        current_stock = int(
            product["quantity"] or 0
        )

        if quantity > current_stock:

            connection.rollback()

            return jsonify({
                "success": False,
                "error":
                    f"Insufficient stock. "
                    f"Available stock: {current_stock}"
            }), 400

        # ----------------------------------------------------
        # GET SELLING PRICE FROM PRODUCTS TABLE
        # ----------------------------------------------------

        selling_price = float(
            product["selling_price"] or 0
        )

        buying_price = float(
            product["buying_price"] or 0
        )

        # ----------------------------------------------------
        # CALCULATE TOTAL
        # ----------------------------------------------------

        total_amount = (
            quantity * selling_price
        )

        profit = (
            quantity *
            (selling_price - buying_price)
        )

        # ----------------------------------------------------
        # SAVE SALE
        # ----------------------------------------------------

        cursor.execute("""
            INSERT INTO sales (
                product_id,
                quantity,
                selling_price,
                total_amount,
                customer_name,
                sale_date,
                notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            int(product_id),
            quantity,
            selling_price,
            total_amount,
            customer_name,
            sale_date,
            notes
        ))

        sale_id = cursor.lastrowid

        # ----------------------------------------------------
        # REDUCE PRODUCT STOCK
        # ----------------------------------------------------

        cursor.execute("""
            UPDATE products
            SET quantity = quantity - %s
            WHERE id = %s
        """, (
            quantity,
            int(product_id)
        ))

        # ----------------------------------------------------
        # COMMIT
        # ----------------------------------------------------

        connection.commit()

        remaining_stock = (
            current_stock - quantity
        )

        return jsonify({

            "success": True,

            "message":
                "Sale added successfully",

            "sale_id":
                sale_id,

            "product_id":
                int(product_id),

            "product_name":
                product["name"],

            "quantity":
                quantity,

            "selling_price":
                selling_price,

            "total_amount":
                total_amount,

            "profit":
                profit,

            "remaining_stock":
                remaining_stock,

            "sale_date":
                sale_date

        }), 201

    except Error as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    except Exception as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        connection.close()


# ============================================================
# REPORTS - SUMMARY
# ============================================================

@app.route("/api/reports/summary", methods=["GET"])
def reports_summary():

    today = datetime.now().date()
    start_date_text = request.args.get(
        "start_date",
        today.replace(day=1).isoformat()
    )
    end_date_text = request.args.get("end_date", today.isoformat())

    try:
        start_date = datetime.strptime(start_date_text, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_text, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({
            "success": False,
            "error": "Dates must use YYYY-MM-DD format"
        }), 400

    if start_date > end_date:
        return jsonify({
            "success": False,
            "error": "Start date must be on or before end date"
        }), 400

    date_range = (start_date, end_date)
    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COUNT(*) AS transaction_count,
                COALESCE(SUM(quantity), 0) AS items_sold,
                COALESCE(SUM(total_amount), 0) AS revenue
            FROM sales
            WHERE sale_date BETWEEN %s AND %s
        """, date_range)
        sales = cursor.fetchone()

        cursor.execute("""
            SELECT
                COUNT(*) AS transaction_count,
                COALESCE(SUM(quantity), 0) AS units_purchased,
                COALESCE(SUM(total_cost), 0) AS spend
            FROM purchases
            WHERE purchase_date BETWEEN %s AND %s
        """, date_range)
        purchases = cursor.fetchone()

        cursor.execute("""
            SELECT
                COUNT(*) AS transaction_count,
                COALESCE(SUM(amount), 0) AS spend
            FROM expenses
            WHERE DATE(expense_date) BETWEEN %s AND %s
        """, date_range)
        expenses = cursor.fetchone()

        cursor.execute("""
            SELECT
                COUNT(*) AS transaction_count,
                COALESCE(SUM(quantity), 0) AS items_gifted
            FROM gifts
            WHERE gift_date BETWEEN %s AND %s
        """, date_range)
        gifts = cursor.fetchone()

        cursor.execute("""
            SELECT
                COALESCE(NULLIF(category, ''), 'Other') AS category,
                COUNT(*) AS transaction_count,
                COALESCE(SUM(amount), 0) AS total
            FROM expenses
            WHERE DATE(expense_date) BETWEEN %s AND %s
            GROUP BY COALESCE(NULLIF(category, ''), 'Other')
            ORDER BY total DESC, category
        """, date_range)
        expense_categories = cursor.fetchall()

        sales_revenue = float(sales["revenue"] or 0)
        purchase_spend = float(purchases["spend"] or 0)
        operating_expenses = float(expenses["spend"] or 0)

        return jsonify({
            "success": True,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "sales": {
                "transaction_count": int(sales["transaction_count"] or 0),
                "items_sold": int(sales["items_sold"] or 0),
                "revenue": sales_revenue,
            },
            "purchases": {
                "transaction_count": int(purchases["transaction_count"] or 0),
                "units_purchased": int(purchases["units_purchased"] or 0),
                "spend": purchase_spend,
            },
            "expenses": {
                "transaction_count": int(expenses["transaction_count"] or 0),
                "spend": operating_expenses,
            },
            "gifts": {
                "transaction_count": int(gifts["transaction_count"] or 0),
                "items_gifted": int(gifts["items_gifted"] or 0),
            },
            "expense_categories": [
                {
                    "category": row["category"],
                    "transaction_count": int(row["transaction_count"] or 0),
                    "total": float(row["total"] or 0),
                }
                for row in expense_categories
            ],
            "net_cash_movement": (
                sales_revenue - purchase_spend - operating_expenses
            ),
        }), 200

    except Error as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# ============================================================
# SALES - SUMMARY
# ============================================================

@app.route("/api/sales/summary", methods=["GET"])
def sales_summary():

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "success": False,
            "error":
                "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        # Total sales
        cursor.execute("""
            SELECT
                COALESCE(
                    SUM(total_amount),
                    0
                ) AS total_sales,

                COALESCE(
                    SUM(quantity),
                    0
                ) AS total_items,

                COUNT(*) AS number_of_sales

            FROM sales
        """)

        sales_data = cursor.fetchone()

        # Total profit
        cursor.execute("""
            SELECT

                COALESCE(
                    SUM(
                        (
                            p.selling_price
                            -
                            p.buying_price
                        ) * s.quantity
                    ),
                    0
                ) AS total_profit

            FROM sales s

            INNER JOIN products p
                ON s.product_id = p.id
        """)

        profit_data = cursor.fetchone()

        return jsonify({

            "success": True,

            "total_sales":
                float(
                    sales_data["total_sales"] or 0
                ),

            "total_items":
                int(
                    sales_data["total_items"] or 0
                ),

            "number_of_sales":
                int(
                    sales_data["number_of_sales"] or 0
                ),

            "total_profit":
                float(
                    profit_data["total_profit"] or 0
                )

        }), 200

    except Error as e:

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        connection.close()


# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == "__main__":

    initialize_database()

    print("")
    print("==============================================")
    print(" BUSINESS MANAGEMENT SYSTEM API")
    print("==============================================")
    print("Server:    http://127.0.0.1:5000")
    print("Products:  /api/products")
    print("Purchases: /api/purchases")
    print("Sales:     /api/sales")
    print("Summary:   /api/sales/summary")
    print("==============================================")
    print("")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true"
    )
