# vue 源码阅读笔记

## Debug技巧
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

## $mount

entry-runtime-with-compiler.js $mouted主要作用是将template转换成render再调用原来的$mouted函数

如果没有定义 render 方法，则会把 el 或者 template 字符串转换成 render 方法。这里我们要牢记，在 Vue 2.0 版本中，所有 Vue 的组件的渲染最终都需要 render 方法，
无论我们是用单文件 .vue 方式开发组件，还是写了 el 或者 template 属性，最终都会转换成 render 方法，那么这个过程是 Vue 的一个“在线编译”的过程，它是调用 compileToFunctions 方法实现的


lifecycle.js 渲染watcher，最终调用_update
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

### createElement做两件事
- 当tag为原生标签时创建原生标签vnode
- 当tag为对象(options)或者函数(constructor)，作为参数调用createComponent创建组件vnode

### createComponent做了三件事
主要作用：输入组件options，输出vnode

- 让继承Ctor继承Vue (VueComponent 继承 Vue)

  ````js
  var Sub = function VueComponent (options) {
    this._init(options);
  };
  ````
  
- installComponentHooks 
- 将Ctor放在componentOptions对象作为参数，new Vnode。也就是说new vnode.componentOptions.Ctor可以实例化该组件vm对象


### patch
vdom/patch.js，核心方法createEle

createEle 做了如下事情

- 当前vnode是组件，则调用createComponent，然后返回
- 调用createChildren为孩子节点递归调用createEle
- 当前vnode为原生标签，创建原生Dom对象，并插入到父节点

createComponent方法有两个定义
一个在patch.js，在createElement中调用，最终调用的就是下面那个createElement产生的实例的init方法,该init方法最终调用Vue.prototype._init
一个在createElement(render调用的那个createElement)

```
var child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance,
        parentElm,
        refElm
      );
      
function createComponentInstanceForVnode (
  vnode, // we know it's MountedComponentVNode but flow doesn't
  parent, // activeInstance in lifecycle state
  parentElm,
  refElm
) {
  // ......
  return new vnode.componentOptions.Ctor(options)
}      


var Sub = function VueComponent (options) {
      this._init(options);
};
```

activeInstance在_update方法中赋值

### Vue.prototype._init

- initLifecycle 建立组件间的父子关系
- $options._parentVNode与$vnode指向同一个对象，是占位vnode
- _vnode为渲染vnode，当前组件render 函数生成的 vnode 是当前组件的渲染 vnode

vm._vnode.parent === vm.$vnode

vnode.componentInstance 指向vm，定义在 create-component.js componentVNodeHooks的init方法

## 合并

mergeOptions 定义在 util/options，核心方法mergeField，其中strats定义一系列合并策略，开发者可以通过config.optionMergeStrategies覆写

````js
function mergeField (key) {
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
````

## 生命周期
### mounted
new Vue mounted

````js
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  // .......
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  // ....
}
````

组件 mounted

一个组件的所有子组件patch完成之后，调用initComponent(vnode, insertedVnodeQueue)，initComponent
又调用invokeCreateHooks,invokeCreateHooks中将当前组件vnode加入insertedVnodeQueue。这个过程是先子后父

````
 function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    var i = vnode.data;
    if (isDef(i)) {
      // ......
      if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue);
        // ......
      }
    }
  }
````

````
 function invokeCreateHooks (vnode, insertedVnodeQueue) {
    // ....
    if (isDef(i)) {
      // ....
      if (isDef(i.insert)) { insertedVnodeQueue.push(vnode); }
    }
  }
````

所有组件patch完成后，在root上下文的patch函数中调用invokeInsertHook，调用之前加入队列的vnode的mounted方法

````js
function invokeInsertHook (vnode, queue, initial) {
    // .....
    for (var i = 0; i < queue.length; ++i) {
      queue[i].data.hook.insert(queue[i]);
    }
    // .....
  }
````

该函数会执行 insert 这个钩子函数，对于组件而言，insert 钩子函数的定义在 src/core/vdom/create-component.js 中的 componentVNodeHooks 中：

````js
const componentVNodeHooks = {
  // ...
  insert (vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    // ...
  },
}
````