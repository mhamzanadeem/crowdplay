'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main><h1>This workspace could not render.</h1><p>Your stored messages have not been changed.</p><button onClick={reset}>Try again</button></main>}
