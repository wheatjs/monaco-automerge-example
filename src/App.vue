<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as monaco from 'monaco-editor'
import automerge from 'automerge'

const editor1 = ref<HTMLElement>()
const editor2 = ref<HTMLElement>()
const _history = ref([])

let pauseEditor1 = false
let pauseEditor2 = false

const text1 = ref('')
const text2 = ref('')

let doc1 = automerge.init()
let doc2 = automerge.init()

onMounted(() => {

  if (editor1.value && editor2.value) {

    const model1 = monaco.editor.createModel('')
    const model2 = monaco.editor.createModel('')

    const _editor1 = monaco.editor.create(editor1.value, {
      model: model1
    })
    const _editor2 = monaco.editor.create(editor2.value, {
      model: model2
    })


    _editor1.onDidChangeModelContent((e) => {
      if (pauseEditor1)
        return

      const change = e.changes[0]
      doc1 = automerge.change(doc1, (doc: any) => {
        if (!doc.text)
          doc.text = new automerge.Text()

        if (change.text.length > 0) {
          doc.text.deleteAt(change.rangeOffset, change.rangeLength)
          doc.text.insertAt(change.rangeOffset, ...change.text)
        } else {
          doc.text.deleteAt(change.rangeOffset, change.rangeLength)
        }
      })

      doc1 = automerge.merge(doc1, doc2)
      doc2 = automerge.merge(doc2, doc1)
      text1.value = doc1.text.toString()
      text2.value = doc2.text.toString()

      _history.value = automerge.getHistory(doc1)

      pauseEditor2 = true
      _editor2.getModel()?.setValue(doc1.text.toString())
      pauseEditor2 = false
    })

    _editor2.onDidChangeModelContent((e) => {
      if (pauseEditor2)
        return

      const change = e.changes[0]

      doc2 = automerge.change(doc2, (doc: any) => {
        if (!doc.text)
          doc.text = new automerge.Text()

        if (change.text.length > 0) {
          doc.text.deleteAt(change.rangeOffset, change.rangeLength)
          doc.text.insertAt(change.rangeOffset, ...change.text)
        } else {
          doc.text.deleteAt(change.rangeOffset, change.rangeLength)
        }
      })

      doc1 = automerge.merge(doc1, doc2)
      doc2 = automerge.merge(doc2, doc1)
      text1.value = doc1.text.toString()
      text2.value = doc2.text.toString()

      pauseEditor1 = true
      _editor1.getModel()?.setValue(doc1.text.toString())
      pauseEditor1 = false
    })
  }
})
</script>

<template>
  <div class="container">
    <div style="display: flex; flex-direction: row;">
      <div ref="editor1" style="width: 500px; height: 300px; border: 1px solid black;"></div>
      <div ref="editor2" style="width: 500px; height: 300px; border: 1px solid black;"></div>
    </div>

    <div>
      <div style="padding: 1rem;">
        <div>History</div>
        <div v-for="item in _history">
          <div v-for="x in item.change.ops" class="card">
            <div>Action: {{ x.action }}</div>
            <div v-if="x.value">Value: {{ x.value }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.container {
  display: flex;
  flex-direction: row;
}

.card {
  background-color: #f1f1f1;
  padding: 1rem;
  margin-bottom: 1rem;
}
</style>