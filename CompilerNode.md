instance/render-helpers/index.js codeGen 对应函数，其中 _c 在 instance/render.js initRender 中定义

compiler/index.js baseCompile 是核心函数

stack 是用来检测 template 是否完整地闭合

line9207 preTransform 对 v-model 做处理

line8903 classBind 处理冒号class 即 :class 这种情况

transforms\[0] 即 transformNode 处理 class 与 :class
transforms\[1] 处理 style、:style

line9329 AST 元素有 3 种类型，
- type 1，普通元素
- 一种是有表达式的，type 为 2
- 一种是纯文本，type 为 3 

checkRootConstraints 检查根节点正确性，根节点不能为 template、slot、v-for 

line 9578 dirRE 检测是否匹配指令

line9614 processAttrs addHandler 添加事件绑定

line 8917 options.chars 对文本进行编译生成 ast

html-parser.js handleStartTag line216 if(expectHTML) 处理标签书写不规范的情况，可以忽略不看

### stack 是有两个
-  一个定义在 parse 用来是用来检测 template 是否完整地闭合  这个stack里的对象是这样的{attrs:[],lowerCasedTag:''，tag:''}
- 一个是在 parseHTML.start 函数，用于存放 ast


## Optimize

optimizer.js markStatic line 45 isPlatformReservedTag 判断是否为原生标签