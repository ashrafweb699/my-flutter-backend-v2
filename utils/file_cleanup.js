/**
 * This utility function will delete temporary uploaded files when driver registration fails
 */
const fs = require('fs');
const path = require('path');

/**
 * Delete uploaded files if registration fails
 * @param {Array} filePaths - Array of file paths to delete
 * @param {Object} options - Additional options
 * @param {Boolean} options.removeEmptyFolders - Whether to try removing empty folders after file deletion
 * @param {String} options.baseDir - Base directory to use for relative paths
 * @returns {Array} - Array of successfully deleted file paths
 */
async function deleteUploadedFiles(filePaths, options = {}) {
  try {
    if (!Array.isArray(filePaths)) {
      console.error('deleteUploadedFiles: filePaths must be an array');
      return [];
    }
    
    const { removeEmptyFolders = true, baseDir = '..' } = options;
    const deletedFiles = [];
    const processedFolders = new Set();
    
    console.log(`Attempting to delete ${filePaths.length} uploaded files due to failed registration`);
    
    // Process all files
    for (const filePath of filePaths) {
      if (!filePath) continue;
      
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(__dirname, baseDir, filePath);
      
      try {
        if (fs.existsSync(fullPath)) {
          if (fs.statSync(fullPath).isFile()) {
            fs.unlinkSync(fullPath);
            deletedFiles.push(filePath);
            console.log(`Deleted file: ${fullPath}`);
            
            // Add parent directory to processed folders
            if (removeEmptyFolders) {
              processedFolders.add(path.dirname(fullPath));
            }
          } else {
            console.log(`Not a file, skipping: ${fullPath}`);
          }
        } else {
          console.log(`File not found: ${fullPath}`);
        }
      } catch (fileError) {
        console.error(`Error deleting file ${fullPath}:`, fileError.message);
      }
    }
    
    // Clean up empty folders if requested
    if (removeEmptyFolders) {
      for (const folder of processedFolders) {
        try {
          // Only remove folder if it exists and is empty
          if (fs.existsSync(folder)) {
            const files = fs.readdirSync(folder);
            if (files.length === 0) {
              fs.rmdirSync(folder);
              console.log(`Removed empty folder: ${folder}`);
            }
          }
        } catch (folderError) {
          console.error(`Error processing folder ${folder}:`, folderError.message);
        }
      }
    }
    
    console.log(`Cleanup complete. Deleted ${deletedFiles.length} files.`);
    return deletedFiles;
  } catch (error) {
    console.error('Error deleting uploaded files:', error);
    return [];
  }
}

/**
 * Clean up a specific directory related to a driver
 * @param {String} driverId - Driver ID to look for in filenames
 * @param {String} directory - Directory to clean (relative to project root), defaults to uploads/drivers
 * @returns {Array} - Array of deleted file paths
 */
async function cleanupDriverFiles(driverId, directory = 'uploads/drivers') {
  try {
    if (!driverId) {
      console.error('cleanupDriverFiles: driverId is required');
      return [];
    }
    
    const dirPath = path.isAbsolute(directory) 
      ? directory 
      : path.join(__dirname, '..', directory);
    
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory does not exist: ${dirPath}`);
      return [];
    }
    
    const filesToDelete = [];
    const files = fs.readdirSync(dirPath);
    
    // Find files that match the driver ID
    for (const file of files) {
      if (file.includes(driverId)) {
        filesToDelete.push(path.join(directory, file));
      }
    }
    
    console.log(`Found ${filesToDelete.length} files for driver ${driverId} to delete`);
    return await deleteUploadedFiles(filesToDelete);
    
  } catch (error) {
    console.error('Error in cleanupDriverFiles:', error);
    return [];
  }
}

module.exports = { deleteUploadedFiles, cleanupDriverFiles };
