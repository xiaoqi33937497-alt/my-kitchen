import { createServer } from './server.js';

createServer().listen(Number(process.env.PORT ?? 8000), '0.0.0.0');
