import {getMongoStore} from '../src/lib/database/connection.ts';
let database:Awaited<ReturnType<typeof getMongoStore>>|undefined;
try {
 database=await getMongoStore();
 await database.database.command({ping:1});
 console.log('MongoDB connected. CrowdPlay collections and unique/TTL indexes initialized.');
} catch {
 console.error('MongoDB setup failed. Check DB_URL, MONGODB_DB, Atlas network access and read/write permissions. Connection credentials are not printed.');
 process.exitCode=1;
} finally {await database?.client.close()}
