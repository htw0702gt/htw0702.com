import {mkdir,rm,cp,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/assets',{recursive:true});
for(const file of ['index.html','_headers','robots.txt','sitemap.xml'])await cp(file,'dist/'+file);
for(const file of ['og.png','favicon.svg','world-2026.css','world-2026.js'])await cp('assets/'+file,'dist/assets/'+file);
await cp('data/media.json','dist/assets/media.json');
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/*'],exclude:['/assets/*','/images/*','/robots.txt','/sitemap.xml']}));
console.log('Cloudflare Pages assets built in dist/; Functions remain in functions/.');
