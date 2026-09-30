const express = require("express");
const Book = require("../models/Book");
const Transaction = require("../models/Transaction");

const router = express.Router();

// Get all books with optional search & filter
router.get("/", async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};

        if (category && category !== "All") {
            query.category = category;
        }

        if (search) {
            const regex = new RegExp(search.trim(), "i");
            query.$or = [
                { title: regex },
                { author: regex },
                { isbn: regex }
            ];
        }

        const books = await Book.find(query).sort({ createdAt: -1 });
        res.json(books);
    } catch (error) {
        res.status(500).json({
            message: error.message || "Failed to fetch books"
        });
    }
});

// Get single book
router.get("/:id", async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add new book
router.post("/", async (req, res) => {
    try {
        const { title, author, isbn, category, totalCopies } = req.body;

        if (!title || !author || !isbn || totalCopies === undefined) {
            return res.status(400).json({
                message: "Title, author, ISBN, and total copies are required"
            });
        }

        const parsedCopies = parseInt(totalCopies, 10);
        if (isNaN(parsedCopies) || parsedCopies < 1) {
            return res.status(400).json({
                message: "Total copies must be a positive integer (minimum 1)"
            });
        }

        // Check if ISBN exists
        const existing = await Book.findOne({ isbn: isbn.trim() });
        if (existing) {
            return res.status(400).json({
                message: "A book with this ISBN already exists"
            });
        }

        const book = await Book.create({
            title: title.trim(),
            author: author.trim(),
            isbn: isbn.trim(),
            category: category ? category.trim() : "General",
            totalCopies: parsedCopies,
            availableCopies: parsedCopies
        });

        res.status(201).json(book);
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});

// Update book
router.put("/:id", async (req, res) => {
    try {
        const { title, author, isbn, category, totalCopies } = req.body;
        const currentBook = await Book.findById(req.params.id);

        if (!currentBook) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        // If ISBN is being changed, ensure uniqueness
        if (isbn && isbn.trim() !== currentBook.isbn) {
            const existing = await Book.findOne({ isbn: isbn.trim() });
            if (existing) {
                return res.status(400).json({
                    message: "A book with this ISBN already exists"
                });
            }
            currentBook.isbn = isbn.trim();
        }

        if (title) currentBook.title = title.trim();
        if (author) currentBook.author = author.trim();
        if (category) currentBook.category = category.trim();

        if (totalCopies !== undefined) {
            const parsedCopies = parseInt(totalCopies, 10);
            if (isNaN(parsedCopies) || parsedCopies < 1) {
                return res.status(400).json({
                    message: "Total copies must be at least 1"
                });
            }

            const currentlyIssued = currentBook.totalCopies - currentBook.availableCopies;
            if (parsedCopies < currentlyIssued) {
                return res.status(400).json({
                    message: `Cannot set total copies to ${parsedCopies}. ${currentlyIssued} copies are currently issued.`
                });
            }

            // Adjust available copies based on delta
            const delta = parsedCopies - currentBook.totalCopies;
            currentBook.totalCopies = parsedCopies;
            currentBook.availableCopies += delta;
        }

        const updated = await currentBook.save();
        res.json(updated);
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});

// Delete book
router.delete("/:id", async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        // Check if there are active transactions for this book
        const activeCount = await Transaction.countDocuments({
            book: req.params.id,
            status: "Issued"
        });

        if (activeCount > 0) {
            return res.status(400).json({
                message: `Cannot delete book. There are ${activeCount} issued copy/copies not yet returned.`
            });
        }

        await Book.findByIdAndDelete(req.params.id);

        res.json({
            message: "Book deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;