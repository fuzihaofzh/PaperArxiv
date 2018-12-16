const path = require("path");
const homeDir = require('home-dir');
function configManager(ctx){
    var fs = require('fs');
    var confPath = homeDir(".pa.conf");
    this.writeConfig = function(){
        fs.writeFileSync(confPath, JSON.stringify(ctx.configSettings, null, '\t'));
    }
    if(fs.existsSync(confPath)){
        ctx.configSettings = JSON.parse(fs.readFileSync(confPath).toString());
    }else{
        ctx.configSettings = {
            "libpath": homeDir("papers"),
            "ConferenceMap": {
              "Journal of Machine Learning Research": "JMLR",
              "Neural Computation": "NC",
              "IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE": "TPAMI",
              "International World Wide Web Conference": "WWW",
              "Association for the Advancement of Artificial Intelligence": "AAAI",
              "Association for the Advancement of Artiﬁcial Intelligence": "AAAI",
              "American Association for Artificial Intelligence": "AAAI",
              "International Conference on Machine Learning": "ICML",
              "Empirical Methods in Natural Language Processing": "EMNLP",
              "NAACL": "NAACL",
              "International Natural Language Generation": "INLG",
              "SIGDIAL": "SIGDIAL",
              "Association for Computational Linguistics": "ACL",
              "International Joint Conference on Artificial Intelligence": "IJCAI",
              "Neural Information Processing Systems": "NIPS",
              "Springer Nature": "Nature",
              "ICLR": "ICLR",
              "SIGIR": "SIGIR",
              "Mach Learn": "ML",
              "ECCV": "ECCV",
              "SIGKDD": "SIGKDD",
              "SIGMOD": "SIGMOD",
              "ACM": "ACM",
              "PRICAI": "PRICAI",
              "arXiv": "arXiv",
              "Computer": "Computer",
              "IEEE": "IEEE"
            },
            "engines":{
                "gscholar": false
            },
            "search": "https://www.google.com/search?q="
        };

    }
    if (!fs.existsSync(ctx.configSettings.libpath)){
        fs.mkdir(ctx.configSettings.libpath, (err) => {
            if (err) alert("Cannot make dir " + ctx.configSettings.libpath + " !")
        });
    }
}

module.exports = {
    configManager: configManager
}
