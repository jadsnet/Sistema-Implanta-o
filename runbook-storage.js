/* Os arquivos originais de Runbook ficam fora do localStorage.
   IndexedDB armazena ArrayBuffer binário sem conversão Base64. */
(function(){
 'use strict';
 const DB_NAME='gestaoImplantacaoArquivos',STORE='runbooks',VERSION=1;
 function open(){return new Promise((resolve,reject)=>{
   if(!('indexedDB' in window))return reject(new Error('O navegador não disponibilizou IndexedDB para esta página.'));
   let req=indexedDB.open(DB_NAME,VERSION);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||new Error('Não foi possível acessar o armazenamento do navegador.'));
   req.onblocked=()=>reject(new Error('O armazenamento está bloqueado por outra guia.'));
 })}
 async function operation(key,mode,fn){
   const db=await open();
   try{return await new Promise((resolve,reject)=>{
     const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
     let result;let request;
     try{request=fn(store,String(key));request.onsuccess=()=>result=request.result}catch(err){reject(err);return}
     tx.oncomplete=()=>resolve(result??null);
     tx.onerror=()=>reject(tx.error||new Error('Falha ao salvar o arquivo no navegador.'));
     tx.onabort=()=>reject(tx.error||new Error('Armazenamento interrompido.'));
   })}finally{db.close()}
 }
 window.RunbookStorage={
   put:(key,buffer)=>operation(key,'readwrite',(s,k)=>s.put(buffer,k)),
   get:key=>operation(key,'readonly',(s,k)=>s.get(k)),
   remove:key=>operation(key,'readwrite',(s,k)=>s.delete(k))
 };
})();
