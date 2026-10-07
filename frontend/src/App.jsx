import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api"
).replace(/\/$/, "");

const formatMoney = (value) =>
  `TZS ${Number(value || 0).toLocaleString("en-TZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const CATEGORIES = [
  "Food",
  "Drinks",
  "Electronics",
  "Stationery",
  "Cosmetics",
  "Clothing",
  "Household",
  "Health & Beauty",
  "Other",
];

const UNITS = [
  "Piece",
  "Kg",
  "Gram",
  "Liter",
  "Bottle",
  "Box",
  "Pack",
  "Dozen",
];

const SUPPLIERS = [
  "Local Supplier",
  "Wholesale Supplier",
  "Manufacturer",
  "Other",
];

const emptyForm = {
  product_code: "",
  name: "",
  category: "",
  unit: "Piece",
  quantity: "",
  minimum_stock: 5,
  supplier: "",
  buying_price: "",
  selling_price: "",
  description: "",
};

function useAutoSavedDraft(storageKey, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const savedValue = window.localStorage.getItem(storageKey);

      if (!savedValue) {
        return initialValue;
      }

      const parsedValue = JSON.parse(savedValue);

      return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
        ? { ...initialValue, ...parsedValue }
        : initialValue;
    } catch {
      return initialValue;
    }
  });
  const [status, setStatus] = useState("Saving draft on this device...");

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
      setStatus("Draft saved on this device");
    } catch {
      setStatus("Draft could not be saved on this device");
    }
  }, [storageKey, value]);

  return [value, setValue, status];
}

/* =====================================================
   LOGIN
===================================================== */

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (username === "admin" && password === "admin123") {
      setError("");
      onLogin();
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🏪</div>

        <h1>Business Manager</h1>

        <p>Sign in to manage your business</p>

        <form onSubmit={handleLogin}>
          <label>Username</label>

          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error-message">❌ {error}</div>}

          <button type="submit" className="primary-button login-button">
            Login
          </button>
        </form>

        <div className="demo-login">
          Demo: <strong>admin</strong> / <strong>admin123</strong>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MODULE PAGE
===================================================== */

function ModulePage({ title, icon, description, children }) {
  return (
    <div className="dashboard-content">
      <div className="page-header">
        <div className="module-title">
          <div className="module-title-icon">{icon}</div>

          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

/* =====================================================
   DASHBOARD
===================================================== */

function Dashboard({ products }) {
  const totalProducts = products.length;

  const totalStock = products.reduce(
    (sum, product) => sum + Number(product.quantity || 0),
    0
  );

  const stockValue = products.reduce(
    (sum, product) =>
      sum +
      Number(product.quantity || 0) *
        Number(product.buying_price || 0),
    0
  );

  const potentialProfit = products.reduce(
    (sum, product) =>
      sum +
      (Number(product.selling_price || 0) -
        Number(product.buying_price || 0)) *
        Number(product.quantity || 0),
    0
  );

  const lowStock = products.filter(
    (product) =>
      Number(product.quantity || 0) <=
      Number(product.minimum_stock || 5)
  ).length;

  return (
    <div className="dashboard-content">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your business</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>

          <div>
            <span>Total Products</span>
            <strong>{totalProducts}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>

          <div>
            <span>Total Stock</span>
            <strong>{totalStock}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💵</div>

          <div>
            <span>Stock Value</span>
            <strong>TZS {stockValue.toLocaleString()}</strong>
          </div>
        </div>

        <div className="stat-card warning-card">
          <div className="stat-icon">⚠️</div>

          <div>
            <span>Low Stock</span>
            <strong>{lowStock}</strong>
          </div>
        </div>
      </div>

      <div className="welcome-card">
        <h2>Welcome to Business Management System</h2>

        <p>
          Manage products, purchases, sales, gifts, expenses,
          reports and notifications from one system.
        </p>
      </div>

      <div className="module-card">
        <h3>Potential Profit</h3>

        <p>
          Estimated profit from current stock:
        </p>

        <h2>TZS {potentialProfit.toLocaleString()}</h2>
      </div>
    </div>
  );
}

/* =====================================================
   PRODUCTS
===================================================== */

function Products({ products, setProducts }) {
  const [formData, setFormData, draftStatus] = useAutoSavedDraft(
    "business-management:product-draft:v1",
    emptyForm
  );
  const [editingProduct, setEditingProduct] = useAutoSavedDraft(
    "business-management:product-edit:v1",
    null
  );
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [defaultMinimumStock, setDefaultMinimumStock] = useState(5);

  useEffect(() => {
    const loadDefaultMinimumStock = async () => {
      try {
        const response = await fetch(`${API_URL}/settings`);
        const settings = await response.json();

        if (!response.ok) {
          throw new Error(settings.error || "Failed to load system settings");
        }

        const threshold = Number(settings.default_minimum_stock);

        if (!Number.isInteger(threshold) || threshold < 0) {
          return;
        }

        setDefaultMinimumStock(threshold);
        setFormData((previous) => {
          const hasProductDraft = Boolean(
            previous.product_code ||
            previous.name ||
            previous.category ||
            previous.quantity !== "" ||
            previous.supplier ||
            previous.buying_price !== "" ||
            previous.selling_price !== "" ||
            previous.description
          );

          if (editingProduct || hasProductDraft) {
            return previous;
          }

          return { ...previous, minimum_stock: threshold };
        });
      } catch (settingsError) {
        console.error("Error loading system settings:", settingsError);
      }
    };

    loadDefaultMinimumStock();
  }, []);

  const loadProducts = async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/products`);

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = await response.json();

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        "Cannot connect to backend. Make sure Flask server is running."
      );
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({ ...emptyForm, minimum_stock: defaultMinimumStock });
    setEditingProduct(null);
    setMessage("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const url = editingProduct
        ? `${API_URL}/products/${editingProduct.id}`
        : `${API_URL}/products`;

      const method = editingProduct ? "PUT" : "POST";

      const productData = {
        product_code: formData.product_code || null,
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit,
        quantity: Number(formData.quantity || 0),
        minimum_stock: Number(formData.minimum_stock || defaultMinimumStock),
        supplier: formData.supplier,
        buying_price: Number(formData.buying_price || 0),
        selling_price: Number(formData.selling_price || 0),
        description: formData.description,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save product");
      }

      setMessage(
        editingProduct
          ? "Product updated successfully!"
          : "Product added successfully!"
      );

      resetForm();

      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);

    setFormData({
      product_code: product.product_code || "",
      name: product.name || "",
      category: product.category || "",
      unit: product.unit || "Piece",
      quantity: product.quantity ?? "",
      minimum_stock: product.minimum_stock ?? 5,
      supplier: product.supplier || "",
      buying_price: product.buying_price ?? "",
      selling_price: product.selling_price ?? "",
      description: product.description || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Delete failed");
      }

      setMessage("Product deleted successfully!");

      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProducts = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return products.filter((product) => {
      const text = `
        ${product.name || ""}
        ${product.category || ""}
        ${product.product_code || ""}
        ${product.supplier || ""}
      `.toLowerCase();

      return text.includes(searchText);
    });
  }, [products, search]);

  const profitPerUnit =
    Number(formData.selling_price || 0) -
    Number(formData.buying_price || 0);

  const potentialProfit =
    profitPerUnit * Number(formData.quantity || 0);

  const getStockStatus = (product) => {
    const quantity = Number(product.quantity || 0);
    const minimum = Number(product.minimum_stock || 5);

    if (quantity === 0) {
      return <span className="stock-badge out">Out of Stock</span>;
    }

    if (quantity <= minimum) {
      return <span className="stock-badge low">Low Stock</span>;
    }

    return <span className="stock-badge good">In Stock</span>;
  };

  return (
    <div className="dashboard-content">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Add and manage your business products</p>
        </div>
      </div>

      {message && <div className="success-message">✅ {message}</div>}

      {error && <div className="error-message">❌ {error}</div>}

      <div className="form-card">
        <div className="form-title">
          <div>
            <h2>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h2>

            <p>Enter product information below</p>
            <p className="draft-status" role="status">{draftStatus}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Product Code</label>

              <input
                type="text"
                name="product_code"
                placeholder="e.g. PRD-001"
                value={formData.product_code}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                Product Name <span>*</span>
              </label>

              <input
                type="text"
                name="name"
                placeholder="e.g. Coca Cola"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>

              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">Select Category</option>

                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Unit</label>

              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity</label>

              <input
                type="number"
                min="0"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Minimum Stock</label>

              <input
                type="number"
                min="0"
                name="minimum_stock"
                value={formData.minimum_stock}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Buying Price (TZS)</label>

              <input
                type="number"
                min="0"
                step="0.01"
                name="buying_price"
                value={formData.buying_price}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Selling Price (TZS)</label>

              <input
                type="number"
                min="0"
                step="0.01"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Supplier</label>

              <select
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
              >
                <option value="">Select Supplier</option>

                {SUPPLIERS.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Description</label>

            <textarea
              name="description"
              rows="4"
              placeholder="Enter product description..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="profit-preview">
            <div>
              <span>Profit per Unit</span>

              <strong>
                TZS {profitPerUnit.toLocaleString()}
              </strong>
            </div>

            <div>
              <span>Potential Profit</span>

              <strong>
                TZS {potentialProfit.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="form-actions">
            {editingProduct && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : editingProduct
                ? "Update Product"
                : "Save Product"}
            </button>
          </div>
        </form>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Product Inventory</h2>

            <p>{filteredProducts.length} products found</p>
          </div>

          <input
            className="search-input"
            type="text"
            placeholder="🔍 Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div>📦</div>

            <h3>No products found</h3>

            <p>Add your first product using the form above.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Buying</th>
                  <th>Selling</th>
                  <th>Profit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const profit =
                    Number(product.selling_price || 0) -
                    Number(product.buying_price || 0);

                  return (
                    <tr key={product.id}>
                      <td>{product.product_code || "-"}</td>

                      <td>
                        <strong>{product.name}</strong>
                      </td>

                      <td>{product.category || "-"}</td>

                      <td>{product.unit || "Piece"}</td>

                      <td>
                        <strong>{product.quantity}</strong>
                      </td>

                      <td>
                        TZS{" "}
                        {Number(
                          product.buying_price || 0
                        ).toLocaleString()}
                      </td>

                      <td>
                        TZS{" "}
                        {Number(
                          product.selling_price || 0
                        ).toLocaleString()}
                      </td>

                      <td className="profit-text">
                        TZS {profit.toLocaleString()}
                      </td>

                      <td>{getStockStatus(product)}</td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() => handleEdit(product)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-button"
                            onClick={() =>
                              handleDelete(product.id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   PURCHASES
===================================================== */

function Purchases({ products, onPurchaseAdded }) {
  const [form, setForm, draftStatus] = useAutoSavedDraft(
    "business-management:purchase-draft:v1",
    {
      product_id: "",
      quantity: 1,
      buying_price: "",
      supplier: "",
      purchase_date: new Date().toISOString().split("T")[0],
      notes: "",
    }
  );

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPurchases = async () => {
    try {
      const response = await fetch(`${API_URL}/purchases`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load purchases");
      }

      setPurchases(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const selectedProduct = products.find(
    (product) => product.id === Number(form.product_id)
  );

  const totalCost =
    Number(form.quantity || 0) * Number(form.buying_price || 0);

  const handleProductChange = (e) => {
    const productId = e.target.value;

    const product = products.find(
      (item) => item.id === Number(productId)
    );

    setForm({
      ...form,
      product_id: productId,
      buying_price: product ? product.buying_price : "",
      supplier: product?.supplier || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.product_id) {
      setError("Please select a product.");
      return;
    }

    if (Number(form.quantity) <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    if (Number(form.buying_price) < 0) {
      setError("Buying price cannot be negative.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: Number(form.product_id),
          quantity: Number(form.quantity),
          buying_price: Number(form.buying_price),
          supplier: form.supplier,
          purchase_date: form.purchase_date,
          notes: form.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add purchase");
      }

      setMessage(
        `Purchase saved successfully. Total cost: ${formatMoney(
          data.total_cost
        )}`
      );

      setForm({
        product_id: "",
        quantity: 1,
        buying_price: "",
        supplier: "",
        purchase_date: new Date().toISOString().split("T")[0],
        notes: "",
      });

      await loadPurchases();

      if (onPurchaseAdded) {
        await onPurchaseAdded();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-content">
      <div className="page-header">
        <div>
          <h1>Purchases</h1>
          <p>Record purchases and automatically increase product stock.</p>
        </div>
      </div>

      <div className="form-card">
        <h2 className="form-title">Add New Purchase</h2>
        <p className="draft-status" role="status">{draftStatus}</p>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Product *</label>

              <select
                value={form.product_id}
                onChange={handleProductChange}
                required
              >
                <option value="">Select Product</option>

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}{" "}
                    {product.product_code
                      ? `(${product.product_code})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity *</label>

              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Buying Price *</label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.buying_price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    buying_price: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Supplier</label>

              <input
                type="text"
                value={form.supplier}
                onChange={(e) =>
                  setForm({
                    ...form,
                    supplier: e.target.value,
                  })
                }
                placeholder="Supplier name"
              />
            </div>

            <div className="form-group">
              <label>Purchase Date *</label>

              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    purchase_date: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Total Cost</label>

              <input
                type="text"
                value={formatMoney(totalCost)}
                readOnly
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>

            <textarea
              rows="3"
              value={form.notes}
              onChange={(e) =>
                setForm({
                  ...form,
                  notes: e.target.value,
                })
              }
              placeholder="Optional notes..."
            />
          </div>

          {selectedProduct && (
            <div className="info-card">
              <strong>Current Stock:</strong>{" "}
              {selectedProduct.quantity} {selectedProduct.unit}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Purchase"}
          </button>
        </form>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h2>Purchase History</h2>
        </div>

        {purchases.length === 0 ? (
          <div className="empty-state">
            No purchases recorded yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Buying Price</th>
                  <th>Total Cost</th>
                  <th>Supplier</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>#{purchase.id}</td>

                    <td>
                      <strong>
                        {purchase.product_name}
                      </strong>

                      {purchase.product_code && (
                        <small>
                          {purchase.product_code}
                        </small>
                      )}
                    </td>

                    <td>{purchase.quantity}</td>

                    <td>
                      {formatMoney(purchase.buying_price)}
                    </td>

                    <td>
                      <strong>
                        {formatMoney(purchase.total_cost)}
                      </strong>
                    </td>

                    <td>
                      {purchase.supplier || "-"}
                    </td>

                    <td>{purchase.purchase_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   SALES
===================================================== */

function Sales({ products, onSaleAdded }) {
  const [form, setForm, draftStatus] = useAutoSavedDraft(
    "business-management:sale-draft:v1",
    {
      product_id: "",
      quantity: 1,
      selling_price: "",
      customer_name: "",
      sale_date: new Date().toISOString().split("T")[0],
      notes: "",
    }
  );

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSales, setLoadingSales] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSales = async () => {
    try {
      setLoadingSales(true);

      const response = await fetch(`${API_URL}/sales`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to load sales");
      }

      setSales(
        Array.isArray(data)
          ? data
          : Array.isArray(data.sales)
            ? data.sales
            : []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const selectedProduct = products.find(
    (product) => Number(product.id) === Number(form.product_id)
  );

  const totalAmount =
    Number(form.quantity || 0) * Number(form.selling_price || 0);

  const totalRevenue = sales.reduce(
    (total, sale) => total + Number(sale.total_amount || 0),
    0
  );

  const totalItemsSold = sales.reduce(
    (total, sale) => total + Number(sale.quantity || 0),
    0
  );

  const handleProductChange = (e) => {
    const productId = e.target.value;

    const product = products.find(
      (item) => Number(item.id) === Number(productId)
    );

    setForm({
      ...form,
      product_id: productId,
      selling_price: product ? product.selling_price : "",
    });

    setMessage("");
    setError("");
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    setMessage("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.product_id) {
      setError("Please select a product.");
      return;
    }

    if (Number(form.quantity) <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    if (Number(form.selling_price) < 0) {
      setError("Selling price cannot be negative.");
      return;
    }

    if (!form.sale_date) {
      setError("Please select sale date.");
      return;
    }

    if (
      selectedProduct &&
      Number(form.quantity) > Number(selectedProduct.quantity)
    ) {
      setError(
        `Not enough stock. Available stock is ${selectedProduct.quantity}.`
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: Number(form.product_id),
          quantity: Number(form.quantity),
          selling_price: Number(form.selling_price),
          customer_name: form.customer_name,
          sale_date: form.sale_date,
          notes: form.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to save sale.");
      }

      setMessage(
        `Sale saved successfully. Total: ${formatMoney(
          data.total_amount
        )}. Remaining stock: ${data.remaining_stock}.`
      );

      setForm({
        product_id: "",
        quantity: 1,
        selling_price: "",
        customer_name: "",
        sale_date: new Date().toISOString().split("T")[0],
        notes: "",
      });

      await loadSales();

      if (onSaleAdded) {
        await onSaleAdded();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sales-page">

      {/* SALES HEADER */}
      <div className="sales-header">
        <div>
          <h1>💰 Sales Management</h1>
          <p>Record sales, monitor revenue and view sales history.</p>
        </div>

        <div className="sales-header-icon">
          💵
        </div>
      </div>

      {/* SALES SUMMARY */}
      <div className="sales-summary">

        <div className="sales-summary-card">
          <div className="sales-summary-icon">🧾</div>
          <div>
            <span>Total Sales</span>
            <strong>{sales.length}</strong>
          </div>
        </div>

        <div className="sales-summary-card">
          <div className="sales-summary-icon">📦</div>
          <div>
            <span>Items Sold</span>
            <strong>{totalItemsSold}</strong>
          </div>
        </div>

        <div className="sales-summary-card">
          <div className="sales-summary-icon">💰</div>
          <div>
            <span>Total Revenue</span>
            <strong>{formatMoney(totalRevenue)}</strong>
          </div>
        </div>

      </div>

      {/* MESSAGES */}
      {message && (
        <div className="sales-success">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="sales-error">
          ❌ {error}
        </div>
      )}

      {/* NEW SALE FORM */}
      <div className="sales-form-card">

        <div className="sales-section-title">
          <div>
            <h2>➕ New Sale</h2>
            <p>Enter the information below to record a customer sale.</p>
            <p className="draft-status" role="status">{draftStatus}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="sales-form-grid">

            {/* PRODUCT */}
            <div className="sales-form-group">
              <label>Product *</label>

              <select
                name="product_id"
                value={form.product_id}
                onChange={handleProductChange}
                required
              >
                <option value="">-- Select Product --</option>

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — Stock: {product.quantity}
                  </option>
                ))}
              </select>
            </div>

            {/* STOCK */}
            <div className="sales-form-group">
              <label>Available Stock</label>

              <div className="sales-stock-box">
                {selectedProduct
                  ? `${selectedProduct.quantity} ${selectedProduct.unit || "units"}`
                  : "Select a product"}
              </div>
            </div>

            {/* QUANTITY */}
            <div className="sales-form-group">
              <label>Quantity *</label>

              <input
                type="number"
                name="quantity"
                min="1"
                value={form.quantity}
                onChange={handleChange}
                required
              />
            </div>

            {/* SELLING PRICE */}
            <div className="sales-form-group">
              <label>Selling Price (TZS) *</label>

              <input
                type="number"
                name="selling_price"
                min="0"
                step="0.01"
                value={form.selling_price}
                onChange={handleChange}
                required
              />
            </div>

            {/* CUSTOMER */}
            <div className="sales-form-group">
              <label>Customer Name</label>

              <input
                type="text"
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="Enter customer name"
              />
            </div>

            {/* DATE */}
            <div className="sales-form-group">
              <label>Sale Date *</label>

              <input
                type="date"
                name="sale_date"
                value={form.sale_date}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          {/* TOTAL */}
          <div className="sales-total-box">
            <span>Total Sale Amount</span>
            <strong>{formatMoney(totalAmount)}</strong>
          </div>

          {/* NOTES */}
          <div className="sales-form-group sales-notes">
            <label>Notes</label>

            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Enter additional information..."
              rows="3"
            />
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            className="sales-save-button"
            disabled={loading}
          >
            {loading ? "⏳ Saving Sale..." : "💾 Save Sale"}
          </button>

        </form>
      </div>

      {/* SALES HISTORY */}
      <div className="sales-history-card">

        <div className="sales-section-title">
          <div>
            <h2>📋 Sales History</h2>
            <p>All recorded customer sales.</p>
          </div>

          <button
            type="button"
            className="sales-refresh-button"
            onClick={loadSales}
          >
            🔄 Refresh
          </button>
        </div>

        {loadingSales ? (
          <div className="sales-empty">
            ⏳ Loading sales...
          </div>
        ) : sales.length === 0 ? (
          <div className="sales-empty">
            <div className="sales-empty-icon">🧾</div>
            <h3>No Sales Yet</h3>
            <p>When you record a sale, it will appear here.</p>
          </div>
        ) : (
          <div className="sales-table-wrapper">

            <table className="sales-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Selling Price</th>
                  <th>Total</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>

                    <td>
                      <span className="sale-id">
                        #{sale.id}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {sale.product_name || "Unknown Product"}
                      </strong>

                      {sale.product_code && (
                        <small>
                          {sale.product_code}
                        </small>
                      )}
                    </td>

                    <td>
                      <span className="quantity-badge">
                        {sale.quantity}
                      </span>
                    </td>

                    <td>
                      {formatMoney(sale.selling_price)}
                    </td>

                    <td>
                      <strong className="sale-total">
                        {formatMoney(sale.total_amount)}
                      </strong>
                    </td>

                    <td>
                      {sale.customer_name || "Walk-in Customer"}
                    </td>

                    <td>
                      {sale.sale_date}
                    </td>

                    <td>
                      {sale.notes || "-"}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}
/* =====================================================
   GIFTS
===================================================== */

function Gifts({ products, onGiftAdded }) {
  const [form, setForm, draftStatus] = useAutoSavedDraft(
    "business-management:gift-draft:v1",
    {
      product_id: "",
      quantity: 1,
      recipient_name: "",
      gift_date: new Date().toISOString().split("T")[0],
      notes: "",
    }
  );
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedProduct = products.find(
    (product) => Number(product.id) === Number(form.product_id)
  );

  const loadGifts = async () => {
    try {
      const response = await fetch(`${API_URL}/gifts`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load gift history");
      }

      setGifts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadGifts();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const quantity = Number(form.quantity);

    if (!selectedProduct) {
      setError("Select a product to give as a gift.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Quantity must be a whole number greater than zero.");
      return;
    }

    if (quantity > Number(selectedProduct.quantity)) {
      setError(`Insufficient stock. Available stock: ${selectedProduct.quantity}`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/gifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: Number(form.product_id),
          quantity,
          recipient_name: form.recipient_name,
          gift_date: form.gift_date,
          notes: form.notes,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to record gift");
      }

      setMessage(
        `Gift recorded. ${data.remaining_stock} ${selectedProduct.unit || "units"} remain in stock.`
      );
      setForm({
        product_id: "",
        quantity: 1,
        recipient_name: "",
        gift_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      await loadGifts();

      if (onGiftAdded) {
        await onGiftAdded();
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModulePage
      title="Gifts"
      icon="🎁"
      description="Record products given to customers as gifts."
    >
      <div className="form-card">
        <div className="form-title">
          <h2>Record a Gift</h2>
          <p>Gifted quantities are deducted from available stock.</p>
        </div>

        <p className="draft-status" role="status">{draftStatus}</p>
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="gift-product">Product *</label>
              <select
                id="gift-product"
                value={form.product_id}
                onChange={(event) =>
                  setForm({ ...form, product_id: event.target.value })
                }
                required
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (stock: {product.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="gift-quantity">Quantity *</label>
              <input
                id="gift-quantity"
                type="number"
                min="1"
                step="1"
                max={selectedProduct?.quantity}
                value={form.quantity}
                onChange={(event) =>
                  setForm({ ...form, quantity: event.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="gift-recipient">Recipient</label>
              <input
                id="gift-recipient"
                type="text"
                maxLength="150"
                value={form.recipient_name}
                onChange={(event) =>
                  setForm({ ...form, recipient_name: event.target.value })
                }
                placeholder="Customer or recipient name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="gift-date">Gift Date *</label>
              <input
                id="gift-date"
                type="date"
                value={form.gift_date}
                onChange={(event) =>
                  setForm({ ...form, gift_date: event.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="gift-notes">Notes</label>
            <textarea
              id="gift-notes"
              rows="3"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              placeholder="Optional reason or details"
            />
          </div>

          {selectedProduct && (
            <div className="info-card">
              <strong>Available stock:</strong> {selectedProduct.quantity} {selectedProduct.unit || "units"}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading || products.length === 0}
          >
            {loading ? "Saving..." : "Record Gift"}
          </button>
        </form>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h2>Gift History</h2>
        </div>

        {gifts.length === 0 ? (
          <div className="empty-state">No gifts recorded yet.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Recipient</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {gifts.map((gift) => (
                  <tr key={gift.id}>
                    <td>#{gift.id}</td>
                    <td>
                      <strong>{gift.product_name}</strong>
                      {gift.product_code && <small>{gift.product_code}</small>}
                    </td>
                    <td>{gift.quantity}</td>
                    <td>{gift.recipient_name || "-"}</td>
                    <td>{String(gift.gift_date).slice(0, 10)}</td>
                    <td>{gift.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModulePage>
  );
}

/* =====================================================
   EXPENSES
===================================================== */

function Expenses() {
  const [form, setForm, draftStatus] = useAutoSavedDraft(
    "business-management:expense-draft:v1",
    {
      description: "",
      category: "",
      amount: "",
      expense_date: new Date().toISOString().split("T")[0],
    }
  );
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  const loadExpenses = async () => {
    try {
      const response = await fetch(`${API_URL}/expenses`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load expenses");
      }

      setExpenses(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.description.trim()) {
      setError("Enter a description for this expense.");
      return;
    }

    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          category: form.category,
          amount: Number(form.amount),
          expense_date: form.expense_date,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to record expense");
      }

      setMessage("Expense recorded successfully.");
      setForm({
        description: "",
        category: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
      });
      await loadExpenses();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModulePage
      title="Expenses"
      icon="💸"
      description="Track all business expenses."
    >
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💸</div>
          <div>
            <span>Total Expenses</span>
            <strong>{formatMoney(totalExpenses)}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧾</div>
          <div>
            <span>Expense Records</span>
            <strong>{expenses.length}</strong>
          </div>
        </div>
      </div>

      <div className="form-card">
        <div className="form-title">
          <h2>Record an Expense</h2>
          <p>Enter the expense details to add it to your business records.</p>
        </div>

        <p className="draft-status" role="status">{draftStatus}</p>
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="expense-description">Description *</label>
              <input
                id="expense-description"
                type="text"
                maxLength="255"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="e.g. Shop electricity bill"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="expense-category">Category</label>
              <select
                id="expense-category"
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                <option value="">Select category</option>
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Transport">Transport</option>
                <option value="Salaries">Salaries</option>
                <option value="Supplies">Supplies</option>
                <option value="Maintenance">Maintenance</option>
                <option value="License">License</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="expense-amount">Amount (TZS) *</label>
              <input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="expense-date">Expense Date *</label>
              <input
                id="expense-date"
                type="date"
                value={form.expense_date}
                onChange={(event) =>
                  setForm({ ...form, expense_date: event.target.value })
                }
                required
              />
            </div>
          </div>

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Saving..." : "Save Expense"}
          </button>
        </form>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h2>Expense History</h2>
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state">No expenses recorded yet.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>#{expense.id}</td>
                    <td><strong>{expense.description}</strong></td>
                    <td>{expense.category || "Other"}</td>
                    <td><strong>{formatMoney(expense.amount)}</strong></td>
                    <td>{String(expense.expense_date).slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModulePage>
  );
}

/* =====================================================
   REPORTS
===================================================== */

function Reports() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = async (fromDate = startDate, toDate = endDate) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        start_date: fromDate,
        end_date: toDate,
      });
      const response = await fetch(
        `${API_URL}/reports/summary?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load report");
      }

      setReport(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (startDate > endDate) {
      setError("Start date must be on or before end date.");
      return;
    }

    loadReport(startDate, endDate);
  };

  return (
    <ModulePage
      title="Reports"
      icon="📊"
      description="Review sales, purchasing, expenses, and gifts for a selected period."
    >
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="report-start-date">Start date</label>
            <input
              id="report-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="report-end-date">End date</label>
            <input
              id="report-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? "Loading..." : "Apply date range"}
        </button>
      </form>

      {loading && !report && <div className="empty-state">Loading report...</div>}

      {report && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div>
                <span>Sales revenue</span>
                <strong>{formatMoney(report.sales.revenue)}</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div>
                <span>Purchase spend</span>
                <strong>{formatMoney(report.purchases.spend)}</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💸</div>
              <div>
                <span>Operating expenses</span>
                <strong>{formatMoney(report.expenses.spend)}</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🧮</div>
              <div>
                <span>Net cash movement</span>
                <strong>{formatMoney(report.net_cash_movement)}</strong>
              </div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <h2>Activity summary</h2>
              <span>{report.start_date} to {report.end_date}</span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Records</th>
                    <th>Units</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Sales</td>
                    <td>{report.sales.transaction_count}</td>
                    <td>{report.sales.items_sold}</td>
                    <td>{formatMoney(report.sales.revenue)}</td>
                  </tr>
                  <tr>
                    <td>Purchases</td>
                    <td>{report.purchases.transaction_count}</td>
                    <td>{report.purchases.units_purchased}</td>
                    <td>{formatMoney(report.purchases.spend)}</td>
                  </tr>
                  <tr>
                    <td>Expenses</td>
                    <td>{report.expenses.transaction_count}</td>
                    <td>-</td>
                    <td>{formatMoney(report.expenses.spend)}</td>
                  </tr>
                  <tr>
                    <td>Gifts</td>
                    <td>{report.gifts.transaction_count}</td>
                    <td>{report.gifts.items_gifted}</td>
                    <td>-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <h2>Expenses by category</h2>
            </div>
            {report.expense_categories.length === 0 ? (
              <div className="empty-state">No expenses in this date range.</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Records</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expense_categories.map((category) => (
                      <tr key={category.category}>
                        <td>{category.category}</td>
                        <td>{category.transaction_count}</td>
                        <td>{formatMoney(category.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </ModulePage>
  );
}

/* =====================================================
   NOTIFICATIONS
===================================================== */

function Notifications({ products, loading, error, onRefresh }) {
  const stockAlerts = products
    .map((product) => ({
      ...product,
      currentStock: Number(product.quantity || 0),
      minimumStock: Number(product.minimum_stock ?? 5),
    }))
    .filter((product) => product.currentStock <= product.minimumStock)
    .sort((first, second) => first.currentStock - second.currentStock);

  return (
    <ModulePage
      title="Notifications"
      icon="🔔"
      description="Current stock alerts based on your product reorder limits."
    >
      <div className="notification-toolbar">
        <span>
          {stockAlerts.length} stock {stockAlerts.length === 1 ? "alert" : "alerts"}
        </span>
        <button
          type="button"
          className="secondary-button"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh stock"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && products.length === 0 && !error ? (
        <div className="empty-state">Loading stock alerts...</div>
      ) : stockAlerts.length === 0 && products.length === 0 && !error ? (
        <div className="module-card">
          <h3>No products to monitor</h3>
          <p>Add products to receive stock alerts.</p>
        </div>
      ) : stockAlerts.length === 0 && !error ? (
        <div className="module-card">
          <h3>Stock levels are healthy</h3>
          <p>All products are above their minimum stock levels.</p>
        </div>
      ) : (
        <div className="notification-list">
          {stockAlerts.map((product) => {
            const isOutOfStock = product.currentStock <= 0;

            return (
            <div
              className={`notification-item ${isOutOfStock ? "critical" : "warning"}`}
              key={product.id}
            >
              <span aria-hidden="true">{isOutOfStock ? "⛔" : "⚠️"}</span>

              <div>
                <strong>
                  {isOutOfStock ? "Out of stock" : "Low stock"}: {product.name}
                </strong>
                <p>
                  Current: {product.currentStock} {product.unit || "Piece"}
                  {" · "}Minimum: {product.minimumStock}
                </p>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </ModulePage>
  );
}

/* =====================================================
   SETTINGS
===================================================== */

function Settings() {
  const [settings, setSettings] = useState({
    business_name: "Business Management System",
    business_phone: "",
    business_email: "",
    business_address: "",
    default_minimum_stock: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load settings");
      }

      setSettings((previous) => ({ ...previous, ...data }));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (event) => {
    setSettings((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          default_minimum_stock: Number(settings.default_minimum_stock),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSettings(data.settings);
      setMessage("Settings saved successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModulePage
      title="Settings"
      icon="⚙️"
      description="Manage business contact details and inventory defaults."
    >
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <div className="form-title">
            <h2>Business information</h2>
            <p>These details are stored with your business settings.</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="business-name">Business name *</label>
              <input
                id="business-name"
                name="business_name"
                type="text"
                maxLength="150"
                value={settings.business_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="business-phone">Phone</label>
              <input
                id="business-phone"
                name="business_phone"
                type="tel"
                maxLength="40"
                value={settings.business_phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="business-email">Email</label>
              <input
                id="business-email"
                name="business_email"
                type="email"
                maxLength="254"
                value={settings.business_email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="business-address">Address</label>
              <textarea
                id="business-address"
                name="business_address"
                rows="3"
                maxLength="255"
                value={settings.business_address}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="form-title">
            <h2>System settings</h2>
            <p>Used as the default when adding a new product.</p>
          </div>

          <div className="form-group">
            <label htmlFor="default-minimum-stock">Default minimum stock</label>
            <input
              id="default-minimum-stock"
              name="default_minimum_stock"
              type="number"
              min="0"
              max="100000"
              step="1"
              value={settings.default_minimum_stock}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <button type="submit" className="primary-button" disabled={loading || saving}>
          {loading ? "Loading settings..." : saving ? "Saving..." : "Save settings"}
        </button>
      </form>
    </ModulePage>
  );
}

/* =====================================================
   MAIN APP
===================================================== */

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [products, setProducts] = useState([]);
  const [appLoading, setAppLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  const menuItems = [
    { name: "Dashboard", icon: "🏠" },
    { name: "Products", icon: "📦" },
    { name: "Purchases", icon: "🛒" },
    { name: "Sales", icon: "💰" },
    { name: "Gifts", icon: "🎁" },
    { name: "Expenses", icon: "💸" },
    { name: "Reports", icon: "📊" },
    { name: "Notifications", icon: "🔔" },
    { name: "Settings", icon: "⚙️" },
  ];

  // Load products once at App level so Dashboard, Purchases,
  // Reports and Notifications always use the latest database data.
  const loadProducts = async () => {
    try {
      setAppLoading(true);
      setProductsError("");

      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load products");
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading products:", error);
      setProductsError(error.message || "Failed to load current stock");
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      loadProducts();
    }
  }, [loggedIn]);

  const handleLogin = () => {
    setLoggedIn(true);
    setActivePage("Dashboard");
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setActivePage("Dashboard");
    setProducts([]);
    setProductsError("");
  };

  const handleMenuClick = (page) => {
    setActivePage(page);
  };

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard products={products} />;

      case "Products":
        return (
          <Products
            products={products}
            setProducts={setProducts}
          />
        );

      case "Purchases":
        return (
          <Purchases
            products={products}
            onPurchaseAdded={loadProducts}
          />
        );

      case "Sales":
        return <Sales products={products} onSaleAdded={loadProducts} />;

      case "Gifts":
        return <Gifts products={products} onGiftAdded={loadProducts} />;

      case "Expenses":
        return <Expenses />;

      case "Reports":
        return <Reports />;

      case "Notifications":
        return (
          <Notifications
            products={products}
            loading={appLoading}
            error={productsError}
            onRefresh={loadProducts}
          />
        );

      case "Settings":
        return <Settings />;

      default:
        return <Dashboard products={products} />;
    }
  };

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🏪</div>

          <div>
            <h2>Business</h2>
            <span>Management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => handleMenuClick(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {appLoading && products.length === 0 ? (
          <div className="dashboard-content">
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <h2>Loading business data...</h2>
              <p>Please wait while products are loaded.</p>
            </div>
          </div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  );
}

export default App;