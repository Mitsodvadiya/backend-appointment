import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './prisma/client.js';
const startServer = async () => {
    try {
        // Database connection test
        await prisma.$connect();
        console.log('Database connected successfully.');
        app.listen(env.port, () => {
            console.log(`Server is running on http://localhost:${env.port}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
};
startServer();
