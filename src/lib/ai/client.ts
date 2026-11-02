import {jevEnabled} from '../services/config';
import 'server-only';
import {recordJevHealth} from '../services/observation';
import {required} from '../server/config';
import {requestJev,ProviderError} from './transport';
export {ProviderError} from './transport';
export function pricing(){const input=Number(required('JEV_INPUT_USD_PER_MILLION')),output=Number(required('JEV_OUTPUT_USD_PER_MILLION'));if(!Number.isFinite(input)||input<=0||!Number.isFinite(output)||output<0)throw new Error('Confirm valid Jev pricing before enabling classification');return {input,output}}
export async function askJev(request:{model:string;state:unknown;questions:Record<string,unknown>},count:number){if(!jevEnabled(process.env.JEV_ENABLED))throw new ProviderError('Jev integration deferred');try{const result=await requestJev(request,count,{apiKey:required('TYPESAFE_API_KEY')});recordJevHealth(true);return result}catch(error){recordJevHealth(false);throw error}}
