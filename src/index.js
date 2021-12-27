//const Vue = require('vue/dist/vue.js');
//const Element = require('element-ui');
const shell = require('electron').shell;
const path = require('path');
const opn = require('opn');
const stringSimilarity = require('string-similarity');
const fileManager = require('./file.js');
const configManager = require('./config.js');
const utils = new (require('./utils.js').utils)();

var DBManager = require('./database.js').DBManager;

var ctx = {}
ctx.configManager = new (require('./config.js').configManager)(ctx);
ctx.dbManager = new DBManager(ctx);
ctx.dbManager.loadFullData();

ctx.showKeys = ['name', 'title', 'year', 'authors', 'tags', 'comment', 'addTime','updateTime', 'libraryPath'];
var emptyData = {}
ctx.showKeys.forEach(x => emptyData[x] = "");
var ItemEdit = {
    data() {
        return {
            ctx: ((item) => {
                ctx.ctor = item;
                ctx.error = ctx.ctor.$message.error;
                ctx.warn = x => this.$message({message: x,type: 'warning'});
                return ctx;
            })(this),
            showKeys: [],
            itemConfigFormData: utils.configToString(ctx.configSettings),
            itemEditFormData: emptyData,
            itemEditFormVisible: false,
            itemConfigFormVisible: false,
            tableData: utils.partialCopyArray(ctx.tableData, ctx.showKeys),
            userInputSearchText: "",
            userTags: utils.getUserTags(ctx.tableData),
            treePath: utils.getUserLibraryTree(ctx.tableData),
        }
    },
    methods: {
        openPdfFile: function() {
            fileManager.loadFile(this.ctx);
            this.$refs.searchBox.focus();
        },
        itemEditFormDataUpdate: function() {
            this.itemEditFormVisible = false;
            if(ctx.updatePreviousItemName !== undefined){
                ctx.dbManager.updateItemInfo(ctx.updatePreviousItemName);
                ctx.updatePreviousItemName = undefined;
            }else{
                ctx.dbManager.InsertItemInfo();
            }
            this.refreshAllInfo();
        },
        itemEditFormDataCancel: function(){
            this.tagsBuffer = null;
            this.$refs.searchBox.focus();
        },
        itemConfigFormDataUpdate: function(){
            var config = utils.stringToConfig(this.itemConfigFormData);
            if(config == -1)return;
            ctx.configSettings = config;
            ctx.configManager.writeConfig();
            this.itemConfigFormVisible = false;
            this.itemConfigFormData = utils.configToString(ctx.configSettings);
            location.reload(true);
            this.$refs.searchBox.focus();
            this.tagsBuffer = null;
        },
        changNameByNewInfo: function() {
            function makeName(arr){
                return (arr.join('-') + ".pdf").replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" ]/g, '');;
            }
            names = [this.itemEditFormData.year, this.itemEditFormData.journal, this.itemEditFormData.authors.split('\n')[0]];
            this.itemEditFormData.name = makeName(names);
            if(ctx.tableData.some(x=>{return x.name == this.itemEditFormData.name;})){
                names.push(this.itemEditFormData.title.split(" ")[0]);
                this.itemEditFormData.name = makeName(names);
            };
        },
        openPdfFileWithSystemTool: function(val){
            shell.openPath(path.join(this.ctx.configSettings.libpath, val.replace(/<\/?[^>]+(>|$)/g, "")));
        },
        refreshAllInfo: function(){
            this.searchContent(this.userInputSearchText);
            this.userTags = utils.getUserTags(ctx.tableData);
            this.treePath = utils.getUserLibraryTree(ctx.tableData);
            this.$refs.searchBox.focus();
        },
        searchTitleInBrowser: function(val, method){
            var div = document.createElement("div");
            div.innerHTML = val;
            var text = div.textContent || div.innerText || "";
            if(method == 'search'){
                opn(this.ctx.configSettings.search + text);
            }else if(method == 'github'){
                opn("https://www.google.com.hk/search?hl=en&q=" + encodeURI('site:github.com ' + text) + "&btnI=1");
            }else if(method == 'dblp'){
                opn("https://dblp.uni-trier.de/search?q=" + encodeURI(text))
            }else if(method == 'googlescholar'){
                opn("https://scholar.google.com/scholar?q=" + encodeURI(text))
            }
        },
        queryUserTagSuggestion: function(val, cb){
            if(val.length == 0){
                cb([]);
                return;
            }
            if(val[val.length - 1] == ',' || val[val.length - 1] == ';'){
                this.tagsBuffer = this.itemEditFormData.tags;
            }
            words = val.split(/[,;]/g);
            var userTagKeys = Object.keys(this.userTags);
            sortedKeys = stringSimilarity.findBestMatch( words[words.length - 1], userTagKeys.map(x => x.toLowerCase())).ratings;
            for(i in sortedKeys){
                sortedKeys[i].ori = userTagKeys[i];
            }
            ratings = sortedKeys.sort(function (x, y)  {return y.rating - x.rating}).slice(0, 7);
            candindates = []
            for (word of ratings){
                candindates.push({value: word.ori});
            }
            cb(candindates);
        },
        queryUserTagSelect: function(item){
            if(!this.tagsBuffer) this.tagsBuffer = "";
            this.tagsBuffer = this.tagsBuffer + (this.tagsBuffer.length > 0 && this.tagsBuffer[this.tagsBuffer.length - 1].trim() != ','  ? ',' : '') + item.value;
            this.itemEditFormData.tags = this.tagsBuffer;
        },
        searchContent: function(searchValue, domains = ctx.showKeys, updateSearchBox = true){
            if(typeof (searchValue) === 'string' && updateSearchBox)this.userInputSearchText = searchValue;
            if(searchValue.length == 0){
                ctx.ctor.tableData = utils.partialCopyArray(ctx.tableData, ctx.showKeys);
            }else if(searchValue.length >= 1){
                ctx.dbManager.searchItemInfo(searchValue, domains);
            }
        },
        sortTableItem: function(x, y){
            return x.updateTime > y.updateTime? 1 : -1;
        },
        editRowInfo: function(row){
            this.tagsBuffer = null;
            ctx.ctor.itemEditFormVisible = true;
            ctx.updatePreviousItemName = row.name.replace(/<\/?[^>]+(>|$)/g, "");
            var findItem = ctx.tableData.filter(x => x.name == ctx.updatePreviousItemName);
            if(findItem.length !== 1){ctx.error('数据库中找不到该文件，请重启程序！');return;};
            ctx.ctor.itemEditFormData = utils.deepcopy(findItem[0]);
        },
        deleteRowInfo: function(){
            name = ctx.ctor.itemEditFormData.name;
            this.itemEditFormVisible = false;
            this.$confirm('Confirm to delete record ' + name.replace(/<\/?[^>]+(>|$)/g, "") + '？')
                .then(_ => {
                  ctx.dbManager.deleteItemInfo(name.replace(/<\/?[^>]+(>|$)/g, ""));
                  this.refreshAllInfo();
                })
                .catch(_ => {})
        },
        onCellDBClick: function(row, column, cell, event){
            this.editRowInfo(row);
        },
        handleLibraryNodeClick(node) {
            this.searchContent(node.path, domains = ["libraryPath"], false);
            this.clearAllLeftTags();
        },
        handleLibraryNodeDBClick(event, data){
            data.isEdit = true;
            editBox = event.target.parentElement.querySelector('input')
            setTimeout(function() {editBox.focus()}, 1);
        },
        handleTreeFinishEdit(data, remove = false){
            data.isEdit = false;
            utils.updateUserLibraryTree(ctx, data.name, data.path, remove);
            this.treePath = utils.getUserLibraryTree(ctx.tableData);
        },
        handleTagsFinishEdit(oldTag, data, remove = false){
            data.isEdit = false;
            newTag = data.label;
            utils.updateUserTags(ctx, oldTag, newTag, remove);
            this.refreshAllInfo();
        },
        handleLibraryNodeDrop(e){
            var name=e.dataTransfer.getData("text");
            var path = e.target.getAttribute("path")
            for(item of ctx.tableData){
                if(item.name == name){
                    pathSeg = item.libraryPath.split("\n");
                    if(!pathSeg.includes(path)){
                        item.libraryPath += "\n" + path;
                        ctx.dbManager.updateItemInfoFixName(item);
                        this.treePath = utils.getUserLibraryTree(ctx.tableData);
                    }
                    break;
                }
            }
        },
        handleItemIconDrag(e){
            e.dataTransfer.setData("text", e.target.getAttribute("name"));
        },
        leftTagClick(e) {
            if (e.target.parentElement.getAttribute("mtag") !== null){
                var tagname = e.target.parentElement.getAttribute("mtag").replace(/<[^>]*>?/gm, '');
                alltags = document.getElementsByClassName("tag-list");
                for (tag of alltags){
                    if(tag.getAttribute("etag").replace(/<[^>]*>?/gm, '') == tagname){
                        tag.children[1].click();
                        return;
                    }
                }
            }else if(e.target.parentElement.getAttribute("etag") !== null){
                e.target.parentElement.classList.toggle("tag-list-toggle");
                //e.target.parentElement.style.background = "#5A9CF8";
                selected = document.getElementsByClassName("tag-list-toggle");
                stags = []
                for(span of selected){
                    stags.push(span.getAttribute("etag").replace(/<[^>]*>?/gm, ''));
                }
                this.searchContent('(' + stags.join('|') + ')', ['tags'], false);
            }
        },
        clearAllLeftTags(){
            selected = document.getElementsByClassName("tag-list-toggle");
            for(var i = selected.length - 1; i >= 0; i-- ){
                selected[i].classList.toggle("tag-list-toggle");
            }
        },
        renderWithKatex(element) {
            function render(){
                renderMathInElement(element, {
                // customised options
                // • auto-render specific keys, e.g.:
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                // • rendering keys, e.g.:
                throwOnError : false
                });
            }
            setTimeout(render, 10);
        }
    }
}
const LazyComponent = require("v-lazy-component");
Vue.use(LazyComponent);
var Ctor = Vue.extend(ItemEdit);
new Ctor().$mount('#app');
document.addEventListener('keyup', function (e){
    if (e.ctrlKey && e.keyCode == 82) {
        location.reload(true);
    }}, false);
document.addEventListener('keydown', function (e){
    if (e.keyCode == 27) {// press esc, clean the input
        document.getElementById("el-input-search").value = "";
        document.getElementById("el-input-clear-search").click();
        document.getElementById("el-input-search").focus();
        ctx.ctor.clearAllLeftTags();
    }}, false);
// ======= set table size
function updateWindowSize(){
    var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    document.getElementById('el-main-table').setAttribute("style","height:" + (height - 60).toString() + "px");
}


window.addEventListener('resize', function (e){
      updateWindowSize();
    }, true);

setTimeout(updateWindowSize, 1);

var Split = require('split.js');
Split(['#split-00', '#split-01'], {
    direction: 'vertical',
    sizes: [10, 90],
    gutterSize: 6,
});
Split(['#split-0', '#split-1'], {
    sizes: [25, 75],
    gutterSize: 6,
});

document.querySelector("title").innerText = "PaperArxiv (" + ctx.configSettings.libpath + ")";
