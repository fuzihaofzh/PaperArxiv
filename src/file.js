const utils = new (require('./utils.js').utils)();
const path = require('path');
const fs = require('fs');
function extractFromPdfFile(filePath, ctx) {
    if(! filePath.endsWith('.pdf'))return null;
    var child_process = require('child_process');
    var pdfInfo = {}
    try{
        var data = child_process.execSync('pdftohtml -f 1 -l 1 -q -xml -i -stdout -fontfullname "' + filePath + '"', {env:{PATH: process.env.PATH + ':/usr/local/bin'}}).toString();
    }catch(err){
        ctx.error("Cannot find pdftohtml command in current shell. Please install popller and set the path of sh.\n" + err);
        return;
    }
    var years = utils.regFindAll(/19\d\d|20\d\d/g, data).map(x => Number(x));
    pdfInfo.year = Math.max(...(years.length == 0 ? [(new Date()).getFullYear()] : years));
    var xpath = require('xpath'), dom = require('xmldom').DOMParser
    var doc = new dom().parseFromString(data)
    var title = xpath.select("//text[@font=0]", doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, "")).join(' ');//remove html tags
    var authorsList = xpath.select("//text[@font=1 or @font=2 or @font=3 or @font=4 or @font=5]", doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, ""));
    if([...Object.keys(ctx.configSettings.ConferenceMap), 'arXiv', 'Vol.', 'V o L', 'N A t U r e', 'RESEARCH ARTICLES', 'LETTER', 'I N V I T E D P A P E R', 'doi.org'].some(x => utils.strContain(title, x)) || title.length < 5){
        title = xpath.select("//text[@font=1]", doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, "")).join(' ');
        authorsList = xpath.select("//text[@font=2 or @font=3 or @font=4 or @font=5]", doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, ""));
    }
    pdfInfo.title = title.slice(0, 200);
    var authors = []
    var cnt = 0
    for(var i = 0; i < authorsList.length; ++i){
        var a = authorsList[i];
        if(a !== undefined && ['Abstract', 'abstract', 'ABSTRACT', 'BSTRACT', 'Introduction'].every(x => !utils.strContain(a, x)) && authors.length < 10){
            if(a.length >= 4){
                authors = authors.concat(a.replace(/†|∗|‡|§/g,'').split(/,| *and /g));
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
    pdfInfo.authors = authors.map(x => x.trim()).join('\n')
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    pdfInfo.addTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -5).replace('T', ' ');
    pdfInfo.updateTime = pdfInfo.addTime;
    pdfInfo.content = child_process.execSync('pdftohtml -q -xml -i -stdout -fontfullname "' + filePath + '"', {env:{PATH: process.env.PATH + ':/usr/local/bin'}}).toString().replace(/<\/?[^>]+(>|$)/g, "").split('\n').filter(x => x.length > 10).join('\n');
    pdfInfo.tags = "";
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
    var dialog = require('electron').remote.dialog;
    dialog.showOpenDialog({
        defaultPath: ctx.previousOpenPath == undefined? null: ctx.previousOpenPath,
        properties: ['openFile', 'multiSelections']
    }, function(filePath) {
        if(filePath === undefined)return;
        filePath.forEach(function(entry) {
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
        });
    });
}

module.exports = {
    extractFromPdfFile: extractFromPdfFile,
    loadFile: loadFile,
}
