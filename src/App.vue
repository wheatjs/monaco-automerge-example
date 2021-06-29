<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { io } from 'socket.io-client'
import * as monaco from 'monaco-editor'
import automerge from 'automerge'

const target = ref<HTMLElement>()
let pauseUpdate = false

let doc = automerge.init()
let doc2 = automerge.init()

onMounted(() => {
  const client = io('ws://localhost:4000')

  client.on('connect', () => {
    if (target.value) {

      const model = monaco.editor.createModel('')
      const editor = monaco.editor.create(target.value, {
        model
      })

      editor.onDidChangeModelContent((e) => {
        if (pauseUpdate)
          return

        const change = e.changes[0]
        let newdoc = automerge.change(doc, (_doc: any) => {
          if (!_doc.text)
            _doc.text = new automerge.Text()

          if (change.text.length > 0) {
            _doc.text.deleteAt(change.rangeOffset, change.rangeLength)
            _doc.text.insertAt(change.rangeOffset, ...change.text)
          } else {
            _doc.text.deleteAt(change.rangeOffset, change.rangeLength)
          }
        })

        const changes = automerge.getChanges(doc, newdoc)
        doc = newdoc
        client.emit('change', new Blob(changes))
      })

      client.on('change', async (changes) => {
        changes = await new Response(changes).arrayBuffer()
        changes = new Uint8Array(changes)
        let x = automerge.applyChanges(doc, [changes])

        doc = x[0]
        let patches = x[1]

        pauseUpdate = true

        // Manually apply the patches to the editor
        if (patches.diffs.props.text) {
          Object.values(patches.diffs.props.text).forEach(({ edits }) => {
            edits.forEach((edit: any) => {
              if (edit.action === 'insert') {
                const { lineNumber, column } = model.getPositionAt(edit.index)
                const op = {
                  identifier: edit.opId,
                  range: new monaco.Range(lineNumber, column, lineNumber, column),
                  text: edit.value.value,
                  forceMoveMarkers: true
                }

                editor.executeEdits('autmerge', [op])
              } else if (edit.action === 'remove') {
                const { lineNumber: startLineNumber, column: startLineColumn } = model.getPositionAt(edit.index)
                const { lineNumber: endLineNumber, column: endLineColumn } = model.getPositionAt(edit.index + edit.count)
                const op = {
                  identifier: edit.opId,
                  range: new monaco.Range(startLineNumber, startLineColumn, endLineNumber, endLineColumn),
                  text: null,
                  forceMoveMarkers: true
                }

                editor.executeEdits('autmerge', [op])
              } else if (edit.action === 'multi-insert') {
                const { lineNumber, column } = model.getPositionAt(edit.index)
                const op = {
                  identifier: edit.opId,
                  range: new monaco.Range(lineNumber, column, lineNumber, column),
                  text: edit.values.join(''),
                  forceMoveMarkers: true
                }

                editor.executeEdits('autmerge', [op])
              }
            })
          })
        }

        pauseUpdate = false
      })

    }
  })


  client.connect()
})
</script>

<template>
  <div w="112" h="112" ref="target"></div>
</template>
