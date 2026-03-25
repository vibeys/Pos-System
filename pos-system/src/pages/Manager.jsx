import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Salad,
  Coffee,
  CakeSlice,
  Trash2,
  UtensilsCrossed,
  Users,
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

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function getCategoryLabel(category) {
  const value = normalizeText(category);
  if (value === "entree") return "Entrée";
  if (value === "main") return "Main Course";
  if (value === "appetizer") return "Appetizer";
  if (value === "dessert") return "Dessert";
  if (value === "drinks") return "Drinks";
  return value || "Item";
}

function getIconByCategory(category) {
  switch (normalizeText(category)) {
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

function getStockClass(stock) {
  const n = Number(stock || 0);
  if (n <= 0) return "out";
  if (n <= 10) return "low";
  return "good";
}

function getStockLabel(stock) {
  const n = Number(stock || 0);
  if (n <= 0) return "Out of Stock";
  if (n <= 10) return `Low Stock (${n})`;
  return `In Stock (${n})`;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export default function Manager() {
  const navigate = useNavigate();

  const loggedInUsername = localStorage.getItem("luxe_username") || "manager";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [exiting, setExiting] = useState(false);

  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [users, setUsers] = useState([]);

  const [searchReceipt, setSearchReceipt] = useState("");
  const [searchMenu, setSearchMenu] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [newCashier, setNewCashier] = useState({ username: "", password: "" });
  const [stockAdjustments, setStockAdjustments] = useState({});

  useEffect(() => {
    const role = localStorage.getItem("luxe_role");
    if (role && role !== "manager" && role !== "owner") {
      navigate("/", { replace: true });
      return;
    }

    fetchAll();
  }, [navigate]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [menuRes, ordersRes, orderItemsRes, usersRes] = await Promise.all([
        supabase.from("menu").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("order_items").select("*").order("id", { ascending: true }),
        supabase.from("users").select("*").order("created_at", { ascending: false }),
      ]);

      if (menuRes.error) throw menuRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (orderItemsRes.error) throw orderItemsRes.error;
      if (usersRes.error) throw usersRes.error;

      setMenu(menuRes.data || []);
      setOrders(ordersRes.data || []);
      setOrderItems(orderItemsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error("Manager load error:", error);
      setMessage(error.message || "Failed to load manager dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const orderItemsByOrderId = useMemo(() => {
    return orderItems.reduce((acc, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = [];
      acc[item.order_id].push(item);
      return acc;
    }, {});
  }, [orderItems]);

  const dashboard = useMemo(() => {
    const today = startOfDay();
    const todayOrders = orders.filter((o) => new Date(o.created_at) >= today);

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const completedOrders = orders.filter((o) => normalizeText(o.status) === "paid").length;
    const cashOnHand = orders
      .filter((o) => normalizeText(o.status) === "paid" && normalizeText(o.payment_method) === "cash")
      .reduce((sum, o) => sum + Number(o.cash_received || 0), 0);

    const lowStockItems = menu.filter((item) => Number(item.stock || 0) <= 10);

    const topSellingMap = orderItems.reduce((acc, item) => {
      const key = item.item_name || item.menu_item_id;
      if (!acc[key]) acc[key] = { name: item.item_name || "Item", qty: 0, revenue: 0 };
      acc[key].qty += Number(item.qty || 0);
      const lineTotal = item.line_total != null
        ? Number(item.line_total)
        : Number(item.price || 0) * Number(item.qty || 0);
      acc[key].revenue += lineTotal;
      return acc;
    }, {});

    const topSelling = Object.values(topSellingMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const avgOrder = orders.length ? totalSales / orders.length : 0;

    return {
      totalSales,
      todaySales,
      completedOrders,
      cashOnHand,
      lowStockItems,
      topSelling,
      avgOrder,
    };
  }, [orders, orderItems, menu]);

  const salesByDay = useMemo(() => {
    const map = new Map();
    const today = new Date();

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      map.set(getDateKey(d), 0);
    }

    orders.forEach((order) => {
      if (normalizeText(order.status) === "voided") return;
      const key = getDateKey(order.created_at);
      if (map.has(key)) map.set(key, map.get(key) + Number(order.total || 0));
    });

    return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
  }, [orders]);

  const maxChartValue = Math.max(...salesByDay.map((d) => d.value), 1);

  const filteredOrders = useMemo(() => {
    const q = normalizeText(searchReceipt);
    return orders.filter((order) => {
      const receiptNo = normalizeText(order.receipt_no);
      const status = normalizeText(order.status);
      const payment = normalizeText(order.payment_method);
      const cashierId = normalizeText(order.cashier_id);
      return !q || receiptNo.includes(q) || status.includes(q) || payment.includes(q) || cashierId.includes(q);
    });
  }, [orders, searchReceipt]);

  const filteredMenu = useMemo(() => {
    const q = normalizeText(searchMenu);
    return menu.filter((item) => {
      const name = normalizeText(item.name);
      const category = normalizeText(item.category);
      const matchesCategory = activeCategory === "all" || category === activeCategory;
      const matchesSearch = !q || name.includes(q) || category.includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [menu, searchMenu, activeCategory]);

  const cashierUsers = useMemo(() => {
    const q = normalizeText(searchUser);
    return users.filter((user) => {
      const role = normalizeText(user.role);
      const username = normalizeText(user.username);
      return role === "cashier" && (!q || username.includes(q));
    });
  }, [users, searchUser]);

  const selectedOrder = useMemo(() => {
    if (!expandedOrderId) return null;
    return orders.find((order) => order.id === expandedOrderId) || null;
  }, [expandedOrderId, orders]);

  const selectedOrderItems = selectedOrder ? orderItemsByOrderId[selectedOrder.id] || [] : [];

  const updateMenuStock = async (item, addQty) => {
    const qtyToAdd = Number(addQty || 0);
    if (qtyToAdd <= 0) {
      setMessage("Enter a positive stock amount to add.");
      return;
    }

    try {
      setSaving(true);
      const nextStock = Number(item.stock || 0) + qtyToAdd;
      const { error } = await supabase
        .from("menu")
        .update({ stock: nextStock, is_available: nextStock > 0 })
        .eq("id", item.id);
      if (error) throw error;

      setStockAdjustments((prev) => ({ ...prev, [item.id]: "" }));
      await fetchAll();
      setMessage(`Added ${qtyToAdd} stock to ${item.name}.`);
    } catch (error) {
      console.error("Stock update error:", error);
      setMessage(error.message || "Failed to update stock.");
    } finally {
      setSaving(false);
    }
  };

  const addCashier = async () => {
    if (!newCashier.username.trim() || !newCashier.password.trim()) {
      setMessage("Please enter username and password.");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from("users").insert([
        {
          username: newCashier.username.trim(),
          password: newCashier.password,
          role: "cashier",
        },
      ]);
      if (error) throw error;
      setNewCashier({ username: "", password: "" });
      await fetchAll();
      setMessage("Cashier account added.");
    } catch (error) {
      console.error("Add cashier error:", error);
      setMessage(error.message || "Failed to add cashier.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCashier = async (id) => {
    try {
      setSaving(true);
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      await fetchAll();
      setMessage("Cashier deleted.");
    } catch (error) {
      console.error("Delete cashier error:", error);
      setMessage(error.message || "Failed to delete cashier.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setExiting(true);

    setTimeout(() => {
      localStorage.removeItem("luxe_role");
      localStorage.removeItem("luxe_username");
      navigate("/", { replace: true });
    }, 650);
  };

  return (
    <div className="page">
      {exiting && (
        <div className="auth-overlay logout">
          <div className="auth-card">
            <div className="spark spark-1"><Sparkles size={18} /></div>
            <div className="spark spark-2"><Sparkles size={14} /></div>
            <div className="pulse-ring" />
            <div className="auth-icon">
              <LogOut size={34} />
            </div>
            <h3>Logging out...</h3>
            <p>See you again soon.</p>
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
            <p className="eyebrow">Manager Dashboard</p>
            <h1>LuxeDine</h1>
            <p className="tagline">
              Oversee sales, receipts, stock, and cashier accounts from one elegant control panel.
            </p>

            <div className="trust">
              <div>
                <BarChart3 size={15} />
                Sales reports
              </div>
              <div>
                <Users size={15} />
                Cashier control
              </div>
              <div>
                <Package size={15} />
                Stock updates
              </div>
            </div>

            <div className="stats">
              <div className="stat">
                <span>Today Sales</span>
                <strong>{money.format(dashboard.todaySales)}</strong>
              </div>
              <div className="stat">
                <span>Total Sales</span>
                <strong>{money.format(dashboard.totalSales)}</strong>
              </div>
              <div className="stat">
                <span>Orders</span>
                <strong>{dashboard.completedOrders}</strong>
              </div>
              <div className="stat">
                <span>Logged In As</span>
                <strong>{loggedInUsername}</strong>
              </div>
            </div>

            <div className="side-actions">
              <button className="side-btn" onClick={fetchAll}>
                <RefreshCw size={16} />
                Refresh Data
              </button>
              <button
                className="side-btn logout"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="right">
          <div className="form-header">
            <h2>Manager Panel</h2>
            <p>Track sales, add stock, review receipts, and manage cashiers.</p>
          </div>

          {message && <div className="notice">{message}</div>}

          <div className="workspace-grid">
            <section className="panel hero-panel">
              <div className="panel-head">
                <h3>Executive Overview</h3>
                <p>Live performance summary for the restaurant.</p>
              </div>

              <div className="hero-grid">
                <div className="metric-grid">
                  <div className="metric-card">
                    <span>Today Sales</span>
                    <strong>{money.format(dashboard.todaySales)}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Cash On Hand</span>
                    <strong>{money.format(dashboard.cashOnHand)}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Orders</span>
                    <strong>{dashboard.completedOrders}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Average Order</span>
                    <strong>{money.format(dashboard.avgOrder)}</strong>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-head">
                    <h4>Sales Trend (Last 7 Days)</h4>
                    <p>Based on paid transactions.</p>
                  </div>
                  <div className="chart-bars">
                    {salesByDay.map((point) => {
                      const width = Math.max(8, Math.round((point.value / maxChartValue) * 100));
                      return (
                        <div key={point.date} className="chart-row">
                          <span className="chart-date">{point.date.slice(5)}</span>
                          <div className="chart-track">
                            <div className="chart-fill" style={{ width: `${width}%` }} />
                          </div>
                          <span className="chart-value">{money.format(point.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel inventory-panel">
              <div className="panel-head split-head">
                <div>
                  <h3>Inventory Stock Control</h3>
                  <p>Only stock additions are allowed here.</p>
                </div>
                <div className="category-row compact">
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category.value}
                      className={`category-pill ${activeCategory === category.value ? "active" : ""}`}
                      onClick={() => setActiveCategory(category.value)}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="search-box inline-search">
                <Search size={16} />
                <input
                  value={searchMenu}
                  onChange={(e) => setSearchMenu(e.target.value)}
                  placeholder="Search menu items..."
                />
              </div>

              <div className="inventory-scroll">
                <div className="item-list">
                  {filteredMenu.length === 0 ? (
                    <div className="empty-mini">No menu items found.</div>
                  ) : (
                    filteredMenu.map((item) => {
                      const Icon = getIconByCategory(item.category);
                      const stockClass = getStockClass(item.stock);
                      const pending = stockAdjustments[item.id] ?? "";

                      return (
                        <article key={item.id} className={`item-card ${stockClass !== "good" ? "low-stock" : ""}`}>
                          <div className="item-icon">
                            <Icon size={18} />
                          </div>

                          <div className="item-info">
                            <div className="item-title-row">
                              <h4>{item.name}</h4>
                              <span className={`stock-pill ${stockClass}`}>{getStockLabel(item.stock)}</span>
                            </div>
                            <p>{getCategoryLabel(item.category)}</p>
                            <small>{item.is_available === false ? "Unavailable" : "Available"}</small>
                            <div className="price-line">{money.format(Number(item.price || 0))}</div>
                          </div>

                          <div className="item-actions">
                            <div className="stock-adjust-wrap">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={pending}
                                onChange={(e) =>
                                  setStockAdjustments((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                placeholder="Add stock"
                              />
                              <button className="primary-btn" onClick={() => updateMenuStock(item, pending)} disabled={saving}>
                                <Plus size={16} /> Add Stock
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            <section className="panel transactions-panel">
              <div className="panel-head split-head">
                <div>
                  <h3>Receipt Search & Transaction Viewer</h3>
                  <p>Search receipts and inspect sold item details.</p>
                </div>
                <div className="search-box small-width">
                  <Search size={16} />
                  <input
                    value={searchReceipt}
                    onChange={(e) => setSearchReceipt(e.target.value)}
                    placeholder="Search receipt ID..."
                  />
                </div>
              </div>

              <div className="section-scroll">
                <div className="order-grid">
                  {filteredOrders.length === 0 ? (
                    <div className="empty-mini">No matching receipts found.</div>
                  ) : (
                    filteredOrders.slice(0, 12).map((order) => {
                      const isOpen = expandedOrderId === order.id;
                      const items = orderItemsByOrderId[order.id] || [];

                      return (
                        <article key={order.id} className="order-card">
                          <button className="order-card-top" onClick={() => setExpandedOrderId(isOpen ? null : order.id)}>
                            <div>
                              <h4>{order.receipt_no}</h4>
                              <p>
                                {new Date(order.created_at).toLocaleString()} · {normalizeText(order.status) || "paid"}
                              </p>
                            </div>
                            <div className="order-card-meta">
                              <strong>{money.format(Number(order.total || 0))}</strong>
                              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="order-details">
                              <div className="detail-grid">
                                <div>
                                  <span>Subtotal</span>
                                  <strong>{money.format(Number(order.subtotal || 0))}</strong>
                                </div>
                                <div>
                                  <span>VAT</span>
                                  <strong>{money.format(Number(order.vat || 0))}</strong>
                                </div>
                                <div>
                                  <span>Cash</span>
                                  <strong>{money.format(Number(order.cash_received || 0))}</strong>
                                </div>
                                <div>
                                  <span>Change</span>
                                  <strong>{money.format(Number(order.change_amount || 0))}</strong>
                                </div>
                              </div>

                              <div className="sold-list">
                                {items.length === 0 ? (
                                  <div className="empty-mini">No item rows found for this order.</div>
                                ) : (
                                  items.map((item) => {
                                    const lineTotal = item.line_total != null
                                      ? Number(item.line_total)
                                      : Number(item.price || 0) * Number(item.qty || 0);
                                    return (
                                      <div className="sold-row" key={item.id}>
                                        <div>
                                          <strong>{item.item_name}</strong>
                                          <p>
                                            {item.qty} × {money.format(Number(item.price || 0))}
                                          </p>
                                        </div>
                                        <span>{money.format(lineTotal)}</span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            <section className="panel staff-panel">
              <div className="panel-head split-head">
                <div>
                  <h3>Staff Control</h3>
                  <p>Manage cashier accounts only.</p>
                </div>
                <div className="search-box small-width">
                  <Search size={16} />
                  <input
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Search cashier accounts..."
                  />
                </div>
              </div>

              <div className="form-grid user-grid">
                <input
                  value={newCashier.username}
                  onChange={(e) => setNewCashier({ ...newCashier, username: e.target.value })}
                  placeholder="Cashier username"
                />
                <input
                  type="password"
                  value={newCashier.password}
                  onChange={(e) => setNewCashier({ ...newCashier, password: e.target.value })}
                  placeholder="Cashier password"
                />
                <button className="primary-btn" onClick={addCashier} disabled={saving}>
                  <Plus size={16} /> Add Cashier Account
                </button>
              </div>

              <div className="section-scroll compact-scroll">
                <div className="user-list">
                  {cashierUsers.length === 0 ? (
                    <div className="empty-mini">No cashier accounts found.</div>
                  ) : (
                    cashierUsers.map((user) => (
                      <div className="user-row" key={user.id}>
                        <div>
                          <strong>{user.username}</strong>
                          <p>cashier</p>
                        </div>
                        <button className="icon-btn danger" onClick={() => deleteCashier(user.id)} disabled={saving}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>

          {loading && <div className="loading-overlay">Loading manager dashboard...</div>}
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

        html, body, #root {
          height: 100%;
        }

        body {
          overflow: hidden;
          background: var(--bg);
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

        .spark {
          position: absolute;
          color: rgba(139, 107, 63, 0.85);
          animation: floatSpark 2.2s ease-in-out infinite;
        }

        .spark-1 { top: 14px; right: 18px; }
        .spark-2 { left: 18px; top: 22px; animation-delay: 0.4s; }

        .pulse-ring {
          position: absolute;
          inset: 18px;
          border-radius: 22px;
          border: 1px solid rgba(139, 107, 63, 0.12);
          animation: ringPulse 1.6s ease-in-out infinite;
          pointer-events: none;
        }

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

        @keyframes floatSpark {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          50% { transform: translateY(-6px) rotate(10deg); opacity: 1; }
        }

        @keyframes ringPulse {
          0% { transform: scale(1); opacity: 0.28; }
          70% { transform: scale(1.05); opacity: 0; }
          100% { transform: scale(1.05); opacity: 0; }
        }

        .page {
          height: 100vh;
          display: flex;
          align-items: stretch;
          justify-content: center;
          padding: 12px;
          background:
            radial-gradient(circle at top left, rgba(139, 107, 63, 0.12), transparent 30%),
            radial-gradient(circle at bottom right, rgba(20, 20, 20, 0.08), transparent 28%),
            var(--bg);
        }

        .card {
          width: 100%;
          height: calc(100vh - 24px);
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          border-radius: 28px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 26px 64px rgba(20, 20, 20, 0.12);
        }

        .left {
          position: relative;
          padding: 36px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: #fff;
          overflow: auto;
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
          word-break: break-word;
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
          padding: 28px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          background: linear-gradient(180deg, #fff, #fcfaf8);
          position: relative;
        }

        .form-header h2 {
          font-size: 34px;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 8px;
        }

        .form-header p {
          color: var(--muted);
          line-height: 1.6;
          margin-bottom: 14px;
        }

        .notice {
          margin-bottom: 12px;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(139, 107, 63, 0.08);
          border: 1px solid rgba(139, 107, 63, 0.14);
          color: var(--accent-dark);
          font-size: 13px;
          flex: 0 0 auto;
        }

        .workspace-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.42fr) minmax(0, 1fr);
          grid-template-rows: auto 1fr 1fr;
          grid-template-areas:
            "hero hero"
            "inventory transactions"
            "inventory staff";
          gap: 14px;
          align-items: stretch;
          min-height: 0;
          flex: 1;
          overflow: hidden;
        }

        .panel {
          background: linear-gradient(180deg, #fff, #fcfaf8);
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 16px;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .hero-panel { grid-area: hero; padding: 18px; }
        .inventory-panel { grid-area: inventory; }
        .transactions-panel { grid-area: transactions; }
        .staff-panel { grid-area: staff; }

        .panel-head {
          margin-bottom: 12px;
          flex: 0 0 auto;
        }

        .panel-head h3 {
          font-size: 18px;
          color: var(--text);
          margin-bottom: 4px;
        }

        .panel-head p {
          color: var(--muted);
          font-size: 13px;
        }

        .split-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.08fr 1fr;
          gap: 12px;
          align-items: stretch;
          min-height: 0;
          flex: 1;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .metric-card {
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 18px;
          background: #fff;
          box-shadow: 0 10px 24px rgba(20, 20, 20, 0.04);
          min-height: 102px;
        }

        .metric-card span {
          display: block;
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .metric-card strong {
          display: block;
          font-size: 22px;
          color: var(--accent-dark);
          line-height: 1.1;
        }

        .chart-card {
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 16px;
          background: rgba(250, 247, 242, 0.65);
          min-height: 0;
          overflow: hidden;
        }

        .chart-head h4 {
          color: var(--text);
          font-size: 15px;
          margin-bottom: 4px;
        }

        .chart-head p {
          color: var(--muted);
          font-size: 12px;
          margin-bottom: 12px;
        }

        .chart-bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chart-row {
          display: grid;
          grid-template-columns: 52px 1fr 90px;
          gap: 10px;
          align-items: center;
        }

        .chart-date,
        .chart-value {
          font-size: 12px;
          color: var(--muted);
        }

        .chart-track {
          height: 11px;
          border-radius: 999px;
          background: rgba(139, 107, 63, 0.1);
          overflow: hidden;
        }

        .chart-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, var(--accent), var(--accent-dark));
        }

        .search-box {
          width: min(460px, 100%);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 16px;
          background: var(--soft);
          border: 1px solid var(--line);
          flex: 0 0 auto;
        }

        .small-width {
          width: min(340px, 100%);
        }

        .inline-search {
          margin-bottom: 12px;
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
        }

        .category-row.compact {
          justify-content: flex-end;
        }

        .category-pill {
          border: 1px solid var(--line);
          background: #fff;
          color: #4c463f;
          border-radius: 999px;
          padding: 9px 13px;
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

        .inventory-scroll,
        .section-scroll {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding-right: 4px;
        }

        .compact-scroll {
          padding-bottom: 2px;
        }

        .order-grid,
        .item-list,
        .user-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .empty-mini {
          min-height: 104px;
          display: grid;
          place-items: center;
          color: var(--muted);
          border: 1px dashed var(--line);
          border-radius: 16px;
          background: rgba(250, 247, 242, 0.55);
          padding: 14px;
          font-size: 13px;
        }

        .item-card {
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 12px;
          background: #fff;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          box-shadow: 0 10px 24px rgba(20, 20, 20, 0.04);
        }

        .item-card.low-stock {
          border-color: rgba(176, 75, 75, 0.24);
          background: rgba(176, 75, 75, 0.04);
        }

        .item-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(139, 107, 63, 0.1);
          color: var(--accent-dark);
        }

        .item-info h4 {
          font-size: 14px;
          color: var(--text);
          margin-bottom: 4px;
        }

        .item-info p {
          color: var(--muted);
          font-size: 12px;
          margin-bottom: 4px;
        }

        .item-info small {
          color: #8c8279;
          font-size: 11px;
        }

        .item-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .stock-pill,
        .alert-count {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .stock-pill.good {
          background: rgba(47, 143, 87, 0.12);
          color: var(--good);
          border: 1px solid rgba(47, 143, 87, 0.22);
        }

        .stock-pill.low {
          background: rgba(197, 138, 42, 0.12);
          color: var(--low);
          border: 1px solid rgba(197, 138, 42, 0.22);
        }

        .stock-pill.out {
          background: rgba(176, 75, 75, 0.12);
          color: var(--out);
          border: 1px solid rgba(176, 75, 75, 0.22);
        }

        .price-line {
          margin-top: 6px;
          font-weight: 800;
          color: var(--accent-dark);
          font-size: 13px;
        }

        .item-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .action-row {
          display: inline-flex;
          gap: 8px;
        }

        .icon-btn {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--soft);
          color: var(--accent-dark);
          border: 1px solid var(--line);
        }

        .icon-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .icon-btn.danger {
          color: var(--out);
        }

        .order-card {
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
        }

        .order-card-top {
          width: 100%;
          border: none;
          background: transparent;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px;
          cursor: pointer;
          text-align: left;
        }

        .order-card-top h4 {
          color: var(--text);
          font-size: 14px;
          margin-bottom: 4px;
        }

        .order-card-top p {
          color: var(--muted);
          font-size: 12px;
        }

        .order-card-meta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--accent-dark);
          white-space: nowrap;
        }

        .order-details {
          border-top: 1px solid var(--line);
          padding: 12px;
          background: rgba(250, 247, 242, 0.5);
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 10px;
        }

        .detail-grid div {
          padding: 10px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid var(--line);
        }

        .detail-grid span {
          display: block;
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 4px;
        }

        .detail-grid strong {
          color: var(--text);
          font-size: 13px;
        }

        .sold-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sold-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 10px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid var(--line);
        }

        .sold-row p {
          color: var(--muted);
          font-size: 12px;
          margin-top: 3px;
        }

        .form-grid {
          display: grid;
          gap: 10px;
          margin-bottom: 12px;
        }

        .user-grid {
          grid-template-columns: 1.2fr 1.2fr 1fr;
        }

        .form-grid input {
          width: 100%;
          border: 1px solid var(--line);
          background: var(--soft);
          border-radius: 14px;
          padding: 12px 13px;
          font-size: 14px;
          outline: none;
          color: var(--text);
        }

        .primary-btn,
        .ghost-btn {
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 14px;
        }

        .primary-btn {
          background: linear-gradient(135deg, var(--accent), var(--accent-dark));
          color: #fff;
          font-weight: 700;
        }

        .ghost-btn {
          background: #fff;
          color: var(--accent-dark);
          border: 1px solid var(--line);
        }

        .stock-adjust-wrap {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
        }

        .stock-adjust-wrap input {
          width: 100%;
          border: 1px solid var(--line);
          background: var(--soft);
          border-radius: 14px;
          padding: 12px 13px;
          font-size: 14px;
          outline: none;
          color: var(--text);
        }

        .loading-overlay {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(245, 242, 238, 0.56);
          backdrop-filter: blur(4px);
          color: var(--accent-dark);
          font-weight: 700;
          border-radius: 28px;
          z-index: 10;
        }

        .user-row {
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 12px;
          background: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        @media (max-width: 1280px) {
          body {
            overflow: auto;
          }

          .page {
            height: auto;
            min-height: 100vh;
          }

          .card {
            height: auto;
            min-height: calc(100vh - 24px);
            grid-template-columns: 280px minmax(0, 1fr);
          }

          .workspace-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
            grid-template-areas:
              "hero"
              "inventory"
              "transactions"
              "staff";
          }

          .hero-grid,
          .metric-grid,
          .detail-grid,
          .user-grid {
            grid-template-columns: 1fr 1fr;
          }

          .inventory-panel,
          .transactions-panel,
          .staff-panel {
            grid-column: auto;
            grid-row: auto;
          }
        }

        @media (max-width: 980px) {
          .card {
            grid-template-columns: 1fr;
          }

          .left,
          .right {
            padding: 22px;
          }

          .left {
            min-height: 280px;
          }

          .hero-grid,
          .metric-grid,
          .detail-grid,
          .user-grid,
          .stock-adjust-wrap {
            grid-template-columns: 1fr;
          }

          .workspace-grid {
            grid-template-columns: 1fr;
            grid-template-areas:
              "hero"
              "inventory"
              "transactions"
              "staff";
          }

          .item-card {
            grid-template-columns: 42px minmax(0, 1fr);
          }

          .item-actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }

          .order-card-top {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 8px;
          }

          .card {
            border-radius: 22px;
          }

          .left,
          .right {
            padding: 18px;
          }

          .split-head {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box,
          .small-width {
            width: 100%;
          }

          .category-row.compact {
            justify-content: flex-start;
          }

          .chart-row {
            grid-template-columns: 44px 1fr 78px;
          }
        }
      `}</style>
    </div>
  );
}
