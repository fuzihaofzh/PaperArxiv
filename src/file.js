const fs = require('fs');
const path = require('path');
const { Ollama } = require('ollama');

async function extractPDFText(filePath, maxPages = 1) {
    try {
        
        // Use pdftohtml command line tool which is more reliable
        const child_process = require('child_process');
        
        try {
            // Extract first page only for AI processing
            const command = `pdftohtml -f 1 -l 1 -q -xml -i -stdout -fontfullname "${filePath}"`;
            const data = child_process.execSync(command, {
                env: { PATH: process.env.PATH + ':/usr/local/bin' },
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            }).toString();
            
            // Remove XML tags to get plain text
            const plainText = data.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, ' ').trim();
            
            if (plainText && plainText.length > 100) {
                return plainText.substring(0, 3000); // Limit to first 3000 chars for AI
            } else {
                console.log('Extracted text too short');
                return null;
            }
            
        } catch (cmdError) {
            console.log('pdftohtml command failed:', cmdError.message);
            console.log('Please ensure pdftohtml is installed (poppler-utils)');
            return null;
        }
        
    } catch (error) {
        console.log('PDF text extraction error:', error.message);
        return null;
    }
}

async function callOllama(prompt, ctx, onProgress = null) {
    try {
        const ollamaConfig = ctx.configSettings.ollama || {};
        const host = ollamaConfig.host || 'http://localhost:11434';
        const model = ollamaConfig.model || 'gemma3n:latest';
        const temperature = ollamaConfig.temperature || 0.3;
        const top_p = ollamaConfig.top_p || 0.9;
        
        
        // Create Ollama instance with timeout protection
        let ollama;
        try {
            ollama = new Ollama({ host: host });
        } catch (initError) {
            console.error('Failed to initialize Ollama:', initError);
            return null;
        }
        
        // Create a timeout for the entire operation
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
            console.log('Aborting Ollama request due to timeout');
        }, 15000); // 15 second timeout
        
        let response;
        try {
            response = await ollama.generate({
                model: model,
                prompt: prompt,
                stream: true,
                options: {
                    temperature: temperature,
                    top_p: top_p,
                    num_predict: 1000
                },
                signal: controller.signal
            });
        } catch (err) {
            clearTimeout(timeout);
            if (err.name === 'AbortError') {
                console.error('Ollama request timed out after 15 seconds');
                return null;
            }
            throw err;
        }
        
        let fullResponse = '';
        let charCount = 0;
        let lastUpdate = Date.now();
        
        for await (const part of response) {
            if (part.response) {
                fullResponse += part.response;
                charCount += part.response.length;
                
                // Update progress every 500ms to avoid too frequent updates
                const now = Date.now();
                if (onProgress && now - lastUpdate > 500) {
                    onProgress(`AI analyzing... (${charCount} characters processed)`);
                    lastUpdate = now;
                }
            }
        }
        
        clearTimeout(timeout);
        return fullResponse;
    } catch (error) {
        console.error('Ollama error:', error.message);
        console.error('Full error:', error);
        return null;
    }
}

function findClosestLibraryPath(suggestedPath, existingPaths) {
    if (!suggestedPath || existingPaths.length === 0) {
        return '/Library';
    }
    
    // Normalize the suggested path
    const normalizedSuggested = suggestedPath.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    let bestMatch = '/Library';
    let bestScore = 0;
    
    for (const path of existingPaths) {
        const normalizedPath = path.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Calculate similarity score
        let score = 0;
        const minLength = Math.min(normalizedSuggested.length, normalizedPath.length);
        for (let i = 0; i < minLength; i++) {
            if (normalizedSuggested[i] === normalizedPath[i]) {
                score++;
            }
        }
        
        // Check if path contains key terms from suggested path
        const suggestedTerms = suggestedPath.toLowerCase().split(/[^a-z]+/).filter(t => t.length > 2);
        const pathTerms = path.toLowerCase().split(/[^a-z]+/).filter(t => t.length > 2);
        
        for (const term of suggestedTerms) {
            if (pathTerms.includes(term)) {
                score += 10;
            }
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = path;
        }
    }
    
    return bestMatch;
}

async function extractFromPdfFileWithAI(filePath, ctx) {
    try {
        
        // Remove temporary disable
        const FORCE_DISABLE_OLLAMA = false;
        
        // Update loading text
        const updateLoadingText = (text) => {
            if (ctx.currentLoading) {
                const loadingEl = document.querySelector('.el-loading-text');
                if (loadingEl) {
                    loadingEl.textContent = text;
                }
            }
        };
        
        // Check if AI extraction is enabled in config
        const ollamaConfig = ctx.configSettings.ollama || {};
        const useAI = ollamaConfig.enabled !== false; // Default to true if not specified
        
        if (!useAI) {
            console.log('AI extraction disabled in config');
            return await extractFromPdfFileBasic(filePath, ctx);
        }
        
        // Skip connectivity test - just try to use Ollama directly
        console.log('Proceeding with Ollama extraction');
        
        // Step 1: Extract PDF text
        updateLoadingText('Extracting text from PDF...');
        let pdfText;
        try {
            pdfText = await extractPDFText(filePath);
        } catch (pdfError) {
            console.log('PDF text extraction failed:', pdfError.message);
            return await extractFromPdfFileBasic(filePath, ctx);
        }
        
        if (!pdfText) {
            console.log('Failed to extract PDF text, falling back to basic method');
            return await extractFromPdfFileBasic(filePath, ctx);
        }
        
        // Step 2: Prepare for AI analysis
        updateLoadingText('Preparing AI analysis...');
        
        // Get existing library paths
    const existingPaths = [];
    function extractPaths(nodes, currentPath = '') {
        for (let node of nodes) {
            let fullPath = currentPath ? currentPath + '/' + node.name : '/' + node.name;
            existingPaths.push(fullPath);
            if (node.children) {
                extractPaths(node.children, fullPath);
            }
        }
    }
    const utils = new (require('./utils.js').utils)();
    const treeData = utils.getUserLibraryTree(ctx.tableData);
    extractPaths(treeData);
    
    // Format existing paths for prompt
    const existingPathsList = existingPaths.length > 0 
        ? existingPaths.join('\n') 
        : '/Library';
    
    // Create prompt for Ollama
    const prompt = `You are a research paper metadata extractor. Extract the following information from this academic paper's first page:

Paper text:
${pdfText.substring(0, 3000)}

Available Library Paths (you MUST choose one from this list):
${existingPathsList}

Please extract and return ONLY a JSON object with these EXACT field names (spelling is important):
{
    "title": "exact paper title",
    "authors": "<author>Author Name1</author>, <affiliation>Institution1</affiliation>\\n<author>Author Name2</author>, <affiliation>Institution2</affiliation>\\n...",
    "year": "publication year (YYYY)",
    "journal": "journal or conference name",
    "tags": "tag1, tag2, tag3, tag4, tag5 (5-8 relevant academic tags based on content)",
    "library_path": "选择上面列表中最合适的路径",
    "summary": "用一句中文总结这篇论文的主要贡献和创新点"
}

IMPORTANT: The field name MUST be "authors" (not "authoers" or any other spelling)

IMPORTANT for authors field:
- Extract ONLY author names and their affiliated institutions
- Remove ALL symbols like †, *, ‡, §, ¶, ∗, ⋆, ◦, •, ★, ☆, ♣, ♠, ♦, ♥
- Remove footnote markers, superscripts, and other annotations
- Format: "<author>FirstName LastName</author>, <affiliation>Institution Name</affiliation>"
- Each author on a new line using \\n
- Example: "<author>John Smith</author>, <affiliation>MIT</affiliation>\\n<author>Jane Doe</author>, <affiliation>Stanford University</affiliation>"
- MUST use <author> and <affiliation> tags exactly as shown

IMPORTANT for library_path field:
- You MUST choose ONE path from the "Available Library Paths" list above
- Choose the most relevant path based on the paper's topic
- If none fit well, use "/Library"
- Do NOT create new paths

IMPORTANT for summary field:
- Must be written in Chinese (中文)
- Summarize the main contribution and innovation in one sentence
- Focus on what problem it solves and how
- Example: "本文提出了一个多智能体框架，通过协调因子工程和模型优化来自动化量化策略的研发过程"

Return only valid JSON, no other text.`;

        // Step 3: Send to AI for analysis
        updateLoadingText('AI analyzing paper content...');
        
        // Create progress callback to update loading text
        const updateProgress = (text) => {
            updateLoadingText(text);
        };
        
        // Call Ollama directly - it has its own error handling
        const aiResponse = await callOllama(prompt, ctx, updateProgress);
        if (!aiResponse) {
            console.log('Ollama returned null, will use basic extraction');
            throw new Error('No response from Ollama - model might not be installed or Ollama is not running');
        }
        
        
        // Parse AI response
        const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        let metadata = JSON.parse(cleanResponse);
        
        // Fix common typos in field names
        if (metadata.authoers && !metadata.authors) {
            metadata.authors = metadata.authoers;
            delete metadata.authoers;
        }
        
        // Decode HTML entities in all fields
        const decodeHtmlEntities = (text) => {
            if (!text) return text;
            return text
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/&nbsp;/g, ' ');
        };
        
        // Apply HTML entity decoding to all string fields
        Object.keys(metadata).forEach(key => {
            if (typeof metadata[key] === 'string') {
                metadata[key] = decodeHtmlEntities(metadata[key]);
                // Fix escaped newlines in authors field
                if (key === 'authors') {
                    metadata[key] = metadata[key].replace(/\\n/g, '\n');
                }
            }
        });
        
        
        // Step 4: Finalizing results
        updateLoadingText('Finalizing paper metadata...');
        
        // Use the library path directly from Ollama response
        // If not provided or invalid, use default
        const libraryPath = metadata.library_path && existingPaths.includes(metadata.library_path) 
            ? metadata.library_path 
            : '/Library';
        
        // Format the result
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        // Extract first author name for filename (remove tags)
        let firstAuthor = '';
        if (metadata.authors) {
            const firstAuthorLine = metadata.authors.split('\n')[0];
            const authorMatch = firstAuthorLine.match(/<author>(.*?)<\/author>/);
            if (authorMatch && authorMatch[1]) {
                firstAuthor = authorMatch[1];
            } else {
                // Fallback if no tags
                firstAuthor = firstAuthorLine.split(',')[0].trim();
            }
        }
        
        // Generate filename using same format as fallback method: [year-journal-firstauthor].pdf
        const fileNameParts = [
            metadata.year || new Date().getFullYear().toString(),
            metadata.journal || 'note',
            firstAuthor.replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" \n]/g, '')
        ];
        const generatedFileName = (fileNameParts.join('-') + '.pdf').replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" ]/g, '');
        
        const finalResult = {
            name: generatedFileName,
            title: metadata.title || path.basename(filePath).replace('.pdf', ''),
            year: metadata.year || new Date().getFullYear().toString(),
            authors: metadata.authors || '',
            journal: metadata.journal || '',
            tags: metadata.tags || '',
            comment: metadata.summary || '',
            addTime: timestamp,
            updateTime: timestamp,
            libraryPath: libraryPath,
            content: ''
        };
        
        return finalResult;
    } catch (error) {
        console.error('Error processing AI response:', error);
        return await extractFromPdfFileBasic(filePath, ctx);
    }
}

async function extractFromPdfFileBasic(filePath, ctx) {
    try {
        if(!filePath.endsWith('.pdf')) return null;
        
        const utils = new (require('./utils.js').utils)();
        let titleCase;
        
        // Always use fallback since title-case is problematic in Electron
        titleCase = (str) => {
            if (!str) return '';
            return str.toLowerCase().split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        };
        
        var child_process = require('child_process');
        var pdfInfo = {}
    
    try{
        var data = child_process.execSync('pdftohtml -f 1 -l 1 -q -xml -i -stdout -fontfullname "' + filePath + '"', {
            env:{PATH: process.env.PATH + ':/usr/local/bin'},
            timeout: 10000, // 10 second timeout
            killSignal: 'SIGKILL'
        }).toString();
    }catch(err){
        console.error('pdftohtml error:', err.message);
        ctx.error("Cannot find pdftohtml command in current shell. Please install poppler and set the PATH for sh.\n" + err);
        return null;
    }
    
    var years = utils.regFindAll(/19\d\d|20\d\d/g, data).map(x => Number(x)).filter(x => x <= new Date().getFullYear());
    pdfInfo.year = Math.max(...(years.length == 0 ? [(new Date()).getFullYear()] : years)).toString();
    var xpath = require('xpath'), dom = require('@xmldom/xmldom').DOMParser
    meta = []
    for(line of data.split('\n')){
        meta.push(line);
        if(['Abstract', 'abstract', 'ABSTRACT', 'BSTRACT', 'Introduction'].some(x => utils.strContain(line, x))) break;
    }
    meta = meta.join('\n');
    
    // Debug: Check XML structure
    console.log('XML length:', meta.length, 'characters');
    
    // Try to fix common XML issues
    if (!meta.includes('</page>')) {
        meta += '\n</page>';
        console.log('Added missing </page> tag');
    }
    if (!meta.includes('</pdf2xml>')) {
        meta += '\n</pdf2xml>';
        console.log('Added missing </pdf2xml> tag');
    }
    
    var doc;
    try {
        doc = new dom({
            errorHandler: {
                warning: function(w) { console.warn('XML warning:', w); },
                error: function(e) { console.warn('XML error:', e); },
                fatalError: function(e) { console.warn('XML fatal error:', e); }
            }
        }).parseFromString(meta, 'text/xml');
    } catch (parseError) {
        console.error('Failed to parse XML, extracting from raw text');
        
        // Try to extract information from raw text
        const cleanText = data.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, ' ').trim();
        const lines = cleanText.split('\n').filter(l => l.trim().length > 5);
        
        let title = path.basename(filePath, '.pdf');
        let authors = 'Unknown';
        let year = new Date().getFullYear().toString();
        
        // Try to find title (usually the longest line in the first few lines)
        if (lines.length > 0) {
            const firstLines = lines.slice(0, 5);
            title = firstLines.reduce((longest, current) => 
                current.length > longest.length ? current : longest, 
                title
            ).trim();
            
            // Clean up title
            title = title.replace(/[^\w\s-:.,]/g, ' ').replace(/\s+/g, ' ').trim();
            if (title.length > 100) {
                title = title.substring(0, 100) + '...';
            }
        }
        
        // Try to find year
        const yearMatches = cleanText.match(/\b(19|20)\d{2}\b/g);
        if (yearMatches && yearMatches.length > 0) {
            const years = yearMatches.map(y => parseInt(y)).filter(y => y >= 1900 && y <= new Date().getFullYear());
            if (years.length > 0) {
                year = Math.max(...years).toString();
            }
        }
        
        // Try to find authors (look for patterns like "Author Name" before abstract)
        const beforeAbstract = cleanText.toLowerCase().split('abstract')[0];
        const authorPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+)/g;
        const authorMatches = beforeAbstract.match(authorPattern);
        if (authorMatches && authorMatches.length > 0) {
            authors = authorMatches.slice(0, 5).join(', ');
        }
        
        // Generate filename using same format as Ollama: [year-journal-firstauthor].pdf
        let firstAuthor = '';
        if (authors !== 'Unknown') {
            firstAuthor = authors.split(',')[0].trim().replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" \n]/g, '');
        }
        if (!firstAuthor) {
            firstAuthor = 'unknown';
        }
        
        const journal = 'arXiv'; // Assume arXiv since the file name suggests it
        const fileNameParts = [year, journal, firstAuthor];
        const generatedFileName = (fileNameParts.join('-') + '.pdf').replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" ]/g, '');
        
        return {
            name: generatedFileName,
            title: titleCase(title),
            year: year,
            authors: authors,
            journal: journal,
            tags: '',
            comment: '',
            addTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
            libraryPath: '/Library',
            content: cleanText.substring(0, 1000)
        };
    }
    
    // Try to extract title from the first few lines of text
    var title = '';
    var titleFont = 0;
    try {
        var fontSizes = xpath.select("//fontspec", doc).map(x => parseInt(x.getAttribute('size'))).slice(0, 8);
        if (fontSizes.length > 0) {
            titleFont = fontSizes.indexOf(Math.max.apply(Math, fontSizes));
            title = xpath.select(`//text[@font=${titleFont}]`, doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, "")).join(' ');
            
            //title has two fonts
            if(title.split(' ').map(x => x.length).filter(x => x == 1).length >= 3 || title.split(' ').length <= 3){
                title = "";
                for(t of xpath.select(`//text[@font=${titleFont} or @font=${titleFont+1}]`, doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, ""))){
                    title += t;
                    if(utils.strContain(t, '-')){title = title.slice(0, title.length-1);}
                    if (t.length > 1 && !utils.strContain(t, '-')){title += ' ';}
                }
                title = title.toLowerCase();
                titleFont += 1;
            }
        }
    } catch (err) {
        console.warn('Failed to extract title from XML:', err);
        // Try to extract from raw text
        const lines = data.split('\n').filter(l => l.trim().length > 10);
        if (lines.length > 0) {
            title = lines[0].replace(/<\/?[^>]+(>|$)/g, "").trim();
        }
    }
    
    if (!title) {
        title = path.basename(filePath, '.pdf');
    }
    
    // Extract authors
    var authorsList = [];
    try {
        authorsList = xpath.select(`//text[@font=${titleFont+1} or @font=${titleFont+2} or @font=${titleFont+3} or @font=${titleFont+4} or @font=${titleFont+5}]`, doc).map(x => x.toString().replace(/<\/?[^>]+(>|$)|\n/g, "")).filter(x => utils.strContain(x, ' ')).concat();
    } catch (err) {
        console.warn('Failed to extract authors:', err);
    }
    pdfInfo.title = titleCase(title.slice(0, 200));
    var authors = []
    var cnt = 0
    for(var i = 0; i < authorsList.length; ++i){
        var a = authorsList[i];
        if(a !== undefined && ['Abstract', 'abstract', 'ABSTRACT', 'BSTRACT', 'Introduction'].every(x => !utils.strContain(a, x)) && authors.length < 20){
            if(a.length >= 4){
                authors = authors.concat(a.replace(/†|∗|‡|§/g,'').split(/,| *and /g).filter(x => x.length > 2));
            }
        }else{
            break;
        }
    }
    if(authors.length == 0) authors = ["Unknown"];
    var pcontent = data.replace(/<\/?[^>]+(>|$)| *\-\n */g, "").replace("\n", "");
    pdfInfo.journal = "note"
    for(var jn in ctx.configSettings.ConferenceMap){
        if(utils.strContain(pcontent, jn)){
            pdfInfo.journal = ctx.configSettings.ConferenceMap[jn];
            break;
        }
    }
    pdfInfo.authors = authors.map(x => titleCase(x.trim())).join('\n');
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    pdfInfo.addTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -5).replace('T', ' ');
    pdfInfo.updateTime = pdfInfo.addTime;
    try{
        console.log('Extracting full PDF content...');
        pdfInfo.content = child_process.execSync('pdftohtml -q -xml -i -stdout -fontfullname "' + filePath + '"', {
            env:{PATH: process.env.PATH + ':/usr/local/bin'},
            timeout: 15000, // 15 second timeout for full content
            killSignal: 'SIGKILL'
        }).toString().replace(/<\/?[^>]+(>|$)/g, "").split('\n').filter(x => x.length > 10).join('\n');
        console.log('Full content extraction completed');
    }catch(err){
        console.error('Content extraction error:', err.message);
        pdfInfo.content = data.toString().replace(/<\/?[^>]+(>|$)/g, "").split('\n').filter(x => x.length > 10).join('\n');;
        ctx.warn("Content extract error - using partial content.\n" + err);
    }
    pdfInfo.tags = "";  // searchTags was not included in the original
    pdfInfo.libraryPath = "/Library";
    pdfInfo.comment = "";

    // use gscholar to find bib info
    if(ctx.configSettings.engines && ctx.configSettings.engines.gscholar){
        try{
            var data = child_process.execSync('gscholar "' + filePath + '"', {env:{PATH: process.env.PATH + ':/usr/local/bin'}, "shell": "/bin/bash"}).toString();
            title = data.match(/title={.*?}[,\n]/g);
            if(title){
                pdfInfo.title = title[0].slice(7, -2);
            }
            year = data.match(/year={\d+}/g);
            if(year){
                pdfInfo.year = Number(year[0].slice(6, -1));
            }
            authors = data.match(/author={.*?}[,\n]/g);
            if(authors){
                pdfInfo.authors = authors[0].slice(8, -2).replace(/,/g, ' ').replace(/ +/g, ' ').replace(/ and /g, '\n');
            }
        }catch(err){
            ctx.warn("gscholar command error:\n" + err);
        }
    }
        pdfInfo.name = ([pdfInfo.year, pdfInfo.journal, pdfInfo.authors.split('\n')[0].replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" \n]/g, '')].join('-') + '.pdf').replace(/[\%\/\<\>\^\|\?\&\#\*\\\:\" ]/g, '');
        return pdfInfo;
    } catch (error) {
        console.error('Error in basic PDF extraction:', error);
        // Return a minimal PDF info object as fallback
        const fileName = require('path').basename(filePath, '.pdf');
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        return {
            name: fileName + '.pdf',
            title: fileName,
            year: new Date().getFullYear().toString(),
            authors: 'Unknown',
            journal: 'Unknown',
            tags: '',
            comment: '',
            addTime: timestamp,
            updateTime: timestamp,
            libraryPath: '/Library',
            content: ''
        };
    }
}

async function loadFile(ctx) {
    // Prevent multiple file dialogs
    if (ctx.isLoadingFile) {
        console.log('File loading already in progress');
        return;
    }
    
    try {
        ctx.isLoadingFile = true;
        
        const { dialog } = require('@electron/remote');
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });
        
        if (result.canceled || !result.filePaths.length) {
            ctx.isLoadingFile = false;
            return;
        }
        
        const filePath = result.filePaths[0];
        console.log('Selected file:', filePath);
        
        // Show loading with spinner using Element Plus
        const { ElLoading } = require('element-plus');
        const loading = ElLoading.service({
            lock: true,
            text: 'Processing PDF with AI...',
            background: 'rgba(0, 0, 0, 0.7)',
            customClass: 'pdf-loading'
        });
        
        // Save loading instance to context for progress updates
        ctx.currentLoading = loading;
        
        try {
            console.log('Starting PDF processing for:', filePath);
            
            // Try AI extraction with timeout
            const pdfInfo = await extractFromPdfFileWithAI(filePath, ctx);
            
            if (pdfInfo) {
                ctx.itemEditFilePath = filePath;
                ctx.ctor.itemEditFormData = pdfInfo;
                ctx.ctor.itemEditFormVisible = true;
                console.log('AI extraction successful:', pdfInfo.title);
            } else {
                throw new Error('AI extraction returned null');
            }
        } catch (error) {
            console.log('AI extraction failed, using basic extraction:', error.message);
            
            // Try basic extraction instead
            try {
                const basicPdfInfo = await extractFromPdfFileBasic(filePath, ctx);
                if (basicPdfInfo) {
                    ctx.itemEditFilePath = filePath;
                    ctx.ctor.itemEditFormData = basicPdfInfo;
                    ctx.ctor.itemEditFormVisible = true;
                    
                    // Show specific error message for Ollama connection issues
                    if (error.message.includes('No response from Ollama') || error.message.includes('Failed to fetch')) {
                        ctx.ctor.$message.error('Ollama service is not running! Using basic extraction instead.');
                    } else {
                        ctx.warn('AI extraction failed: ' + error.message + '\nUsing basic extraction instead.');
                    }
                } else {
                    throw new Error('Basic extraction also failed');
                }
            } catch (basicError) {
                // If even basic extraction fails, create minimal info
                const fileName = require('path').basename(filePath, '.pdf');
                const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
                
                const basicInfo = {
                    name: fileName + '.pdf',
                    title: fileName,
                    year: new Date().getFullYear().toString(),
                    authors: '',
                    journal: '',
                    tags: '',
                    comment: '',
                    addTime: timestamp,
                    updateTime: timestamp,
                    libraryPath: '/Library',
                    content: ''
                };
                
                ctx.itemEditFilePath = filePath;
                ctx.ctor.itemEditFormData = basicInfo;
                ctx.ctor.itemEditFormVisible = true;
                
                ctx.warn('Could not extract PDF information automatically. Please fill in the details manually.');
            }
        } finally {
            // Close loading spinner
            loading.close();
            ctx.currentLoading = null;
            ctx.isLoadingFile = false;
        }
    } catch (err) {
        console.error('File dialog error:', err);
        ctx.error('Cannot open file dialog: ' + err.message);
        ctx.isLoadingFile = false;
    }
}

module.exports = {
    loadFile,
    extractFromPdfFileWithAI
};