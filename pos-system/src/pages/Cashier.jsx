import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ReceiptText,
  CreditCard,
  LogOut,
  Loader2,
  Sparkles,
  UtensilsCrossed,
  Coffee,
  CakeSlice,
  Salad,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const CATEGORY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Appetizer", value: "appetizer" },
  { label: "Entrée", value: "entree" },
  { label: "Main Course", value: "main" },
  { label: "Dessert", value: "dessert" },
  { label: "Drinks", value: "drinks" },
];

const VAT_RATE = 0.12;

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCategoryLabel(category) {
  const value = String(category || "").toLowerCase();
  if (value === "entree") return "Entrée";
  if (value === "main") return "Main Course";
  if (value === "appetizer") return "Appetizer";
  if (value === "dessert") return "Dessert";
  if (value === "drinks") return "Drinks";
  return value || "Item";
}

function getIconByCategory(category) {
  switch (String(category || "").toLowerCase()) {
    case "appetizer":
      return Sparkles;
    case "entree":
      return Salad;
    case "main":
      return UtensilsCrossed;
    case "dessert":
      return CakeSlice;
    case "drinks":
      return Coffee;
    default:
      return UtensilsCrossed;
  }
}

function getStockBadge(stock, isAvailable) {
  const safeStock = Number(stock || 0);

  if (isAvailable === false || safeStock === 0) {
    return { label: "Out of Stock", className: "out" };
  }

  if (safeStock > 20) {
    return { label: `In Stock (${safeStock})`, className: "good" };
  }

  return { label: `Low Stock (${safeStock})`, className: "low" };
}

function buildReceiptHtml(receipt) {
  const itemsHtml = receipt.items
    .map(
      (item) => `
        <div class="row">
          <span class="name">${escapeHtml(item.name)} × ${item.qty}</span>
          <span class="price">${money.format(item.price * item.qty)}</span>
        </div>
      `
    )
    .join("");

  return `
    <html>
      <head>
        <title>${escapeHtml(receipt.receiptNo)}</title>
        <style>
          * {
            box-sizing: border-box;
            font-family: "Courier New", Courier, monospace;
          }

          body {
            margin: 0;
            padding: 20px;
            background: #f5f2ee;
            color: #141414;
          }

          .receipt {
            width: 100%;
            max-width: 360px;
            margin: 0 auto;
            background: linear-gradient(180deg, #fff, #fcfaf8);
            border: 1px solid #e7e1da;
            border-radius: 16px;
            padding: 18px;
            box-shadow: 0 18px 36px rgba(20, 20, 20, 0.08);
          }

          .header {
            text-align: center;
            padding-bottom: 12px;
            border-bottom: 1px dashed #cfc6bc;
            margin-bottom: 14px;
          }

          .header h1 {
            margin: 0 0 4px;
            font-size: 26px;
            letter-spacing: 0.04em;
            color: #6f532d;
          }

          .header p {
            margin: 0;
            font-size: 12px;
            color: #6f6b66;
            line-height: 1.45;
          }

          .sub {
            margin: 10px 0 0;
            font-size: 12px;
            color: #8b6b3f;
            font-weight: 700;
            letter-spacing: 0.06em;
          }

          .meta {
            font-size: 12px;
            color: #555;
            margin-bottom: 14px;
            line-height: 1.7;
          }

          .divider {
            border-top: 1px dashed #bfb6ac;
            margin: 14px 0;
          }

          .row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin: 8px 0;
            font-size: 13px;
          }

          .name {
            flex: 1;
          }

          .price {
            white-space: nowrap;
            font-weight: 700;
          }

          .totals .row {
            margin: 6px 0;
            font-size: 13px;
          }

          .grand {
            font-size: 15px;
            font-weight: 700;
            color: #6f532d;
          }

          .footer {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px dashed #cfc6bc;
            text-align: center;
            font-size: 11px;
            color: #6f6b66;
            line-height: 1.5;
            letter-spacing: 0.04em;
          }

          @media print {
            body {
              background: white;
              padding: 0;
            }

            .receipt {
              border: none;
              border-radius: 0;
              box-shadow: none;
              max-width: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>LuxeDine</h1>
            <p>
              123 Gourmet Avenue, Manila, Philippines<br />
              TIN: 000-123-456-000
            </p>
            <div class="sub">OFFICIAL RECEIPT</div>
          </div>

          <div class="meta">
            <div><strong>Receipt No:</strong> ${escapeHtml(receipt.receiptNo)}</div>
            <div><strong>Date:</strong> ${escapeHtml(receipt.time)}</div>
            <div><strong>Cashier:</strong> cashier</div>
          </div>

          <div class="divider"></div>

          ${itemsHtml}

          <div class="divider"></div>

          <div class="totals">
            <div class="row">
              <span>Subtotal</span>
              <span>${money.format(receipt.subtotal)}</span>
            </div>
            <div class="row">
              <span>VAT (12%)</span>
              <span>${money.format(receipt.vat)}</span>
            </div>
            <div class="row">
              <span>Total</span>
              <span>${money.format(receipt.total)}</span>
            </div>
            <div class="row">
              <span>Cash</span>
              <span>${money.format(receipt.cashReceived)}</span>
            </div>
            <div class="row grand">
              <span>Change</span>
              <span>${money.format(receipt.change)}</span>
            </div>
          </div>

          <div class="footer">
            THIS DOCUMENT IS FOR OFFICIAL USE ONLY
          </div>
        </div>
      </body>
    </html>
  `;
}

function printReceipt(receipt) {
  const printWindow = window.open("", "_blank", "width=420,height=700");

  if (!printWindow) {
    alert("Popup blocked. Please allow popups to print the receipt.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildReceiptHtml(receipt));
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
}

export default function Cashier() {
  const navigate = useNavigate();
  const menuScrollRef = useRef(null);

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [cashReceived, setCashReceived] = useState("");

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoadingMenu(true);
      setMenuError("");

      const { data, error } = await supabase
        .from("menu")
        .select("id, name, category, price, stock, is_available, created_at")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching menu:", error);
        setMenuError(error.message || "Unable to load menu items.");
        setMenu([]);
        return;
      }

      setMenu(data || []);
    } catch (err) {
      console.error("Unexpected fetch error:", err);
      setMenuError("Unable to load menu items.");
      setMenu([]);
    } finally {
      setLoadingMenu(false);
    }
  };

  const filteredMenu = useMemo(() => {
    const query = search.toLowerCase().trim();

    return menu.filter((item) => {
      const category = String(item.category || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();

      const matchesCategory =
        activeCategory === "all" || category === activeCategory;

      const matchesSearch =
        !query || name.includes(query) || category.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [menu, activeCategory, search]);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.qty,
    0
  );
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;
  const cashReceivedNumber = Number(cashReceived) || 0;
  const change = Math.max(0, cashReceivedNumber - total);

  const syncStockChange = async (itemId, delta) => {
    const currentItem = menu.find((item) => item.id === itemId);
    const currentStock = Number(currentItem?.stock || 0);
    const nextStock = currentStock + delta;

    if (nextStock < 0) return false;

    const { error } = await supabase
      .from("menu")
      .update({
        stock: nextStock,
        is_available: nextStock > 0,
      })
      .eq("id", itemId);

    if (error) throw error;

    setMenu((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, stock: nextStock, is_available: nextStock > 0 }
          : item
      )
    );

    return true;
  };

  const addToCart = async (item) => {
    const stock = Number(item.stock || 0);
    const alreadyInCart = cart.find((x) => x.id === item.id)?.qty || 0;

    if (item.is_available === false || stock <= 0) return;
    if (alreadyInCart >= stock) return;

    try {
      const reserved = await syncStockChange(item.id, -1);
      if (!reserved) return;

      setCart((prev) => {
        const existing = prev.find((x) => x.id === item.id);
        if (existing) {
          return prev.map((x) =>
            x.id === item.id ? { ...x, qty: x.qty + 1 } : x
          );
        }
        return [...prev, { ...item, qty: 1 }];
      });
    } catch (error) {
      console.error("Add to cart stock update failed:", error);
      alert("Unable to add item. Please try again.");
    }
  };

  const increaseQty = async (id) => {
    const stockItem = menu.find((m) => m.id === id);
    const stock = Number(stockItem?.stock || 0);
    const cartItem = cart.find((item) => item.id === id);

    if (!cartItem || stock <= 0) return;

    try {
      const reserved = await syncStockChange(id, -1);
      if (!reserved) return;

      setCart((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } catch (error) {
      console.error("Increase quantity failed:", error);
      alert("Unable to update quantity. Please try again.");
    }
  };

  const decreaseQty = async (id) => {
    const cartItem = cart.find((item) => item.id === id);
    if (!cartItem) return;

    try {
      await syncStockChange(id, +1);

      setCart((prev) =>
        prev
          .map((item) =>
            item.id === id ? { ...item, qty: item.qty - 1 } : item
          )
          .filter((item) => item.qty > 0)
      );
    } catch (error) {
      console.error("Decrease quantity failed:", error);
      alert("Unable to update quantity. Please try again.");
    }
  };

  const removeItem = async (id) => {
    const cartItem = cart.find((item) => item.id === id);
    if (!cartItem) return;

    try {
      await syncStockChange(id, cartItem.qty);

      setCart((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Remove item failed:", error);
      alert("Unable to remove item. Please try again.");
    }
  };

  const clearCart = async (restoreStock = true) => {
    try {
      if (restoreStock && cart.length > 0) {
        for (const item of cart) {
          await syncStockChange(item.id, item.qty);
        }
      }

      setCart([]);
      setCashReceived("");
    } catch (error) {
      console.error("Clear cart failed:", error);
      alert("Unable to clear cart. Please try again.");
    }
  };

  const [exiting, setExiting] = useState(false);

  const handleLogout = () => {
    setExiting(true);

    setTimeout(() => {
      navigate("/", { replace: true });
    }, 650);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || savingOrder || cashReceivedNumber < total) return;

    try {
      setSavingOrder(true);

      const receiptNo = `LD-${Date.now().toString().slice(-6)}`;
      const { data: authData } = await supabase.auth.getUser();
      const cashierId = authData?.user?.id ?? null;

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            receipt_no: receiptNo,
            cashier_id: cashierId,
            subtotal,
            vat,
            total,
            cash_received: cashReceivedNumber,
            change_amount: change,
            payment_method: "cash",
            status: "paid",
          },
        ])
        .select("id")
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        item_name: item.name,
        price: Number(item.price || 0),
        qty: item.qty,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const receipt = {
        receiptNo,
        time: new Date().toLocaleString(),
        items: cart.map((item) => ({
          name: item.name,
          qty: item.qty,
          price: Number(item.price || 0),
        })),
        subtotal,
        vat,
        total,
        cashReceived: cashReceivedNumber,
        change,
      };

      setLastReceipt(receipt);
      setCart([]);
      setCashReceived("");
      await fetchMenu();

      printReceipt(receipt);
      alert("Payment completed successfully.");
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Checkout failed. Restoring stock and clearing the cart.");

      try {
        await clearCart(true);
        await fetchMenu();
      } catch (restoreError) {
        console.error("Failed to restore stock after checkout error:", restoreError);
      }
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="page">
      {exiting && (
        <div className="auth-overlay logout">
          <div className="auth-card">
            <div className="auth-icon">
              <LogOut size={34} />
            </div>
            <h3>Logging out...</h3>
            <p>Wrapping up your session nicely.</p>
            <div className="auth-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <aside className="left">
          <div className="left-content">
            <p className="eyebrow">Cashier Dashboard</p>
            <h1>LuxeDine</h1>
            <p className="tagline">
              Elegant restaurant POS for fast ordering, clean transactions, and smooth service.
            </p>

            <div className="trust">
              <div>
                <UtensilsCrossed size={15} />
                Live menu sync
              </div>
              <div>
                <ReceiptText size={15} />
                Cart summary
              </div>
            </div>

            <div className="stats">
              <div className="stat">
                <span>Menu Items</span>
                <strong>{menu.length}</strong>
              </div>
              <div className="stat">
                <span>In Cart</span>
                <strong>{cart.reduce((n, item) => n + item.qty, 0)}</strong>
              </div>
              <div className="stat">
                <span>Role</span>
                <strong>cashier</strong>
              </div>
            </div>

            <div className="side-actions">
              <button className="side-btn" onClick={fetchMenu}>
                Refresh Menu
              </button>
              <button className="side-btn" onClick={() => clearCart(true)}>
                Clear Cart
              </button>
              <button className="side-btn logout" onClick={handleLogout}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="right">
          <div className="form-header">
            <h2>Cashier Panel</h2>
            <p>Search the menu, build orders, and complete checkout in one place.</p>
          </div>

          <div className="topbar">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search menu items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="category-row">
            {CATEGORY_OPTIONS.map((category) => (
              <button
                key={category.value}
                className={`category-pill ${
                  activeCategory === category.value ? "active" : ""
                }`}
                onClick={() => setActiveCategory(category.value)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="workspace">
            <section className="menu-panel">
              <div className="section-head">
                <h3>Menu</h3>
                <p>Select items to add to the current order</p>
              </div>

              <div className="menu-scroll" ref={menuScrollRef}>
                {loadingMenu ? (
                  <div className="state-box">
                    <Loader2 className="spin" size={22} />
                    <p>Loading menu...</p>
                  </div>
                ) : menuError ? (
                  <div className="state-box error">
                    <p>{menuError}</p>
                    <button onClick={fetchMenu}>Try again</button>
                  </div>
                ) : filteredMenu.length === 0 ? (
                  <div className="state-box">
                    <ReceiptText size={28} />
                    <p>No menu items found</p>
                  </div>
                ) : (
                  <div className="menu-grid">
                    {filteredMenu.map((item) => {
                      const Icon = getIconByCategory(item.category);
                      const stock = Number(item.stock || 0);
                      const isOutOfStock =
                        item.is_available === false || stock <= 0;
                      const stockBadge = getStockBadge(stock, item.is_available);

                      return (
                        <article
                          key={item.id}
                          className={`menu-card ${isOutOfStock ? "disabled" : ""}`}
                        >
                          <div className="menu-icon">
                            <Icon size={18} />
                          </div>

                          <div className="menu-info">
                            <h4>{item.name}</h4>
                            <p>{getCategoryLabel(item.category)}</p>
                          </div>

                          <div className="menu-meta">
                            <span className="price">
                              {money.format(Number(item.price || 0))}
                            </span>
                            <span className={`stock-badge ${stockBadge.className}`}>
                              {stockBadge.label}
                            </span>
                          </div>

                          <div className="menu-footer">
                            <button
                              onClick={() => addToCart(item)}
                              disabled={isOutOfStock}
                            >
                              <Plus size={16} />
                              Add
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <aside className="order-panel">
              <div className="section-head">
                <h3>Current Order</h3>
                <p>Review items before checkout</p>
              </div>

              <div className="order-list">
                {cart.length === 0 ? (
                  <div className="empty-state">
                    <ReceiptText size={32} />
                    <p>No items added yet</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const stockItem = menu.find((m) => m.id === item.id);
                    const stock = Number(stockItem?.stock || 0);

                    return (
                      <div key={item.id} className="order-item">
                        <div className="order-item-left">
                          <h4>{item.name}</h4>
                          <p>{money.format(Number(item.price || 0))} each</p>
                          <small>
                            {stock > 0 ? `Available stock: ${stock}` : "Out of stock"}
                          </small>
                        </div>

                        <div className="qty-controls">
                          <button onClick={() => decreaseQty(item.id)}>
                            <Minus size={14} />
                          </button>
                          <span>{item.qty}</span>
                          <button onClick={() => increaseQty(item.id)}>
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          className="remove-btn"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="summary">
                <div className="cash-input-wrap">
                  <label htmlFor="cashReceived">Cash Received</label>
                  <input
                    id="cashReceived"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Enter cash received"
                  />
                </div>

                <div>
                  <span>Subtotal</span>
                  <strong>{money.format(subtotal)}</strong>
                </div>
                <div>
                  <span>VAT (12%)</span>
                  <strong>{money.format(vat)}</strong>
                </div>
                <div>
                  <span>Change</span>
                  <strong>{money.format(change)}</strong>
                </div>
                <div className="total">
                  <span>Total</span>
                  <strong>{money.format(total)}</strong>
                </div>

                {cashReceived !== "" && cashReceivedNumber < total && (
                  <p className="cash-warning">
                    Cash received is not enough to complete payment.
                  </p>
                )}

                <button
                  className="checkout-btn"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || savingOrder || cashReceivedNumber < total}
                >
                  <CreditCard size={16} />
                  {savingOrder ? "Processing..." : "Charge Payment"}
                </button>
              </div>

              {lastReceipt && (
                <div className="receipt-box">
                  <h4>Last Receipt</h4>
                  <p>{lastReceipt.receiptNo}</p>
                  <p>{lastReceipt.time}</p>
                  <p>Total: {money.format(lastReceipt.total)}</p>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: Inter, "Segoe UI", sans-serif;
        }

        :root {
          --bg: #f5f2ee;
          --text: #141414;
          --muted: #6f6b66;
          --line: #e7e1da;
          --accent: #8b6b3f;
          --accent-dark: #6f532d;
          --soft: #faf7f2;
          --good: #2f8f57;
          --low: #c58a2a;
          --out: #b04b4b;
        }

        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background:
            radial-gradient(circle at top left, rgba(139, 107, 63, 0.12), transparent 30%),
            radial-gradient(circle at bottom right, rgba(20, 20, 20, 0.08), transparent 28%),
            var(--bg);
        }

        .card {
          width: min(1480px, 100%);
          min-height: calc(100vh - 32px);
          display: grid;
          grid-template-columns: 320px 1fr;
          border-radius: 28px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 26px 64px rgba(20, 20, 20, 0.12);
        }

        .left {
          position: relative;
          padding: 44px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: #fff;
          background:
            linear-gradient(145deg, rgba(20, 20, 20, 0.92), rgba(45, 37, 28, 0.92)),
            url("https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80") center/cover;
        }

        .left::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.28));
        }

        .left > * {
          position: relative;
          z-index: 1;
        }

        .eyebrow {
          display: inline-block;
          width: fit-content;
          margin-bottom: 14px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .left h1 {
          font-size: clamp(32px, 4.6vw, 50px);
          line-height: 1;
          letter-spacing: -0.04em;
          margin-bottom: 14px;
        }

        .tagline {
          max-width: 430px;
          font-size: 15px;
          line-height: 1.65;
          color: rgba(255,255,255,0.82);
        }

        .trust {
          margin-top: 22px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .trust div {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.9);
          font-size: 13px;
        }

        .stats {
          margin-top: 24px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .stat {
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
        }

        .stat span {
          display: block;
          font-size: 11px;
          color: rgba(255,255,255,0.68);
          margin-bottom: 6px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .stat strong {
          font-size: 17px;
          color: #fff;
        }

        .side-actions {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .side-btn {
          width: 100%;
          border: none;
          border-radius: 16px;
          padding: 13px 16px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          transition: 0.2s ease;
          text-align: left;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .side-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          transform: translateX(2px);
        }

        .side-btn.logout {
          background: rgba(139, 107, 63, 0.92);
        }

        .side-btn.logout:hover {
          background: rgba(111, 83, 45, 0.98);
        }

        .right {
          padding: 44px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          background: linear-gradient(180deg, #fff, #fcfaf8);
          min-width: 0;
        }

        .form-header h2 {
          font-size: 30px;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 8px;
        }

        .form-header p {
          color: var(--muted);
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .search-box {
          width: min(420px, 100%);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 16px;
          border-radius: 16px;
          background: var(--soft);
          border: 1px solid var(--line);
        }

        .search-box input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 14px;
          color: var(--text);
        }

        .category-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .category-pill {
          border: 1px solid var(--line);
          background: #fff;
          color: #4c463f;
          border-radius: 999px;
          padding: 10px 14px;
          cursor: pointer;
          transition: 0.2s ease;
          font-size: 13px;
        }

        .category-pill:hover {
          transform: translateY(-1px);
          border-color: rgba(139, 107, 63, 0.35);
        }

        .category-pill.active {
          background: linear-gradient(135deg, var(--accent), var(--accent-dark));
          color: #fff;
          border-color: transparent;
        }

        .workspace {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) 390px;
          gap: 18px;
          align-items: start;
          flex: 1;
          min-height: 0;
        }

        .menu-panel,
        .order-panel {
          background: linear-gradient(180deg, #fff, #fcfaf8);
          border: 1px solid var(--line);
          border-radius: 24px;
          padding: 18px;
          min-height: 0;
        }

        .section-head {
          margin-bottom: 16px;
        }

        .section-head h3 {
          font-size: 19px;
          color: var(--text);
          margin-bottom: 4px;
        }

        .section-head p {
          color: var(--muted);
          font-size: 13px;
        }

        .menu-scroll {
          max-height: 600px;
          overflow-y: auto;
          padding-right: 6px;
        }

        .state-box {
          min-height: 240px;
          display: grid;
          place-items: center;
          text-align: center;
          gap: 10px;
          color: var(--muted);
          border: 1px dashed var(--line);
          border-radius: 20px;
          background: rgba(250, 247, 242, 0.55);
          padding: 20px;
        }

        .state-box.error button {
          margin-top: 8px;
          border: none;
          padding: 10px 14px;
          border-radius: 12px;
          cursor: pointer;
          background: linear-gradient(135deg, var(--accent), var(--accent-dark));
          color: #fff;
          font-weight: 600;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .menu-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .menu-card {
          border: 1px solid var(--line);
          background: #fff;
          border-radius: 20px;
          padding: 15px;
          transition: 0.22s ease;
          box-shadow: 0 10px 24px rgba(20, 20, 20, 0.04);
          display: flex;
          flex-direction: column;
          min-height: 170px;
        }

        .menu-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 32px rgba(20, 20, 20, 0.08);
          border-color: rgba(139, 107, 63, 0.24);
        }

        .menu-card.disabled {
          opacity: 0.65;
        }

        .menu-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(139, 107, 63, 0.1);
          color: var(--accent-dark);
          margin-bottom: 12px;
        }

        .menu-info h4 {
          font-size: 15px;
          color: var(--text);
          margin-bottom: 4px;
        }

        .menu-info p {
          font-size: 13px;
          color: var(--muted);
        }

        .menu-meta {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .price {
          font-weight: 800;
          color: var(--accent-dark);
        }

        .stock-badge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .stock-badge.good {
          background: rgba(47, 143, 87, 0.12);
          color: var(--good);
          border: 1px solid rgba(47, 143, 87, 0.22);
        }

        .stock-badge.low {
          background: rgba(197, 138, 42, 0.12);
          color: var(--low);
          border: 1px solid rgba(197, 138, 42, 0.22);
        }

        .stock-badge.out {
          background: rgba(176, 75, 75, 0.12);
          color: var(--out);
          border: 1px solid rgba(176, 75, 75, 0.22);
        }

        .menu-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .menu-footer button,
        .checkout-btn {
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .menu-footer button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px;
          background: var(--soft);
          color: var(--accent-dark);
          border: 1px solid var(--line);
          font-size: 13px;
        }

        .menu-footer button:hover:not(:disabled) {
          background: rgba(139, 107, 63, 0.12);
          transform: translateY(-1px);
        }

        .menu-footer button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .order-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 480px;
          overflow: auto;
          padding-right: 2px;
        }

        .empty-state {
          min-height: 240px;
          display: grid;
          place-items: center;
          text-align: center;
          color: var(--muted);
          border: 1px dashed var(--line);
          border-radius: 20px;
          background: rgba(250, 247, 242, 0.55);
          gap: 10px;
          padding: 20px;
        }

        .order-item {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 13px;
          background: #fff;
        }

        .order-item-left h4 {
          font-size: 15px;
          color: var(--text);
          margin-bottom: 4px;
        }

        .order-item-left p {
          font-size: 13px;
          color: var(--muted);
        }

        .order-item-left small {
          display: block;
          margin-top: 4px;
          color: #8c8279;
        }

        .qty-controls {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--soft);
          border: 1px solid var(--line);
        }

        .qty-controls button {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: #fff;
          color: var(--accent-dark);
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 6px 14px rgba(20, 20, 20, 0.06);
        }

        .qty-controls span {
          min-width: 18px;
          text-align: center;
          font-weight: 700;
          color: var(--text);
        }

        .remove-btn {
          border: none;
          background: transparent;
          color: #9b8f82;
          cursor: pointer;
          padding: 6px;
          border-radius: 10px;
        }

        .remove-btn:hover {
          background: rgba(139, 107, 63, 0.08);
          color: var(--accent-dark);
        }

        .summary {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
        }

        .summary > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          color: var(--muted);
          font-size: 14px;
        }

        .cash-input-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .cash-input-wrap label {
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
        }

        .cash-input-wrap input {
          width: 100%;
          border: 1px solid var(--line);
          background: var(--soft);
          border-radius: 14px;
          padding: 13px 14px;
          font-size: 14px;
          outline: none;
          color: var(--text);
        }

        .cash-input-wrap input:focus {
          border-color: rgba(139, 107, 63, 0.35);
          box-shadow: 0 0 0 3px rgba(139, 107, 63, 0.08);
        }

        .summary .total {
          color: var(--text);
          font-size: 16px;
          padding-top: 10px;
          margin-top: 10px;
          border-top: 1px solid var(--line);
        }

        .cash-warning {
          margin-top: -2px;
          margin-bottom: 8px;
          color: var(--out);
          font-size: 12px;
        }

        .checkout-btn {
          width: 100%;
          margin-top: 12px;
          padding: 14px 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent-dark));
          color: #fff;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 14px 28px rgba(111, 83, 45, 0.24);
        }

        .checkout-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(111, 83, 45, 0.3);
        }

        .checkout-btn:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .receipt-box {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: rgba(250, 247, 242, 0.7);
        }

        .receipt-box h4 {
          margin-bottom: 8px;
          color: var(--text);
        }

        .receipt-box p {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .auth-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          background: rgba(20, 20, 20, 0.22);
          backdrop-filter: blur(10px);
          animation: overlayIn 0.25s ease both;
        }

        .auth-card {
          position: relative;
          width: min(360px, calc(100vw - 32px));
          padding: 28px 24px 22px;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,247,242,0.96));
          border: 1px solid rgba(139, 107, 63, 0.18);
          box-shadow: 0 24px 60px rgba(20, 20, 20, 0.18);
          text-align: center;
          transform-origin: center;
          animation: cardPop 0.5s cubic-bezier(.2,.9,.2,1) both;
        }

        .auth-icon {
          width: 66px;
          height: 66px;
          margin: 0 auto 14px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          color: var(--accent-dark);
          background: linear-gradient(135deg, rgba(139,107,63,0.12), rgba(111,83,45,0.08));
          border: 1px solid rgba(139,107,63,0.14);
        }

        .auth-card h3 {
          font-size: 22px;
          color: var(--text);
          margin-bottom: 8px;
        }

        .auth-card p {
          color: var(--muted);
          line-height: 1.5;
        }

        .auth-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 18px;
        }

        .auth-dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent);
          animation: dotBounce 0.9s infinite ease-in-out;
        }

        .auth-dots span:nth-child(2) { animation-delay: 0.12s; }
        .auth-dots span:nth-child(3) { animation-delay: 0.24s; }

        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes cardPop {
          from { opacity: 0; transform: scale(0.88) translateY(18px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
          40% { transform: translateY(-7px); opacity: 1; }
        }

        @media (max-width: 1280px) {
          .card {
            grid-template-columns: 300px 1fr;
          }

          .workspace {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 980px) {
          .card {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .left,
          .right {
            padding: 30px;
          }

          .left {
            min-height: 300px;
          }

          .menu-grid {
            grid-template-columns: 1fr;
          }

          .menu-scroll {
            max-height: 520px;
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 10px;
          }

          .card {
            border-radius: 22px;
          }

          .left,
          .right {
            padding: 22px 18px;
          }

          .topbar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            width: 100%;
          }

          .category-row {
            gap: 8px;
          }

          .workspace {
            gap: 14px;
          }

          .order-item {
            grid-template-columns: 1fr;
          }

          .qty-controls {
            justify-self: start;
          }
        }
      `}</style>
    </div>
  );
}