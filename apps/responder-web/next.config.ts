import type {NextConfig} from 'next';
const config:NextConfig={
  output:'standalone',
  transpilePackages:['@surakshaai/contracts'],
  async rewrites(){return [{source:'/v1/:path*',destination:(process.env.API_BASE_URL??'http://127.0.0.1:4001')+'/v1/:path*'}];},
  async headers(){return [{source:'/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Robots-Tag',value:'noindex'},{key:'Cache-Control',value:'no-store'},{key:'X-Content-Type-Options',value:'nosniff'}]}];}
};
export default config;
