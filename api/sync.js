export default async function handler(req, res) {
  // Silent cloud sync endpoint for Calcounting
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const STORAGE_BIN_URL = 'https://extendsclass.com/api/json-storage/bin/adcbbbe';

  try {
    if (req.method === 'GET') {
      const userParam = (req.query.user || '').trim().toLowerCase();
      if (!userParam) {
        return res.status(400).json({ error: 'Missing user query parameter' });
      }

      const response = await fetch(STORAGE_BIN_URL, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) {
        return res.status(502).json({ error: 'Storage upstream failure' });
      }
      const data = await response.json();
      const users = data.users || {};
      const userData = users[userParam];

      if (!userData) {
        return res.status(404).json({ error: 'User not found in cloud' });
      }

      return res.status(200).json({ success: true, data: userData });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action;
      const userKey = (body.userKey || (body.user && body.user.username) || '').trim().toLowerCase();

      if (!userKey) {
        return res.status(400).json({ error: 'Missing userKey' });
      }

      // Fetch current bin data
      const getRes = await fetch(STORAGE_BIN_URL, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      let binData = { version: 1, users: {} };
      if (getRes.ok) {
        try {
          binData = await getRes.json();
          if (!binData.users) binData.users = {};
        } catch (e) {}
      }

      if (action === 'save' || !action) {
        binData.users[userKey] = {
          user: body.user,
          history: body.history || [],
          balance: body.balance,
          exercise: body.exercise === true,
          updatedAt: Date.now()
        };

        const putRes = await fetch(STORAGE_BIN_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(binData)
        });

        if (!putRes.ok) {
          return res.status(502).json({ error: 'Failed to update upstream' });
        }

        return res.status(200).json({ success: true, userKey });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
