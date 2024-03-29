

# PaperArxiv

<img src="https://user-images.githubusercontent.com/1419566/42982474-04dc27b8-8c14-11e8-8a07-a15e6007c6a8.png" align="right" width="150">

PaperArxiv is a new paper management tool that helps to organize your mind. It focuses on taking notes, organizing, and archiving your files. Different from existing paper management tools that focus on reference management. PaperArxiv emphasizes on notes organizing as we believe a short note can bring more information to grasp the general idea.


## Highlights

- Auto Extraction: It can extract almost all information from pdf files and generate default meta information;
- Portable: all information is stored in one folder and you can put in your cloud disk and take it everywhere;
- Universal Search: You can use its powerful find tool to find whatever you want, tags, names, notes ... No matter what comes into your mind.
- Powerful tree-view and tag management.
- Support different forms of notes including Markdown, LaTeX, and Mermaid.

## Getting Start
1. [Download](https://github.com/fuzihaofzh/PaperArxiv/releases) PaperArxiv;
2. Unzip the file and put the app into your Application folder;
3. Install [Poppler](https://poppler.freedesktop.org/). 
    - On Mac, you can use `brew install poppler`.
    - On Windows and Linux, please use `conda install -c conda-forge poppler`.
4. Open PaperArxiv;
5. Click the `Add` Button to select a paper in pdf format. PaperArxiv will automatically generate a new item for the paper;
6. Double Click the item to add some notes;

## Notes Format
The notes support Markdown, Latex, and Mermaid. For example, you can write the following notes to write items, formulas, and Mermaid diagrams.
```
    - Give a proof of the *repetition problem* for Generation;
    - New **encoding method**;
    - The <font color=orange>upper bound</font> for the <del>repetition</del>:
    $$\begin{aligned}
    R\le\frac{\|B^2\|_*}{\min_{1\le i \le n} \{ \frac{1}{2}( \zeta n - \underbrace{\sum_{j=1}^n (B^2)_{ij}}_{outflow})+\frac{1}{2}(\zeta n - \underbrace{\sum_{k=1}^n (B^2)_{ki}}_{inflow}) \}}
    \end{aligned}$$

    ```mermaid
    flowchart LR;
    Repetition-->Theory;
    Theory-->Encoding;
    ```

    ![My Image][image-1]



  <!--The image data is attached as follows-->
  [image-1]:data:image/png;base64,iVBORw0KGgoAAAANS...

```


<p align="center">
  <img src="https://user-images.githubusercontent.com/1419566/147880349-5717d2e5-ad25-461b-8a80-ffab2a13b02b.png" width="800">
</p>
If you want to add images in the comments, just copy the image and paste in the edit box. Then it will insert a base64 image into the comments file.

## Download
Please download our latest release! [Download](https://github.com/fuzihaofzh/PaperArxiv/releases)

## Compile
On Mac you can run
```
npm install
./node_modules/.bin/electron-rebuild
npm run buildmac
```
On Mac with M1 CPU, please use:
```
npm install
./node_modules/.bin/electron-rebuild -a arm64
npm run buildm1
```