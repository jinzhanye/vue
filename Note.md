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

### Vue.extend
global.api extend.js

构造函数有cid

````
Sub.cid = cid++
````


### 组件注册

#### 全局注册
Vue.component(tagName, options)
this.options[type + 's'][id] = definition 把组件构造函数到 Vue.options.components

在创建 vnode 的过程中，会执行 _createElement 方法，这里有一个判断逻辑 isDef(Ctor = resolveAsset(context.$options, 'components', tag))
resolveAsset会把Vue.options.components里的组件构造函数取出来

#### 局部注册
局部注册是非常简单的。在组件的 Vue 的实例化阶段有一个合并 option 的逻辑，之前我们也分析过，所以就把 components 合并到 vm.$options.components 上，这样我们就可以在 resolveAsset 的时候拿到这个组件的构造函数

### 异步组件
1. vue.component 注册工厂函数 
2. 在 `createElement` 过程中调用 resolveAsset 取出该工厂函数
3. 由于利用工厂函数没有cid这一点，判断出这是工厂函数进入创建异步组件逻辑
4. 在 resolveAsyncComponent 中执行工厂函数，以下是 resolveAsyncComponent 的部分代码 
5. factory.resolved 保存异步组件构造器
6. forceRender 调用 $forceUpdate(lifecycle.js)，主要在调用渲染watcher.update()，最终调用 vm._update(vm._render(), hydrate)，又回到第2步
7. 不过二次调用 `resolveAsyncComponent` 时，`factory.resolved` 已经有值，所以返回 `factory.resolved` 这个 VueComponent 构造函数。之后 `createElement` 要执行的步骤就像普通组件一样。

````js
if (isDef(factory.resolved)) {
  return factory.resolved
}

const resolve = once((res: Object | Class<Component>) => {
  // cache resolved
  // resolved为组件export出来的对象
  // 调用 Vue.extend 把resolved转换成一个组件的构造函数。
  factory.resolved = ensureCtor(res, baseCtor)
  // invoke callbacks only if this is not a synchronous resolve
  // (async resolves are shimmed as synchronous during SSR)
  if (!sync) {
    forceRender()
  }
})

const res = factory(resolve, reject)

// main.js，下面的callback就是factory，最终回调 once
Vue.component('HelloWorld', (resolve, reject) => {
  require(['./components/HelloWorld'], (res) => {
    resolve(res);
  });
});
````

## 响应式
observe 先做一些判断，然后调用 new Observer()，并 return 这个observer
new Observer() 调用def()获得__ob__属性，调用walk
walk 遍历key，调用defineReactive变成setter、getter，如果当前值是对象，还会递归调用observe

一个dep对应一个属性
observer与dep是一对一关系 ，Observer构造方法 this.dep = new Dep()，defineReactive也有 const dep = new Dep()，什么用？
watcher与dep是多对多的关系，dep.subs是一个watcher数组，一个watcher之所有对应多个dep是因为，对象中的属性(包括递归的)，都会订阅同一个渲染watcher/userWatcher
Watcher 构造方法中 初始化dep
````js
  this.deps = [];
  this.newDeps = [];
  this.depIds = new _Set();
  this.newDepIds = new _Set();
````

watcher强制调用get方法
- Dep dep.depend 调用 Dep.target.addDep 也就是watcher.addDep收集依赖，也就是收集渲染watcher
一旦dep调用notify时，就调用这个dep的subs里面的渲染watcher重新渲染

#### 派发更新
set,notify -> 遍历sub队列执行Watcher.prototype.update -> queueWatcher -> queue.push(watcher), waiting = true, 异步 nextTick(flushSchedulerQueue);

flushSchedulerQueue queue.sort，遍历queue执行watcher.run(); userWatcher.get获取新值传递给callback，如果在userCallback中有值发生变化又重复notify。 渲染watcher在get中执行_update更新视图。

watcher每次视图更新后，清理dep

````js
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        // 从旧deps中删除不使用的watcher
        // 这是因为当数据改变时，Object.defineProperty.set会被调用。删除不需要的watcher，就不会做无谓的重新渲染
        dep.removeSub(this)
      }
    }
    // 为什么要交换，而不直接在新dep覆盖旧dep，因为引用问题。而要解决引用问题，可以采用深克隆，但代价太大。交换再清空效率高

    // 交换新旧depIds
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    // 清空新的depIds
    this.newDepIds.clear()
    // 交换新旧deps
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    // 清空新deps
    this.newDeps.length = 0
  }
````

#### nextTick
util/nextTick

render.js $nextTick

global-api/ Vue.nextTick

按顺序收集callback，然后按顺序执行这些callback。尽量使用promise式nextTick，因为这种callback会产生一个异步callback在flushSchedulerQueue（即视图更新结束）之后执行。
而传入回调函数式的nextTick，会严格按照代码书写代码顺序的callback执行

待测试 async await

#### Vue.set
global-api.js Vue.set = set

对象defineReactive，然后notify

数组在原方法上做修改，然后notify。官方文档提到过，不能通过索引修改数组数据 https://cn.vuejs.org/v2/guide/list.html

### computed

Vue.extend 中 第一次初始化Computed

````js
if(Sub.options.computed){
  initComputed(Sub);
}

// initComputed 调用 defineComputed

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  // ..... 
  // shouldCache 为 true
  // sharedPropertyDefinition 是一个属性描述配置对象
  sharedPropertyDefinition.get = shouldCache
    ? createComputedGetter(key)
    : userDef
  sharedPropertyDefinition.set = noop
  
  // .....
  // (VueComponentConstructor.prototype,'name',{})
  Object.defineProperty(target, key, sharedPropertyDefinition)
}


// 当要获取 computed 的值时，比如 this.name 或者在模版中 {{name}} ，就会触发 evaluate 求值
function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      watcher.depend()
      return watcher.evaluate()
    }
  }
}


Watcher.prototype.evaluate = function evaluate () {
  if (this.dirty) {
    this.value = this.get();
    this.dirty = false;
  }
  return this.value
};
````

watcher 构造函数，dirty的值与computed的值是一样的，是boolean

````js
this.dirty = this.computed
```` 

````js
 computed: {
    name() {
      // 方法中每次getter，都会收集依赖，将当前watcher也就是computed watcher加入subs，以便数据改变时触发computed watcher
      if (this.useless > 0) {
        debugger
        return this.firstName + ',' + this.lastName;
      }

      return 'please click change';
    }
  },
````

当数据发生变化时, 如果sub是 computed watcher 则执行 watcher.update() 这段代码
````js
 // dep 在 new Watcher 中添加
 this.getAndInvoke(() => {
      this.dep.notify()
    })
````

这个dep的subs，是渲染watcher，notify使渲染watcher更新view

数据变化触发 setter -> computedWatcher.getAndInvoke 检测如果新旧computed value不相同 -> computedWatcher.dep.notify -> renderWatcher update view 

### user watcher
无论是函数形式的 user watcher ，还是对象形式的 user watcher，最终都会转换成调用 Vue.prototype.$watch，之后$watch 会调用 new Watcher，这个 watcher的user字段为true

核心：Watcher.prototype.get 调用 this.getter.call(xx,xx) 调用 parsePath 收集依赖！！

````js
export function parsePath (path: string): any {
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {// obj 为 vm
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]] // Dep.target 是当前userWatcher，所以当访问vm.data里的数据时会将当前userWatcher收集为依赖
    }
    return obj
  }
}
````

deep 深度遍历访问对象里的所有属性，使它们在setter中收集当前userWatcher为依赖
immediate 创建 watcher 之后立即执行
sync 不走nextTick?

## Watcher
- computed watcher
- render watcher
- user watcher

expOrFn: computed、render watcher 时 expOrFn 为函数 ，user 时为字符串
````js
if (typeof expOrFn === 'function') {
    this.getter = expOrFn;
  } else {
    // xxxxx
  }
````

只有 user watcher 的 user 字段为true ，其他两个 watcher 的 user 字段为false

三种 watcher 的 getter 方法
- user watcher

````js
export function parsePath (path: string): any {
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {// obj 为 vm
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]] // Dep.target 是当前userWatcher，所以当访问vm.data里的数据时会将当前userWatcher收集为依赖
    }
    return obj
  }
}
````

- computed watcher

- render watcher
updateComponent

dep 字段是 computed 字段专有的，其他两个 watcher 只有 deps、newDeps 数组

nextTick 会执行 flushSchedulerQueue，遍历所有 watcher ,执行它们的 run 方法
````js
Watcher.prototype.run = function run () {
  if (this.active) {
    this.getAndInvoke(this.cb);
  }
};
````

## update

patch.js/isPatchable 寻找可挂载节点

父组件 data 发生变化  -> patchVnode -> updateChildren 调用调用 pathchVnode, pathchVnode 满足一定条件调用 prepatch -> prepatch 调用 updateChildComponent 用新的props 对子组件的 旧的 props 赋值 -> 触发子组件setter从而触发子组件render watcher 更新

````js
    for (var i = 0; i < propKeys.length; i++) {
      var key = propKeys[i];
      var propOptions = vm.$options.props; // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm);
    }
````

updateChildComponent 对以下东西进行更新

````
  vm,
  propsData,
  listeners,
  parentVnode,
  renderChildren
````

更新占位符节点,patch.js

````js
var ancestor = vnode.parent;
````

删除旧节点
````js
  if (isDef(parentElm)) {
          removeVnodes(parentElm, [oldVnode], 0, 0);
  } else if (isDef(oldVnode.tag)) {
    invokeDestroyHook(oldVnode);
  }
````

- 组件更新的过程核心就是新旧 vnode diff, 对新旧节点相同或不同的情况分别做不同的处理。
- 新旧节点不同的更新流程是创建新节点 -> 更新父占位符节点 -> 删除旧节点
- 新旧节点相同的更新流程是去获取它们的 children, 根据不同情况做不同的更新逻辑(超级多if else)

其他

- patchVnode 的作用就是把新的 vnodepatch 到旧的 vnode 上

## 渲染 vnode 与 占位符 vnode 的区别
渲染 vnode 没有 componentInstance 属性，而 占位符 vnode 有

占位符 vnode 的 tag 为 xx + 组件名，渲染 vnode tag 为原生 tag

