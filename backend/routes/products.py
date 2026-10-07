from flask import Blueprint, request, jsonify
from database import get_db_connection

products_bp = Blueprint("products", __name__)


# GET ALL PRODUCTS
@products_bp.route("/api/products", methods=["GET"])
def get_products():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT * FROM products ORDER BY id DESC")
    products = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(products)


# ADD PRODUCT
@products_bp.route("/api/products", methods=["POST"])
def add_product():
    data = request.get_json()

    name = data.get("name")
    category = data.get("category")
    buying_price = data.get("buying_price")
    selling_price = data.get("selling_price")
    stock_quantity = data.get("stock_quantity", 0)
    minimum_stock = data.get("minimum_stock", 5)
    description = data.get("description")

    if not name or buying_price is None or selling_price is None:
        return jsonify({
            "error": "Name, buying price and selling price are required"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    sql = """
        INSERT INTO products
        (name, category, buying_price, selling_price,
         stock_quantity, minimum_stock, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    values = (
        name,
        category,
        buying_price,
        selling_price,
        stock_quantity,
        minimum_stock,
        description
    )

    cursor.execute(sql, values)
    connection.commit()

    product_id = cursor.lastrowid

    cursor.close()
    connection.close()

    return jsonify({
        "message": "Product added successfully",
        "product_id": product_id
    }), 201


# DELETE PRODUCT
@products_bp.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM products WHERE id = %s",
        (product_id,)
    )

    connection.commit()

    deleted = cursor.rowcount

    cursor.close()
    connection.close()

    if deleted == 0:
        return jsonify({
            "error": "Product not found"
        }), 404

    return jsonify({
        "message": "Product deleted successfully"
    })
