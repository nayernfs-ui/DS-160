module.exports = (req, res) => {
  try {
    const hasSendinblue = !!process.env.SENDINBLUE_API_KEY;
    const hasSender = !!process.env.SENDER_EMAIL;

    const body = {
      sendinblue: hasSendinblue ? 'configured' : 'missing',
      sender: hasSender ? 'configured' : 'missing',
    };

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(body));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'internal error' }));
  }
};
