// Simple local server for running Vercel API functions in development
import http from 'http';
import { parse } from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  let currentKey = null;
  let currentValue = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      if (currentKey && currentValue.length > 0) {
        // Save previous multi-line value
        process.env[currentKey] = currentValue.join('\n');
        currentKey = null;
        currentValue = [];
      }
      continue;
    }
    
    // Check if this line starts a new key-value pair
    if (trimmedLine.includes('=') && !trimmedLine.startsWith(' ')) {
      // Save previous key-value if exists
      if (currentKey && currentValue.length > 0) {
        let value = currentValue.join('\n');
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[currentKey] = value;
      }
      
      // Parse new key-value
      const equalIndex = trimmedLine.indexOf('=');
      currentKey = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();
      
      // Check if value starts with quote (might be multi-line JSON)
      if (value.startsWith('"') && !value.endsWith('"')) {
        // Multi-line value starting
        currentValue = [value];
      } else if (value.endsWith('"') && currentValue.length > 0) {
        // Multi-line value ending
        currentValue.push(value);
        const finalValue = currentValue.join('\n');
        process.env[currentKey] = finalValue.startsWith('"') && finalValue.endsWith('"') 
          ? finalValue.slice(1, -1) 
          : finalValue;
        currentKey = null;
        currentValue = [];
      } else {
        // Single-line value
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[currentKey] = value;
        currentKey = null;
        currentValue = [];
      }
    } else if (currentKey) {
      // Continuation of multi-line value
      currentValue.push(line);
    }
  }
  
  // Handle last key-value if exists
  if (currentKey && currentValue.length > 0) {
    let value = currentValue.join('\n');
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[currentKey] = value;
  }
  
  console.log('Loaded environment variables from .env.local');
}

const PORT = 3001;

// Dynamic import for TypeScript API functions using tsx
async function loadHandler(apiPath) {
  try {
    // Use tsx to run TypeScript
    const modulePath = `file://${path.join(__dirname, 'api', `${apiPath}.ts`)}`;
    const module = await import(modulePath);
    return module.default;
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`API server also available on network at port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/send-otp');
  console.log('  POST /api/verify-otp');
});


