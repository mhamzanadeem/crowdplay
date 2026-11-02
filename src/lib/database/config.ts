import {isIP} from 'node:net';
// Pure configuration helpers: safe to test without connecting or logging credentials.
export function databaseName(value:string|undefined):string {
 const name=value?.trim()||'crowdplay';
 if(!/^[a-zA-Z0-9_-]{1,63}$/.test(name))throw new Error('Invalid MongoDB database name');
 return name;
}
export function connectionUri(value:string|undefined):string {
 if(!value||!/^mongodb(?:\+srv)?:\/\//.test(value))throw new Error('Configure the server-only DB_URL MongoDB connection string');
 return value;
}

// Explicit process-local override; never change Windows/network adapter settings.
export function mongoDnsServers(value:string|undefined):string[] {
 if(!value?.trim())return [];
 const servers=value.split(',').map(server=>server.trim());
 if(servers.length>3||servers.some(server=>!isIP(server)))throw new Error('MONGODB_DNS_SERVERS must contain up to three comma-separated DNS IP addresses');
 return servers;
}
