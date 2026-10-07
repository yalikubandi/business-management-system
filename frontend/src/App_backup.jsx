jsx
import { useState, useEffect } from "react";
import "./App.css";


// ======================================================
// BACKEND API URL
// ======================================================

const API_URL = "http://127.0.0.1:5000/api";


// ======================================================
// PRODUCTS COMPONENT
// ======================================================

function Products({ products, setProducts }) {

  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    stock_quantity: "",
    buying_price: "",
    selling_price: "",
    minimum_stock: 5,
    description: "",
  });


  // ====================================================
  // FORM INPUT
  // ====================================================

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

  };


  // ====================================================
  // LOAD PRODUCTS FROM DATABASE
  // ====================================================

  const loadProducts = async () => {

    try {

      setLoading(true);

      const response = await fetch(
        `${API_URL}/products`
      );

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = await response.json();

      setProducts(data);

    } catch (error) {

      console.error("Load products error:", error);

      alert(
        "Failed to load products from database."
      );

    } finally {

      setLoading(false);

    }

  };


  // ====================================================
  // ADD PRODUCT
  // ====================================================

  const addProduct = async (e) => {

    e.preventDefault();

    try {

      setLoading(true);

      const productData = {

        name: formData.name.trim(),

        category: formData.category,

        buying_price:
          Number(formData.buying_price),

        selling_price:
          Number(formData.selling_price),

        stock_quantity:
          Number(formData.stock_quantity),

        minimum_stock:
          Number(formData.minimum_stock),

        description:
          formData.description.trim(),

      };


      // Send product to Flask
      const response = await fetch(
        `${API_URL}/products`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(productData),
        }
      );


      const data = await response.json();


      if (!response.ok) {

        alert(
          data.error ||
          "Failed to save product."
        );

        return;

      }


      // Product successfully saved
      alert(
        "Product saved successfully!"
      );


      // Reload from MySQL
      await loadProducts();


      // Clear form
      setFormData({

        name: "",

        category: "",

        stock_quantity: "",

        buying_price: "",

        selling_price: "",

        minimum_stock: 5,

        description: "",

      });


      // Close form
      setShowForm(false);


    } catch (error) {

      console.error(
        "Add product error:",
        error
      );

      alert(
        "Cannot connect to backend. Make sure Flask is running."
      );

    } finally {

      setLoading(false);

    }

  };


  // ====================================================
  // DELETE PRODUCT
  // ====================================================

  const deleteProduct = async (id) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this product?"
      );


    if (!confirmDelete) {
      return;
    }


    try {

      setLoading(true);


      const response = await fetch(
        `${API_URL}/products/${id}`,
        {
          method: "DELETE",
        }
      );


      const data = await response.json();


      if (!response.ok) {

        alert(
          data.error ||
          "Failed to delete product."
        );

        return;

      }


      alert(
        "Product deleted successfully!"
      );


      // Reload products from database
      await loadProducts();


    } catch (error) {

      console.error(
        "Delete product error:",
        error
      );

      alert(
        "Cannot connect to backend."
      );

    } finally {

      setLoading(false);

    }

  };


  // ====================================================
  // SUMMARY CALCULATIONS
  // ====================================================

  const totalProducts =
    products.length;


  const totalStock =
    products.reduce(
      (total, product) =>
        total +
        Number(
          product.stock_quantity || 0
        ),
      0
    );


  const potentialProfit =
    products.reduce(
      (total, product) => {

        const buying =
          Number(
            product.buying_price || 0
          );

        const selling =
          Number(
            product.selling_price || 0
          );

        const quantity =
          Number(
            product.stock_quantity || 0
          );

        return (
          total +
          (selling - buying) *
          quantity
        );

      },
      0
    );


  // ====================================================
  // SEARCH
  // ====================================================

  const [search, setSearch] =
    useState("");


  const filteredProducts =
    products.filter((product) => {

      const name =
        String(
          product.name || ""
        ).toLowerCase();

      const category =
        String(
          product.category || ""
        ).toLowerCase();

      const searchText =
        search.toLowerCase();

      return (
        name.includes(searchText) ||
        category.includes(searchText)
      );

    });


  // ====================================================
  // PRODUCTS PAGE
  // ====================================================

  return (

    <div className="page-content">


      {/* ================================================
          PAGE HEADER
      ================================================= */}

      <div className="page-header">

        <div>

          <h1>
            Products
          </h1>

          <p>
            Manage your business products and inventory.
          </p>

        </div>


        <button
          className="primary-button"
          onClick={() =>
            setShowForm(!showForm)
          }
        >

          {showForm
            ? "Close Form"
            : "+ Add Product"}

        </button>

      </div>


      {/* ================================================
          ADD PRODUCT FORM
      ================================================= */}

      {showForm && (

        <div className="form-panel">


          <div className="form-panel-header">

            <h2>
              Add New Product
            </h2>


            <button
              className="close-button"
              onClick={() =>
                setShowForm(false)
              }
            >
              ×
            </button>

          </div>


          <form
            onSubmit={addProduct}
            className="product-form"
          >


            {/* PRODUCT NAME */}

            <div className="form-group">

              <label>
                Product Name
              </label>

              <input
                type="text"
                name="name"
                placeholder="Enter product name"
                value={formData.name}
                onChange={handleChange}
                required
              />

            </div>


            {/* CATEGORY */}

            <div className="form-group">

              <label>
                Category
              </label>

              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >

                <option value="">
                  Select category
                </option>

                <option value="Food">
                  Food
                </option>

                <option value="Drinks">
                  Drinks
                </option>

                <option value="Electronics">
                  Electronics
                </option>

                <option value="Stationery">
                  Stationery
                </option>

                <option value="Clothes">
                  Clothes
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

            </div>


            {/* STOCK QUANTITY */}

            <div className="form-group">

              <label>
                Stock Quantity
              </label>

              <input
                type="number"
                name="stock_quantity"
                placeholder="0"
                min="0"
                value={
                  formData.stock_quantity
                }
                onChange={handleChange}
                required
              />

            </div>


            {/* MINIMUM STOCK */}

            <div className="form-group">

              <label>
                Minimum Stock
              </label>

              <input
                type="number"
                name="minimum_stock"
                placeholder="5"
                min="0"
                value={
                  formData.minimum_stock
                }
                onChange={handleChange}
              />

            </div>


            {/* BUYING PRICE */}

            <div className="form-group">

              <label>
                Buying Price (TSh)
              </label>

              <input
                type="number"
                name="buying_price"
                placeholder="0"
                min="0"
                value={
                  formData.buying_price
                }
                onChange={handleChange}
                required
              />

            </div>


            {/* SELLING PRICE */}

            <div className="form-group">

              <label>
                Selling Price (TSh)
              </label>

              <input
                type="number"
                name="selling_price"
                placeholder="0"
                min="0"
                value={
                  formData.selling_price
                }
                onChange={handleChange}
                required
              />

            </div>


            {/* DESCRIPTION */}

            <div className="form-group">

              <label>
                Description
              </label>

              <textarea
                name="description"
                placeholder="Enter product description"
                value={
                  formData.description
                }
                onChange={handleChange}
              />

            </div>


            {/* FORM ACTIONS */}

            <div className="form-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                Cancel
              </button>


              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >

                {loading
                  ? "Saving..."
                  : "Save Product"}

              </button>

            </div>


          </form>

        </div>

      )}


      {/* ================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="products-summary">


        {/* TOTAL PRODUCTS */}

        <div className="small-stat">

          <span>
            📦
          </span>

          <div>

            <small>
              Total Products
            </small>

            <strong>
              {totalProducts}
            </strong>

          </div>

        </div>


        {/* TOTAL STOCK */}

        <div className="small-stat">

          <span>
            📊
          </span>

          <div>

            <small>
              Total Stock
            </small>

            <strong>
              {totalStock}
            </strong>

          </div>

        </div>


        {/* POTENTIAL PROFIT */}

        <div className="small-stat">

          <span>
            💰
          </span>

          <div>

            <small>
              Potential Profit
            </small>

            <strong>
              TSh{" "}
              {potentialProfit.toLocaleString()}
            </strong>

          </div>

        </div>

      </div>


      {/* ================================================
          PRODUCT TABLE
      ================================================= */}

      <div className="table-panel">


        <div className="table-header">

          <div>

            <h2>
              Product Inventory
            </h2>

            <p>
              All products currently in your business.
            </p>

          </div>


          {/* SEARCH */}

          <input
            className="search-input"
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>


        <div className="table-container">

          {loading ? (

            <div
              style={{
                padding: "30px",
                textAlign: "center",
              }}
            >
              Loading products...
            </div>

          ) : (

            <table>

              <thead>

                <tr>

                  <th>
                    #
                  </th>

                  <th>
                    Product
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Quantity
                  </th>

                  <th>
                    Buying Price
                  </th>

                  <th>
                    Selling Price
                  </th>

                  <th>
                    Profit / Unit
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredProducts.length === 0 ? (

                  <tr>

                    <td
                      colSpan="8"
                      style={{
                        textAlign: "center",
                        padding: "30px",
                      }}
                    >

                      {search
                        ? "No matching products found."
                        : "No products available. Click + Add Product to add one."}

                    </td>

                  </tr>

                ) : (

                  filteredProducts.map(
                    (product, index) => {

                      const buyingPrice =
                        Number(
                          product.buying_price ||
                          0
                        );


                      const sellingPrice =
                        Number(
                          product.selling_price ||
                          0
                        );


                      const quantity =
                        Number(
                          product.stock_quantity ||
                          0
                        );


                      const minimumStock =
                        Number(
                          product.minimum_stock ||
                          5
                        );


                      const profit =
                        sellingPrice -
                        buyingPrice;


                      return (

                        <tr
                          key={product.id}
                        >


                          {/* NUMBER */}

                          <td>
                            {index + 1}
                          </td>


                          {/* PRODUCT */}

                          <td>

                            <strong>
                              {product.name}
                            </strong>

                          </td>


                          {/* CATEGORY */}

                          <td>

                            <span className="category-badge">
                              {product.category}
                            </span>

                          </td>


                          {/* QUANTITY */}

                          <td>

                            <span
                              className={
                                quantity <=
                                minimumStock
                                  ? "low-stock"
                                  : "stock-number"
                              }
                            >

                              {quantity}

                            </span>

                          </td>


                          {/* BUYING PRICE */}

                          <td>

                            TSh{" "}
                            {buyingPrice.toLocaleString()}

                          </td>


                          {/* SELLING PRICE */}

                          <td>

                            TSh{" "}
                            {sellingPrice.toLocaleString()}

                          </td>


                          {/* PROFIT */}

                          <td className="profit-cell">

                            {profit >= 0
                              ? "+"
                              : "-"}TSh{" "}

                            {Math.abs(
                              profit
                            ).toLocaleString()}

                          </td>


                          {/* DELETE */}

                          <td>

                            <button
                              className="delete-button"
                              onClick={() =>
                                deleteProduct(
                                  product.id
                                )
                              }
                            >
                              Delete
                            </button>

                          </td>


                        </tr>

                      );

                    }
                  )

                )}

              </tbody>

            </table>

          )}

        </div>

      </div>

    </div>

  );
}



// ======================================================
// DASHBOARD
// ======================================================

function Dashboard({
  onLogout,
  products,
  setProducts,
}) {

  const [
    activePage,
    setActivePage,
  ] = useState("Dashboard");


  const menuItems = [

    ["📊", "Dashboard"],

    ["📦", "Products"],

    ["🛒", "Purchases"],

    ["💰", "Sales"],

    ["🎁", "Gifts"],

    ["💸", "Expenses"],

    ["📈", "Reports"],

    ["🔔", "Notifications"],

    ["⚙️", "Settings"],

  ];


  // ====================================================
  // DASHBOARD CALCULATIONS
  // ====================================================

  const totalStock =
    products.reduce(
      (total, product) =>
        total +
        Number(
          product.stock_quantity || 0
        ),
      0
    );


  const totalProducts =
    products.length;


  const potentialProfit =
    products.reduce(
      (total, product) => {

        const buying =
          Number(
            product.buying_price || 0
          );

        const selling =
          Number(
            product.selling_price || 0
          );

        const quantity =
          Number(
            product.stock_quantity || 0
          );

        return (
          total +
          (selling - buying) *
          quantity
        );

      },
      0
    );


  return (

    <div className="dashboard">


      {/* =================================================
          SIDEBAR
      ================================================== */}

      <aside className="sidebar">


        <div className="sidebar-logo">

          <div className="logo-icon">
            📊
          </div>

          <div>

            <h2>
              Business
            </h2>

            <span>
              Management System
            </span>

          </div>

        </div>


        <nav className="sidebar-menu">

          {menuItems.map(
            ([icon, name]) => (

              <button
                key={name}
                className={
                  activePage === name
                    ? "menu-item active"
                    : "menu-item"
                }
                onClick={() =>
                  setActivePage(name)
                }
              >

                {icon}

                <span>
                  {name}
                </span>

              </button>

            )
          )}

        </nav>


        <button
          className="logout-button"
          onClick={onLogout}
        >

          🚪

          <span>
            Logout
          </span>

        </button>

      </aside>



      {/* =================================================
          MAIN CONTENT
      ================================================== */}

      <main className="main-content">


        {/* TOP BAR */}

        <header className="topbar">

          <div>

            <h1>
              {activePage}
            </h1>

            <p>
              Business Management System
            </p>

          </div>


          <div className="topbar-right">


            <button className="notification-button">

              🔔

              <span className="notification-badge">
                3
              </span>

            </button>


            <div className="admin-profile">

              <div className="admin-avatar">
                A
              </div>

              <div>

                <strong>
                  Admin
                </strong>

                <small>
                  Administrator
                </small>

              </div>

            </div>

          </div>

        </header>



        {/* =================================================
            PRODUCTS PAGE
        ================================================== */}

        {activePage === "Products" ? (

          <Products
            products={products}
            setProducts={setProducts}
          />

        ) : (

          <div className="dashboard-placeholder">


            <div className="placeholder-icon">

              {activePage === "Dashboard"
                ? "📊"
                : "🚧"}

            </div>


            <h2>

              {activePage === "Dashboard"
                ? "Dashboard"
                : `${activePage} Module`}

            </h2>


            <p>

              {activePage === "Dashboard"
                ? "Your business overview will appear here."
                : "This module will be developed in the next step."}

            </p>



            {/* =========================================
                REAL DASHBOARD DATA
            ========================================== */}

            {activePage === "Dashboard" && (

              <div className="summary-grid">


                {/* TOTAL PRODUCTS */}

                <div className="summary-card">

                  <div className="card-icon">
                    📦
                  </div>

                  <div>

                    <p>
                      Total Products
                    </p>

                    <h2>
                      {totalProducts}
                    </h2>

                    <span>
                      Products in database
                    </span>

                  </div>

                </div>



                {/* TOTAL STOCK */}

                <div className="summary-card">

                  <div className="card-icon">
                    📊
                  </div>

                  <div>

                    <p>
                      Products in Stock
                    </p>

                    <h2>
                      {totalStock}
                    </h2>

                    <span>
                      Total available stock
                    </span>

                  </div>

                </div>



                {/* POTENTIAL PROFIT */}

                <div className="summary-card">

                  <div className="card-icon">
                    💰
                  </div>

                  <div>

                    <p>
                      Potential Profit
                    </p>

                    <h2>
                      TSh{" "}
                      {potentialProfit.toLocaleString()}
                    </h2>

                    <span>
                      Based on current stock
                    </span>

                  </div>

                </div>



                {/* DATABASE STATUS */}

                <div className="summary-card">

                  <div className="card-icon">
                    🗄️
                  </div>

                  <div>

                    <p>
                      Database
                    </p>

                    <h2>
                      Connected
                    </h2>

                    <span>
                      MySQL + Flask API
                    </span>

                  </div>

                </div>


              </div>

            )}


          </div>

        )}



        {/* FOOTER */}

        <footer className="dashboard-footer">

          Business Management System © 2026

        </footer>


      </main>

    </div>

  );

}



// ======================================================
// LOGIN
// ======================================================

function Login({ onLogin }) {

  const [username, setUsername] =
    useState("");


  const [password, setPassword] =
    useState("");


  const [showPassword, setShowPassword] =
    useState(false);


  const [message, setMessage] =
    useState("");


  const handleLogin = (e) => {

    e.preventDefault();


    // Temporary frontend login
    // We will move this to Flask + MySQL later

    if (
      username === "admin" &&
      password === "admin123"
    ) {

      onLogin();

    } else {

      setMessage(
        "Invalid username or password."
      );

    }

  };


  return (

    <div className="login-page">


      <div className="login-card">


        {/* =================================================
            BRAND
        ================================================== */}

        <div className="login-brand">


          <div className="brand-icon">
            📊
          </div>


          <h1>

            Business
            <br />

            Management
            <br />

            System

          </h1>


          <p>

            Manage your products, sales,
            purchases, expenses and business
            performance in one place.

          </p>


          <div className="brand-features">

            <span>
              ✓ Inventory Management
            </span>

            <span>
              ✓ Sales & Purchases
            </span>

            <span>
              ✓ Profit & Loss
            </span>

            <span>
              ✓ Business Reports
            </span>

          </div>

        </div>



        {/* =================================================
            LOGIN FORM
        ================================================== */}

        <div className="login-form-section">


          <div className="login-header">

            <h2>
              Welcome Back
            </h2>

            <p>
              Sign in to continue to your account
            </p>

          </div>


          <form onSubmit={handleLogin}>


            {/* USERNAME */}

            <div className="input-group">

              <label>
                Username
              </label>


              <div className="input-wrapper">

                <span className="input-icon">
                  👤
                </span>


                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                    )
                  }
                  required
                />

              </div>

            </div>



            {/* PASSWORD */}

            <div className="input-group">

              <label>
                Password
              </label>


              <div className="input-wrapper">

                <span className="input-icon">
                  🔒
                </span>


                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  required
                />


                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >

                  {showPassword
                    ? "Hide"
                    : "Show"}

                </button>

              </div>

            </div>



            {/* OPTIONS */}

            <div className="login-options">

              <label className="remember">

                <input
                  type="checkbox"
                />

                Remember me

              </label>


              <button
                type="button"
                className="forgot-password"
              >

                Forgot password?

              </button>

            </div>



            {/* LOGIN BUTTON */}

            <button
              className="login-button"
              type="submit"
            >

              LOGIN

            </button>


          </form>


          {message && (

            <div className="message error">

              {message}

            </div>

          )}


          <div className="login-footer">

            Business Management System © 2026

          </div>


        </div>

      </div>

    </div>

  );

}



// ======================================================
// MAIN APP
// ======================================================

function App() {


  const [loggedIn, setLoggedIn] =
    useState(false);


  const [products, setProducts] =
    useState([]);


  const [loadingProducts, setLoadingProducts] =
    useState(false);


  // ====================================================
  // LOAD PRODUCTS WHEN USER LOGS IN
  // ====================================================

  useEffect(() => {

    if (!loggedIn) {
      return;
    }


    const loadProducts = async () => {

      try {

        setLoadingProducts(true);


        const response = await fetch(
          `${API_URL}/products`
        );


        if (!response.ok) {

          throw new Error(
            "Failed to load products"
          );

        }


        const data =
          await response.json();


        setProducts(data);


      } catch (error) {

        console.error(
          "Database connection error:",
          error
        );


        alert(
          "Could not load products from database. Make sure Flask and MySQL are running."
        );


      } finally {

        setLoadingProducts(false);

      }

    };


    loadProducts();

  }, [loggedIn]);


  // ====================================================
  // LOGGED IN
  // ====================================================

  if (loggedIn) {

    return (

      <Dashboard

        onLogout={() =>
          setLoggedIn(false)
        }

        products={products}

        setProducts={setProducts}

      />

    );

  }


  // ====================================================
  // LOGIN PAGE
  // ====================================================

  return (

    <Login
      onLogin={() =>
        setLoggedIn(true)
      }
    />

  );

}


export default App;