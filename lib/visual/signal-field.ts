export type NodeType = 'project' | 'concept' | 'technology' | 'contribution';
export type Relation = 'USES' | 'PROCESSES' | 'STUDIES' | 'APPLIES' | 'VALIDATES_WITH' | 'REQUIRES_HUMAN_REVIEW' | 'VISUALIZES' | 'CONTRIBUTED_TO';
export type SignalNode = { id:string; name:string; type:NodeType; description:string; repository:string; source:string; cluster:string; importance:number; position:[number,number]; destination?:string };
export type SignalEdge = { source:string; target:string; relationship:Relation; label:string; evidence:string; verification:'implemented'|'documented-protocol'; primary:boolean };
const repositories = {
 oncola:'https://github.com/sarseej-shrestha/OncoLA',
 lung:'https://github.com/sarseej-shrestha/LungNoduleClassification',
 lidc:'https://github.com/sarseej-shrestha/lidc-reader-disagreement',
 ruskin:'https://github.com/dchanson/Ruskin',
};
const revisions={oncola:'bdb89600aa',lung:'06cb7514b6',lidc:'98d336960b',ruskin:'9fbaf4e139'};
type Repo=keyof typeof repositories;
const source=(repo:Repo,path:string)=>`${repositories[repo]}/blob/${revisions[repo]}/${path}`;
function node(id:string,name:string,type:NodeType,description:string,repo:Repo,path:string,position:[number,number],destination?:string):SignalNode {return {id,name,type,description,repository:repositories[repo],source:source(repo,path),cluster:repo,importance:type==='project'?3:type==='technology'?1:2,position,destination};}
export const signalNodes:SignalNode[]=[
 node('oncola','OncoLA','project','The repository now documents CareSignal: symptom reporting and clinician-facing care workflows.','oncola','README.md',[22,37],'oncola'),
 node('lung','Lung Nodule Classification','project','A three-branch ResNet-18 pipeline for lung CT candidates, with MC dropout and temperature scaling.','lung','src/model.py',[48,27],'lung-nodules'),
 node('lidc','LIDC Reader Disagreement','project','Research protocol and pilot tooling studying disagreement in LIDC-IDRI reader annotations; no model has been trained under this protocol.','lidc','README.md',[66,57],'lidc'),
 node('ruskin','Early Ruskin Manuscripts','contribution','A collaborative digital humanities archive and contributed project. The connected capabilities describe the platform, not sole authorship.','ruskin','README.md',[85,35]),
 node('symptoms','Symptom reporting','concept','Structured and free-text SMS messages feed a care-team triage workflow.','oncola','README.md',[10,24]),
 node('review','Human review','concept','Clinician review gates drafted notes; the imaging study separately defines blinded operational association review.','oncola','prisma/schema.prisma',[32,56]),
 node('soap','SOAP drafts','concept','Language-model output is stored as a draft requiring clinician review.','oncola','lib/ai.ts',[14,54]),
 node('ct','Lung CT imaging','concept','Both imaging repositories process lung CT data and its associated metadata.','lung','src/preprocess.py',[53,46]),
 node('uncertainty','Uncertainty','concept','MC dropout is implemented in the classifier and proposed for evaluating reader disagreement in the study protocol.','lung','src/model.py',[49,65]),
 node('splits','Patient-level splits','concept','Patient identities define separation between development and held-out data.','lung','src/splits.py',[64,22]),
 node('annotations','Reader annotations','concept','LIDC-IDRI reader marks support consensus preprocessing and the separate disagreement study.','lidc','docs/protocol.md',[73,42]),
 node('matching','Max-flow matching','concept','Joint patient assignment satisfies pilot sampling quotas with fail-closed feasibility checks.','lidc','tests/pilot/test_pilot.py',[73,73]),
 node('archives','Structured archives','concept','TEI/XML documents are transformed into published archival pages.','ruskin','common/ruskin.xsl',[87,61]),
 node('maps','Historical visualization','concept','The archive combines place maps and a synchronized historical timeline.','ruskin','_Map/map.html',[91,20]),
 node('next','Next.js','technology','The care application uses Next.js with TypeScript.','oncola','package.json',[8,42]),
 node('sqlite','SQLite / Prisma','technology','Prisma defines a SQLite-backed application database.','oncola','prisma/schema.prisma',[24,70]),
 node('python','Python','technology','Python implements imaging preprocessing, model code, and study pilot tools.','lung','src/preprocess.py',[40,41]),
 node('torch','PyTorch','technology','Torch and torchvision provide the classifier implementation.','lung','requirements.txt',[40,17]),
 node('xml','TEI / XML','technology','The archive stylesheet processes TEI-encoded historical documents.','ruskin','common/ruskin.xsl',[93,48]),
 node('elastic','Elasticsearch','technology','The PHP search stack depends on the Elasticsearch client.','ruskin','src/composer.json',[80,16]),
];
function edge(a:string,b:string,relationship:Relation,label:string,repo:Repo,path:string,primary=true,verification:SignalEdge['verification']='implemented'):SignalEdge{return {source:a,target:b,relationship,label,evidence:source(repo,path),verification,primary};}
export const signalEdges:SignalEdge[]=[
 edge('oncola','symptoms','PROCESSES','processes symptom reports','oncola','README.md'),
 edge('oncola','review','REQUIRES_HUMAN_REVIEW','requires clinician review','oncola','prisma/schema.prisma'),
 edge('oncola','soap','APPLIES','drafts clinical notes','oncola','lib/ai.ts'),
 edge('oncola','next','USES','uses Next.js and TypeScript','oncola','package.json',false),
 edge('oncola','sqlite','USES','stores records with Prisma / SQLite','oncola','prisma/schema.prisma',false),
 edge('lung','ct','PROCESSES','preprocesses lung CT data','lung','src/preprocess.py'),
 edge('lung','uncertainty','APPLIES','estimates uncertainty with MC dropout','lung','src/model.py'),
 edge('lung','splits','VALIDATES_WITH','separates data by patient','lung','src/splits.py'),
 edge('lung','annotations','PROCESSES','builds consensus nodule samples','lung','src/preprocess.py'),
 edge('lung','python','USES','implements imaging in Python','lung','src/preprocess.py',false),
 edge('lung','torch','USES','builds ResNet-18 with PyTorch','lung','src/model.py',false),
 edge('lidc','ct','PROCESSES','reads CT series metadata','lidc','requirements.txt'),
 edge('lidc','uncertainty','STUDIES','proposes uncertainty evaluation','lidc','docs/protocol.md',true,'documented-protocol'),
 edge('lidc','splits','VALIDATES_WITH','specifies patient-level separation','lidc','docs/protocol.md',false,'documented-protocol'),
 edge('lidc','annotations','STUDIES','studies reader disagreement','lidc','docs/protocol.md'),
 edge('lidc','review','REQUIRES_HUMAN_REVIEW','defines blinded association review','lidc','docs/protocol.md',true,'documented-protocol'),
 edge('lidc','matching','APPLIES','assigns pilot patients by max-flow','lidc','tests/pilot/test_pilot.py'),
 edge('lidc','python','USES','implements pilot tools in Python','lidc','tests/pilot/test_pilot.py',false),
 edge('ruskin','archives','PROCESSES','publishes structured archives','ruskin','common/ruskin.xsl'),
 edge('ruskin','maps','VISUALIZES','maps historical places and events','ruskin','_Map/map.html'),
 edge('ruskin','xml','USES','transforms TEI / XML','ruskin','common/ruskin.xsl',false),
 edge('ruskin','elastic','USES','queries Elasticsearch','ruskin','src/composer.json',false),
];
export const nodeById = Object.fromEntries(signalNodes.map(n=>[n.id,n])) as Record<string,SignalNode>;
export function connections(id:string){return signalEdges.filter(e=>e.source===id||e.target===id);}
export function worldPosition(n:SignalNode):[number,number,number]{return [(n.position[0]-50)*.25, (85-n.position[1])*.095, -13-(n.importance===1?1.2:0)];}
