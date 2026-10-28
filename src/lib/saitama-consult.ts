/** Dedicated LP contact endpoint. Does not change the corporate contact form. */
export const ALLOWED_ORIGINS = new Set([
 'https://saitama-ai-homepage.ato01.chatgpt.site',
 'https://saitama-ai-homepage.pages.dev',
 'https://motenas.co.jp',
]);
export const WARDS = ['西区','北区','大宮区','見沼区','中央区','桜区','浦和区','南区','緑区','岩槻区'];
export type Values = {name:string;company:string;contact:string;ward:string;url:string;message:string};
export type MailConfig = {RESEND_API_KEY?:string;CONTACT_FROM?:string;CONTACT_TO?:string};
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(value:string){return emailPattern.test(value)&&!/[\r\n]/.test(value);}
export function isContact(value:string){
 if(isEmail(value))return true;
 const normalized=value.normalize('NFKC');
 return /^\+?[\d\s()（）ー−-]+$/.test(normalized)&&normalized.replace(/\D/g,'').length>=10&&normalized.replace(/\D/g,'').length<=15;
}
export function validateConsult(form:FormData){
 const get=(key:string)=>typeof form.get(key)==='string'?String(form.get(key)).trim():'';
 const values:Values={name:get('name'),company:get('company'),contact:get('contact'),ward:get('ward'),url:get('url'),message:get('message')};
 const errors:Record<string,string>={};
 for(const [key,label,max] of [['name','お名前',100],['company','会社・事業者名',200]] as const){
  if(!values[key])errors[key]=`${label}を入力してください。`;
  else if(values[key].length>max||/[\r\n]/.test(values[key]))errors[key]=`${label}は${max}文字以内の1行で入力してください。`;
 }
 if(!values.contact)errors.contact='メールアドレスまたは電話番号を入力してください。';
 else if(values.contact.length>254||!isContact(values.contact))errors.contact='メールアドレスまたは電話番号を正しく入力してください。';
 if(!WARDS.includes(values.ward))errors.ward='事業所のある区を選んでください。';
 if(values.url){try{const u=new URL(values.url);if(!['http:','https:'].includes(u.protocol)||values.url.length>2048)throw Error();}catch{errors.url='HPのアドレスを https:// から入力してください。';}}
 if(values.message.length>3000)errors.message='お困りごとは3,000文字以内で入力してください。';
 return {values,errors};
}
export function mailPayload(values:Values,config:MailConfig){
 return {from:config.CONTACT_FROM,to:[config.CONTACT_TO],...(isEmail(values.contact)?{reply_to:values.contact}:{}),
 subject:`【さいたまAIホームページ】無料30分相談 - ${values.name} 様`,
 text:[ 'さいたまAIホームページの無料30分相談にお申し込みがありました。','',`お名前：${values.name}`,`会社・事業者名：${values.company}`,`ご連絡先：${values.contact}`,`事業所のある区：${values.ward}`,`今のHP：${values.url||'（未記入）'}`,'', 'お困りごと：',values.message||'（未記入）','',isEmail(values.contact)?'このメールへの返信で、お申し込みの方に連絡できます。':'電話でのご連絡を希望されています。上記の電話番号へご連絡ください。'].join('\n')};
}
export async function deliverConsult(values:Values,config:MailConfig,fetcher:typeof fetch=fetch){
 if(!config.RESEND_API_KEY||!config.CONTACT_FROM||!config.CONTACT_TO)return {ok:false,status:503};
 try{
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(mailPayload(values,config))});
  return {ok:response.ok,status:response.ok?200:502};
 }catch{return {ok:false,status:502};}
}
