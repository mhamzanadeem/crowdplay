import {randomBytes} from 'node:crypto';
import {digest,sign,verify} from './crypto.ts';
export interface ActionBinding {userId:string;channelId:string;messageId:string;twitchMessageId:string;text:string}
export function createConfirmation(binding:ActionBinding,secret:string){return sign({action:'delete',user:binding.userId,channel:binding.channelId,message:binding.messageId,twitch:binding.twitchMessageId,body:digest(binding.text),nonce:randomBytes(24).toString('hex'),exp:Date.now()+120000},secret)}
export function checkConfirmation(token:string,binding:ActionBinding,secret:string){const p=verify(token,secret);if(p.action!=='delete'||p.user!==binding.userId||p.channel!==binding.channelId||p.message!==binding.messageId||p.twitch!==binding.twitchMessageId||p.body!==digest(binding.text)||typeof p.nonce!=='string')throw new Error('Confirmation does not match this moderator, channel and message');return p.nonce}
