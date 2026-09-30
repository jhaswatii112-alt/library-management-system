const express = require("express");
const Transaction = require("../models/Transaction");
const Book = require("../models/Book");
const Member = require("../models/Member");

const router = express.Router();

// Get all transactions (with optional status filter)
router.get("/", async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};

        if (status && status !== "All") {
            query.status = status;
        }

        const transactions = await Transaction.find(query)
            .populate("book")
            .populate("member")
            .sort({ createdAt: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({
            message: error.message || "Failed to fetch transactions"
        });
    }
});

// Issue Book (Atomic operation with validations)
router.post("/issue", async (req, res) => {
    try {
        const { bookId, memberId, dueDate } = req.body;

        if (!bookId || !memberId || !dueDate) {
            return res.status(400).json({
                message: "Book ID, Member ID, and Due Date are required"
            });
        }

        // Validate member exists
        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        // Validate dueDate
        const parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
            return res.status(400).json({
                message: "Invalid due date format"
            });
        }

        // Atomic check and decrement of availableCopies
        const book = await Book.findOneAndUpdate(
            { _id: bookId, availableCopies: { $gt: 0 } },
            { $inc: { availableCopies: -1 } },
            { new: true }
        );

        if (!book) {
            return res.status(400).json({
                message: "Book is not available or has 0 available copies"
            });
        }

        // Create transaction record
        const transaction = await Transaction.create({
            book: bookId,
            member: memberId,
            dueDate: parsedDueDate,
            issueDate: new Date(),
            status: "Issued"
        });

        const populated = await Transaction.findById(transaction._id)
            .populate("book")
            .populate("member");

        res.status(201).json({
            message: "Book issued successfully",
            transaction: populated
        });

    } catch (error) {
        res.status(400).json({
            message: error.message || "Failed to issue book"
        });
    }
});

// Return Book (Atomic update with guard)
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
                message: "Book has already been returned"
            });
        }

        // Update transaction status
        transaction.status = "Returned";
        transaction.returnDate = new Date();
        await transaction.save();

        // Increment book available copies safely
        const book = await Book.findById(transaction.book);
        if (book && book.availableCopies < book.totalCopies) {
            book.availableCopies += 1;
            await book.save();
        }

        const populated = await Transaction.findById(transaction._id)
            .populate("book")
            .populate("member");

        res.json({
            message: "Book returned successfully",
            transaction: populated
        });

    } catch (error) {
        res.status(400).json({
            message: error.message || "Failed to return book"
        });
    }
});

module.exports = router;