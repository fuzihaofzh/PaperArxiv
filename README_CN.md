# PaperArxiv 📚

<div align="center">
  <img src="https://user-images.githubusercontent.com/1419566/42982474-04dc27b8-8c14-11e8-8a07-a15e6007c6a8.png" width="120" alt="PaperArxiv Logo">
  
  <h3>您的个人学术论文管理系统</h3>
  
  [![Release](https://img.shields.io/github/v/release/fuzihaofzh/PaperArxiv)](https://github.com/fuzihaofzh/PaperArxiv/releases)
  [![License](https://img.shields.io/github/license/fuzihaofzh/PaperArxiv)](LICENSE)
  [![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-brightgreen)](https://github.com/fuzihaofzh/PaperArxiv/releases)
</div>

## 🎯 简介

PaperArxiv 是一款专为研究人员设计的现代化论文管理工具。与传统的文献管理工具不同，PaperArxiv 强调**笔记整理和知识组织**，我们相信良好的笔记是理解复杂研究的关键。

## ✨ 功能特性

### 🤖 AI 智能功能（新增！）
- **Ollama 集成**：使用本地 AI 模型自动提取论文元数据
- **智能信息提取**：标题、作者、单位、年份、期刊等信息
- **智能分类**：AI 自动建议相关标签和文件夹路径
- **中文摘要生成**：一句话总结论文核心贡献

### 📋 核心功能
- **🔍 自动提取**：自动从 PDF 文件提取元数据信息
- **💾 便携存储**：所有数据存储在一个文件夹中，可随时同步到云盘
- **🔎 全局搜索**：强大的搜索功能，支持标签、标题、作者、笔记和内容搜索
- **🌳 高级组织**：层级树状视图和灵活的标签管理
- **📝 富文本笔记**：支持 Markdown、LaTeX 公式、Mermaid 流程图和内嵌图片

### 🛠 技术改进 (v0.2.0)
- **现代技术栈**：Electron 33.4.11 + Vue 3.5.13 + Element Plus
- **通用二进制**：原生支持 Apple Silicon (M1/M2/M3) 和 Intel Mac
- **性能优化**：优化的搜索和渲染引擎
- **界面改进**：响应式设计，改进的视觉反馈

## 🚀 快速开始

### 系统要求
- **macOS 10.12+** / **Windows 10+** / **Linux**
- **Poppler**（用于 PDF 文本提取）
- **Ollama**（可选，用于 AI 功能）

### 安装步骤

1. **下载 PaperArxiv**
   - 访问 [Releases](https://github.com/fuzihaofzh/PaperArxiv/releases) 页面
   - 下载适合您平台的版本：
     - macOS：`.dmg` 文件（通用版或特定架构）
     - Windows：`.exe` 安装程序
     - Linux：`.AppImage`、`.deb` 或 `.rpm`

2. **安装 Poppler**
   ```bash
   # macOS（使用 Homebrew）
   brew install poppler
   
   # Windows（使用 Conda）
   conda install -c conda-forge poppler
   
   # Linux（Ubuntu/Debian）
   sudo apt-get install poppler-utils
   ```

3. **安装 Ollama**（可选，用于 AI 功能）
   ```bash
   # 访问 https://ollama.com 获取安装说明
   # 安装后，拉取模型：
   ollama pull gemma3n:latest
   ```

4. **启动 PaperArxiv**
   - macOS：移动到应用程序文件夹并打开
   - Windows：运行安装程序
   - Linux：使 AppImage 可执行并运行

## 📖 使用指南

### 添加论文
1. 点击**添加**按钮或将 PDF 文件拖入窗口
2. PaperArxiv 将自动提取元数据
3. 根据需要检查和编辑提取的信息

### 撰写笔记
PaperArxiv 支持丰富的笔记格式：

```markdown
## 主要贡献
- 提出了新颖的**编码方法**来减少重复
- 数学证明了*上界*
- <font color=orange>重要发现</font>

## 公式
$$R \leq \frac{\|B^2\|_*}{\min_{1\leq i \leq n} \{\zeta n - \sum_{j=1}^n (B^2)_{ij}\}}$$

## 工作流程
```mermaid
flowchart LR
    论文-->分析
    分析-->实现
    实现-->结果
```
```

### 组织管理
- **树状视图**：在层级文件夹中组织论文
- **标签系统**：添加多个标签进行交叉引用
- **搜索功能**：使用搜索栏按任意字段查找论文

## 🔧 开发

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/fuzihaofzh/PaperArxiv.git
cd PaperArxiv

# 安装依赖
npm install

# 开发模式
npm start

# 构建当前平台
npm run build

# 特定平台构建
npm run build:mac-arm64    # macOS Apple Silicon
npm run build:mac-x64      # macOS Intel
npm run build:mac-universal # macOS 通用版
npm run build:win          # Windows
npm run build:linux        # Linux
```

## 🤝 贡献

欢迎贡献！请随时：
- 通过 [Issues](https://github.com/fuzihaofzh/PaperArxiv/issues) 报告错误或请求功能
- 提交改进的拉取请求
- 分享您的使用体验和建议

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

<div align="center">
  由研究人员制作，为研究人员服务 ❤️
</div>