 function utils(){
     this.strContain = function (ss, sub) {
        var regEx = new RegExp(sub, "ig");
        if(ss.toString().match(regEx) != null){
            return true;
        }else{
            return false;
        }
    };
    this.regFindAll = function (reg, str){
        var result = [];
        while (m = reg.exec(str)) {
            result.push(m[0])
        }
        return result;
    };
    this.deepcopy = function(src){
      return JSON.parse(JSON.stringify(src));
    };
    this.partialCopy = function(src, keys){
        obj = {};
        keys.forEach(x => obj[x] = src[x]);
        return obj;
    };
    this.partialCopyArray = function (src, keys){
        dst = [];
        for(var k in src){
            dst.push(this.partialCopy(src[k], keys));
        }
        return dst;
    };
    this.getUserTags = function (src){
        function byCount(lst){
            var itm, a= [], L= lst.length, o= {};
            for(var i= 0; i<L; i++){
                itm= lst[i];
                if(!itm) continue;
                if(o[itm]== undefined) o[itm]= 1;
                else ++o[itm];
            }
            for(var p in o) a[a.length]= p;
            a = a.sort(function(a, b){
                return o[b]-o[a];
            });
            res = {};
            for(aa of a){
                res[aa] = {};
                res[aa].count = o[aa];
                res[aa].isEdit = false;
                res[aa].label = aa;
            }
            //a.forEach(x => res[x] = o[x]);
            return res
        }
        tags = [];
        for(var k of src){
            tags = tags.concat(k['tags'].split(/[,;\n]/g));
        }
        tags = tags.map(x => x.trim());
        tags = byCount(tags);
        return tags;
    };
    this.getUserLibraryTree = function (src){
        tree = [{name : "Library"}];
        icons = ["📦", "🗂️", "📚", "📘"];
        function addNode(node, pathSeg, deepth, fullPath, name){
            // addNode(tree, ["Library", "aaa", "bbb"]);
            if (pathSeg.length == 0) return;
            var hasNode = false;
            for (r of node){
                if (pathSeg[0] == r.name){
                    hasNode = true;
                    break;
                }
            }
            if (!hasNode){
                r = {name : pathSeg[0]}
                node.push(r);
            }
            if (r.count == undefined){ 
                r.count = 0;
                r.subitem = new Set();
            }
            r.subitem.add(name);
            r.count = r.subitem.size;
            r.label = icons[deepth] + r.name + "(" + r.count.toString() + ")";
            r.isEdit = false;
            r.isTextEdit = false;
            r.path = fullPath + "/" + r.name;
            if (pathSeg.length > 1 && r.children == undefined)r.children = [];
            addNode(r.children, pathSeg.slice(1, pathSeg.length), deepth + 1, r.path, name);
        };
        for(var k of src){
            paths = k['libraryPath'].split(/[\n]/g);
            if (paths.find(o => o === '/Library') == undefined){
                k['libraryPath'] = '/Library\n' + k['libraryPath'];
                paths = ['/Library'].concat(paths);
            }
            //epath = k['libraryPath'] + '\n/Library';
            for(path of paths){
                pathSeg = path.split('/');
                if(pathSeg[0] == "")pathSeg = pathSeg.slice(1, pathSeg.length);
                addNode(tree, pathSeg, 0, "", k.name);
            }
        }
        return tree;
    };
    this.updateUserLibraryTree = function (ctx, newName, oldPath, remove = false){
        if(remove)newName = "";
        var pathSeg = oldPath.split('/')
        newPath = pathSeg.slice(0, pathSeg.length - 1).join('/') + '/'+ newName;
        if(newPath == oldPath)return;
        for (item of ctx.tableData){
            paths = item.libraryPath.split('\n');
            oid = paths.indexOf(oldPath);
            while(oid != -1){
                if(!remove){
                    paths[oid] = newPath;
                }else{
                    paths = paths.filter(x => x != oldPath);
                }
                oid = paths.indexOf(oldPath);
                item.libraryPath = paths.join('\n');
                ctx.dbManager.updateItemInfoFixName(item);
            }
        }
    }
    this.updateUserTags = function (ctx, oldTag, newTag,  remove = false){
        if(remove)newTag = "";
        if(oldTag == newTag)return;
        for (item of ctx.tableData){
            tags = item.tags.split(/[,;\n]/g);
            oid = tags.indexOf(oldTag);
            while(oid != -1){
                if(!remove){
                    tags[oid] = newTag;
                }else{
                    tags = tags.filter(x => x != oldTag);
                }
                oid = tags.indexOf(oldTag);
                item.tags = tags.join(',');
                ctx.dbManager.updateItemInfoFixName(item);
            }
        }
    }
    this.configToString = function (config){
        return JSON.stringify(config, null, '\t')
    }
    this.stringToConfig = function (text){
        try{
            sc = JSON.parse(text);
        }catch(err){
            ctx.error("文献列表格式错误！");
            return -1;
        }
        return sc;
    }
}
module.exports = {
    utils: utils
}
