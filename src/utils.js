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
        console.log(tags);
        return tags;
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
