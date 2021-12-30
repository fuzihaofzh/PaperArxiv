const path = require("path");
const utils = new (require('./utils.js').utils)();
const fs = require('fs');
function DBManager(ctx) {
    function dbwrapper (func){
        return function(...args){
            BS3 = require('better-sqlite3');
            try{
                db = BS3(path.join(ctx.configSettings.libpath, 'pa.db'));
            }catch(err){
                alert("Cannot open the database " + path.join(ctx.configSettings.libpath, 'pa.db'));
                return;
            }
            ctx.dbTableName = "docInfoTable";
            db.prepare("create table if not exists " + ctx.dbTableName + "(name text NOT NULL PRIMARY KEY, title text, authors text, year text, journal text, tags text, comment text, addTime datetime, updateTime datetime, content text, libraryPath text DEFAULT '/Library')").run();
            //ctx.metaTableName = "metaInfoTable";
            //db.prepare("create table if not exists " + ctx.metaTableName + " (name text NOT NULL PRIMARY KEY, info text)");
            this.db = db;

            func(...args);

            this.db.close();
        };
    };

    _exteactTags = function(tableData, key){
        var tags = tableData.map(x => x[key].split(","));
        tags = Array.prototype.concat.apply([], tags);
        tags = tags.map(x => x.trim()).filter(x => x.length > 0);
        var counts = {};
        for (var i = 0; i < tags.length; i++) {
          counts[tags[i]] = counts[tags[i]] ? counts[tags[i]] + 1 : 1;
        }
        return counts;
    }
    this.loadFullData = dbwrapper(function() {
        if(typeof(this.db) !== undefined)ctx.tableData = this.db.prepare("SELECT * FROM docInfoTable").all();
        //ctx.tagCounts = _exteactTags(ctx.tableData, "tags");
        //ctx.journalCounts = _exteactTags(ctx.tableData, "journal");
    });
    _insertItem = dbwrapper(function(itemInfo, srcPath, dstPath){
        keys = Object.keys(itemInfo);
        values = "('" + keys.map(x => itemInfo[x].toString().replace(/\'/g, "''")).join("', '") + "')";
        keys = "(" + keys.join(', ') + ")";
        this.db.prepare("insert into " + ctx.dbTableName + keys + " values  " + values + ";").run();
        if(srcPath != dstPath){
          fs.writeFileSync(dstPath, fs.readFileSync(srcPath));
          fs.unlink(srcPath, function (err) {
              if (err) ctx.warn("原始文件" + srcPath + "已打开，无法移动，已复制副本到库");
          });
        }
    });
    _deleteItem = dbwrapper(function (name){
        this.db.prepare("delete from " + ctx.dbTableName + " where name='" + name + "';").run();
    });
    this.InsertItemInfo = dbwrapper(function() {
        ctx.itemEditFormDataStandard = utils.deepcopy(ctx.ctor.itemEditFormData);
        var itemInfo = ctx.itemEditFormDataStandard;
        if (this.db.prepare("select name from " + ctx.dbTableName + " where name = '" + itemInfo.name + "';").all().length != 0) {
            ctx.error("有同名文件" + itemInfo.name + "存在！请编辑名称。");
            ctx.ctor.itemEditFormVisible = true;
            return -1;
        }
        _insertItem(itemInfo, ctx.itemEditFilePath, path.join(ctx.configSettings.libpath, ctx.itemEditFormDataStandard.name));
        ctx.tableData.push(ctx.itemEditFormDataStandard);
        ctx.ctor.tableData = utils.partialCopyArray(ctx.tableData, ctx.showKeys);
        return 0;
    });
    this.updateItemInfo = function(oriName){
        var tzoffset = (new Date()).getTimezoneOffset() * 60000;
        ctx.ctor.itemEditFormData.updateTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -5).replace('T', ' ');
        ctx.itemEditFormDataStandard = utils.deepcopy(ctx.ctor.itemEditFormData);
        var findItemId = 0;
        for(;findItemId < ctx.tableData.length && ctx.tableData[findItemId].name !== oriName; ++findItemId);
        if(findItemId >= ctx.tableData.length){ctx.error('Cannot find the file in the database. Please restart PaperArxiv.');return;};
        for(var x in ctx.itemEditFormDataStandard){
            ctx.tableData[findItemId][x] = ctx.itemEditFormDataStandard[x];
        }
        _deleteItem(oriName);
        _insertItem(ctx.itemEditFormDataStandard, path.join(ctx.configSettings.libpath, oriName), path.join(ctx.configSettings.libpath, ctx.itemEditFormDataStandard.name));
        ctx.ctor.tableData = utils.partialCopyArray(ctx.tableData, ctx.showKeys);
    }
    this.updateItemInfoFixName = function(item){
        _deleteItem(item.name);
        _insertItem(item, "", "");
    }
    this.deleteItemInfo = function(name){
        _deleteItem(name);
        fs.unlink(path.join(ctx.configSettings.libpath, name), function (err) {
            if (err) ctx.warn("The file " + path.join(ctx.configSettings.libpath, name) + " cannot be deleted. Please consider closing PaperArxiv and removing the file manually.");
        });
        var findItemId = 0;
        for(;findItemId < ctx.tableData.length && ctx.tableData[findItemId].name !== name; ++findItemId);
        ctx.tableData.splice(findItemId, 1);
        ctx.ctor.tableData = utils.partialCopyArray(ctx.tableData, ctx.showKeys);
    },
    this.searchItemInfo = function(searchText, domains = ctx.showKeys){
        function searchOneKeyword(candindateList, searchText){
            if (!searchText) return candindateList;
            newList = [];
            newListRender = [];
            var regEx = new RegExp('(' + searchText + ')', "ig");
            function searchAndReplace(attrList, newRow){
                for (let key in domains){
                    newRow[attrList[key]] = newRow[attrList[key]].toString().replace(regEx, '<span class="search-result-block">$1</span>');
                }
                return newRow;
            }
            for (let key in candindateList) {
                if(domains.some(function (x){return utils.strContain(candindateList[key][x], searchText)})){
                var newRow = utils.partialCopy(candindateList[key], ctx.showKeys);
                newList.push(candindateList[key]);
                newListRender.push(searchAndReplace(domains, newRow));
                }
            }
            return [newList, newListRender];
        }
        var candindateList = ctx.tableData;
        if (ctx.previousSearchText !== undefined && searchText.includes(ctx.previousSearchText)){
            candindateList = ctx.previousCandindateList;
        }
        ctx.previousSearchText = searchText;
        searchText = searchText.trim().split(/[ ]*\+[ ]*/g);
        for (let word of searchText){
            [ctx.previousCandindateList, candindateList] = searchOneKeyword(candindateList, word);
        }
        ctx.ctor.tableData = candindateList;
    }
}

module.exports = {
    DBManager: DBManager
}
