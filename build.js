/**
 * 罗德岛补给站 - 构建脚本
 * 功能：压缩 CSS/JS，更新 HTML 引用为 .min 版本
 * 运行：npm run build
 */

const fs = require('fs');
const path = require('path');

// 基础 CSS 压缩：去注释、去多余空白
function minifyCSS(content) {
    return content
        .replace(/\/\*[\s\S]*?\*\//g, '')           // 去注释
        .replace(/\s+/g, ' ')                        // 合并空白
        .replace(/\s*([{}:;,>+~()])\s*/g, '$1')     // 去符号周围空白
        .replace(/;\s*}/g, '}')                      // 去最后一个分号
        .replace(/,\s*/g, ',')                       // 逗号后空白
        .trim();
}

// 基础 JS 压缩：去注释、去多余空白（保留字符串内容）
function minifyJS(content) {
    // 去单行注释
    content = content.replace(/\/\/.*$/gm, '');
    // 去多行注释
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // 合并空白（保留换行用于分号插入安全）
    content = content.replace(/[ \t]+/g, ' ');
    // 去行首行尾空白
    content = content.split('\n').map(l => l.trim()).filter(l => l).join('\n');
    // 去多余空行
    content = content.replace(/\n{3,}/g, '\n\n');
    return content.trim();
}

const rootDir = __dirname;

// 读取源文件
const cssPath = path.join(rootDir, 'css', 'style.css');
const jsPath = path.join(rootDir, 'js', 'main.js');
const htmlPath = path.join(rootDir, 'Hypergryphmode.html');

if (!fs.existsSync(cssPath) || !fs.existsSync(jsPath) || !fs.existsSync(htmlPath)) {
    console.error('[build] 源文件不存在，请先确保项目结构完整');
    process.exit(1);
}

const cssOriginal = fs.readFileSync(cssPath, 'utf8');
const jsOriginal = fs.readFileSync(jsPath, 'utf8');
let html = fs.readFileSync(htmlPath, 'utf8');

// 压缩
const cssMin = minifyCSS(cssOriginal);
const jsMin = minifyJS(jsOriginal);

// 写入 .min 文件
fs.writeFileSync(path.join(rootDir, 'css', 'style.min.css'), cssMin, 'utf8');
fs.writeFileSync(path.join(rootDir, 'js', 'main.min.js'), jsMin, 'utf8');

// 更新 HTML 引用
html = html.replace(
    'href="css/style.css"',
    'href="css/style.min.css"'
);
html = html.replace(
    'src="js/main.js"',
    'src="js/main.min.js"'
);

// 写入构建版 HTML
const buildHtmlPath = path.join(rootDir, 'Hypergryphmode.min.html');
fs.writeFileSync(buildHtmlPath, html, 'utf8');

// 统计
const cssSize = (cssOriginal.length / 1024).toFixed(1);
const cssMinSize = (cssMin.length / 1024).toFixed(1);
const jsSize = (jsOriginal.length / 1024).toFixed(1);
const jsMinSize = (jsMin.length / 1024).toFixed(1);
const cssRatio = ((1 - cssMin.length / cssOriginal.length) * 100).toFixed(1);
const jsRatio = ((1 - jsMin.length / jsOriginal.length) * 100).toFixed(1);

console.log('\n=== 罗德岛补给站 · 构建报告 ===');
console.log(`  CSS:  ${cssSize} KB → ${cssMinSize} KB (压缩 ${cssRatio}%)`);
console.log(`  JS:   ${jsSize} KB → ${jsMinSize} KB (压缩 ${jsRatio}%)`);
console.log(`  输出: css/style.min.css, js/main.min.js`);
console.log(`  构建版 HTML: Hypergryphmode.min.html`);
console.log('==============================\n');
