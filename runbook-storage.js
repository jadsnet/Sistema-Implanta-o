/* Runbooks e evidências: Supabase Storage privado com políticas RLS. */
(function(){
 'use strict';
 function cloud(){
   if(!window.GICloud?.role())throw Error('Faça login para acessar os arquivos do runbook.');
   return window.GICloud;
 }
 window.RunbookStorage={
   put:(key,buffer)=>cloud().filePut(key,buffer),
   get:key=>cloud().fileGet(key),
   remove:key=>cloud().fileRemove(key)
 };
})();
