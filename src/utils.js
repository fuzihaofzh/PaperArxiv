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
            return a.sort(function(a, b){
                return o[b]-o[a];
            });
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
        function addNode(node, pathSeg, deepth, fullPath){
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
            if (r.count == undefined) r.count = 0;
            r.count += 1
            r.label = icons[deepth] + r.name + "(" + r.count.toString() + ")";
            r.path = fullPath + "/" + r.name;
            if (pathSeg.length > 1 && r.children == undefined)r.children = [];
            addNode(r.children, pathSeg.slice(1, pathSeg.length), deepth + 1, r.path);
        };
        for(var k of src){
            for(path of k['libraryPath'].split(/[\n]/g)){
                pathSeg = path.split('/');
                if(pathSeg[0] == "")pathSeg = pathSeg.slice(1, pathSeg.length);
                addNode(tree, pathSeg, 0, "");
            }
        }
        return tree;
    };
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
