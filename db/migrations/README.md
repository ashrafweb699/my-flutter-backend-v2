# Database Migrations

## Overview
This directory contains SQL migration files for the Gwadar Online Bazaar database.

## Migration Files

### 007 - Appointment Fields for Service Items
**File:** `007_add_appointment_fields_to_service_items.sql`

**Purpose:** Add support for appointment-based services (Doctor, Technical Expert, Consultants, etc.)

**Changes:**
- Adds `available_time` column (VARCHAR 100) - Store time slots like "10 AM - 3 PM"
- Adds `rating` column (DECIMAL 3,2) - Store provider ratings (0.00 - 5.00)
- Adds `available_24_hours` column (TINYINT 1) - Flag for 24-hour availability
- Creates indexes for better query performance
- Updates existing records with default values

**Rollback:** `007_rollback_appointment_fields.sql`

---

## How to Apply Migration

### Method 1: MySQL Command Line
```bash
mysql -u your_username -p your_database < 007_add_appointment_fields_to_service_items.sql
```

### Method 2: MySQL Workbench
1. Open MySQL Workbench
2. Connect to your database
3. Open the migration file
4. Click "Execute" (⚡ icon)

### Method 3: phpMyAdmin
1. Login to phpMyAdmin
2. Select your database
3. Go to "SQL" tab
4. Copy-paste the migration content
5. Click "Go"

### Method 4: Node.js Script (Recommended for Production)
```javascript
const mysql = require('mysql2/promise');
const fs = require('fs').promises;

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'your_database',
    multipleStatements: true
  });

  const sql = await fs.readFile('./007_add_appointment_fields_to_service_items.sql', 'utf8');
  await connection.query(sql);
  console.log('✅ Migration 007 applied successfully');
  await connection.end();
}

runMigration().catch(console.error);
```

---

## How to Rollback Migration

If something goes wrong, run the rollback file:

```bash
mysql -u your_username -p your_database < 007_rollback_appointment_fields.sql
```

---

## Testing After Migration

### 1. Verify Columns Added
```sql
DESCRIBE service_items;
```

Expected output should include:
- `available_time` (varchar 100)
- `rating` (decimal 3,2)
- `available_24_hours` (tinyint 1)

### 2. Verify Indexes Created
```sql
SHOW INDEX FROM service_items;
```

Expected indexes:
- `idx_service_items_rating`
- `idx_service_items_24hours`

### 3. Test Insert (Appointment-based)
```sql
INSERT INTO service_items (
  service_name, 
  sub_item_name, 
  description, 
  image_url, 
  price, 
  unit, 
  min_quantity,
  available_time,
  rating,
  available_24_hours
) VALUES (
  'Doctor',
  'Dr. Ahmed Khan',
  'Heart Specialist with 10 years experience',
  'uploads/doctors/ahmed.jpg',
  0,
  '',
  0,
  '10 AM - 3 PM',
  4.8,
  0
);
```

### 4. Test Insert (Product-based)
```sql
INSERT INTO service_items (
  service_name, 
  sub_item_name, 
  description, 
  image_url, 
  price, 
  unit, 
  min_quantity
) VALUES (
  'Fast Food',
  'Chicken Burger',
  'Delicious grilled chicken burger',
  'uploads/food/burger.jpg',
  250,
  'piece',
  1
);
```

---

## Migration History

| Version | Date | Description | Status |
|---------|------|-------------|--------|
| 007 | 2024-11-07 | Add appointment fields to service_items | ✅ Ready |

---

## Best Practices

1. ✅ **Always backup database before migration**
   ```bash
   mysqldump -u username -p database_name > backup_before_007.sql
   ```

2. ✅ **Test on development/staging first**
   - Never run directly on production
   - Test all features after migration

3. ✅ **Keep rollback file ready**
   - In case something goes wrong
   - Quick recovery possible

4. ✅ **Update version in code**
   - Update API documentation
   - Update model classes (already done ✅)

5. ✅ **Commit to Git**
   ```bash
   git add db/migrations/
   git commit -m "Add migration 007: Appointment fields for service items"
   git push origin main
   ```

---

## Support

If you encounter any issues:
1. Check error logs
2. Verify database user permissions
3. Run rollback if needed
4. Contact development team

---

## Next Steps After Migration

1. ✅ Update admin panel to show conditional fields
2. ✅ Update user interface for appointment booking
3. ✅ Test thoroughly with both product and appointment services
4. ✅ Deploy to production

---

**Created by:** Gwadar Online Bazaar Development Team  
**Last Updated:** November 7, 2024
