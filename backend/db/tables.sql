CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  UNIQUE(username)
);

CREATE TABLE vehicles (
  vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_name TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  availability INTEGER,
  make TEXT NOT NULL,
  year INTEGER,
  tags TEXT,
  UNIQUE(model_name)
);

CREATE TABLE transactions (
  transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  vehicle_id INTEGER,
  confirmation_number TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);

CREATE TABLE review (
  review_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  vehicle_id INTEGER,
  rating INTEGER,
  review_text TEXT,
  date_submitted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
)