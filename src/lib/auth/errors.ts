export const authErrors={
 state:'The sign-in cookie was missing or expired. Open the app at its configured address and start Twitch sign-in again in the same browser.',
 authorization:'Twitch authorization was declined or incomplete. Start sign-in again and approve the requested permissions.',
 token:'Twitch could not exchange or validate the authorization. Check the registered callback URL and application credentials, then retry.',
 permissions:'Twitch did not grant the required permissions. Reconnect and approve the requested channel permissions.',
 profile:'Twitch account verification failed. Start sign-in again.',
 database:'Twitch sign-in needs MongoDB to save your account and session. The database connection failed; resolve the MongoDB error below before retrying.',
 session:'Your authenticated session could not be saved. Check MongoDB availability and the server encryption configuration, then retry.',
 configuration:'Twitch sign-in is not configured correctly. Check the application URL, registered callback URL and server security keys.',
 failed:'Twitch sign-in could not be completed. Check service connections below, then try again.'
} as const;
export type AuthStage=keyof typeof authErrors;
export function authErrorMessage(code:string){return authErrors[code as AuthStage]||authErrors.failed}
