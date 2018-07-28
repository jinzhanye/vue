# vue 源码阅读笔记

### Debug技巧
在webpack.base.conf.js的 alias 中添加 'vue$': 'vue/dist/vue.esm.js' , 启用 Runtime + Compiler 版本。
在 node_modules 中找到 vue/dist/vue.esm.js，Vue.prototype._init 为vue的入口，在此处打断点即可调试vue
w
````
 resolve: {
    extensions: ['.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
    }
  },
````


Runtime + Compiler 构建出来的 Vue.js，它的入口是 src/platforms/web/entry-runtime-with-compiler.js

entry-runtime-with-compiler.js $mouted主要作用是将template转换成render再调用原来的$mouted函数

如果没有定义 render 方法，则会把 el 或者 template 字符串转换成 render 方法。这里我们要牢记，在 Vue 2.0 版本中，所有 Vue 的组件的渲染最终都需要 render 方法，
无论我们是用单文件 .vue 方式开发组件，还是写了 el 或者 template 属性，最终都会转换成 render 方法，那么这个过程是 Vue 的一个“在线编译”的过程，它是调用 compileToFunctions 方法实现的


lifecycle.js 渲染watcher
````js
new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
```` 


render.js Vue.prototype._render 最终调用开发者编写的render函数，返回VNode


Vue 的 _update 是实例的一个私有方法，它被调用的时机有 2 个，一个是首次渲染，一个是数据更新的时候
_update 方法的作用是把 render函数返回的VNode 渲染成真实的 DOM，它的定义在 src/core/instance/lifecycle.js

_update 的核心就是调用 vm.__patch__ 方法，web 平台中它的定义在 src/platforms/web/runtime/index.js 

### patch
vdom/patch.js，核心方法createEle，createEle将VNode转化成真实Dom

createEle 做了如下事情

- 当前vnode是组件，则调用createComponent，然后返回
- 调用createChildren为孩子节点递归调用createEle
- 当前vnode为原生标签，创建原生Dom对象，并插入到父节点

createComponent方法有两个
一个在patch.js，这个一个在createElement，调用的就是下面那个createElement产生的实例的init方法
一个在createElement，当tag不为原生标签时会调用createComponent，createComponent定义在create-component.js

## Component
组件VNode的Children是空，多了ComponentOptions，patch会用到

initLifecycle 建立组件间的父子关系

_parentVNode、$VNode 就是 占位符VNode
渲染vnode.parent 指向_parentVnode
vm._vnode保存的是渲染Vnode

vnode.componentInstance 指向vm，定义在 create-component.js componentVNodeHooks的init方法