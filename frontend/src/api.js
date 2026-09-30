// Centralized API client for LibraryHub

const BASE_URL = import.meta.env.VITE_API_URL || "https://library-management-system-kuap.onrender.com";

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    let data;
    try {
      data = await res.json();
    } catch {
      data = { message: res.statusText || "Server response error" };
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error("Unable to connect to backend server. It may be starting up or offline.");
    }
    throw error;
  }
}

export const api = {
  // Books API
  getBooks: (search = "", category = "") => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category && category !== "All") params.append("category", category);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/books${queryString}`);
  },

  createBook: (bookData) => {
    return request("/api/books", {
      method: "POST",
      body: JSON.stringify(bookData),
    });
  },

  updateBook: (id, bookData) => {
    return request(`/api/books/${id}`, {
      method: "PUT",
      body: JSON.stringify(bookData),
    });
  },

  deleteBook: (id) => {
    return request(`/api/books/${id}`, {
      method: "DELETE",
    });
  },

  // Members API
  getMembers: (search = "") => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return request(`/api/members${query}`);
  },

  createMember: (memberData) => {
    return request("/api/members", {
      method: "POST",
      body: JSON.stringify(memberData),
    });
  },

  updateMember: (id, memberData) => {
    return request(`/api/members/${id}`, {
      method: "PUT",
      body: JSON.stringify(memberData),
    });
  },

  deleteMember: (id) => {
    return request(`/api/members/${id}`, {
      method: "DELETE",
    });
  },

  // Transactions API
  getTransactions: (status = "") => {
    const query = status && status !== "All" ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/api/transactions${query}`);
  },

  issueBook: (issueData) => {
    return request("/api/transactions/issue", {
      method: "POST",
      body: JSON.stringify(issueData),
    });
  },

  returnBook: (transactionId) => {
    return request(`/api/transactions/return/${transactionId}`, {
      method: "PUT",
    });
  },

  // System Health
  checkHealth: () => {
    return request("/api/health");
  },

  getBaseUrl: () => BASE_URL,
};
