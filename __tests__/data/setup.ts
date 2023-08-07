import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.join(process.cwd(), '.env.local')

dotenv.config({path: envPath});