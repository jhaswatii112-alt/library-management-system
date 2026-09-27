import { useEffect, useState } from "react";
import "./App.css";
function App() {
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [bookId, setBookId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const loadData = () => {
    fetch("https://library-management-system-kuap.onrender.com/api/books")
      .then((res) => res.json())
      .then((data) => setBooks(data));

    fetch("https://library-management-system-kuap.onrender.com/api/members")
      .then((res) => res.json())
      .then((data) => setMembers(data));

    fetch("https://library-management-system-kuap.onrender.com/api/transactions")
      .then((res) => res.json())
      .then((data) => setTransactions(data));
  };

  useEffect(() => {
    loadData();
  }, []);

  const issueBook = async () => {
    if (!bookId || !memberId || !dueDate) {
      alert("Please fill all fields");
      return;
    }

    const response = await fetch(
      "https://library-management-system-kuap.onrender.com/api/transactions/issue",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId,
          memberId,
          dueDate,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      alert("Book issued successfully!");
      loadData();
      setBookId("");
      setMemberId("");
      setDueDate("");
    } else {
      alert(data.message || "Something went wrong");
    }
  };

  const returnBook = async (transactionId) => {
    const response = await fetch(
      `https://library-management-system-kuap.onrender.com/api/transactions/return/${transactionId}`,
      {
        method: "PUT",
      }
    );

    const data = await response.json();

    if (response.ok) {
      alert("Book returned successfully!");
      loadData();
    } else {
      alert(data.message || "Something went wrong");
    }
  };

  return (
    <div>
      <div className="dashboard">
    <div className="card">
        <h3>Total Books</h3>
        <p>{books.length}</p>
    </div>

    <div className="card">
        <h3>Available Books</h3>
        <p>
            {books.reduce(
                (total, book) => total + book.availableCopies,
                0
            )}
        </p>
    </div>

    <div className="card">
        <h3>Total Members</h3>
        <p>{members.length}</p>
    </div>

    <div className="card">
        <h3>Issued Books</h3>
        <p>
            {transactions.filter(
                (transaction) => transaction.status === "Issued"
            ).length}
        </p>
    </div>
</div>
      <h1>Library Management System</h1>
      <h2>Books List</h2>

<table className="data-table">
  <thead>
    <tr>
      <th>Title</th>
      <th>Author</th>
      <th>Category</th>
      <th>Total Copies</th>
      <th>Available Copies</th>
    </tr>
  </thead>

  <tbody>
    {books.map((book) => (
      <tr key={book._id}>
        <td>{book.title}</td>
        <td>{book.author}</td>
        <td>{book.category}</td>
        <td>{book.totalCopies}</td>
        <td>{book.availableCopies}</td>
      </tr>
    ))}
  </tbody>
</table>
<h2>Members List</h2>

<table className="data-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Phone</th>
      <th>Member ID</th>
      <th>Department</th>
    </tr>
  </thead>

  <tbody>
    {members.map((member) => (
      <tr key={member._id}>
        <td>{member.name}</td>
        <td>{member.email}</td>
        <td>{member.phone}</td>
        <td>{member.memberId}</td>
        <td>{member.department}</td>
      </tr>
    ))}
  </tbody>
</table>

      <h2>Issue Book</h2>

      <div>
        <label>Select Book: </label>

        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
        >
          <option value="">-- Select Book --</option>

          {books.map((book) => (
            <option key={book._id} value={book._id}>
              {book.title} - Available: {book.availableCopies}
            </option>
          ))}
        </select>
      </div>

      <br />

      <div>
        <label>Select Member: </label>

        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
        >
          <option value="">-- Select Member --</option>

          {members.map((member) => (
            <option key={member._id} value={member._id}>
              {member.name} - {member.memberId}
            </option>
          ))}
        </select>
      </div>

      <br />

      <div>
        <label>Due Date: </label>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <br />

      <button onClick={issueBook}>Issue Book</button>

      <hr />

      <h2>Issued Books</h2>

      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        transactions.map((transaction) => (
          <div key={transaction._id}>
            <p>
              <b>Book:</b>{" "}
              {transaction.book?.title || transaction.book}
            </p>

            <p>
              <b>Member:</b>{" "}
              {transaction.member?.name || transaction.member}
            </p>

            <p>
              <b>Due Date:</b>{" "}
              {new Date(transaction.dueDate).toLocaleDateString()}
            </p>

            <p>
              <b>Status:</b> {transaction.status}
            </p>

            {transaction.status === "Issued" && (
              <button onClick={() => returnBook(transaction._id)}>
                Return Book
              </button>
            )}

            <hr />
          </div>
        ))
      )}
    </div>
  );
}

export default App;