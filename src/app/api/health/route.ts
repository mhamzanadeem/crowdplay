import {noStore} from '@/lib/server/http';
import {serviceHealth} from '@/lib/services/live';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){const services=await serviceHealth();return noStore({status:services.every(s=>s.status==='connected'||s.status==='deferred')?'healthy':'degraded',services})}
