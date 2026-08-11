<script setup>
import { nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { getMenuSearchKey } from '@/utils/menuSearch'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  language: {
    type: String,
    default: 'Fr',
  },
})

const emit = defineEmits(['indexed', 'translationNeeded'])
const indexRoot = useTemplateRef('indexRoot')
let observer
let collectFrame
let previousSignature = ''

function collectTranslatedNames() {
  if (collectFrame) window.cancelAnimationFrame(collectFrame)

  collectFrame = window.requestAnimationFrame(() => {
    const translatedNames = {}

    indexRoot.value?.querySelectorAll('[data-menu-search-key]').forEach((element) => {
      const key = element.dataset.menuSearchKey
      const translatedName = element.textContent?.trim()

      if (key && translatedName) translatedNames[key] = translatedName
    })

    const signature = JSON.stringify(translatedNames)
    if (signature === previousSignature) return

    previousSignature = signature
    emit('indexed', translatedNames)
  })
}

async function observeTranslationIndex() {
  observer?.disconnect()
  previousSignature = ''
  await nextTick()

  if (!indexRoot.value || props.language !== 'En') {
    emit('indexed', {})
    return
  }

  observer = new MutationObserver(collectTranslatedNames)
  observer.observe(indexRoot.value, {
    childList: true,
    characterData: true,
    subtree: true,
  })

  collectTranslatedNames()
  emit('translationNeeded')
}

watch(() => [props.language, props.items], observeTranslationIndex)
onMounted(observeTranslationIndex)

onBeforeUnmount(() => {
  observer?.disconnect()
  if (collectFrame) window.cancelAnimationFrame(collectFrame)
})
</script>

<template>
  <div
    v-if="language === 'En'"
    ref="indexRoot"
    class="menu-translation-index"
    aria-hidden="true"
    inert
  >
    <span
      v-for="item in items"
      :key="getMenuSearchKey(item)"
      :data-menu-search-key="getMenuSearchKey(item)"
    >
      {{ item.nom }}
    </span>
  </div>
</template>

<style scoped>
.menu-translation-index {
  position: fixed;
  top: 0;
  left: -10000px;
  display: grid;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0.01;
  pointer-events: none;
}
</style>
