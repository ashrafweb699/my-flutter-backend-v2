/**
 * Format validation errors from express-validator
 * @param {Object} errors - Validation errors from express-validator
 * @returns {Object} Formatted error response
 */
exports.formatErrorResponse = (errors) => {
  return {
    success: false,
    errors: errors.array().map(error => ({
      field: error.path,
      message: error.msg
    }))
  };
};
