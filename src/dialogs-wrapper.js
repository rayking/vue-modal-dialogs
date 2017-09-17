'use strict'

import {
  find,
  findIndex,
  defaultsDeep
} from './util'

// filter bad wrapper options and add default options
function parseWrapperOptions (options) {
  if (typeof options !== 'object') options = {}

  if (options.wrapper && typeof options.wrapper !== 'object') {
    options.wrapper = undefined
  }

  if (options.zIndex === false) {
    options.zIndex = {
      value: null,
      autoIncrement: false
    }
  } else if (options.zIndex && typeof options.zIndex !== 'object') {
    options.zIndex = undefined
  }

  let result = defaultsDeep(options, {
    wrapper: {
      class: 'modal-dialogs-wrapper',
      props: {
        tag: 'div',
        name: 'modal-dialog'
      }
    },
    zIndex: {
      value: 1000,
      autoIncrement: true
    }
  })

  return result
}

export default function modalWrapperFactory (Vue, wrapperOptions) {
  wrapperOptions = parseWrapperOptions(wrapperOptions)

  // an auto-increment id to indentify dialogs
  let id = 0

  return Vue.extend({
    name: 'ModalDialogsWrapper',
    data: () => ({
      dialogs: []
    }),
    methods: {
      // add a new modal dialog into this wrapper
      add (dialogOptions, ...args) {
        return new Promise((resolve, reject) => {
          this.dialogs.push(Object.freeze({
            id: id,
            resolve,
            reject,
            args,
            options: dialogOptions,
            zIndex: wrapperOptions.zIndex.value,
            close: this.close.bind(this, id)
          }))

          ++id    // make sure id will never duplicate
          if (wrapperOptions.zIndex.autoIncrement) {
            ++wrapperOptions.zIndex.value
          }

          /* this promise will be resolved when 'close' method is called */
        }).then(({ id, data }) => {
          const index = findIndex(this.dialogs, item => item.id === id)
          if (index > -1) this.dialogs.splice(index, 1)

          return data
        })
      },
      // close a modal dialog by id
      close (id, data) {
        const dialog = find(this.dialogs, item => item.id === id)
        if (dialog) {
          // resolve previously created promise in 'add' method
          dialog.resolve({ id, data })
        }
      }
    },
    render (h) {
      let renderedDialogs = []
      for (let i = 0; i < this.dialogs.length; i++) {
        const dialog = this.dialogs[i]

        // map args to props
        let props = { args: dialog.args }
        dialog.options.args.forEach((arg, i) => { props[arg] = dialog.args[i] })

        // render component
        const renderOptions = defaultsDeep(
          dialog.options,                         // merge with user's dialog options
          {                                       // and some default options
            key: dialog.id,
            style: { zIndex: dialog.zIndex },
            props,
            on: { close: dialog.close }
          }
        )

        // clear extra properties otherwise vue will throw an error
        delete renderOptions.component
        delete renderOptions.args

        renderedDialogs.push(h(dialog.options.component, renderOptions))
      }

      return h('transition-group', wrapperOptions.wrapper, renderedDialogs)
    }
  })
}
