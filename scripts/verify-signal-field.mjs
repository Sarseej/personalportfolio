import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript');
const compiled=ts.transpileModule(readFileSync('lib/visual/signal-field.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const context={exports:{}};vm.runInNewContext(compiled,context);
const {signalNodes:nodes,signalEdges:edges}=context.exports;
const ids=new Set(nodes.map(n=>n.id));assert.equal(ids.size,nodes.length);
const urls=new Set(['sarseej-shrestha/OncoLA','sarseej-shrestha/LungNoduleClassification','sarseej-shrestha/lidc-reader-disagreement','dchanson/Ruskin']);
for(const n of nodes){assert(n.description&&n.importance&&n.position.length===2);assert(urls.has(new URL(n.repository).pathname.slice(1)));assert(n.source.startsWith(n.repository+'/blob/'));}
const pairs=new Set();for(const e of edges){assert(ids.has(e.source)&&ids.has(e.target));assert(!pairs.has(e.source+':'+e.target));pairs.add(e.source+':'+e.target);assert(e.label.length>10&&!['related to','connected'].includes(e.label));assert(e.evidence.startsWith('https://github.com/'));assert(['implemented','documented-protocol'].includes(e.verification));}
for(const concept of ['ct','uncertainty','annotations','splits'])for(const project of ['lung','lidc'])assert(edges.some(e=>e.source===project&&e.target===concept));
assert.equal(nodes.find(n=>n.id==='ruskin').type,'contribution');
console.log(JSON.stringify({nodes:nodes.length,edges:edges.length,nodeTypes:nodes.reduce((a,n)=>(a[n.type]=(a[n.type]||0)+1,a),{}),edgeTypes:edges.reduce((a,e)=>(a[e.relationship]=(a[e.relationship]||0)+1,a),{})},null,2));
