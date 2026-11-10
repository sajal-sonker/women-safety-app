import {test,expect,type Page,type APIRequestContext} from '@playwright/test';
async function login(page:Page,request:APIRequestContext,phone:string,path='/'){
 await page.goto(path);
 await page.getByLabel('Phone number',{exact:true}).fill(phone);
 await page.getByRole('button',{name:'Send verification code',exact:true}).click();
 await expect(page.getByLabel('Verification code',{exact:true})).toBeVisible({timeout:20000});
 const response=await request.get('http://127.0.0.1:9099/emulator/v1/projects/demo-surakshaai/verificationCodes');
 const codes=await response.json();
 const code=codes.verificationCodes.filter((c:{phoneNumber:string})=>c.phoneNumber===phone).at(-1)?.code;
 expect(code).toBeTruthy();
 await page.getByLabel('Verification code',{exact:true}).fill(code);
 await page.getByRole('button',{name:'Verify and continue',exact:true}).click();
 await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible({timeout:20000});
}
test('emulator phone login → SOS → simulated recipient message → acknowledgement → resolve',async({browser,request})=>{
 const a=await browser.newContext(),b=await browser.newContext();
 const owner=await a.newPage(),contact=await b.newPage();
 await login(owner,request,'+16505550101');
 await owner.getByRole('button',{name:'SOS Send test alert'}).click();
 await expect(owner.getByRole('heading',{name:'Active alert',exact:true})).toBeVisible();
 await login(contact,request,'+16505550501');
 await contact.getByRole('button',{name:'Test inbox',exact:true}).click();
 await contact.getByRole('button',{name:'Refresh',exact:true}).click();
 await expect(contact.getByRole('link',{name:'Open secure link ↗'}).first()).toBeVisible({timeout:15000});
 const url=await contact.getByRole('link',{name:'Open secure link ↗'}).first().getAttribute('href');
 await contact.goto(url!);
 await contact.getByRole('button',{name:'Open private tracking',exact:true}).click();
 await expect(contact.getByRole('heading',{name:'Demo user',exact:true})).toBeVisible();
 await contact.getByRole('button',{name:'I can help',exact:true}).click();
 await expect(contact.getByText(/Current response: CAN ASSIST/)).toBeVisible();
 await owner.getByRole('button',{name:'Resolve — I am safe',exact:true}).click();
 await expect(contact.getByRole('alert').filter({hasText:/expired|revoked/})).toBeVisible({timeout:15000});
 await a.close();await b.close();
});
test('temporal route comparison and journey arrival work with fictional Lucknow data',async({page,request})=>{
 await login(page,request,'+16505550101');
 await page.getByRole('button',{name:'Plan a journey',exact:true}).click();
 await page.getByRole('button',{name:'Compare walking routes ↗',exact:true}).click();
 await expect(page.getByText(/DEMO: fictional network/)).toBeVisible();
 await expect(page.getByRole('img',{name:'Fictional walking route comparison near Lucknow'})).toBeVisible();
 await page.getByRole('button',{name:'Start journey check-in',exact:true}).click();
 await expect(page.getByRole('button',{name:'I have arrived',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'I have arrived',exact:true}).click();
 await expect(page.getByRole('button',{name:'I have arrived',exact:true})).toHaveCount(0);
});
