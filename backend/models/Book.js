const mongoose = require("mongoose");


const bookSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },

        author: {
            type: String,
            required: true
        },

        isbn: {
            type: String,
            required: true,
            unique: true
        },

        category: {
            type: String,
            default: "General"
        },

        totalCopies: {
            type: Number,
            required: true,
            min: 1
        },

        availableCopies: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Book", bookSchema);