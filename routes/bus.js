const router = require('express').Router();
const busCtrl = require('../controllers/busController');
const auth = require('../middleware/auth');
const upload = require('../utils/upload');

module.exports = (io) => {
  // Bus Manager
  router.post(
    '/bus/register', 
    upload.fields([
      { name: 'profile_image', maxCount: 1 },
      { name: 'cnic_front_image', maxCount: 1 },
      { name: 'cnic_back_image', maxCount: 1 },
    ]), 
    busCtrl.register
  );
  router.post('/bus/login', busCtrl.login);

  // Schedule
  router.post('/bus/schedule/add', auth.userAuth, busCtrl.addSchedule(io));
  router.get('/bus/schedule/:bus_manager_id', auth.userAuth, busCtrl.getSchedules);
  router.get('/bus/schedule/:schedule_id/seats', auth.userAuth, busCtrl.getSeats);

  // Manager Bookings
  router.get('/bus/manager/:bus_manager_id/bookings', auth.userAuth, busCtrl.getBookingsByManager);
  router.patch('/bus/booking/:id/status', auth.userAuth, busCtrl.updateBookingStatus);

  // User side
  router.get('/bus/my/bookings', auth.userAuth, busCtrl.getBookingsByUser);
  router.patch('/bus/booking/:id/cancel', auth.userAuth, busCtrl.cancelBookingByUser);
  router.get('/bus/available', busCtrl.availableBuses);
  router.post('/bus/book', auth.userAuth, busCtrl.bookSeats(io));

  // Admin side (no auth middleware to match current app pattern)
  router.get('/bus/managers', busCtrl.listManagers);
  router.patch('/bus/manager/:id/approval', busCtrl.updateApproval);

  return router;
};
