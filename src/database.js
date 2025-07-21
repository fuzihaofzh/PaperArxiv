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
                console.log(err);
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
        try {
            if(typeof(this.db) !== undefined){
                ctx.tableData = this.db.prepare("SELECT * FROM docInfoTable").all();
            }
        } catch(err) {
            console.log("Database error:", err);
            ctx.tableData = [];
        }
        //ctx.tagCounts = _exteactTags(ctx.tableData, "tags");
        //ctx.journalCounts = _exteactTags(ctx.tableData, "journal");
    });
    _insertItem = dbwrapper(function(itemInfo, srcPath, dstPath){
        const keys = Object.keys(itemInfo);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(key => itemInfo[key]);
        const sql = `INSERT INTO ${ctx.dbTableName} (${keys.join(', ')}) VALUES (${placeholders})`;
        this.db.prepare(sql).run(...values);
        if(srcPath != dstPath){
          fs.writeFileSync(dstPath, fs.readFileSync(srcPath));
          fs.unlink(srcPath, function (err) {
              if (err) ctx.warn("原始文件" + srcPath + "已打开，无法移动，已复制副本到库");
          });
        }
    });
    _deleteItem = dbwrapper(function (name){
        const sql = `DELETE FROM ${ctx.dbTableName} WHERE name = ?`;
        this.db.prepare(sql).run(name);
    });
    this.InsertItemInfo = dbwrapper(function() {
        ctx.itemEditFormDataStandard = utils.deepcopy(ctx.ctor.itemEditFormData);
        var itemInfo = ctx.itemEditFormDataStandard;
        const checkSql = `SELECT name FROM ${ctx.dbTableName} WHERE name = ?`;
        if (this.db.prepare(checkSql).all(itemInfo.name).length != 0) {
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
    this.searchItemInfo = function(searchText, domains = ctx.searchKeys){
        function searchOneKeyword(candindateList, searchText){
            if (!searchText) return candindateList;
            
            // Check for exact match prefix
            const isExactMatch = searchText.startsWith('EXACT_MATCH:');
            if (isExactMatch) {
                searchText = searchText.substring('EXACT_MATCH:'.length);
            }
            
            // Escape special regex characters
            const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // For better performance, use indexOf for simple searches
            const searchLower = searchText.toLowerCase();
            const useRegex = searchText.includes('*') || searchText.includes('.') || searchText.includes('[') || searchText.includes('(') || searchText.includes(')');
            const regEx = useRegex ? new RegExp('(' + escapedSearchText + ')', "ig") : null;
            const regSkip = /```mermaid[^```]+```|\$\$[^$]+\$\$|\n.+data:image\/png;base64.+|\!\[[^\]]+\]\[[^\]]+\]/g;
            
            const newList = [];
            
            for(let i = 0; i < candindateList.length; i++){
                const item = candindateList[i];
                let found = false;
                const highlightedItem = {};
                
                // Copy all properties first
                for(let key in item) {
                    highlightedItem[key] = item[key];
                }
                
                for(let j = 0; j < domains.length; j++){
                    const domain = domains[j];
                    const fieldValue = item[domain];
                    
                    if (!fieldValue) continue;
                    
                    
                    // Special handling for libraryPath - check if fieldValue contains the search path
                    if (domain === 'libraryPath') {
                        // For library path, check if the item's path contains the searched path
                        // Since items might have multiple paths separated by newlines
                        const pathLines = fieldValue.split('\n');
                        let pathFound = false;
                        for (let pathLine of pathLines) {
                            if (pathLine.trim().includes(searchText)) {
                                pathFound = true;
                                break;
                            }
                        }
                        if (pathFound) {
                            // Highlight the matching path
                            const fieldLower = fieldValue.toLowerCase();
                            const searchLower = searchText.toLowerCase();
                            const index = fieldLower.indexOf(searchLower);
                            if (index !== -1) {
                                const before = fieldValue.substring(0, index);
                                const match = fieldValue.substring(index, index + searchText.length);
                                const after = fieldValue.substring(index + searchText.length);
                                highlightedItem[domain] = before + '<font class="search-result-block">' + match + '</font>' + after;
                            } else {
                                highlightedItem[domain] = fieldValue;
                            }
                            found = true;
                        }
                        continue;
                    }
                    
                    // Skip highlighting for tags domain to avoid issues with display
                    if (domain === 'tags') {
                        // Just check if it matches without replacing
                        if (useRegex) {
                            if (fieldValue.match(regEx)) {
                                found = true;
                            }
                        } else {
                            if (fieldValue.toLowerCase().includes(searchLower)) {
                                found = true;
                            }
                        }
                    } else if (domain === 'authors' && isExactMatch) {
                        // For exact match, use regex to ensure the complete name appears as a whole unit
                        const escapedName = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        // Look for the name surrounded by word boundaries or non-word characters
                        const exactPattern = new RegExp('(?:^|\\W)' + escapedName + '(?:\\W|$)', 'i');
                        if (exactPattern.test(fieldValue)) {
                            found = true;
                            // Highlight the match
                            const highlightPattern = new RegExp('(' + escapedName + ')', 'gi');
                            highlightedItem[domain] = fieldValue.replace(highlightPattern, '<font class="search-result-block">$1</font>');
                        }
                    } else {
                        if (useRegex) {
                            const cleanedValue = fieldValue.replace(regSkip, '');
                            if (cleanedValue.match(regEx)) {
                                highlightedItem[domain] = fieldValue.replace(regSkip, '').replace(regEx, '<font class="search-result-block">$1</font>');
                                found = true;
                            }
                        } else {
                            // Use indexOf for simple searches - much faster
                            const fieldLower = fieldValue.toLowerCase();
                            const index = fieldLower.indexOf(searchLower);
                            if (index !== -1) {
                                const before = fieldValue.substring(0, index);
                                const match = fieldValue.substring(index, index + searchText.length);
                                const after = fieldValue.substring(index + searchText.length);
                                highlightedItem[domain] = before + '<font class="search-result-block">' + match + '</font>' + after;
                                found = true;
                            }
                        }
                    }
                }
                
                if(found){
                    newList.push(highlightedItem);
                }
            }
            return newList;
        }
        
        function searchMultipleKeywords(candindateList, searchText){
            const searchedKeywords = searchText.substring(1, searchText.length-1).split('|');
            const resultMap = new Map();
            
            for (let keyword of searchedKeywords){
                const results = searchOneKeyword(candindateList, keyword);
                for (let item of results) {
                    if (!resultMap.has(item.name)) {
                        resultMap.set(item.name, item);
                    }
                }
            }
            
            return Array.from(resultMap.values());
        }
        
        if (typeof searchText !== 'string') searchText = searchText.toString();
        
        // Don't copy all data if not necessary
        let candindateList;
        if (domains === ctx.searchKeys && searchText.length > 0) {
            // Use original data for better performance
            candindateList = ctx.tableData.map(item => {
                const copy = {};
                for (let key of ctx.showKeys) {
                    copy[key] = item[key];
                }
                return copy;
            });
        } else {
            candindateList = utils.partialCopyArray(ctx.tableData, ctx.showKeys);
        }
        
        if (searchText[0] === '(' && searchText[searchText.length-1] === ')'){
            candindateList = searchMultipleKeywords(candindateList, searchText);
        } else {
            // For libraryPath searches, don't split on spaces - use the full path
            if (domains.length === 1 && domains[0] === 'libraryPath') {
                candindateList = searchOneKeyword(candindateList, searchText);
            } else {
                // For other searches, split on spaces for AND logic
                const searchKeywords = searchText.split(' ').filter(k => k.length > 0);
                for(let i = 0; i < searchKeywords.length; ++i){
                    candindateList = searchOneKeyword(candindateList, searchKeywords[i]);
                }
            }
        }
        
        ctx.ctor.tableData = candindateList;
    }
}

module.exports = {
    DBManager: DBManager
}