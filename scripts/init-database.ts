import {DatabaseConnectionError} from '../src/lib/database/diagnostics.ts';
import {getMongoStore} from '../src/lib/database/connection.ts';
let database:Awaited<ReturnType<typeof getMongoStore>>|undefined;
try {
 database=await getMongoStore();
 await database.database.command({ping:1});
 console.log('MongoDB connected. CrowdPlay collections and unique/TTL indexes initialized.');
} catch(error) {
 console.error(error instanceof DatabaseConnectionError ? error.message : 'MongoDB configuration failed. Check DB_URL and MONGODB_DB. Credentials are not printed.');
 process.exitCode=1;
} finally {await database?.client.close()}
