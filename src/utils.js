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
    this.configToString = function (config){
        sc = this.deepcopy(config);
        for(var i in sc){
            if(typeof(sc[i]) == 'string') continue;
            sc[i] = JSON.stringify(sc[i], null, '\t');
        }
        return sc;
    }
    this.stringToConfig = function (str, ctx){
        try{
            sc['ConferenceMap'] = JSON.parse(sc['ConferenceMap']);
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
