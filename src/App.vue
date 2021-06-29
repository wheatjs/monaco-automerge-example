<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { io } from 'socket.io-client'
import * as monaco from 'monaco-editor'
import automerge from 'automerge'

const target = ref<HTMLElement>()
let pauseUpdate = false

let doc = automerge.init()
let doc2 = automerge.init()

function arrayToBase64String(a: Uint8Array) {
  return btoa(String.fromCharCode(...a));
}

function base64StringToArray(s: string) {
  const asciiString = atob(s);
  return new Uint8Array([...asciiString].map((char) => char.charCodeAt(0)));
}

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
        doc = automerge.change(doc, (_doc: any) => {
          if (!_doc.text)
            _doc.text = new automerge.Text()

          if (change.text.length > 0) {
            _doc.text.deleteAt(change.rangeOffset, change.rangeLength)
            _doc.text.insertAt(change.rangeOffset, ...change.text)
          } else {
            _doc.text.deleteAt(change.rangeOffset, change.rangeLength)
          }
        })

        const changes = automerge.getAllChanges(doc)
        client.emit('change', new Blob(changes))
      })

      client.on('change', async (changes) => {
        changes = await new Response(changes).arrayBuffer()
        changes = new Uint8Array(changes)
        doc = automerge.applyChanges(doc, [changes])[0]

        pauseUpdate = true
        model.setValue(doc.text.toString())
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
