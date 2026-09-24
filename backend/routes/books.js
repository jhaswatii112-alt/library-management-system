const express = require("express");
const Book = require("../models/Book");

const router = express.Router();

// Get all books
router.get("/", async (req, res) => {
    try {
        const books = await Book.find();
        res.json(books);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

// Add new book
router.post("/", async (req, res) => {
    try {
        const {
            title,
            author,
            isbn,
            category,
            totalCopies
        } = req.body;

        const book = await Book.create({
            title,
            author,
            isbn,
            category,
            totalCopies,
            availableCopies: totalCopies
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
        const book = await Book.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.json(book);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});

// Delete book
router.delete("/:id", async (req, res) => {
    try {
        const book = await Book.findByIdAndDelete(
            req.params.id
        );

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

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