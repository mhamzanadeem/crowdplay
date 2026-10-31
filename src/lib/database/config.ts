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
