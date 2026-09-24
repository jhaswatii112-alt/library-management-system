const express = require("express");
const Transaction = require("../models/Transaction");
const Book = require("../models/Book");

const router = express.Router();

// Issue Book
// Get all transactions
router.get("/", async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate("book")
            .populate("member");

        res.json(transactions);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
router.post("/issue", async (req, res) => {
    try {
        const { bookId, memberId, dueDate } = req.body;

        const book = await Book.findById(bookId);

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        if (book.availableCopies <= 0) {
            return res.status(400).json({
                message: "Book is not available"
            });
        }

        const transaction = await Transaction.create({
            book: bookId,
            member: memberId,
            dueDate: dueDate
        });

        book.availableCopies -= 1;
        await book.save();

        res.status(201).json({
            message: "Book issued successfully",
            transaction
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});
// Return Book
router.put("/return/:id", async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found"
            });
        }

        if (transaction.status === "Returned") {
            return res.status(400).json({
                message: "Book already returned"
            });
        }

        transaction.status = "Returned";
        transaction.returnDate = new Date();

        await transaction.save();

        const book = await Book.findById(transaction.book);

        if (book) {
            book.availableCopies += 1;
            await book.save();
        }

        res.json({
            message: "Book returned successfully",
            transaction
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});
module.exports = router;