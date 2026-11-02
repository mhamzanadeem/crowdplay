// Only fixed messages cross the server boundary; never return raw driver errors.
export function mongoDiagnostic(error:unknown):string {
 const e=error as {code?:number|string;name?:string;message?:string;cause?:unknown;syscall?:string};
 const detail=[e?.code,e?.name,e?.message,e?.syscall].join(' ');
 if(e?.code===18||/AuthenticationFailed|authentication failed|bad auth/i.test(detail))return 'MongoDB authentication failed. Check the Atlas database username/password and percent-encode special password characters in DB_URL.';
 if(e?.code===13||/not authorized|Unauthorized/i.test(detail))return 'MongoDB permissions denied. Grant the database user readWrite on the crowdplay database.';
 if(/querySrv|queryTxt|DNS|ENOTFOUND|EAI_AGAIN/i.test(detail)&&/ETIMEOUT|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN/i.test(detail))return 'MongoDB DNS resolver timed out or refused the SRV/TXT query. Test another DNS resolver using MONGODB_DNS_SERVERS, or use the standard mongodb:// connection string supplied by Atlas.';
 if(/ENOTFOUND|ENODATA|NXDOMAIN/i.test(detail))return 'MongoDB DNS record was not found. Copy the current connection string from Atlas Connect > Drivers and confirm the cluster is running.';
 if(/ENOTFOUND|EAI_AGAIN|querySrv|queryTxt|DNS/i.test(detail))return 'MongoDB DNS lookup failed. Check the Atlas cluster hostname, cluster availability and your DNS/network connection.';
 if(/ServerSelection|ETIMEDOUT|ECONNREFUSED|TLS|SSL/i.test(detail))return 'MongoDB network connection failed. Check Atlas Network Access for your current public IP, cluster availability, firewall and TLS connectivity.';
 return 'MongoDB connection/setup failed. Check DB_URL, MONGODB_DB and Atlas read/write permissions.';
}

export class DatabaseConnectionError extends Error {constructor(error:unknown){super(mongoDiagnostic(error));this.name='DatabaseConnectionError'}}
