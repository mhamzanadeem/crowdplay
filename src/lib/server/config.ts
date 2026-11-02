import {jevEnabled} from '../services/config';
import 'server-only';
export function required(name:string):string{const value=process.env[name];if(!value)throw new Error(`Server configuration missing: ${name}`);return value}
export function appUrl(){const url=new URL(required('NEXT_PUBLIC_APP_URL'));if(process.env.NODE_ENV==='production'&&url.protocol!=='https:')throw new Error('Production application URL must use HTTPS');return url.origin}
export function readiness(){return {database:!!process.env.DB_URL,twitch:!!process.env.TWITCH_CLIENT_ID&&!!process.env.TWITCH_CLIENT_SECRET,jevEnabled:jevEnabled(process.env.JEV_ENABLED),jev:!!process.env.TYPESAFE_API_KEY,pricing:process.env.JEV_INPUT_USD_PER_MILLION!==undefined&&process.env.JEV_INPUT_USD_PER_MILLION!==''&&process.env.JEV_OUTPUT_USD_PER_MILLION!==undefined&&process.env.JEV_OUTPUT_USD_PER_MILLION!==''}}
