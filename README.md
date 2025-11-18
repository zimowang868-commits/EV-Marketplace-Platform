# EV Marketplace Platform 🚗⚡

A full-stack electric vehicle (EV) commerce platform featuring a responsive frontend interface, a Node.js/Express backend API, user authentication, purchasing workflows, search + filtering, transaction history, and dynamic recommendation logic.

This project demonstrates a complete e-commerce system with RESTful API design, SQL-backed persistence, and a clean separation between UI and server logic.

---

## 🚀 Features

### 🔐 User Authentication
- Secure login endpoint
- Session token (JWT) returned on successful authentication
- Password validation & credential checks

### 🛒 Purchasing Workflow
- API to purchase an EV product
- Generates order ID, computes total price
- Records purchase in SQL database

### 📜 Transaction History
- Fetch all past orders for a user
- Includes timestamp, amount, and order metadata

### 🤖 Vehicle Recommendation Engine
- Dynamic recommendations based on selected vehicle
- Returns similar EV options by model/category

### 🔎 Item Browsing & Filtering
- Full EV catalog browsing
- Filter by category, price range, brand, model, etc.

### ⭐ Vehicle Reviews & Ratings
- Submit reviews (rating + optional comment)
- Retrieve aggregated average rating for display in:
  - Main listing view
  - Detailed product page

### 🖥️ Frontend Interface
- Responsive HTML/CSS/JS interface
- Main landing page with hero image, navbar, and category layout
- Detail page with full specs, reviews, features
- Icons, images, and assets optimized for frontend use