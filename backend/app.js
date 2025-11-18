/**
 * Backend JS file to handle...
 */

"use strict";

const express = require("express");
const app = express();

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(express.json());

/**
 * Handles user login, retrieving previous transactions, and getting recommendations
 *
 * @function
 * @name POST /user
 * @async
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object, if successful
 *
 * @throws {401} Unauthorized - If the provided credentials are invalid.
 * @throws {400} Bad Request - If there are missing params.
 * @throws {500} Internal Server Error - If the server crashes.
 */
app.post('/user', async function(req, res) {
  const {username, password} = req.body;
  if (!username || !password) {
    res.status(400)
      .type('text')
      .send('Missing username and/or password');
    return;
  }
  try {
    const userId = await authenticateUser(username, password);
    if (!userId) {
      res.status(401)
        .type('text')
        .send('Incorrect username and/or password');
      return;
    }
    const user = await getUserData(userId);
    res.json(user);
  } catch (err) {
    res.status(500)
      .type('text')
      .send("Internal Server Error");
  }
});

/**
 * Handles the purchase of a vehicle by a user.
 *
 * @function
 * @name POST /purchase
 * @async
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 *
 * @throws {400} Bad Request - If there are missing user ID or product ID.
 * @throws {400} Bad Request - If the requested vehicle is not available.
 * @throws {500} Internal Server Error - If there is an issue with the server.
 *
 * @returns {Object} Returns a confirmation number upon successful purchase.
 */
app.post('/purchase', async function(req, res) {
  const {userId, vehicleId} = req.body;
  if (!userId || !vehicleId) {
    res.status(400)
      .type('text')
      .send('Missing user ID or product ID');
    return;
  }
  try {
    const isVehicleAvailable = await checkVehicle(vehicleId);
    if (!isVehicleAvailable) {
      res.status(400)
        .type('text')
        .send('Vehicle not available');
      return;
    }
    const confirmation = await makePurchase(userId, vehicleId);
    res.type('text')
      .send(confirmation);
  } catch (err) {
    res.status(500)
      .type('text')
      .send("Internal Server Error");
  }
});

/**
 * Handles fetching detailed information about a specific vehicle.
 *
 * @function
 * @name GET /vehicle/:vehicleId
 * @async
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 *
 * @throws {404} Not Found - If the requested vehicle is not found.
 * @throws {500} Internal Server Error - If there is an issue with the server.
 *
 * @returns {Object} Returns detailed information about the requested vehicle.
 */
app.get('/vehicle/:vehicleId', async function(req, res) {
  const vehicleId = req.params.vehicleId;
  try {
    const vehicleInfo = await getVehicleInfo(vehicleId);
    if (!vehicleInfo) {
      res.status(404)
        .type('text')
        .send('Vehicle not found');
      return;
    }
    const feedbackData = await getProductFeedback(vehicleId);
    res.json({vehicleInfo, feedbackData});
  } catch (err) {
    res.status(500)
      .type('text')
      .send('Internal Server Error');
  }
});

/**
 * Endpoint to search the database and return results based on search query and filters.
 *
 * @function
 * @name GET /vehicles
 * @async
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 *
 * @returns {Object} - Returns an array of search results.
 */
app.get('/vehicles', async function(req, res) {
  const searchQuery = req.query.qry;
  const filters = req.query.filters;

  try {
    const results = await searchDatabase(searchQuery, filters);
    if (results.length === 0) {
      res.status(404)
        .type('text')
        .send('Results not found');
      return;
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({error: 'Internal Server Error'});
  }
});

/**
 * Searches the database and returns results based on search query and filters.
 *
 * @param {string} searchQuery - The search query string.
 * @param {string} filters - The filters to be applied.
 * @returns {Promise<Array<Object>>} - Returns an array of search results.
 *
 */
async function searchDatabase(searchQuery, filters) {
  let query = 'SELECT * FROM vehicles';

  if (searchQuery || filters) {
    query += ' WHERE';

    if (searchQuery) {
      query += ` (availability > 0 AND (model_name LIKE ? OR description LIKE ? OR tags LIKE ?))`;
    }

    if (searchQuery && filters) {
      query += ' AND';
    }

    if (filters) {
      const filterArray = filters.split(',');
      const tagConditions = filterArray.map(() => 'tags LIKE ?').join(' AND ');
      query += ` (${tagConditions})`;
    }
  }

  const db = await getDBConnection();
  try {
    const results = await db.all(query, createSearchParams(searchQuery, filters));
    return results;
  } finally {
    await db.close();
  }
}

/**
 * Creates an array of search parameters based on search query and filters.
 *
 * @param {string} searchQuery - The search query string.
 * @param {string} filters - The filters to be applied.
 * @returns {Array<string>} - Returns an array of search parameters.
 */
function createSearchParams(searchQuery, filters) {
  const params = [];
  if (searchQuery) {
    const likeParam = `%${searchQuery}%`;
    params.push(likeParam, likeParam, likeParam);
  }
  if (filters) {
    const tagParams = filters.split(',').map(tag => `%${tag}%`);
    params.push(...tagParams);
  }
  return params;
}

/**
 * Retrieves detailed information about a specific vehicle.
 *
 * @param {number} vehicleId - The ID of the vehicle.
 * @returns {Promise<Object|null>} - Returns detailed information about the vehicle if found, null
 * otherwise.
 */
async function getVehicleInfo(vehicleId) {
  const qry = 'SELECT * FROM vehicles WHERE vehicle_id = ?';
  const db = await getDBConnection();
  const vehicleInfo = await db.get(qry, vehicleId);
  await db.close();
  return vehicleInfo;
}

/**
 * Checks if a vehicle is available for purchase.
 *
 * @param {number} vehicleId - The ID of the vehicle.
 * @returns {Promise<boolean>} - Returns true if the vehicle is available, false otherwise.
 */
async function checkVehicle(vehicleId) {
  const qry = `SELECT availability FROM vehicles WHERE vehicle_id = ?`;
  const db = await getDBConnection();
  const count = await db.get(qry, vehicleId);
  await db.close();
  return (count.availability > 0);
}

/**
 * Makes a purchase transaction and updates the availability of the purchased vehicle.
 *
 * @param {number} userId - The ID of the user making the purchase.
 * @param {number} vehicleId - The ID of the vehicle being purchased.
 * @returns {Promise<string>} - Returns the confirmation number of the purchase.
 */
async function makePurchase(userId, vehicleId) {
  const confirmationNumber = genRanHex();
  const transactionQry = `INSERT INTO transactions (user_id, vehicle_id, confirmation_number, date)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
  const decrementQry = `UPDATE vehicles SET availability = availability - 1 WHERE vehicle_id = ?`;
  const db = await getDBConnection();
  await db.run(transactionQry, userId, vehicleId, confirmationNumber);
  await db.run(decrementQry, vehicleId);
  await db.close();
  return confirmationNumber;
}

/**
 * Retrieves user data including previous transactions and recommendations.
 *
 * @param {string} userId - The user ID.
 * @returns {Promise<Object|null>} - Returns user data if the user is found, null otherwise.
 */
async function getUserData(userId) {
  const qry = `
    SELECT transactions.*, vehicles.model_name AS vehicle_name
    FROM transactions
    JOIN vehicles ON transactions.vehicle_id = vehicles.vehicle_id
    WHERE transactions.user_id = ?
    ORDER BY transaction_id DESC`;
  const db = await getDBConnection();
  const transactions = await db.all(qry, userId);
  if (!transactions) {
    await db.close();
    return null;
  }
  const recommendations = await getRecommendations(userId, db);
  const userData = {
    userId,
    transactions,
    recommendations
  };
  await db.close();
  return userData;
}

/**
 * Retrieves recommendations based on the user's purchase history.
 *
 * @param {string} userId - The user ID.
 * @param {sqlite3.Database} db - The SQLite database connection.
 * @returns {Promise<Array<Object>>} - Returns an array of recommended items.
 */
async function getRecommendations(userId, db) {
  const qry = `
    SELECT vehicles.*
    FROM transactions
    JOIN vehicles ON transactions.vehicle_id = vehicles.vehicle_id
    WHERE transactions.user_id != ? AND availability > 0 AND
    vehicles.vehicle_id NOT IN (
      SELECT vehicle_id FROM transactions WHERE user_id = ?
    )
    ORDER BY RANDOM()
    LIMIT 5`;
  const recommendations = await db.all(qry, [userId, userId]);
  return recommendations;
}

/**
 * Authenticates a user based on the provided username and password.
 *
 * @param {string} username - The username of the user.
 * @param {string} password - The password of the user.
 * @returns {Promise<string|null>} - Returns the user ID if authentication is successful,
 * null otherwise.
 */
async function authenticateUser(username, password) {
  const qry = 'SELECT * FROM users WHERE username = ? AND password = ?';
  const db = await getDBConnection();
  const user = await db.get(qry, [username, password]);
  await db.close();
  if (user && user.user_id) {
    return user.user_id;
  }
  return null;
}

/**
 * Establishes a database connection to the database and returns the database object.
 * @returns {Promise<sqlite3.Database>} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: 'ewave-autos.db',
    driver: sqlite3.Database
  });

  return db;
}

/**
 * Generates an 8 digit random hex string
 * @returns {String} - The random hex string
 */
function genRanHex() {
  return [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

/**
 * Checks the database for a username associated with the given user ID.
 *
 * @async
 * @param {number} userId - The ID of the user to check.
 * @returns {Promise<?string>} - The username associated with the given user ID, or null if not
 * found.
 */
async function checkUserId(userId) {
  const qry = 'SELECT username FROM users WHERE user_id = ?';
  const db = await getDBConnection();
  const username = await db.get(qry, userId);
  await db.close();
  return username;
}

/**
 * Checks the database for a vehicle model name associated with the given vehicle ID.
 *
 * @async
 * @param {number} vehicleId - The ID of the vehicle to check.
 * @returns {Promise<?string>} - The model name associated with the given vehicle ID, or null if not
 * found.
 */
async function checkVehicleId(vehicleId) {
  const qry = 'SELECT model_name FROM vehicles WHERE vehicle_id = ?';
  const db = await getDBConnection();
  const vehicle = await db.get(qry, vehicleId);
  await db.close();
  return vehicle;
}

/**
 * Adds product feedback (rating and review) to the database.
 *
 * @async
 * @param {number} userId - The ID of the user providing the feedback.
 * @param {number} vehicleId - The ID of the vehicle for which feedback is provided.
 * @param {number} rating - The rating given by the user.
 * @param {string} reviewText - The text of the review provided by the user.
 * @returns {Promise<void>} - A promise that resolves once the feedback is added to the database.
 */
async function addProductFeedback(userId, vehicleId, rating, reviewText) {
  const qry = `
    INSERT INTO review (user_id, vehicle_id, rating, review_text)
    VALUES (?, ?, ?, ?)`;
  const db = await getDBConnection();
  await db.run(qry, userId, vehicleId, rating, reviewText);
  await db.close();
}

/**
 * Retrieves the average rating and reviews for a given vehicle from the database.
 *
 * @async
 * @param {number} vehicleId - The ID of the vehicle to retrieve feedback for.
 * @returns {Promise<{averageRating: number, reviews: object[]}>} - A promise that resolves with an
 * object containing the average rating and an array of reviews.
 */
async function getProductFeedback(vehicleId) {
  const avgRatingQry = 'SELECT AVG(rating) AS averageRating FROM review WHERE vehicle_id = ?';
  const reviewsQry = `
  SELECT review.user_id, users.username, review.rating, review.review_text, review.date_submitted
  FROM review
  JOIN users ON review.user_id = users.user_id
  WHERE review.vehicle_id = ?
  ORDER BY date_submitted DESC`;

  const db = await getDBConnection();
  const result = await db.get(avgRatingQry, vehicleId);
  const reviews = await db.all(reviewsQry, vehicleId);
  await db.close();

  return {averageRating: Math.round(10 * result.averageRating) / 10, reviews};
}

/**
 * Handles submitting feedback/rating/review for a product.
 *
 * @function
 * @name POST /feedback
 * @async
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 *
 * @throws {400} Bad Request - If there are missing parameters.
 * @throws {500} Internal Server Error - If there is an issue with the server.
 *
 * @returns {Object} - Returns a success message upon successful submission.
 */
app.post('/feedback', async function(req, res) {
  const {userId, vehicleId, rating, reviewText} = req.body;

  if (!userId || !vehicleId || !rating || rating <= 0 || rating > 5 || !reviewText) {
    res.status(400)
      .type('text')
      .send('Missing or malformed required parameters');
    return;
  }
  try {
    const username = await checkUserId(userId);
    const vehicle = await checkVehicleId(vehicleId);
    if (!username || !vehicle) {
      res.status(401)
        .type('text')
        .send('Invalid user or vehicle ID');
      return;
    }
    await addProductFeedback(userId, vehicleId, rating, reviewText);
    res.type('text')
      .send('Review added successfully!');
  } catch (err) {
    res.status(500)
      .type('text')
      .send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT);
