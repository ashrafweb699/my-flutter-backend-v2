const { pool } = require('../config/db');

// Get all service units
exports.getServiceUnits = async (req, res) => {
  try {
    const [units] = await pool.query(
      'SELECT * FROM service_units WHERE is_active = 1 ORDER BY unit_name ASC'
    );
    
    res.json({
      success: true,
      units: units
    });
  } catch (error) {
    console.error('❌ Error fetching service units:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service units'
    });
  }
};

// Get all service units (including inactive) - Admin only
exports.getAllServiceUnits = async (req, res) => {
  try {
    const [units] = await pool.query(
      'SELECT * FROM service_units ORDER BY unit_name ASC'
    );
    
    res.json({
      success: true,
      units: units
    });
  } catch (error) {
    console.error('❌ Error fetching all service units:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service units'
    });
  }
};

// Create new service unit
exports.createServiceUnit = async (req, res) => {
  try {
    const { unit_name, unit_symbol, is_active } = req.body;
    
    if (!unit_name || !unit_symbol) {
      return res.status(400).json({
        success: false,
        message: 'Unit name and symbol are required'
      });
    }
    
    // Check if unit already exists
    const [existing] = await pool.query(
      'SELECT id FROM service_units WHERE unit_name = ?',
      [unit_name]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Unit already exists'
      });
    }
    
    const [result] = await pool.query(
      'INSERT INTO service_units (unit_name, unit_symbol, is_active) VALUES (?, ?, ?)',
      [unit_name, unit_symbol, is_active !== false ? 1 : 0]
    );
    
    res.json({
      success: true,
      message: 'Service unit created successfully',
      unit_id: result.insertId
    });
  } catch (error) {
    console.error('❌ Error creating service unit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service unit'
    });
  }
};

// Update service unit
exports.updateServiceUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { unit_name, unit_symbol, is_active } = req.body;
    
    if (!unit_name || !unit_symbol) {
      return res.status(400).json({
        success: false,
        message: 'Unit name and symbol are required'
      });
    }
    
    // Check if unit exists
    const [existing] = await pool.query(
      'SELECT id FROM service_units WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service unit not found'
      });
    }
    
    // Check if new name conflicts with another unit
    const [duplicate] = await pool.query(
      'SELECT id FROM service_units WHERE unit_name = ? AND id != ?',
      [unit_name, id]
    );
    
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Another unit with this name already exists'
      });
    }
    
    await pool.query(
      'UPDATE service_units SET unit_name = ?, unit_symbol = ?, is_active = ? WHERE id = ?',
      [unit_name, unit_symbol, is_active !== false ? 1 : 0, id]
    );
    
    res.json({
      success: true,
      message: 'Service unit updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating service unit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service unit'
    });
  }
};

// Delete service unit
exports.deleteServiceUnit = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if unit is being used in service_items
    const [usageCheck] = await pool.query(
      'SELECT COUNT(*) as count FROM service_items WHERE unit = (SELECT unit_name FROM service_units WHERE id = ?)',
      [id]
    );
    
    if (usageCheck[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete unit that is being used by service items'
      });
    }
    
    const [result] = await pool.query(
      'DELETE FROM service_units WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service unit not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Service unit deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting service unit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service unit'
    });
  }
};

// Toggle unit active status
exports.toggleServiceUnitStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE service_units SET is_active = NOT is_active WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Service unit status updated'
    });
  } catch (error) {
    console.error('❌ Error toggling service unit status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service unit status'
    });
  }
};
