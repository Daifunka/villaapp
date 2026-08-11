<script setup>
import { computed } from 'vue'

const props = defineProps({
  language: {
    type: String,
    default: 'Fr',
  },
  resultCount: {
    type: Number,
    default: 0,
  },
})

const query = defineModel({ type: String, default: '' })

const isEnglish = computed(() => props.language === 'En')
const placeholder = computed(() =>
  isEnglish.value ? 'Search for a menu item' : 'Rechercher un article',
)
const resultLabel = computed(() => {
  if (!query.value?.trim()) return ''

  if (isEnglish.value) {
    return `${props.resultCount} result${props.resultCount === 1 ? '' : 's'}`
  }

  return `${props.resultCount} résultat${props.resultCount === 1 ? '' : 's'}`
})
</script>

<template>
  <div class="menu-search notranslate" translate="no" role="search">
    <q-input
      v-model="query"
      outlined
      rounded
      clearable
      clear-icon="close"
      color="primary"
      bg-color="white"
      autocomplete="off"
      inputmode="search"
      :aria-label="placeholder"
      :placeholder="placeholder"
      class="menu-search__input"
    >
      <template #prepend>
        <q-icon name="sym_o_search" color="primary" />
      </template>
    </q-input>

    <div v-if="resultLabel" class="menu-search__result" aria-live="polite">
      {{ resultLabel }}
    </div>
  </div>
</template>

<style scoped>
.menu-search {
  width: min(100%, 620px);
  margin: -16px auto 28px;
}

.menu-search__input {
  border-radius: 22px;
  box-shadow: 0 10px 28px rgb(35 31 32 / 8%);
}

.menu-search__input :deep(.q-field__control) {
  min-height: 54px;
  border-radius: 22px;
}

.menu-search__input :deep(.q-field__native) {
  font-size: 1rem;
  font-weight: 500;
}

.menu-search__result {
  min-height: 20px;
  padding: 7px 14px 0;
  color: #707070;
  font-size: 0.78rem;
  font-weight: 600;
  text-align: right;
}

@media (max-width: 599px) {
  .menu-search {
    margin-bottom: 22px;
  }
}
</style>
