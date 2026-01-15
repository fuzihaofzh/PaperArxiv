//const Vue = require('vue/dist/vue.js');
//const Element = require('element-ui');
const shell = require('electron').shell;
const path = require('path');
// open is an ES module, use shell.openExternal instead
const stringSimilarity = require('string-similarity');
const fileManager = require('./src/file.js');
const configManager = require('./src/config.js');
const utils = new (require('./src/utils.js').utils)();
var DBManager = require('./src/database.js').DBManager;

var MarkdownIt = require('markdown-it')({
    html:true, breaks:false,linkify:false,langPrefix:""});
var markdownItKatex = require('@traptitech/markdown-it-katex');
MarkdownIt.use(markdownItKatex, {"blockClass": "math-block", "errorColor" : " #cc0000"});

var ctx = {}
ctx.configManager = new (require('./src/config.js').configManager)(ctx);
ctx.dbManager = new DBManager(ctx);
ctx.dbManager.loadFullData();

ctx.showKeys = ['name', 'title', 'year', 'authors', 'tags', 'comment', 'addTime','updateTime', 'libraryPath'];
ctx.searchKeys = ['name', 'title', 'year', 'authors', 'tags', 'comment', 'addTime','updateTime'];
var emptyData = {}
ctx.showKeys.forEach(x => emptyData[x] = "");
// Import icons
const { Plus, Setting, Search, Delete, PriceTag, Promotion, Calendar, CopyDocument, FolderOpened } = require('@element-plus/icons-vue');

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
            searchTimeout: null, // For debouncing
            isLoading: false, // Loading state
            isSearching: false, // Prevent concurrent searches
            searchWatchTimeout: null, // For watch debouncing
            // Icons
            Plus,
            Setting,
            Search,
            Delete,
            PriceTag,
            Promotion,
            Calendar,
            CopyDocument,
            FolderOpened
        }
    },
    watch: {
        userInputSearchText: function(newVal, oldVal) {
            // Clear any existing timeout
            if (this.searchWatchTimeout) {
                clearTimeout(this.searchWatchTimeout);
            }
            
            // For very long search terms or large datasets, increase debounce time
            let debounceTime = 300; // Default 300ms
            if (newVal.length > 20 || ctx.tableData.length > 2000) {
                debounceTime = 500; // Increase to 500ms for complex searches
            }
            
            this.searchWatchTimeout = setTimeout(() => {
                this.searchContent(newVal);
            }, debounceTime);
        }
    },
    methods: {
        onSearchInput: function(value) {
            // Input is now handled by the watcher
            return;
        },
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
            
            // Extract first author name and remove HTML tags
            let firstAuthor = '';
            if (this.itemEditFormData.authors) {
                const firstAuthorLine = this.itemEditFormData.authors.split('\n')[0];
                const authorMatch = firstAuthorLine.match(/<author>(.*?)<\/author>/);
                if (authorMatch && authorMatch[1]) {
                    firstAuthor = authorMatch[1];
                } else {
                    // Fallback if no tags - remove any HTML tags that might be present
                    firstAuthor = firstAuthorLine.replace(/<\/?[^>]+(>|$)/g, "").split(',')[0].trim();
                }
            }
            
            let names = [this.itemEditFormData.year, this.itemEditFormData.journal, firstAuthor];
            this.itemEditFormData.name = makeName(names);
            if(ctx.tableData.some(x=>{return x.name == this.itemEditFormData.name;})){
                names.push(this.itemEditFormData.title.split(" ")[0]);
                this.itemEditFormData.name = makeName(names);
            };
        },
        openPdfFileWithSystemTool: function(val){
            shell.openPath(path.join(this.ctx.configSettings.libpath, val.replace(/<\/?[^>]+(>|$)/g, "")));
        },
        showInFinder: function(name){
            const cleanName = name.replace(/<\/?[^>]+(>|$)/g, "");
            shell.showItemInFolder(path.join(this.ctx.configSettings.libpath, cleanName));
        },
        copyTitle: function(title){
            // Remove HTML tags from title
            const cleanTitle = title.replace(/<\/?[^>]+(>|$)/g, "");
            navigator.clipboard.writeText(cleanTitle).then(() => {
                this.$message({
                    message: 'Title copied to clipboard',
                    type: 'success',
                    duration: 1500
                });
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        },
        refreshAllInfo: function(){
            this.searchContent(this.userInputSearchText);
            this.userTags = utils.getUserTags(ctx.tableData);
            this.treePath = utils.getUserLibraryTree(ctx.tableData);
            this.$refs.searchBox.focus();
        },
        filterLibraryTree: function(tree, searchText) {
            let filteredTree = [];
            
            for (let node of tree) {
                if (node.name.toLowerCase().includes(searchText.toLowerCase())) {
                    // Clone the node and highlight
                    let clonedNode = JSON.parse(JSON.stringify(node));
                    
                    // Use string manipulation instead of regex
                    const searchIndex = node.name.toLowerCase().indexOf(searchText.toLowerCase());
                    if (searchIndex !== -1) {
                        const matchedText = node.name.substring(searchIndex, searchIndex + searchText.length);
                        const highlightedName = node.name.substring(0, searchIndex) + 
                                              '<font class="search-result-block">' + matchedText + '</font>' + 
                                              node.name.substring(searchIndex + searchText.length);
                        clonedNode.label = clonedNode.label.replace(node.name, highlightedName);
                    }
                    
                    // Recursively filter children
                    if (clonedNode.children) {
                        clonedNode.children = this.filterLibraryTree(clonedNode.children, searchText);
                    }
                    filteredTree.push(clonedNode);
                } else if (node.children) {
                    // Check if any children match
                    let filteredChildren = this.filterLibraryTree(node.children, searchText);
                    if (filteredChildren.length > 0) {
                        let clonedNode = JSON.parse(JSON.stringify(node));
                        clonedNode.children = filteredChildren;
                        filteredTree.push(clonedNode);
                    }
                }
            }
            
            return filteredTree;
        },
        updateSidebarContent: function(){
            // Only update if needed
            if (this.updateSidebarTimeout) {
                clearTimeout(this.updateSidebarTimeout);
            }
            
            this.updateSidebarTimeout = setTimeout(() => {
                // Get search text
                const searchText = this.userInputSearchText;
                
                // Get all tags - use cached data from displayed items for better performance
                let allTags = utils.getUserTags(this.tableData);
                
                // Filter and highlight tags based on search
                if (searchText && searchText.length >= 2) {
                    let filteredTags = {};
                    const searchLower = searchText.toLowerCase();
                    
                    for (let tag in allTags) {
                        if (tag.toLowerCase().includes(searchLower)) {
                            // Keep original tag for data, create highlighted version for display
                            let displayTag = tag;
                            const searchIndex = tag.toLowerCase().indexOf(searchLower);
                            if (searchIndex !== -1) {
                                const matchedText = tag.substring(searchIndex, searchIndex + searchText.length);
                                displayTag = tag.substring(0, searchIndex) + 
                                            '<font class="search-result-block">' + matchedText + '</font>' + 
                                            tag.substring(searchIndex + searchText.length);
                            }
                            
                            filteredTags[tag] = {
                                count: allTags[tag].count,
                                isEdit: false,
                                label: tag,
                                originalTag: tag,
                                displayTag: displayTag
                            };
                        }
                    }
                    this.userTags = filteredTags;
                } else {
                    this.userTags = allTags;
                }
                
                // Update library tree
                let allPaths = utils.getUserLibraryTree(this.tableData);
                if (searchText && searchText.length >= 2) {
                    // Filter library tree based on search
                    this.treePath = this.filterLibraryTree(allPaths, searchText);
                } else {
                    this.treePath = allPaths;
                }
            }, 100); // 100ms debounce for sidebar updates
        },
        searchTitleInBrowser: function(val, method){
            var div = document.createElement("div");
            div.innerHTML = val;
            var text = div.textContent || div.innerText || "";
            if(method == 'search'){
                shell.openExternal(this.ctx.configSettings.search + text);
            }else if(method == 'github'){
                shell.openExternal("https://www.google.com.hk/search?hl=en&q=" + encodeURI('site:github.com ' + text) + "&btnI=1");
            }else if(method == 'dblp'){
                shell.openExternal("https://dblp.uni-trier.de/search?q=" + encodeURI(text))
            }else if(method == 'googlescholar'){
                shell.openExternal("https://scholar.google.com/scholar?q=" + encodeURI(text))
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
            let words = val.split(/[,;]/g);
            var userTagKeys = Object.keys(this.userTags);
            let sortedKeys = stringSimilarity.findBestMatch( words[words.length - 1], userTagKeys.map(x => x.toLowerCase())).ratings;
            for(let i in sortedKeys){
                sortedKeys[i].ori = userTagKeys[i];
            }
            let ratings = sortedKeys.sort(function (x, y)  {return y.rating - x.rating}).slice(0, 7);
            let candindates = []
            for (let word of ratings){
                candindates.push({value: word.ori});
            }
            cb(candindates);
        },
        queryUserTagSelect: function(item){
            if(!this.tagsBuffer) this.tagsBuffer = "";
            this.tagsBuffer = this.tagsBuffer + (this.tagsBuffer.length > 0 && this.tagsBuffer[this.tagsBuffer.length - 1].trim() != ','  ? ',' : '') + item.value;
            this.itemEditFormData.tags = this.tagsBuffer;
        },
        queryLibraryPathSuggestion: function(val, cb){
            // Get all library paths from the tree
            let allPaths = [];
            
            function extractPaths(nodes, currentPath = '') {
                for (let node of nodes) {
                    let fullPath = currentPath ? currentPath + '/' + node.name : '/' + node.name;
                    allPaths.push(fullPath);
                    if (node.children) {
                        extractPaths(node.children, fullPath);
                    }
                }
            }
            
            let treeData = utils.getUserLibraryTree(ctx.tableData);
            extractPaths(treeData);
            
            // If no input, show all paths
            if (!val || val.length === 0) {
                let candidates = allPaths.slice(0, 10).map(path => ({value: path}));
                cb(candidates);
                return;
            }
            
            // Filter paths based on input
            let filteredPaths = allPaths.filter(path => 
                path.toLowerCase().includes(val.toLowerCase())
            );
            
            // Sort by similarity
            filteredPaths.sort((a, b) => {
                let aIndex = a.toLowerCase().indexOf(val.toLowerCase());
                let bIndex = b.toLowerCase().indexOf(val.toLowerCase());
                return aIndex - bIndex;
            });
            
            // Return top matches
            let candidates = filteredPaths.slice(0, 10).map(path => ({value: path}));
            cb(candidates);
        },
        queryLibraryPathSelect: function(item){
            this.itemEditFormData.libraryPath = item.value;
        },
        searchContent: function(searchValue, domains = ctx.searchKeys, updateSearchBox = true){
            if(typeof (searchValue) === 'string' && updateSearchBox)this.userInputSearchText = searchValue;
            
            // Skip if called from watcher and we're already processing
            if (this.isSearching) {
                return;
            }
            
            this.isSearching = true;
            
            // Use requestAnimationFrame to avoid blocking input
            requestAnimationFrame(() => {
                if(searchValue.length == 0){
                    // For empty search (showing all items), avoid white flash
                    const newData = utils.partialCopyArray(ctx.tableData, ctx.showKeys);
                    
                    // Only update if data actually changed
                    if (this.tableData.length !== newData.length) {
                        // Use Vue.nextTick to ensure smooth transition
                        this.$nextTick(() => {
                            ctx.ctor.tableData = newData;
                            this.updateSidebarContent();
                        });
                    } else {
                        // Data hasn't changed, just update sidebar
                        this.updateSidebarContent();
                    }
                }else if(searchValue.length >= 2){  // Changed from 1 to 2
                    ctx.dbManager.searchItemInfo(searchValue, domains);
                    this.updateSidebarContent();
                }else{
                    // If search value is 1 character, show all items
                    const newData = utils.partialCopyArray(ctx.tableData, ctx.showKeys);
                    this.$nextTick(() => {
                        ctx.ctor.tableData = newData;
                        this.updateSidebarContent();
                    });
                }
                
                // Reset searching flag
                this.isSearching = false;
            });
        },
        sortTableItem: function(x, y){
            return x.addTime > y.addTime? 1 : -1;
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
            let name = ctx.ctor.itemEditFormData.name;
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
            // Clean HTML tags from the path
            const cleanPath = node.path.replace(/<\/?[^>]+(>|$)/g, "");
            
            // Perform the search without updating sidebar content
            if(typeof (cleanPath) === 'string') this.userInputSearchText = "";
            
            // Skip if called from watcher and we're already processing
            if (this.isSearching) {
                return;
            }
            
            this.isSearching = true;
            
            // Use requestAnimationFrame to avoid blocking input
            requestAnimationFrame(() => {
                ctx.dbManager.searchItemInfo(cleanPath, ["libraryPath"]);
                // Don't call updateSidebarContent to avoid tree corruption
                this.isSearching = false;
            });
            
            this.clearAllLeftTags();
            document.getElementById("el-input-search").value = "";
        },
        handleLibraryNodeDBClick(event, data){
            data.isEdit = true;
            let editBox = event.target.parentElement.querySelector('input')
            setTimeout(function() {editBox.focus()}, 1);
        },
        handleLibraryTreeNodeDrop(draggingNode, dropNode, dropType, ev) {
            let newPath = dropNode.data.path + "/" + draggingNode.data.name
            utils.updateUserLibraryTree(ctx, newPath, draggingNode.data.path);
            this.treePath = utils.getUserLibraryTree(ctx.tableData);
        },
        clearLibraryTree(){
            this.$refs['library-tree'].setCurrentKey(null);
        },
        handleTreeFinishEdit(data, remove = false){
            data.isEdit = false;
            var pathSeg = data.path.split('/')
            let newPath = data.path.split('/').slice(0, pathSeg.length - 1).join('/') + '/'+ data.name;
            utils.updateUserLibraryTree(ctx, newPath, data.path, remove);
            this.treePath = utils.getUserLibraryTree(ctx.tableData);
            this.refreshAllInfo();
        },
        handleTagsFinishEdit(oldTag, data, remove = false){
            data.isEdit = false;
            let newTag = data.label;
            utils.updateUserTags(ctx, oldTag, newTag, remove);
            this.refreshAllInfo();
        },
        handleLibraryNodeDrop(e){
            var name=e.dataTransfer.getData("text");
            var path = e.target.getAttribute("path")
            for(let item of ctx.tableData){
                if(item.name == name){
                    let pathSeg = item.libraryPath.split("\n");
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
        mainTagClick(e) {
            var parent = e.target.parentElement;
            parent = (parent.getAttribute("mtag") == null ? parent.parentElement : parent);
            var tagname = parent.getAttribute("mtag").replace(/<[^>]*>?/gm, '');
            
            // Don't clear previous selections - support multi-select
            this.clearLibraryTree();
            
            // Find and toggle the corresponding tag in the left panel
            let alltags = document.getElementsByClassName("tag-list");
            for (let tag of alltags){
                if(tag.getAttribute("etag").replace(/<[^>]*>?/gm, '') == tagname){
                    // Toggle the tag selection
                    tag.classList.toggle("tag-list-toggle");
                    
                    // Get all selected tags
                    let selected = document.getElementsByClassName("tag-list-toggle");
                    let stags = []
                    for(let span of selected){
                        stags.push(span.getAttribute("etag").replace(/<[^>]*>?/gm, ''));
                    }
                    
                    // Perform search with AND logic
                    if (stags.length > 0) {
                        // Use space-separated tags for AND search
                        let searchPattern = stags.join(' ');
                        this.searchContent(searchPattern, ['tags'], false);
                    } else {
                        this.searchContent('', ['tags'], false);
                    }
                    
                    // Scroll to the tag
                    tag.scrollIntoView({block: "center", inline: "center", behavior : "smooth"});
                    return;
                }
            }
        },
        leftTagClick(e){
            // Find the el-tag element
            let tagElement = e.target.closest('.tag-list');
            if (!tagElement) return;
            
            tagElement.classList.toggle("tag-list-toggle");
            let selected = document.getElementsByClassName("tag-list-toggle");
            let stags = []
            for(let span of selected){
                let tagValue = span.getAttribute("etag");
                if (tagValue) {
                    stags.push(tagValue.replace(/<[^>]*>?/gm, ''));
                }
            }
            
            // Search with AND logic - items must have ALL selected tags
            if (stags.length > 0) {
                // Use space-separated tags for AND search
                let searchPattern = stags.join(' ');
                this.searchContent(searchPattern, ['tags'], false);
            } else {
                // If no tags selected, check if there's text search
                if (this.userInputSearchText.length >= 2) {
                    this.searchContent(this.userInputSearchText);
                } else {
                    this.searchContent('', ['tags'], false);
                }
            }
            this.clearLibraryTree();
        },
        clearAllLeftTags(){
            let selected = document.getElementsByClassName("tag-list-toggle");
            for(var i = selected.length - 1; i >= 0; i-- ){
                selected[i].classList.toggle("tag-list-toggle");
            }
        },
        toggleMainTags(){
            let mainTags = document.getElementsByClassName("main-tag-list");
            for(let tag of mainTags){
                if(tag.querySelector("font") != null){
                    tag.classList.toggle("main-tag-list-toggle");
                }
            }
        },
        renderWithKatex(element) {
            return;// Use Markdown-it instead.
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
            setTimeout(render, 100);
        },
        renderWithMume(element) {
            function updateComment(){
                let commentElement = element.getElementsByClassName("span-of-comment")[0];
                let p1 = utils.mumeRender(commentElement.innerHTML);
                p1.then(function(x){
                commentElement.innerHTML = x.html;
            });
            }
            setTimeout(updateComment, 1000);
        },
        renderComments(content){
            if (!content) return '';
            
            // Cache rendered markdown to improve performance
            if (!this.markdownCache) {
                this.markdownCache = new Map();
            }
            
            if (this.markdownCache.has(content)) {
                return this.markdownCache.get(content);
            }
            
            var div = document.createElement('div');
            var result = MarkdownIt.render(content);
            div.innerHTML = result;
            if (div.firstChild) {
                div.firstChild.style['display']  = 'inline';
                div.firstChild.style['margin']  = 0;
                div.firstChild.style['padding']  = 0;
            }
            this.renderMermaid(div);
            
            const rendered = div.innerHTML;
            this.markdownCache.set(content, rendered);
            
            // Limit cache size
            if (this.markdownCache.size > 500) {
                const firstKey = this.markdownCache.keys().next().value;
                this.markdownCache.delete(firstKey);
            }
            
            return rendered; 
        },
        renderAllAuthors(authorsString) {
            if (!authorsString) return '';
            
            const authorLines = authorsString.split('\n');
            const renderedLines = authorLines.map((line, index) => {
                const prefix = index > 0 ? ', ' : '';
                return prefix + this.renderAuthorLine(line);
            });
            
            return renderedLines.join('');
        },
        renderAuthorLine(authorLine) {
            if (!authorLine) return '';
            
            // Helper function to escape HTML attributes
            const escapeHtml = (str) => {
                return str.replace(/&/g, '&amp;')
                         .replace(/"/g, '&quot;')
                         .replace(/'/g, '&#39;')
                         .replace(/</g, '&lt;')
                         .replace(/>/g, '&gt;');
            };
            
            // Check if this is new format with tags
            if (authorLine.includes('<author>') && authorLine.includes('</author>')) {
                // Parse author and affiliation from the format: <author>Name</author>, <affiliation>Institution</affiliation>
                const authorMatch = authorLine.match(/<author>(.*?)<\/author>/);
                const affiliationMatch = authorLine.match(/<affiliation>(.*?)<\/affiliation>/);
                
                let result = '';
                
                if (authorMatch && authorMatch[1]) {
                    // Clean any HTML tags from the author name (like search highlights)
                    const authorName = authorMatch[1].replace(/<\/?[^>]+(>|$)/g, "");
                    const escapedAuthor = escapeHtml(authorName);
                    result += `<span class="author-tag" data-author="${escapedAuthor}">${authorMatch[1]}</span>`;
                }
                
                if (affiliationMatch && affiliationMatch[1]) {
                    // Clean any HTML tags from the affiliation name
                    const affiliation = affiliationMatch[1].replace(/<\/?[^>]+(>|$)/g, "");
                    const escapedAffiliation = escapeHtml(affiliation);
                    result += `, <span class="affiliation-tag" data-affiliation="${escapedAffiliation}">${affiliationMatch[1]}</span>`;
                }
                
                return result;
            } else {
                // Old format: "Author Name, Institution" or just "Author Name"
                const parts = authorLine.split(',').map(p => p.trim());
                let result = '';
                
                if (parts[0]) {
                    const escapedAuthor = escapeHtml(parts[0]);
                    result += `<span class="author-tag" data-author="${escapedAuthor}">${parts[0]}</span>`;
                }
                
                if (parts[1]) {
                    const escapedAffiliation = escapeHtml(parts.slice(1).join(', '));
                    result += `, <span class="affiliation-tag" data-affiliation="${escapedAffiliation}">${parts.slice(1).join(', ')}</span>`;
                }
                
                return result || authorLine;
            }
        },
        handleAuthorClick(event) {
            const target = event.target;
            
            if (target.classList.contains('author-tag')) {
                const author = target.getAttribute('data-author');
                if (author) {
                    // Use exact match for author search by adding special prefix
                    this.searchContent('EXACT_MATCH:' + author, ['authors'], false);
                    this.clearAllLeftTags();
                    this.clearLibraryTree();
                    // Clear search box to be consistent with tag behavior
                    document.getElementById("el-input-search").value = "";
                    this.userInputSearchText = "";
                }
            } else if (target.classList.contains('affiliation-tag')) {
                const affiliation = target.getAttribute('data-affiliation');
                if (affiliation) {
                    // Use exact match for affiliation search by adding special prefix
                    this.searchContent('EXACT_MATCH:' + affiliation, ['authors'], false);
                    this.clearAllLeftTags();
                    this.clearLibraryTree();
                    // Clear search box to be consistent with tag behavior
                    document.getElementById("el-input-search").value = "";
                    this.userInputSearchText = "";
                }
            }
        },
        renderMermaid(div){
            let mermaids = div.querySelectorAll('code.mermaid');
            for(let mmd of mermaids){
                //avoid search insert font cause error
                var mmd1 = document.createElement('div');
                mmd1.innerHTML = mmd.innerText;
                for(let i in [1,2,3,4]){// fails sometime. Retry will be OK. Seems mermaid's bug?
                    try{
                        let html = mermaid.render("preparedScheme", mmd1.innerText);
                        mmd.innerHTML = html;
                        if(mmd.querySelectorAll("g").length <= 1)continue;// Sometime mermaid will generate empty graph. Skip it.
                        break;
                    }catch(err){
                        console.log(err);
                    }
                }
            }
        },
        handleNotesPaste(e){
            utils.retrieveImageFromClipboardAsBase64(e, function(imageDataBase64){
                // If there's an image, open it in the browser as a new window :)
                if(imageDataBase64){
                    // data:image/png;base64,iVBORw0KGgoAAAAN......
                    let newid = Math.max(...(e.target.value.match(/(?<=image-)\d+/g)||['0']).map(x => parseInt(x))) + 1;
                    let insertStr = `![My Image][image-${newid}]`;
                    let imageData = `\n[image-${newid}]:${imageDataBase64}\n`;
                    let sepStr = "<!--The image data is attached as follows-->";
                    if (!e.target.value.includes(sepStr))imageData = `\n\n\n\n${sepStr}\n[image-${newid}]:${imageDataBase64}`;
                    e.target.value = e.target.value.slice(0, e.target.selectionStart) + insertStr + e.target.value.slice(e.target.selectionEnd, e.target.value.length);
                    e.target.value += imageData;
                    e.target.dispatchEvent(new Event("input"));
                }
            });
        }
    }
}
// Vue 3 initialization
const { createApp } = Vue;
const app = createApp(ItemEdit);
app.use(ElementPlus);

// Register Element Plus icons
const ElementPlusIconsVue = require('@element-plus/icons-vue');
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount('#app');

document.addEventListener('keyup', function (e){
    if (e.ctrlKey && e.keyCode == 82) {
        location.reload(true);
    }}, false);
document.addEventListener('keydown', function (e){
    if (e.keyCode == 27) {// press esc, clean the input and reset search
        // Show loading state for large datasets
        if (ctx.tableData.length > 500) {
            ctx.ctor.isLoading = true;
        }
        
        // Clear UI elements first (instant feedback)
        document.getElementById("el-input-search").value = "";
        ctx.ctor.userInputSearchText = "";
        ctx.ctor.clearAllLeftTags();
        ctx.ctor.clearLibraryTree();
        
        // Don't clear the table data immediately to avoid white flash
        // Just trigger the search reset
        requestAnimationFrame(() => {
            // Clear any pending search timeouts
            if (ctx.ctor.searchTimeout) {
                clearTimeout(ctx.ctor.searchTimeout);
            }
            if (ctx.ctor.searchWatchTimeout) {
                clearTimeout(ctx.ctor.searchWatchTimeout);
            }
            
            // Reset search without clearing existing data first
            ctx.ctor.searchContent("");
            
            // Clear loading state after a short delay
            if (ctx.ctor.isLoading) {
                setTimeout(() => {
                    ctx.ctor.isLoading = false;
                }, 100);
            }
            
            document.getElementById("el-input-search").focus();
        });
    }if (e.keyCode == 83 && e.metaKey) {
        if(ctx.ctor.itemConfigFormVisible){
            ctx.ctor.itemConfigFormDataUpdate();
        }else if(ctx.ctor.itemEditFormVisible){
            ctx.ctor.itemEditFormDataUpdate();
        }
    }
}, false);
// ======= set table size
function updateWindowSize(){
    var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    let heightpx = (height - 60).toString() + "px"
    document.getElementById('el-main-table').setAttribute("style","height:" + heightpx);
    document.getElementById("split-0").style.height = heightpx;
}


window.addEventListener('resize', function (e){
      updateWindowSize();
    }, true);

setTimeout(updateWindowSize, 1);

var Split = require('split.js');
Split(['#split-00', '#split-01'], {
    direction: 'vertical',
    sizes: [40, 60],
    gutterSize: 2,
});
Split(['#split-0', '#split-1'], {
    sizes: [20, 80],
    gutterSize: 2,
});

document.querySelector("title").innerText = "PaperArxiv (" + ctx.configSettings.libpath + ")";
// Use requestAnimationFrame for better performance
requestAnimationFrame(() => {
    ctx.ctor.searchContent("");
});

async function updateComments(){
    let comments = document.getElementsByClassName("span-of-comment");
    for(let comment of comments){
        let res = await utils.mumeRender(comment.innerHTML);
        comment.innerHTML = res.html;
    }
}