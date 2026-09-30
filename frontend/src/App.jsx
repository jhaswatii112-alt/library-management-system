import { useEffect, useState, useMemo } from "react";
import { api } from "./api";
import "./App.css";

let toastCounter = 0;

export default function App() {
  // Main Data States
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendStatus, setBackendStatus] = useState("connecting");

  // Navigation & Theme
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "dark");

  // Filter & Search States
  const [searchBooks, setSearchBooks] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchMembers, setSearchMembers] = useState("");
  const [transactionStatusFilter, setTransactionStatusFilter] = useState("All");

  // Modals & Forms
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, type: "", id: "", label: "" });

  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "General",
    totalCopies: 1,
  });

  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    phone: "",
    memberId: "",
    department: "",
  });

  const [issueForm, setIssueForm] = useState({
    bookId: "",
    memberId: "",
    dueDate: "",
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Load Data Helper
  const refreshData = async () => {
    try {
      const [booksData, membersData, txData] = await Promise.all([
        api.getBooks(),
        api.getMembers(),
        api.getTransactions(),
      ]);

      setBooks(Array.isArray(booksData) ? booksData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
      setTransactions(Array.isArray(txData) ? txData : []);
      setBackendStatus("connected");
    } catch (err) {
      console.error("Failed to refresh library data:", err);
      showToast(err.message || "Failed to load data from backend server", "error");
    }
  };

  useEffect(() => {
    let ignore = false;

    async function initialFetch() {
      try {
        const [booksData, membersData, txData] = await Promise.all([
          api.getBooks(),
          api.getMembers(),
          api.getTransactions(),
        ]);

        if (!ignore) {
          setBooks(Array.isArray(booksData) ? booksData : []);
          setMembers(Array.isArray(membersData) ? membersData : []);
          setTransactions(Array.isArray(txData) ? txData : []);
          setBackendStatus("connected");
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load library data:", err);
          setBackendStatus("error");
          showToast(err.message || "Failed to load data from backend server", "error");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    initialFetch();

    return () => {
      ignore = true;
    };
  }, []);

  // Preset Due Date Setter
  const setPresetDueDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const formatted = d.toISOString().split("T")[0];
    setIssueForm((prev) => ({ ...prev, dueDate: formatted }));
  };

  // Category List
  const categories = useMemo(() => {
    const set = new Set(["All"]);
    books.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [books]);

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesSearch =
        (b.title?.toLowerCase() || "").includes(searchBooks.toLowerCase()) ||
        (b.author?.toLowerCase() || "").includes(searchBooks.toLowerCase()) ||
        (b.isbn?.toLowerCase() || "").includes(searchBooks.toLowerCase());

      const matchesCat = selectedCategory === "All" || b.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [books, searchBooks, selectedCategory]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      return (
        (m.name?.toLowerCase() || "").includes(searchMembers.toLowerCase()) ||
        (m.memberId?.toLowerCase() || "").includes(searchMembers.toLowerCase()) ||
        (m.department?.toLowerCase() || "").includes(searchMembers.toLowerCase()) ||
        (m.email?.toLowerCase() || "").includes(searchMembers.toLowerCase())
      );
    });
  }, [members, searchMembers]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (transactionStatusFilter === "All") return transactions;
    return transactions.filter((t) => t.status === transactionStatusFilter);
  }, [transactions, transactionStatusFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalTitles = books.length;
    const totalCopies = books.reduce((sum, b) => sum + (b.totalCopies || 0), 0);
    const availableCopies = books.reduce((sum, b) => sum + (b.availableCopies || 0), 0);
    const totalMembers = members.length;
    const activeIssued = transactions.filter((t) => t.status === "Issued").length;

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      totalMembers,
      activeIssued,
    };
  }, [books, members, transactions]);

  // Handlers: Issue Book
  const handleIssueBook = async (e) => {
    e.preventDefault();
    if (!issueForm.bookId || !issueForm.memberId || !issueForm.dueDate) {
      showToast("Please select a book, member, and due date", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.issueBook(issueForm);
      showToast("Book issued successfully!", "success");
      setIssueForm({ bookId: "", memberId: "", dueDate: "" });
      await refreshData();
      if (activeTab === "overview") setActiveTab("loans");
    } catch (err) {
      showToast(err.message || "Failed to issue book", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers: Return Book
  const handleReturnBook = async (transactionId) => {
    setIsSubmitting(true);
    try {
      await api.returnBook(transactionId);
      showToast("Book returned successfully! Inventory updated.", "success");
      await refreshData();
    } catch (err) {
      showToast(err.message || "Failed to return book", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers: Add Book
  const handleAddBook = async (e) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.author || !bookForm.isbn) {
      showToast("Please fill in Title, Author, and ISBN", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createBook(bookForm);
      showToast(`"${bookForm.title}" added to catalog!`, "success");
      setIsAddBookModalOpen(false);
      setBookForm({ title: "", author: "", isbn: "", category: "General", totalCopies: 1 });
      await refreshData();
    } catch (err) {
      showToast(err.message || "Failed to add book", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers: Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberForm.name || !memberForm.email || !memberForm.memberId || !memberForm.department) {
      showToast("Please fill in all member fields", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createMember(memberForm);
      showToast(`Member "${memberForm.name}" registered!`, "success");
      setIsAddMemberModalOpen(false);
      setMemberForm({ name: "", email: "", phone: "", memberId: "", department: "" });
      await refreshData();
    } catch (err) {
      showToast(err.message || "Failed to register member", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers: Confirm Delete
  const handleConfirmDelete = async () => {
    const { type, id } = deleteDialog;
    if (!id) return;

    setIsSubmitting(true);
    try {
      if (type === "book") {
        await api.deleteBook(id);
        showToast("Book deleted successfully", "success");
      } else if (type === "member") {
        await api.deleteMember(id);
        showToast("Member deleted successfully", "success");
      }
      setDeleteDialog({ isOpen: false, type: "", id: "", label: "" });
      await refreshData();
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-container" id="toastContainer">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type} animate-fade-in`}>
            <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "⚠️" : "ℹ️"}</span>
            <span>{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* App Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
            </svg>
          </div>
          <div>
            <h1 className="brand-title">LibraryHub</h1>
            <p className="brand-subtitle">Smart Library & Resource Management System</p>
          </div>
        </div>

        <div className="header-controls">
          <div className="status-badge" title="Connection to Render Backend">
            <span className="status-dot"></span>
            {backendStatus === "connected"
              ? "Backend Live"
              : backendStatus === "connecting"
              ? "Connecting..."
              : "Backend Offline"}
          </div>

          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            id="themeToggleBtn"
            title="Toggle Dark / Light Mode"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="tabs-nav" aria-label="Main Navigation">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
          id="navOverviewBtn"
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === "books" ? "active" : ""}`}
          onClick={() => setActiveTab("books")}
          id="navBooksBtn"
        >
          📚 Books ({books.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
          onClick={() => setActiveTab("members")}
          id="navMembersBtn"
        >
          👥 Members ({members.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "loans" ? "active" : ""}`}
          onClick={() => setActiveTab("loans")}
          id="navLoansBtn"
        >
          🔄 Issue & Returns ({metrics.activeIssued})
        </button>
      </nav>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div>
          <div className="skeleton-row" style={{ height: "100px" }}></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* Metrics Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon-wrap metric-icon-blue">📚</div>
                  <div className="metric-info">
                    <h3>Total Titles</h3>
                    <p className="metric-number">{metrics.totalTitles}</p>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap metric-icon-green">✨</div>
                  <div className="metric-info">
                    <h3>Available Copies</h3>
                    <p className="metric-number">{metrics.availableCopies}</p>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap metric-icon-purple">👥</div>
                  <div className="metric-info">
                    <h3>Registered Members</h3>
                    <p className="metric-number">{metrics.totalMembers}</p>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap metric-icon-amber">🔖</div>
                  <div className="metric-info">
                    <h3>Currently Issued</h3>
                    <p className="metric-number">{metrics.activeIssued}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="action-bar" style={{ background: "var(--bg-card)", padding: "18px 24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
                <div>
                  <h3 style={{ fontSize: "16px", color: "var(--text-primary)" }}>Quick Actions</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Manage your collection or issue materials immediately</p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button className="btn btn-primary" onClick={() => setIsAddBookModalOpen(true)}>
                    + Add Book
                  </button>
                  <button className="btn btn-secondary" onClick={() => setIsAddMemberModalOpen(true)}>
                    + Add Member
                  </button>
                  <button className="btn btn-primary" style={{ background: "#8b5cf6" }} onClick={() => setActiveTab("loans")}>
                    ⚡ Issue Book
                  </button>
                </div>
              </div>

              {/* Recent Loans */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h2 style={{ fontSize: "18px" }}>Recent Activity</h2>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab("loans")}>
                    View All Loans →
                  </button>
                </div>

                <div className="table-container">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Book Title</th>
                        <th>Member</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 5).map((t) => (
                        <tr key={t._id}>
                          <td style={{ fontWeight: 600 }}>{t.book?.title || "Unknown Book"}</td>
                          <td>
                            {t.member?.name || "Unknown Member"}{" "}
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                              ({t.member?.memberId || "N/A"})
                            </span>
                          </td>
                          <td>{new Date(t.issueDate || t.createdAt).toLocaleDateString()}</td>
                          <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${t.status === "Issued" ? "badge-issued" : "badge-returned"}`}>
                              {t.status}
                            </span>
                          </td>
                          <td>
                            {t.status === "Issued" && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleReturnBook(t._id)}
                                disabled={isSubmitting}
                              >
                                Return
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)" }}>
                            No loans or activity recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOKS */}
          {activeTab === "books" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="action-bar">
                <div className="search-input-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by title, author, or ISBN..."
                    value={searchBooks}
                    onChange={(e) => setSearchBooks(e.target.value)}
                    id="searchBooksInput"
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => setIsAddBookModalOpen(true)}
                  id="openAddBookBtn"
                >
                  + Add New Book
                </button>
              </div>

              {/* Category Pills */}
              <div className="category-filter-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`filter-pill ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Books Table */}
              <div className="table-container">
                <table className="modern-table" id="booksTable">
                  <thead>
                    <tr>
                      <th>Title & Author</th>
                      <th>Category</th>
                      <th>ISBN</th>
                      <th>Total Copies</th>
                      <th>Available</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((book) => (
                      <tr key={book._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{book.title}</div>
                          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>by {book.author}</div>
                        </td>
                        <td>
                          <span className="badge badge-category">{book.category || "General"}</span>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{book.isbn}</td>
                        <td style={{ textAlign: "center", fontWeight: 500 }}>{book.totalCopies}</td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: book.availableCopies > 0 ? "var(--success)" : "var(--danger)" }}>
                          {book.availableCopies}
                        </td>
                        <td>
                          <span className={`badge ${book.availableCopies > 0 ? "badge-in-stock" : "badge-out-of-stock"}`}>
                            {book.availableCopies > 0 ? `${book.availableCopies} Available` : "Out of Stock"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {book.availableCopies > 0 && (
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setIssueForm((prev) => ({ ...prev, bookId: book._id }));
                                  setActiveTab("loans");
                                }}
                                title="Issue this book"
                              >
                                Issue
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() =>
                                setDeleteDialog({
                                  isOpen: true,
                                  type: "book",
                                  id: book._id,
                                  label: `Book: "${book.title}"`,
                                })
                              }
                              title="Delete Book"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredBooks.length === 0 && (
                      <tr>
                        <td colSpan="7">
                          <div className="empty-state">
                            <div className="empty-state-icon">📖</div>
                            <h4>No books found</h4>
                            <p>Try refining your search terms or add a new book to the catalog.</p>
                            <button className="btn btn-primary" onClick={() => setIsAddBookModalOpen(true)}>
                              + Add Book Now
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MEMBERS */}
          {activeTab === "members" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="action-bar">
                <div className="search-input-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by name, ID, or department..."
                    value={searchMembers}
                    onChange={(e) => setSearchMembers(e.target.value)}
                    id="searchMembersInput"
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => setIsAddMemberModalOpen(true)}
                  id="openAddMemberBtn"
                >
                  + Add New Member
                </button>
              </div>

              {/* Members Table */}
              <div className="table-container">
                <table className="modern-table" id="membersTable">
                  <thead>
                    <tr>
                      <th>Member Name</th>
                      <th>Member ID</th>
                      <th>Department</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Active Loans</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const activeLoansCount = transactions.filter(
                        (t) => (t.member?._id === member._id || t.member === member._id) && t.status === "Issued"
                      ).length;

                      return (
                        <tr key={member._id}>
                          <td style={{ fontWeight: 600 }}>{member.name}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{member.memberId}</td>
                          <td>
                            <span className="badge badge-category">{member.department}</span>
                          </td>
                          <td>{member.email}</td>
                          <td>{member.phone}</td>
                          <td>
                            <span className={`badge ${activeLoansCount > 0 ? "badge-issued" : "badge-returned"}`}>
                              {activeLoansCount} Active
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() =>
                                setDeleteDialog({
                                  isOpen: true,
                                  type: "member",
                                  id: member._id,
                                  label: `Member: ${member.name} (${member.memberId})`,
                                })
                              }
                              title="Delete Member"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan="7">
                          <div className="empty-state">
                            <div className="empty-state-icon">👥</div>
                            <h4>No members found</h4>
                            <p>Register new library members to enable book borrowing.</p>
                            <button className="btn btn-primary" onClick={() => setIsAddMemberModalOpen(true)}>
                              + Register Member
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LOANS & RETURNS */}
          {activeTab === "loans" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* Issue Book Panel */}
              <div
                style={{
                  background: "var(--bg-card)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "24px",
                }}
              >
                <h3 style={{ fontSize: "18px", marginBottom: "4px", color: "var(--text-primary)" }}>
                  ⚡ Issue Book to Member
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Select an available book copy, assign it to a registered patron, and choose the loan duration.
                </p>

                <form onSubmit={handleIssueBook} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px", alignItems: "end" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="issueBookSelect">Select Book *</label>
                    <select
                      id="issueBookSelect"
                      className="form-select"
                      value={issueForm.bookId}
                      onChange={(e) => setIssueForm((prev) => ({ ...prev, bookId: e.target.value }))}
                      required
                    >
                      <option value="">-- Choose Book --</option>
                      {books.map((b) => (
                        <option key={b._id} value={b._id} disabled={b.availableCopies <= 0}>
                          {b.title} ({b.availableCopies > 0 ? `${b.availableCopies} available` : "Out of stock"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="issueMemberSelect">Select Member *</label>
                    <select
                      id="issueMemberSelect"
                      className="form-select"
                      value={issueForm.memberId}
                      onChange={(e) => setIssueForm((prev) => ({ ...prev, memberId: e.target.value }))}
                      required
                    >
                      <option value="">-- Choose Member --</option>
                      {members.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.memberId} - {m.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="issueDueDate">Due Date *</label>
                    <input
                      id="issueDueDate"
                      type="date"
                      className="form-input"
                      value={issueForm.dueDate}
                      onChange={(e) => setIssueForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                      required
                    />
                    <div className="quick-date-chips">
                      <span className="chip" onClick={() => setPresetDueDate(7)}>+7 Days</span>
                      <span className="chip" onClick={() => setPresetDueDate(14)}>+14 Days</span>
                      <span className="chip" onClick={() => setPresetDueDate(30)}>+30 Days</span>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "11px 20px" }}
                      disabled={isSubmitting || !issueForm.bookId || !issueForm.memberId || !issueForm.dueDate}
                      id="submitIssueBtn"
                    >
                      {isSubmitting ? "Processing..." : "Confirm & Issue Book"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Transactions History Header & Filters */}
              <div>
                <div className="action-bar" style={{ marginBottom: "14px" }}>
                  <h3 style={{ fontSize: "18px", color: "var(--text-primary)" }}>Transaction & Loan History</h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["All", "Issued", "Returned"].map((status) => (
                      <button
                        key={status}
                        className={`filter-pill ${transactionStatusFilter === status ? "active" : ""}`}
                        onClick={() => setTransactionStatusFilter(status)}
                      >
                        {status} Loans
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-container">
                  <table className="modern-table" id="transactionsTable">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>Member</th>
                        <th>Issued Date</th>
                        <th>Due Date</th>
                        <th>Return Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => {
                        const isOverdue =
                          tx.status === "Issued" && new Date(tx.dueDate) < new Date();

                        return (
                          <tr key={tx._id}>
                            <td style={{ fontWeight: 600 }}>{tx.book?.title || "Book Removed"}</td>
                            <td>
                              <div>{tx.member?.name || "Member Removed"}</div>
                              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                {tx.member?.memberId || "N/A"}
                              </div>
                            </td>
                            <td>{new Date(tx.issueDate || tx.createdAt).toLocaleDateString()}</td>
                            <td style={{ color: isOverdue ? "var(--danger)" : "inherit", fontWeight: isOverdue ? 700 : 400 }}>
                              {new Date(tx.dueDate).toLocaleDateString()}
                              {isOverdue && <span style={{ fontSize: "11px", display: "block", color: "var(--danger)" }}>⚠️ Overdue</span>}
                            </td>
                            <td>{tx.returnDate ? new Date(tx.returnDate).toLocaleDateString() : "—"}</td>
                            <td>
                              <span className={`badge ${tx.status === "Issued" ? "badge-issued" : "badge-returned"}`}>
                                {tx.status}
                              </span>
                            </td>
                            <td>
                              {tx.status === "Issued" && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleReturnBook(tx._id)}
                                  disabled={isSubmitting}
                                >
                                  Mark Returned
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan="7">
                            <div className="empty-state">
                              <div className="empty-state-icon">📋</div>
                              <h4>No transactions found</h4>
                              <p>No transactions match the selected filter criteria.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: ADD BOOK */}
      {isAddBookModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddBookModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Book to Catalog</h3>
              <button className="modal-close-btn" onClick={() => setIsAddBookModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddBook}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="bookTitle">Book Title *</label>
                  <input
                    id="bookTitle"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Introduction to Algorithms"
                    value={bookForm.title}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bookAuthor">Author *</label>
                  <input
                    id="bookAuthor"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Thomas H. Cormen"
                    value={bookForm.author}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, author: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bookIsbn">ISBN Number *</label>
                  <input
                    id="bookIsbn"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 978-0262033848"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, isbn: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bookCategory">Category</label>
                  <input
                    id="bookCategory"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Computer Science, Fiction, Science"
                    value={bookForm.category}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, category: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bookCopies">Total Copies *</label>
                  <input
                    id="bookCopies"
                    type="number"
                    min="1"
                    className="form-input"
                    value={bookForm.totalCopies}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, totalCopies: parseInt(e.target.value, 10) || 1 }))}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddBookModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MEMBER */}
      {isAddMemberModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddMemberModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Member</h3>
              <button className="modal-close-btn" onClick={() => setIsAddMemberModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="memberName">Full Name *</label>
                  <input
                    id="memberName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Jane Doe"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="memberEmail">Email Address *</label>
                  <input
                    id="memberEmail"
                    type="email"
                    className="form-input"
                    placeholder="e.g. jane.doe@university.edu"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="memberId">Member ID *</label>
                  <input
                    id="memberId"
                    type="text"
                    className="form-input"
                    placeholder="e.g. MEM-2024-001"
                    value={memberForm.memberId}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, memberId: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="memberPhone">Phone Number *</label>
                  <input
                    id="memberPhone"
                    type="text"
                    className="form-input"
                    placeholder="e.g. +1 555-0192"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="memberDept">Department *</label>
                  <input
                    id="memberDept"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Computer Science, Mathematics"
                    value={memberForm.department}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, department: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddMemberModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Registering..." : "Register Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {deleteDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setDeleteDialog({ isOpen: false, type: "", id: "", label: "" })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: "var(--danger)" }}>Confirm Deletion</h3>
              <button
                className="modal-close-btn"
                onClick={() => setDeleteDialog({ isOpen: false, type: "", id: "", label: "" })}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--text-primary)", fontSize: "15px" }}>
                Are you sure you want to permanently delete this {deleteDialog.type}?
              </p>
              <p style={{ fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-tertiary)", padding: "10px 14px", borderRadius: "var(--radius-sm)" }}>
                {deleteDialog.label}
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Note: Deletion will be rejected if this item is currently tied to any active issued book transactions.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteDialog({ isOpen: false, type: "", id: "", label: "" })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}