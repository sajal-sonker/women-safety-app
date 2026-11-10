import sharp from 'sharp';
import {requireCondition} from '../../platform/security.ts';
export async function sanitizeMedia(raw:Buffer,mime:string,duration:number|null):Promise<Buffer>{
 if(mime==='image/jpeg'||mime==='image/png'){
  requireCondition(mime==='image/jpeg'?raw[0]===255&&raw[1]===216:raw.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),400,'INVALID_MEDIA');
  const image=sharp(raw,{limitInputPixels:20000000,failOn:'warning',animated:false});const meta=await image.metadata();
  requireCondition(meta.pages===undefined||meta.pages===1,400,'INVALID_MEDIA');
  // Re-encoding drops EXIF/GPS/XMP/ICC/comments; no original image bytes are served.
  return mime==='image/jpeg'?image.rotate().jpeg({quality:90}).toBuffer():image.rotate().png().toBuffer();
 }
 requireCondition(mime==='audio/wav'&&raw.toString('ascii',0,4)==='RIFF'&&raw.toString('ascii',8,12)==='WAVE'&&raw.readUInt32LE(4)+8===raw.length,400,'INVALID_MEDIA');
 let fmt:Buffer|undefined,pcm:Buffer|undefined;
 for(let offset=12;offset+8<=raw.length;){const name=raw.toString('ascii',offset,offset+4),length=raw.readUInt32LE(offset+4);requireCondition(offset+8+length<=raw.length,400,'INVALID_MEDIA');if(name==='fmt '){requireCondition(!fmt,400,'INVALID_MEDIA');fmt=raw.subarray(offset+8,offset+8+length);}if(name==='data'){requireCondition(!pcm,400,'INVALID_MEDIA');pcm=raw.subarray(offset+8,offset+8+length);}offset+=8+length+(length%2);}
 requireCondition(fmt&&fmt.length===16&&pcm&&fmt.readUInt16LE(0)===1&&fmt.readUInt16LE(2)===1&&fmt.readUInt32LE(4)===16000&&fmt.readUInt32LE(8)===32000&&fmt.readUInt16LE(12)===2&&fmt.readUInt16LE(14)===16&&pcm.length>0&&pcm.length%2===0,400,'INVALID_MEDIA');
 const seconds=pcm.length/32000;requireCondition(seconds<=10&&duration!==null&&Math.abs(duration-seconds)<=.1,400,'INVALID_DURATION');
 const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);fmt.copy(header,20);header.write('data',36);header.writeUInt32LE(pcm.length,40);return Buffer.concat([header,pcm]);
}
