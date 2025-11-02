# Gwadar Online Bazaar Backend

This is the backend server for the Gwadar Online Bazaar app, which provides APIs for products, services, categories, and advertisements. The backend uses Node.js, Express, and MySQL.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL server (v5.7 or higher)
- The `gob_db` database created with tables as shown in the screenshots

### Installation

1. Clone the repository (if not already done):
   ```
   git clone <repository-url>
   cd gwadar_online_bazaar/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the backend directory (use `.env.example` as template):
   ```
   PORT=3000
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=gob_db
   DB_PORT=3306
   JWT_SECRET=your_secret_key
   CLIENT_URL=*
   UPLOAD_DIR=./uploads
   ```
   Adjust the values according to your MySQL setup.

   **Note:** Copy `.env.example` to `.env` and update with your values:
   ```bash
   cp .env.example .env
   ```

4. Start the server:
   ```
   npm run dev
   ```

5. Find your server IP address (useful for connecting from devices):
   ```
   npm run ip
   ```
   This will show all available network interfaces and their IP addresses.

## Uploads Directory

The backend includes an `/uploads` directory where all uploaded files (images) are stored. This directory is served as a static folder, making the files accessible via:

```
http://YOUR_SERVER_IP:3000/uploads/filename.jpg
```

When uploading images through the API endpoints, they will automatically be saved to this directory with unique filenames.

## Connecting from Different Devices

The server is configured to be accessible from various devices:

- **Android Emulator**: Use `10.0.2.2:3000` as the server address
- **iOS Simulator**: Use `localhost:3000` as the server address
- **Real Device on Same WiFi**: Use your computer's local IP address (e.g., `192.168.1.100:3000`)
- **Production**: Use your domain name or server IP

To easily configure the app for different environments, update the settings in `lib/config/app_config.dart` in the Flutter app.

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get a single category by ID
- `POST /api/categories` - Create a new category (with image upload)
- `PUT /api/categories/:id` - Update a category (with image upload)
- `DELETE /api/categories/:id` - Delete a category (soft delete)

### Products
- `GET /api/products` - Get all products (with optional category filter)
- `GET /api/products/:id` - Get a single product by ID
- `POST /api/products` - Create a new product (with image upload)
- `PUT /api/products/:id` - Update a product (with image upload)
- `DELETE /api/products/:id` - Delete a product (soft delete)

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get a single service by ID
- `POST /api/services` - Create a new service (with image upload)
- `PUT /api/services/:id` - Update a service (with image upload)
- `DELETE /api/services/:id` - Delete a service (soft delete)

### Advertisements
- `GET /api/advertisements` - Get all advertisements
- `GET /api/advertisements/:id` - Get a single advertisement by ID
- `POST /api/advertisements` - Create a new advertisement (with image upload)
- `PUT /api/advertisements/:id` - Update an advertisement (with image upload)
- `DELETE /api/advertisements/:id` - Delete an advertisement (soft delete)

## Database Structure

The database has the following tables:

1. `categories` - For product categories
2. `products` - For products with category references
3. `services` - For services
4. `advertisements` - For advertisements

See the schema images for the detailed structure of each table.

## Integration with Flutter App

The Flutter app is configured to fetch data from this backend API while maintaining Firebase for authentication, cab booking, and notifications. If the MySQL backend is unavailable, the app falls back to Firebase for data fetching.

### Flutter App Configuration

The app uses a centralized configuration system in `lib/config/app_config.dart` to manage server URLs for different environments. To change the server URL:

1. Open `lib/config/app_config.dart`
2. Update the appropriate settings:
   - For emulator testing: Set `_useEmulator = true`
   - For real device testing: Set `_useLocalWifi = true` and update `_localWifiUrl`
   - For production: Set both to `false` and update `_productionUrl`

## 🚀 Railway Deployment

For detailed Railway deployment instructions, see [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)

### Quick Deploy to Railway:

1. Push your backend to GitHub
2. Connect Railway to your GitHub repository
3. Add MySQL database in Railway
4. Configure environment variables
5. Deploy!

Railway automatically detects Node.js apps and deploys them. The server will be accessible at `https://your-app.railway.app` 