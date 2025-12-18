module.exports = (req, res) => {
  try {
    const missing = [];
    if (!process.env.SENDINBLUE_API_KEY) missing.push('SENDINBLUE_API_KEY');
    if (!process.env.SENDER_EMAIL) missing.push('SENDER_EMAIL');

    res.setHeader('Content-Type', 'application/json');

    if (missing.length > 0) {
      // Do not expose secret values — only indicate which keys are missing
      res.statusCode = 500;
      res.end(JSON.stringify({ status: 'not_configured', missing }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'ok' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'internal error' }));
  }
};
