const { getBalance, resetWallet, creditUser, ensureWallet } = require('../services/walletService');

exports.getUserBalance = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ message: 'Invalid userId' });
    await ensureWallet(userId);
    const balance = await getBalance(userId);
    res.json({ user_id: userId, balance });
  } catch (e) {
    console.error('wallet.getUserBalance error', e.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetUserBalance = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ message: 'Invalid userId' });
    await resetWallet(userId);
    const balance = await getBalance(userId);
    res.json({ user_id: userId, balance });
  } catch (e) {
    console.error('wallet.resetUserBalance error', e.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.creditForTest = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const amount = Number(req.body?.amount || 0);
    if (!userId || amount <= 0) return res.status(400).json({ message: 'Invalid input' });
    const ok = await creditUser(userId, amount, { reference: 'manual_test' });
    const balance = await getBalance(userId);
    res.json({ success: ok, user_id: userId, balance });
  } catch (e) {
    console.error('wallet.creditForTest error', e.message);
    res.status(500).json({ message: 'Server error' });
  }
};
