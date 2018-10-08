import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // _init方法为init.js的Vue.prototype._init
  this._init(options)
}
// 将原型方法挂载到 Vue 构造方法上
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue) // 定义 $on、$off 等事件方法
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
