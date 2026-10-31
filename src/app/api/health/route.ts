import {noStore} from '@/lib/server/http';
export async function GET(){return noStore({service:'crowdplay',status:'running',version:'0.1.0'})}
