const {icons} = require('./icons.js');
//const mume = require("@shd101wyy/mume");
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
        let m;
        while (m = reg.exec(str)) {
            result.push(m[0])
        }
        return result;
    };
    this.deepcopy = function(src){
      return JSON.parse(JSON.stringify(src));
    };
    this.partialCopy = function(src, keys){
        let obj = {};
        keys.forEach(x => obj[x] = src[x]);
        return obj;
    };
    this.partialCopyArray = function (src, keys){
        if (!src || !Array.isArray(src)) {
            return [];
        }
        let dst = [];
        for(var k in src){
            dst.push(this.partialCopy(src[k], keys));
        }
        return dst;
    };
    this.getUserTags = function (src){
        if (!src || !Array.isArray(src)) {
            return {};
        }
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
            let res = {};
            for(let aa of a){
                res[aa] = {};
                res[aa].count = o[aa];
                res[aa].isEdit = false;
                res[aa].label = aa;
            }
            //a.forEach(x => res[x] = o[x]);
            return res
        }
        let tags = [];
        for(var k of src){
            if (k['tags']) {
                tags = tags.concat(k['tags'].split(/[,;\n]/g));
            }
        }
        tags = tags.map(x => x.trim());
        tags = byCount(tags);
        return tags;
    };
    this.getUserLibraryTree = function (src){
        if (!src || !Array.isArray(src)) {
            return [{name : "Library"}];
        }
        let tree = [{name : "Library"}];
        let iconsList = Object.values(icons); //["🗄️", "📦", "📚", "🗂️", "📘"];
        function addNode(node, pathSeg, deepth, fullPath, name){
            // addNode(tree, ["Library", "aaa", "bbb"]);
            if (pathSeg.length == 0) return;
            var hasNode = false;
            let r = null;
            for (let nodeItem of node){
                if (pathSeg[0] == nodeItem.name){
                    hasNode = true;
                    r = nodeItem;
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
            r.label = iconsList[Math.min(deepth, iconsList.length-1)] + r.name + "(" + r.count.toString() + ")";
            r.isEdit = false;
            r.isTextEdit = false;
            r.path = fullPath + "/" + r.name;
            if (pathSeg.length > 1 && r.children == undefined)r.children = [];
            addNode(r.children, pathSeg.slice(1, pathSeg.length), deepth + 1, r.path, name);
        };
        for(var k of src){
            let paths = k['libraryPath'].split(/[\n]/g);
            if (paths.find(o => o === '/Library') == undefined){
                k['libraryPath'] = '/Library\n' + k['libraryPath'];
                paths = ['/Library'].concat(paths);
            }
            //epath = k['libraryPath'] + '\n/Library';
            for(let path of paths){
                let pathSeg = path.split('/');
                if(pathSeg[0] == "")pathSeg = pathSeg.slice(1, pathSeg.length);
                addNode(tree, pathSeg, 0, "", k.name);
            }
        }
        return tree;
    };
    this.updateUserLibraryTree = function (ctx, newPath, oldPath, remove = false){
        if(remove)newPath = "";
        if(newPath == oldPath)return;
        function findPath(paths, oldPath, strContain){
            let ids = [];
            for(let i in paths){
                if(strContain(paths[i], oldPath)) ids.push(i);
            }
            return ids;
        }
        for (let item of ctx.tableData){
            let paths = item.libraryPath.split('\n');
            let oids = findPath(paths, oldPath, this.strContain);
            if(oids.length > 0){
                for(let oid of oids){
                    if(!remove){
                        paths[oid] = paths[oid].replace(oldPath, newPath).trim();
                    }else{
                        paths = paths.filter(x => !this.strContain(x, oldPath));
                    }
                }
                item.libraryPath = paths.join('\n');
                ctx.dbManager.updateItemInfoFixName(item);
            }
        }
    }
    this.updateUserTags = function (ctx, oldTag, newTag,  remove = false){
        if(remove)newTag = "";
        if(oldTag == newTag)return;
        for (let item of ctx.tableData){
            let tags = item.tags.split(/ ?[,;\n] ?/g);
            let oid = tags.indexOf(oldTag);
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
        let sc;
        try{
            sc = JSON.parse(text);
        }catch(err){
            ctx.error("文献列表格式错误！");
            return -1;
        }
        return sc;
    },
    this.mumeRender = function(inputString){
        if(this.mumeEngine == undefined){
            this.mumeEngine = new mume.MarkdownEngine({
                filePath: "",
                projectDirectoryPath: "",
            });
        }
        return {html: inputString}
        //return this.mumeEngine.parseMD(inputString);
    };
  /**
   * This handler retrieves the images from the clipboard as a base64 string and returns it in a callback.
   * 
   * @param pasteEvent 
   * @param callback 
   */
  this.retrieveImageFromClipboardAsBase64 = function(pasteEvent, callback){
       if(pasteEvent.clipboardData == false){
           if(typeof(callback) == "function"){
               callback(undefined);
           }
       };
   
       var items = pasteEvent.clipboardData.items;
   
       if(items == undefined){
           if(typeof(callback) == "function"){
               callback(undefined);
           }
       };
   
       for (var i = 0; i < items.length; i++) {
           // Skip content if not image
           if (items[i].type.indexOf("image") == -1) continue;
           // Retrieve image on clipboard as blob
           var blob = items[i].getAsFile();
   
           // Create an abstract canvas and get context
           var mycanvas = document.createElement("canvas");
           var ctx = mycanvas.getContext('2d');
           
           // Create an image
           var img = new Image();
   
           // Once the image loads, render the img on the canvas
           img.onload = function(){
               // Update dimensions of the canvas with the dimensions of the image
               mycanvas.width = this.width;
               mycanvas.height = this.height;
   
               // Draw the image
               ctx.drawImage(img, 0, 0);
   
               // Execute callback with the base64 URI of the image
               callback(mycanvas.toDataURL(
                   (items[i].type == "image/png") ? "image/png" : "image/jpeg"
               ));
           };
   
           // Crossbrowser support for URL
           var URLObj = window.URL || window.webkitURL;
   
           // Creates a DOMString containing a URL representing the object given in the parameter
           // namely the original Blob
           img.src = URLObj.createObjectURL(blob);
       }
   }
}
module.exports = {
    utils: utils
}