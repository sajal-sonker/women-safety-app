import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {sanitizeMedia} from '../services/api/src/modules/evidence/sanitize.ts';
test('image processing rejects spoofed bytes and strips metadata by decoding and re-encoding',async()=>{
 await assert.rejects(sanitizeMedia(Buffer.from('<script>malicious</script>'),'image/png',null));
 const image=await sharp({create:{width:8,height:8,channels:3,background:'#7950ba'}}).jpeg().withMetadata({exif:{IFD0:{Artist:'private-test'}}}).toBuffer();
 assert.ok((await sharp(image).metadata()).exif);
 const sanitized=await sanitizeMedia(image,'image/jpeg',null);const metadata=await sharp(sanitized).metadata();assert.equal(metadata.exif,undefined);assert.equal(metadata.icc,undefined);assert.equal(metadata.width,8);
});
test('unsupported media and malformed WAV cannot become available',async()=>{
 await assert.rejects(sanitizeMedia(Buffer.alloc(100),'video/mp4',5));
 await assert.rejects(sanitizeMedia(Buffer.from('RIFF0000WAVE'),'audio/wav',1));
});
