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


render.js Vue.prototype._render