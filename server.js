const express = require('express');
const cors = require('cors');
const path = require('path');
const { NseIndia } = require('stock-nse-india');
 
const app = express();
const nse = new NseIndia();
const PORT = process.env.PORT || 3000;
 
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
 
const cache = {};
const CACHE_TTL = 8000;
function getCached(key){const e=cache[key];if(e&&Date.now()-e.ts<CACHE_TTL)return e.data;return null}
function setCache(key,data){cache[key]={data,ts:Date.now()}}
 
app.get('/api/quote/:symbol',async(req,res)=>{try{const sym=req.params.symbol.toUpperCase();const c=getCached('q_'+sym);if(c)return res.json(c);const d=await nse.getEquityDetails(sym);setCache('q_'+sym,d);res.json(d)}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/trade-info/:symbol',async(req,res)=>{try{const sym=req.params.symbol.toUpperCase();const c=getCached('t_'+sym);if(c)return res.json(c);const d=await nse.getEquityTradeInfo(sym);setCache('t_'+sym,d);res.json(d)}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/index/:indexName',async(req,res)=>{try{const idx=decodeURIComponent(req.params.indexName);const c=getCached('i_'+idx);if(c)return res.json(c);const d=await nse.getEquityStockIndices(idx);setCache('i_'+idx,d);res.json(d)}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/all-indices',async(req,res)=>{try{const c=getCached('all_idx');if(c)return res.json(c);const d=await nse.getDataByEndpoint('/api/allIndices');setCache('all_idx',d);res.json(d)}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/scan/:indexName',async(req,res)=>{try{const idx=decodeURIComponent(req.params.indexName);const c=getCached('s_'+idx);if(c)return res.json(c);const d=await nse.getEquityStockIndices(idx);setCache('s_'+idx,d);res.json(d)}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/gainers/:indexName',async(req,res)=>{try{const idx=decodeURIComponent(req.params.indexName);const c=getCached('g_'+idx);if(c)return res.json(c);const d=await nse.getEquityStockIndices(idx);const stocks=(d.data||[]).filter(s=>s.pChange!=null).sort((a,b)=>b.pChange-a.pChange);setCache('g_'+idx,stocks);res.json(stocks)}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/losers/:indexName',async(req,res)=>{try{const idx=decodeURIComponent(req.params.indexName);const c=getCached('l_'+idx);if(c)return res.json(c);const d=await nse.getEquityStockIndices(idx);const stocks=(d.data||[]).filter(s=>s.pChange!=null).sort((a,b)=>a.pChange-b.pChange);setCache('l_'+idx,stocks);res.json(stocks)}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/intraday/:symbol',async(req,res)=>{try{const sym=req.params.symbol.toUpperCase();const c=getCached('id_'+sym);if(c)return res.json(c);const d=await nse.getEquityIntradayData(sym);setCache('id_'+sym,d);res.json(d)}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/historical/:symbol',async(req,res)=>{try{const sym=req.params.symbol.toUpperCase();const end=new Date();const start=new Date();start.setFullYear(start.getFullYear()-1);const d=await nse.getEquityHistoricalData(sym,{start,end});res.json(d)}catch(e){res.status(500).json({error:e.message})}});
 
// NEWS PROXY - fixes CORS
app.get('/api/news',async(req,res)=>{try{const q=req.query.q||'NSE BSE Nifty stock market India';const c=getCached('news_'+q);if(c)return res.type('text/xml').send(c);const url='https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=en-IN&gl=IN&ceid=IN:en';const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});const text=await r.text();setCache('news_'+q,text);res.type('text/xml').send(text)}catch(e){res.status(500).json({error:e.message})}});
 
// GLOBAL INDICES PROXY - fixes CORS
app.get('/api/global-indices',async(req,res)=>{try{const c=getCached('gidx');if(c)return res.json(c);const url='https://query1.finance.yahoo.com/v7/finance/quote?symbols='+encodeURIComponent('^GSPC,^IXIC,^FTSE,^BSESN');const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}});const d=await r.json();setCache('gidx',d);res.json(d)}catch(e){res.status(500).json({error:e.message})}});
 
app.get('*',(req,res)=>{res.sendFile(path.join(__dirname,'index.html'))});
app.listen(PORT,()=>{console.log('IndiaTrader server running on port '+PORT)});
