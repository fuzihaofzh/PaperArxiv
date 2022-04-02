const utils = new (require('./utils.js').utils)();
const path = require('path');
const {titleCase} = require('title-case');
function extractFromPdfFile(filePath, ctx) {
    console.log(`Processing${filePath}`);
    if(! filePath.endsWith('.pdf'))return null;
    var child_process = require('child_process');
    var pdfInfo = {}
    try{
        var data = child_process.execSync('pdftohtml -f 1 -l 1 -q -xml -i -stdout -fontfullname "' + filePath + '"', {env:{PATH: process.env.PATH + ':/usr/local/bin:' + ctx.configSettings.pdftohtmlPath}}).toString();
    }catch(err){
        ctx.error("Cannot find pdftohtml command in current shell. Please install popller and set the PATH for sh.\n" + err);
        return;
    }
    var years = utils.regFindAll(/19\d\d|20\d\d/g, data).map(x => Number(x)).filter(x => x <= new Date().getFullYear());
    pdfInfo.year = Math.max(...(years.length == 0 ? [(new Date()).getFullYear()] : years)).toString();
    var xpath = require('xpath'), dom = require('xmldom').DOMParser
    meta = []
    for(line of data.split('\n')){
        meta.push(line);
        if(['Abstract', 'abstract', 'ABSTRACT', 'BSTRACT', 'Introduction'].some(x => utils.strContain(line, x))) break;
    }
    meta = meta.join('\n');
    var doc = new dom().parseFromString(meta)
    var fontSizes = xpath.select("//fontspec", doc).map(x => parseInt(x.getAttribute('size'))).slice(0, 8);
    var titleFont = fontSizes.indexOf(Math.max.apply(Math, fontSizes))
    var title = xpath.select(`//text[@font=${titleFont}]`, doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, "")).join(' ');
    //title has two fonts
    if(title.split(' ').map(x => x.length).filter(x => x == 1).length >= 3 || title.split(' ').length <= 3){
        var title = "";
        for(t of xpath.select(`//text[@font=${titleFont} or @font=${titleFont+1}]`, doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, ""))){
            title += t;
            if(utils.strContain(t, '-')){title = title.slice(0, title.length-1);}
            if (t.length > 1 && !utils.strContain(t, '-')){title += ' ';}
        }
        title = title.toLowerCase();
        titleFont += 1;
    }
    var authorsList = xpath.select(`//text[@font=${titleFont+1} or @font=${titleFont+2} or @font=${titleFont+3} or @font=${titleFont+4} or @font=${titleFont+5}]`, doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, "")).filter(x => utils.strContain(x, ' ')).concat();
    pdfInfo.title = titleCase(title.slice(0, 200));
    var authors = []
    var cnt = 0
    for(var i = 0; i < authorsList.length; ++i){
        var a = authorsList[i];
        if(a !== undefined && ['Abstract', 'abstract', 'ABSTRACT', 'BSTRACT', 'Introduction'].every(x => !utils.strContain(a, x)) && authors.length < 20){
            if(a.length >= 4){
                authors = authors.concat(a.replace(/†|∗|‡|§/g,'').split(/,| *and /g).filter(x => x.length > 2));
            }
        }else{
            break;
        }
    }
    if(authors.length == 0) authors = ["Unknown"];
    var pcontent = data.replace(/<\/?[^>]+(>|$)| *\-\n */g, "").replace("\n", "");
    pdfInfo.journal = "note"
    for(var jn in ctx.configSettings.ConferenceMap){
        if(utils.strContain(pcontent, jn)){
            pdfInfo.journal = ctx.configSettings.ConferenceMap[jn];
            break;
        }
    }
    pdfInfo.authors = authors.map(x => titleCase(x.trim())).join('\n');
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    pdfInfo.addTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -5).replace('T', ' ');
    pdfInfo.updateTime = pdfInfo.addTime;
    try{
        pdfInfo.content = child_process.execSync('pdftohtml -q -xml -i -stdout -fontfullname "' + filePath + '"', {env:{PATH: process.env.PATH + ':/usr/local/bin:' + ctx.configSettings.pdftohtmlPath}}).toString().replace(/<\/?[^>]+(>|$)/g, "").split('\n').filter(x => x.length > 10).join('\n');
    }catch(err){
        pdfInfo.content = data.toString().replace(/<\/?[^>]+(>|$)/g, "").split('\n').filter(x => x.length > 10).join('\n');;
        ctx.error("Content extract error.\n" + err);
    }
    pdfInfo.tags = searchTags([pdfInfo.title, pdfInfo.abstract, pdfInfo.content].join(' '), ctx);
    pdfInfo.libraryPath = "/Library";
    pdfInfo.comment = "";

    // use gscholar to find bib info
    if(ctx.configSettings.engines.gscholar){
        try{
            var data = child_process.execSync('gscholar "' + filePath + '"', {env:{PATH: process.env.PATH + ':/usr/local/bin'}, "shell": "/bin/bash"}).toString();
            title = data.match(/title={.*?}[,\n]/g);
            if(title){
                pdfInfo.title = title[0].slice(7, -2);
            }
            year = data.match(/year={\d+}/g);
            if(year){
                pdfInfo.year = Number(year[0].slice(6, -1));
            }
            authors = data.match(/author={.*?}[,\n]/g);
            if(authors){
                pdfInfo.authors = authors[0].slice(8, -2).replace(/,/g, ' ').replace(/ +/g, ' ').replace(/ and /g, '\n');
            }
        }catch(err){
            ctx.warn("gscholar command error:\n" + err);
        }
    }
    pdfInfo.name = ([pdfInfo.year, pdfInfo.journal, pdfInfo.authors.split('\n')[0].replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" \n]/g, '')].join('-') + '.pdf').replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" ]/g, '');
    return pdfInfo;
}
function loadFile(ctx) {
    //fileDialog({ multiple: true, accept: 'image/*' })
    //.then(file => {  
    //})
    var input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = function(e) {
        var filePath = e.target.files[0]; 
        for(file of e.target.files) {
            entry = file.path;
            if (!entry.endsWith('.pdf')) {
                console.log(ctx);
                ctx.error(entry + '\n文件类型错误，只能打开pdf文件');
            }
            pdfInfo = extractFromPdfFile(entry, ctx);
            ctx.ctor.itemEditFormData = utils.deepcopy(pdfInfo);
            ctx.itemEditFormDataStandard = pdfInfo;
            //ctx.ctor.itemEditFormVisible = true;
            ctx.itemEditFilePath = entry;
            ctx.dbManager.InsertItemInfo();
            ctx.previousOpenPath = path.dirname(entry);
            //ctx.ctor.searchContent();
            ctx.ctor.userInputSearchText = "";
        }
        ctx.ctor.refreshAllInfo();
    };
    input.click();
}

function searchTags(text, ctx){
    text = text.toLowerCase()
    tags = []
    for(tag in ctx.ctor.userTags){
        if(utils.strContain(text, " " + tag.toLowerCase() + " ")){
            tags.push(tag);
        }
    }
    return tags.join(',')
}

module.exports = {
    extractFromPdfFile: extractFromPdfFile,
    loadFile: loadFile,
}
