const db = require('../connection');

async function createProductsTables() {
  const connection = await db.getConnection();

  try {
    // Start transaction
    await connection.beginTransaction();

    console.log('Checking for products_categories table...');
    const [categoriesTableExists] = await connection.query(`
      SELECT TABLE_NAME FROM information_schema.tables
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products_categories'
    `);

    if (categoriesTableExists.length === 0) {
      console.log('Creating products_categories table...');
      await connection.query(`
        CREATE TABLE products_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          image_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('products_categories table created successfully');
    } else {
      console.log('products_categories table already exists');
    }

    console.log('Checking for products table...');
    const [productsTableExists] = await connection.query(`
      SELECT TABLE_NAME FROM information_schema.tables
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    `);

    if (productsTableExists.length === 0) {
      console.log('Creating products table...');
      await connection.query(`
        CREATE TABLE products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          stock INT DEFAULT 0,
          rating DECIMAL(2,1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES products_categories(id) ON DELETE CASCADE
        )
      `);
      console.log('products table created successfully');
    } else {
      console.log('products table already exists');
    }

    console.log('Checking for product_images table...');
    const [imagesTableExists] = await connection.query(`
      SELECT TABLE_NAME FROM information_schema.tables
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_images'
    `);

    if (imagesTableExists.length === 0) {
      console.log('Creating product_images table...');
      await connection.query(`
        CREATE TABLE product_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          image_url VARCHAR(500) NOT NULL,
          is_primary BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `);
      console.log('product_images table created successfully');
    } else {
      console.log('product_images table already exists');
    }

    console.log('Checking for product_ratings table...');
    const [ratingsTableExists] = await connection.query(`
      SELECT TABLE_NAME FROM information_schema.tables
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_ratings'
    `);

    if (ratingsTableExists.length === 0) {
      console.log('Creating product_ratings table...');
      await connection.query(`
        CREATE TABLE product_ratings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          user_id INT NOT NULL,
          rating TINYINT CHECK (rating BETWEEN 1 AND 5),
          review TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('product_ratings table created successfully');
    } else {
      console.log('product_ratings table already exists');
    }

    // Commit transaction
    await connection.commit();
    console.log('All product tables created successfully');

  } catch (error) {
    await connection.rollback();
    console.error('Error creating product tables:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = createProductsTables;
