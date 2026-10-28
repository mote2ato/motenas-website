import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {ALLOWED_ORIGINS,validateConsult,deliverConsult} from '../../lib/saitama-consult';
import {verifyTurnstile} from '../../lib/contact';
type Config={RESEND_API_KEY?:string;CONTACT_FROM?:string;CONTACT_TO?:string;TURNSTILE_SITE_KEY?:string;TURNSTILE_SECRET_KEY?:string};
const response=(origin:string,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin',...(ALLOWED_ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept'}:{})}});
export const OPTIONS:APIRoute=({request})=>{const origin=request.headers.get('origin')||'';return response(origin,{},ALLOWED_ORIGINS.has(origin)?200:403);};
export const GET:APIRoute=({request})=>{const origin=request.headers.get('origin')||'';if(!ALLOWED_ORIGINS.has(origin))return response(origin,{message:'このページからは送信できません。'},403);const config=env as unknown as Config;return response(origin,{deliveryConfigured:Boolean(config.RESEND_API_KEY&&config.CONTACT_TO&&config.CONTACT_FROM),turnstileSiteKey:config.TURNSTILE_SITE_KEY&&config.TURNSTILE_SECRET_KEY?config.TURNSTILE_SITE_KEY:null});};
export const POST:APIRoute=async({request})=>{
 const origin=request.headers.get('origin')||'';
 if(!ALLOWED_ORIGINS.has(origin))return response(origin,{status:'invalid',message:'このページからは送信できません。'},403);
 if(Number(request.headers.get('content-length')||0)>24000)return response(origin,{status:'invalid',message:'入力内容が長すぎます。'},413);
 let form:FormData;
 try{form=await request.formData();}catch{return response(origin,{status:'invalid',message:'送信内容を読み取れませんでした。'},400);}
 const {values,errors}=validateConsult(form);
 if(Object.keys(errors).length)return response(origin,{status:'invalid',errors,message:'入力内容をご確認ください。'},422);
 const renderedAt=Number(form.get('rendered_at'));
 if(form.get('website')||!Number.isFinite(renderedAt)||renderedAt<=0||Date.now()-renderedAt<3000||Date.now()-renderedAt>86400000)return response(origin,{status:'invalid',message:'時間をおいて再度お試しいただくか、ページを再読み込みしてください。'},400);
 const config=env as unknown as Config;
 if(config.TURNSTILE_SITE_KEY&&config.TURNSTILE_SECRET_KEY){const token=form.get('cf-turnstile-response');if(!await verifyTurnstile(config.TURNSTILE_SECRET_KEY,typeof token==='string'?token:'',request.headers.get('cf-connecting-ip')))return response(origin,{status:'invalid',message:'送信確認に失敗しました。もう一度お試しください。'},400);}
 const delivered=await deliverConsult(values,config);
 if(!delivered.ok)return response(origin,{status:'error',message:'現在フォームから送信できません。入力内容を保ったまま、時間をおいてお試しいただくか、代表窓口へご連絡ください。'},delivered.status);
 return response(origin,{status:'sent',message:'お申し込みを受け付けました。平日10:00〜17:00受付・原則2営業日以内にご返信します。'});
};
