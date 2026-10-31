import 'server-only';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {appUrl} from './config';
import {AccessDenied} from '../database/store';
export class HttpError extends Error {status:number;constructor(status:number,message:string){super(message);this.status=status}}
export function sameOrigin(request:Request){if(request.headers.get('origin')!==appUrl())throw new HttpError(403,'Request origin rejected')}
export async function jsonBody<T>(request:Request,schema:z.ZodType<T>):Promise<T>{sameOrigin(request);if(!request.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'Expected JSON');const raw=await limitedBody(request,16384);const result=schema.safeParse(JSON.parse(raw));if(!result.success)throw new HttpError(400,'Invalid request fields');return result.data}
export async function limitedBody(request:Request,max:number){if(Number(request.headers.get('content-length')||0)>max)throw new HttpError(413,'Request body too large');const reader=request.body?.getReader();if(!reader)return '';const chunks:Uint8Array[]=[];let bytes=0;while(true){const result=await reader.read();if(result.done)break;bytes+=result.value.byteLength;if(bytes>max){await reader.cancel();throw new HttpError(413,'Request body too large')}chunks.push(result.value)}return Buffer.concat(chunks).toString('utf8')}
export function failure(error:unknown){if(error instanceof AccessDenied)return NextResponse.json({error:'Channel access denied'},{status:403});if(error instanceof HttpError)return NextResponse.json({error:error.message},{status:error.status});if(error instanceof SyntaxError)return NextResponse.json({error:'Malformed JSON'},{status:400});console.error('CrowdPlay request failed',{type:error instanceof Error?error.name:'Unknown'});return NextResponse.json({error:'The server could not complete this request. Check server configuration and service status.'},{status:503})}
export function noStore(data:unknown){return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}})}
