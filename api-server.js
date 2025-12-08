// Simple local server for running Vercel API functions in development
const http = require('http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[key.trim()] = value;
      }
    }
  });
  console.log('Loaded environment variables from .env.local');
}

const PORT = 3001;

// Dynamic import for TypeScript API functions
async function loadHandler(apiPath) {
  try {
    // Use ts-node to load TypeScript files
    require('ts-node/register');
    const handler = require(path.join(__dirname, 'api', `${apiPath}.ts`));
    return handler.default;
  } catch (error) {
    console.error(`Error loading handler for ${apiPath}:`, error);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const { pathname } = parse(req.url, true);
  console.log(`${req.method} ${pathname}`);

  // Route API requests
  if (pathname.startsWith('/api/')) {
    const apiPath = pathname.replace('/api/', '').replace(/\/$/, '');
    const handler = await loadHandler(apiPath);

    if (handler) {
      // Parse body for POST requests
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        const vercelReq = {
          method: req.method,
          headers: req.headers,
          body: body ? JSON.parse(body) : {},
          query: parse(req.url, true).query,
        };

        const vercelRes = {
          statusCode: 200,
          headers: {},
          setHeader: (key, value) => {
            vercelRes.headers[key] = value;
            res.setHeader(key, value);
          },
          status: (code) => {
            vercelRes.statusCode = code;
            return vercelRes;
          },
          json: (data) => {
            res.writeHead(vercelRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          },
          end: () => {
            res.writeHead(vercelRes.statusCode);
            res.end();
          },
        };

        try {
          await handler(vercelReq, vercelRes);
        } catch (error) {
          console.error('Handler error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/send-otp');
  console.log('  POST /api/verify-otp');
});




