const app = require('./src/app');
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
const server = app.listen(port, '0.0.0.0', () => {
  console.log('Server running on port ' + server.address().port);
});
