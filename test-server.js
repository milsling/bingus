const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/user',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

console.log('Testing server at http://localhost:5000/api/user...');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
