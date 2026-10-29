// 사진 주소 요청마다 사건을 다시 조회하지 않게 사건 정보(record)를 ttl 동안 쓴다.
class ImageCache {
  constructor({ttl=60000,now=()=>Date.now()}={}){this.ttl=ttl;this.now=now;this.records=new Map();this.pendingRecords=new Map();}
  rememberRecord(id,data){if(data?.success&&data.record?.record_id===id)this.records.set(id,{data,at:this.now()});}
  invalidate(id){this.records.delete(id);}
  async record(id,load){const hit=this.records.get(id);if(hit&&this.now()-hit.at<this.ttl)return hit.data;if(this.pendingRecords.has(id))return this.pendingRecords.get(id);const p=Promise.resolve().then(load).then(d=>{this.rememberRecord(id,d);return d;}).finally(()=>this.pendingRecords.delete(id));this.pendingRecords.set(id,p);return p;}
}
module.exports={ImageCache};
