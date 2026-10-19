 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../chain-core.js');
const samples = require('../samples.js');
const root = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const docs = ['README.md','README.en.md'].map(read);
const headings = [
  ['🌐 デモページ','📸 スクリーンショット','✨ 機能','📖 使い方','🔬 ハッシュチェーンの形式と検証結果','🎯 ユースケース','⚠️ 制約と前提','🔒 プライバシーと安全対策','🔗 参考文献と関連ツール','🧪 テスト','📁 ディレクトリー構造','💻 動作環境','📄 ライセンス','🛠️ このツールについて'],
  ['🌐 Demo','📸 Screenshots','✨ Features','📖 Usage','🔬 Chain format and verification results','🎯 Use cases','⚠️ Limits and assumptions','🔒 Privacy and security','🔗 References and related tools','🧪 Tests','📁 Directory structure','💻 Requirements','📄 License','🛠️ About this tool']
];
function files(dir=root, prefix='') {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.name === '.git' ? [] :
    entry.isDirectory() ? files(path.join(dir,entry.name),prefix+entry.name+'/') : [prefix+entry.name]);
}
test('Readme headings and five badges follow the same complete order', () => {
  docs.forEach((doc,i) => {
    assert.deepEqual([...doc.matchAll(/^## (.+)$/gm)].map(m=>m[1]),headings[i]);
    assert.equal((doc.match(/https:\/\/img\.shields\.io\//g)||[]).length,5);
    assert.match(doc,/Day117/);
    assert.match(doc,/page_id=44607/);
    assert.doesNotMatch(doc,/^### /m);
  });
});
test('All nine screenshots have captions, PNG dimensions and bounded sizes', () => {
  const all=[];
  docs.forEach((doc,i) => {
    const images=[...doc.matchAll(/!\[([^\]]+)\]\((assets\/[^)]+)\)\n\n\*([^*]+)\*/g)];
    assert.equal(images.length,i===0?5:4);
    for(const [,alt,file,caption] of images) {
      assert.ok(alt && caption);
      const png=fs.readFileSync(path.join(root,file));
      assert.equal(png.readUInt32BE(16),1280);
      assert.equal(png.readUInt32BE(20),800);
      assert.ok(png.length<=300000);
      all.push(file);
    }
  });
  assert.deepEqual(all.sort(),files().filter(f=>f.endsWith('.png')).sort());
});
test('Directory trees list every real file, with aligned descriptions on every line', () => {
  docs.forEach(doc => {
    const tree=/```text\n([\s\S]*?)\n```/.exec(doc)[1].split('\n');
    const listed=[];
    let stack=[];
    const positions=new Set();
    for(const line of tree) {
      assert.match(line,/# \S/);
      positions.add(line.indexOf('#'));
      const item=line.split('#')[0].trimEnd();
      if(item==='hash-chain-tamper-trainer/') continue;
      const match=/^((?:│   |    )*)(?:├── |└── )(.+)$/.exec(item);
      assert.ok(match,item);
      const depth=match[1].length/4;
      stack=stack.slice(0,depth);
      if(match[2].endsWith('/')) stack.push(match[2].slice(0,-1));
      else listed.push([...stack,match[2]].join('/'));
    }
    assert.equal(positions.size,1);
    assert.deepEqual(listed.sort(),files().sort());
  });
});
test('Required public metadata has exact identifiers and categories', () => {
  const yaml=/^<!--\n---\n([\s\S]*?)\n---\n-->/.exec(docs[0])[1];
  const values=Object.fromEntries(yaml.split('\n').map(line=>[line.slice(0,line.indexOf(':')),line.slice(line.indexOf(':')+1).trim()]));
  assert.deepEqual(Object.keys(values),['id','slug','title','subtitle_ja','subtitle_en','description_ja','description_en','category_ja','category_en','difficulty','tags','repo_url','demo_url','hub']);
  assert.equal(values.id,'day117');
  assert.equal(values.slug,'hash-chain-tamper-trainer');
  assert.equal(values.category_ja,'[ハッシュ関数, フォレンジック]');
  assert.equal(values.category_en,'[Hash Function, Digital Forensics]');
  assert.equal(values.hub,'true');
  assert.equal(values.repo_url,'"https://github.com/ipusiron/hash-chain-tamper-trainer"');
  assert.equal(values.demo_url,'"https://ipusiron.github.io/hash-chain-tamper-trainer/"');
  assert.match(values.difficulty,/^[1-5]$/);
  for(const value of Object.values(values)) assert.ok(value);
  assert.doesNotMatch(docs[1],/^<!--/);
});
test('Japanese spelling, spacing, claim limits and bold counts stay within the writing rules', () => {
  for(const text of [docs[0],read('CLAUDE.md')]) {
    assert.doesNotMatch(text,/既に|全て|分かる|無い|インターフェース|\d+(?:か所|箇所)|に限る|想定していない|効く|走る|照合|突き合わせ|注目すべき|ここで重要なのは/);
    assert.doesNotMatch(text,/改ざんを防ぐ|改ざん防止|改ざんの証明(?!にならない)/);
    assert.doesNotMatch(text,/[\u3040-\u30ff\u3400-\u9fff] +[A-Za-z0-9]|[A-Za-z0-9] +[\u3040-\u30ff\u3400-\u9fff]/);
    assert.doesNotMatch(text,/：$/m);
  }
  for(const doc of docs) for(const section of doc.split(/^## /m)) assert.ok((section.match(/\*\*[^*]+\*\*/g)||[]).length<=2);
  assert.doesNotMatch(docs[1].split('\n').slice(1).join('\n'),/[\u3000-\u303f\u3040-\u30ff\u3400-\u9fff]/);
});
test('Both readmes describe the results of all five protection experiments', async () => {
  for(const doc of docs) {
    const rows=[...doc.matchAll(/^\| `([^`]+)` \| [^|]+ \| (○|×) \| (○|×) \|$/gm)];
    assert.equal(rows.length,5);
    for(const [,name,a,b] of rows) {
      const chosen=name==='none'?[]:[name];
      for(const [i,role] of ['outsider','recorder'].entries()) {
        const result=await core.experiment(samples[0],chosen,role);
        assert.equal(result.detected,[a,b][i]==='○',name+'/'+role);
      }
    }
  }
});
test('Both readmes describe first mismatch and rechaining for seven modifications', async () => {
  for(const doc of docs) {
    const rows=[...doc.matchAll(/^\| `([^`]+)` \| [^|]+ \| (\d+|-) \| (pass) \|$/gm)];
    assert.equal(rows.length,7);
    const base=await core.createChain(samples[0]);
    for(const [,operation,,] of rows) assert.ok(core.OPERATIONS.includes(operation));
    for(const [,operation,first] of rows) {
      const changed=await core.tamper(base,operation);
      const result=await core.verify(changed);
      assert.equal(result.firstMismatch,first==='-'?null:Number(first));
      assert.equal(result.valid,false);
      assert.equal((await core.verify(await core.rechain(changed))).valid,true);
    }
  }
});
test('Related tools, known unverified coverage and developer commands are documented', () => {
  for(const doc of docs) {
    for(const slug of ['hash-detector', 'git-secrets-playground', 'mic-gain-logger', 'basexx-visualizer', 'jwt-inspector', 'hashviz', 'hex-dump-trainer', 'otp-animation']) assert.ok(doc.includes('https://ipusiron.github.io/'+slug+'/'));
    assert.match(doc,/Safari/);
    assert.match(doc,/npm test/);
    assert.match(doc,/node --check/);
  }
  const guide=read('CLAUDE.md');
  for(const name of ['chain-core.js','samples.js','messages.js','app.js','extractable: false','ECDSA','P-256']) assert.ok(guide.includes(name));
  for(const file of files().filter(f=>/\.(?:md|js|json|html|yml|css)$/.test(f))) {
    assert.doesNotMatch(read(file),/[CD]:[\\/]|\u6e1a|\u4ed5\u69d8\u66f8|\u8abf\u67fb\u5831\u544a|\u70b9\u691c\u8a18\u9332/,file);
  }
});

test('Both usage sections follow the seven steps and five entrances', () => {
  for (const [i,doc] of docs.entries()) {
    const usage = doc.split(i === 0 ? '## 📖 使い方' : '## 📖 Usage')[1].split('\n## ')[0];
    assert.deepEqual([...usage.matchAll(/^(\d)\. /gm)].map(m=>Number(m[1])),[1,2,3,4,5,6,7]);
    for (const name of i===0 ? ['学習の流れ','途中と最後','自由に試す','座学','設定'] : ['Learning path','Middle vs last','Free experiment','Learn','Settings']) assert.ok(doc.includes(name));
    assert.ok(usage.includes('09:05') && usage.includes('09:06'));
  }
});

test('Both readmes explain manual checks, scoped reset and the two storage keys', () => {
  for (const doc of docs) {
    for (const key of ['hash-chain-tamper-trainer.lang','hash-chain-tamper-trainer.learning']) assert.ok(doc.includes(key));
  }
  assert.match(docs[0], /理解チェックをすべて外す/);
  assert.match(docs[0], /未チェックでも/);
  assert.match(docs[1], /Clear all understanding checks/);
  assert.match(docs[1], /without checking/);
});

test('Both readmes describe inline explanations, four advanced sections and reversible quiz destinations', () => {
  const ja=read('README.md'), en=read('README.en.md'), developer=read('CLAUDE.md');
  for (const word of ['いま起きたこと','仕組みの解説','4節','問題1〜6','問題7・8','18件']) assert.ok(ja.includes(word),word);
  for (const word of ['What just happened','How it works','Four advanced','Questions 1–6','questions 7–8','all 18']) assert.ok(en.includes(word),word);
  assert.ok(developer.includes('4節') && developer.includes('ステップ4・5・6・6・1・3'));
  assert.doesNotMatch(ja+developer,/11節すべて|含む11節/);
  assert.doesNotMatch(en,/Eleven lessons/);
});
