/* Build: παράγει dist/index.html — μονό αρχείο με inline CSS/JS (το PeerJS μένει στο CDN).
   Χρήση: node online/tools/build.js */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
// ΠΡΟΣΟΧΗ: replacement ΩΣ FUNCTION — αλλιώς χαρακτήρες όπως $' μέσα στον κώδικα
// (π.χ. το πιόνι '$') ερμηνεύονται ως ειδικά patterns του String.replace και καταστρέφουν το output.
html = html.replace('<link rel="stylesheet" href="css/style.css">', () => '<style>\n' + css + '\n</style>');

for (const f of ['cards.js', 'i18n.js', 'engine.js', 'bots.js', 'net.js', 'net-fb.js', 'ui.js']) {
  const js = fs.readFileSync(path.join(root, 'js', f), 'utf8');
  html = html.replace('<script src="js/' + f + '"></script>', () => '<script>\n' + js + '\n</script>');
}

// v0.7: το board art γίνεται inline data-URI ώστε το dist να παραμένει ΕΝΑ αρχείο
const img = fs.readFileSync(path.join(root, 'board-web.jpg'));
html = html.replace('src="board-web.jpg"', () => 'src="data:image/jpeg;base64,' + img.toString('base64') + '"');
// v1.0: και η πίσω όψη των καρτών (εμφανίζεται σε στοίβες & τράβηγμα — παράγεται από JS)
const back = fs.readFileSync(path.join(root, 'cardback.png'));
const backUri = 'data:image/png;base64,' + back.toString('base64');
html = html.split('src="cardback.png"').join('src="' + backUri + '"');

// Sanity checks: όλα τα scripts μπήκαν και είναι συντακτικά έγκυρα
if (/src="js\//.test(html)) { console.error('❌ Έμεινε εξωτερικό js reference!'); process.exit(1); }
const blocks = html.split('<script>').slice(1).map(b => b.split('</script>')[0]);
for (const b of blocks) {
  try { new Function(b); } catch (e) { console.error('❌ Syntax error σε inline block: ' + e.message); process.exit(1); }
}

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('✅ dist/index.html (' + Math.round(html.length / 1024) + ' KB) — ' + blocks.length + ' inline scripts OK');
