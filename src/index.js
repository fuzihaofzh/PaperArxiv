const Vue = require('vue/dist/vue.js');
const Element = require('element-ui');
const shell = require('electron').shell;
const path = require('path');
const fileManager = require('./file.js');
const configManager = require('./config.js');
const utils = new (require('./utils.js').utils)();

var DBManager = require('./database.js').DBManager;

var ctx = {}
ctx.configManager = new (require('./config.js').configManager)(ctx);
ctx.dbManager = new DBManager(ctx);
ctx.dbManager.loadFullData();

ctx.fullKeys = ['name', 'title', 'year', 'authors', 'tags', 'comment', 'comment', 'addTime', 'updateTime'];
ctx.showKeys = ['name', 'title', 'year', 'authors', 'tags', 'comment', 'updateTime'];
var emptyData = {}
ctx.fullKeys.forEach(x => emptyData[x] = "");
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
            userInputSearchText: ""
        }
    },
    methods: {
        openPdfFile: function() {
            fileManager.loadFile(this.ctx);
        },
        itemEditFormDataUpdate: function() {
            this.itemEditFormVisible = false;
            if(ctx.updatePreviousItemName !== undefined){
                ctx.dbManager.updateItemInfo(ctx.updatePreviousItemName);
                ctx.updatePreviousItemName = undefined;
            }else{
                ctx.dbManager.InsertItemInfo();
            }
            this.searchContent();
        },
        itemConfigFormDataUpdate: function(){
            var config = utils.stringToConfig(this.itemConfigFormData, ctx);
            if(config == -1)return;
            ctx.configSettings = config;
            ctx.configManager.writeConfig();
            this.itemConfigFormVisible = false;
            this.itemConfigFormData = utils.configToString(ctx.configSettings);
            location.reload(true);
        },
        changNameByNewInfo: function() {
            this.itemEditFormData.name = ([this.itemEditFormData.year, this.itemEditFormData.journal, this.itemEditFormData.authors.split('\n')[0]].join('-') + ".pdf").replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" ]/g, '');
        },
        openPdfFileWithSystemTool: function(val){
            shell.openItem(path.join(this.ctx.configSettings.libpath, val.replace(/<\/?[^>]+(>|$)/g, "")));
        },
        searchContent: function(){
            if(this.userInputSearchText.length == 0){
                ctx.ctor.tableData = utils.partialCopyArray(ctx.tableData, ctx.showKeys);
            }else{
                ctx.dbManager.searchItemInfo(this.userInputSearchText);
            }
        },
        editRowInfo: function(row){
            ctx.ctor.itemEditFormVisible = true;
            ctx.updatePreviousItemName = row.name.replace(/<\/?[^>]+(>|$)/g, "");
            var findItem = ctx.tableData.filter(x => x.name == ctx.updatePreviousItemName);
            if(findItem.length !== 1){ctx.error('数据库中找不到该文件，请重启程序！');return;};
            ctx.ctor.itemEditFormData = utils.deepcopy(findItem[0]);
        },
        deleteRowInfo: function(row){
          this.$confirm('确认删除记录' + row.name.replace(/<\/?[^>]+(>|$)/g, "") + '？')
                .then(_ => {
                  ctx.dbManager.deleteItemInfo(row.name.replace(/<\/?[^>]+(>|$)/g, ""));
                  this.searchContent();
                })
                .catch(_ => {})
        }
    }
}
Vue.use(Element);
var Ctor = Vue.extend(ItemEdit);
new Ctor().$mount('#app');
document.addEventListener('keyup', function (e){
    if (e.ctrlKey && e.keyCode == 82) {
        location.reload(true);
    }}, false);
// ======= set table size
function updateWindowSize(){
    var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    document.getElementById('el-main-table').setAttribute("style","height:" + (height - 60).toString() + "px");
}
updateWindowSize();
window.addEventListener('resize', function (e){
      updateWindowSize();
    }, true);
