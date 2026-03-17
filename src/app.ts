import express, { Application } from 'express';
import routes from './routes';
import { env } from './config/env';

const app: Application = express();

app.use(express.json());

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('API is running.');
});

export default app;
