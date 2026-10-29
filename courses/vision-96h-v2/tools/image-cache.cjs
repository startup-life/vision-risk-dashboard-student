const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
class ImageCache {
  constructor({root,ttl=60000,validate,now=()=>Date.now()}){this.root=root;this.ttl=ttl;this.validate=validate;this.now=now;this.records=new Map();this.pendingRecords=new Map();this.pendingImages=new Map();fs.mkdirSync(root,{recursive:true,mode:0o700});}
  rememberRecord(id,data){if(data?.success&&data.record?.record_id===id)this.records.set(id,{data,at:this.now()});}
  invalidate(id){this.records.delete(id);}
  async record(id,load){const hit=this.records.get(id);if(hit&&this.now()-hit.at<this.ttl)return hit.data;if(this.pendingRecords.has(id))return this.pendingRecords.get(id);const p=Promise.resolve().then(load).then(d=>{this.rememberRecord(id,d);return d;}).finally(()=>this.pendingRecords.delete(id));this.pendingRecords.set(id,p);return p;}
  // Drive 파일 ID가 같으면 내용도 같으므로 사진은 만료 없이 쓴다. 사건 정보(record)만 ttl 동안 쓴다.
  async image({id,index,sourceId,load}){
    const key=hash(Buffer.from(JSON.stringify([id,index,sourceId]))),metaPath=path.join(this.root,key+'.json');
    if(this.pendingImages.has(key))return this.pendingImages.get(key);
    const p=(async()=>{
      try{const m=JSON.parse(fs.readFileSync(metaPath,'utf8'));if(m.sourceId===sourceId&&m.id===id&&m.index===index&&/^[a-f0-9]{64}$/.test(m.sha256)){const b=fs.readFileSync(path.join(this.root,m.sha256+'.bin'));if(hash(b)===m.sha256&&this.validate(b,m.mime))return{buffer:b,mime:m.mime,sha256:m.sha256,cached:true};}}catch{}
      const d=await load();if(!d?.success||d.record_id!==id||d.index!==index||!d.base64||(d.file_id&&d.file_id!==sourceId))return null;
      const b=Buffer.from(d.base64,'base64'),mime=d.mime_type||'image/png';if(b.length>2*1024*1024||!this.validate(b,mime))return null;
      const sha256=hash(b),m={id,index,sourceId,sha256,mime,at:this.now()};
      // 캐시 저장 실패는 원본 전달을 막지 않는다. 잘못된 캐시는 다음 요청에서 폐기한다.
      try{const bin=path.join(this.root,sha256+'.bin');fs.writeFileSync(bin,b,{mode:0o600});const tmp=metaPath+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(m),{mode:0o600});fs.renameSync(tmp,metaPath);}catch{}
      return{buffer:b,mime,sha256,cached:false};
    })().finally(()=>this.pendingImages.delete(key));this.pendingImages.set(key,p);return p;
  }
}
module.exports={ImageCache};
