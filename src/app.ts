import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { env } from './config/env';

const app: Application = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('API is running.');
});

export default app;
