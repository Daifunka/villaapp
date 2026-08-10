<script setup>
import { computed } from 'vue'
import foodFallback from '@/assets/img/food.png'
import drinkFallback from '@/assets/img/drink.png'

const model = defineModel({ type: Boolean, default: false })

const props = defineProps({
  imageUrl: { type: String, default: '' },
  item: { type: Object, default: null },
  language: { type: String, required: true },
})

const emit = defineEmits(['add'])

const isDrink = computed(() => props.item?.source === 'Bar')
const fallbackImage = computed(() => (isDrink.value ? drinkFallback : foodFallback))
const sourceLabel = computed(() => {
  if (props.language === 'En') return isDrink.value ? 'Drink' : 'Dish'
  return isDrink.value ? 'Boisson' : 'Plat'
})
const formattedPrice = computed(() =>
  new Intl.NumberFormat(props.language === 'En' ? 'en-US' : 'fr-FR').format(
    Number(props.item?.prix) || 0,
  ),
)
const description = computed(() => {
  if (!props.item) return ''

  const localizedCandidates =
    props.language === 'En'
      ? [props.item.descriptionEn, props.item.description_en]
      : [props.item.descriptionFr, props.item.description_fr]
  const candidates = [
    ...localizedCandidates,
    props.item.description,
    props.item.details,
    props.item.composition,
    props.item.ingredients,
  ]
  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())

  if (value) return value.trim()
  return props.language === 'En'
    ? 'Discover this selection from La Villa Saint-Jean.'
    : 'Découvrez cette sélection de La Villa Saint-Jean.'
})

function addToCart() {
  if (!props.item) return
  emit('add', props.item)
  model.value = false
}
</script>

<template>
  <q-dialog v-model="model">
    <q-card v-if="item" class="product-dialog">
      <q-btn
        v-close-popup
        class="product-dialog__close"
        icon="sym_o_close"
        round
        flat
        color="grey-9"
        :aria-label="language === 'En' ? 'Close product details' : 'Fermer la fiche produit'"
      />

      <div class="product-dialog__visual">
        <q-img
          :src="imageUrl || fallbackImage"
          :alt="item.nom"
          class="product-dialog__image"
          fit="contain"
          no-spinner
        >
          <template #error>
            <q-img :src="fallbackImage" :alt="item.nom" class="product-dialog__image" fit="contain" />
          </template>
        </q-img>
      </div>

      <q-card-section class="product-dialog__content">
        <div class="product-dialog__type">
          <q-icon :name="isDrink ? 'sym_o_local_bar' : 'sym_o_restaurant'" size="18px" />
          {{ sourceLabel }}
        </div>

        <h2 class="product-dialog__title">{{ item.nom }}</h2>
        <p class="product-dialog__description">{{ description }}</p>

        <div class="product-dialog__footer">
          <strong class="product-dialog__price">{{ formattedPrice }} F</strong>
          <q-btn
            class="product-dialog__add"
            unelevated
            rounded
            no-caps
            icon="sym_o_add_shopping_cart"
            :label="language === 'En' ? 'Add to cart' : 'Ajouter au panier'"
            @click="addToCart"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.product-dialog {
  width: min(640px, 94vw);
  max-height: 92vh;
  overflow: auto;
  background: #fff;
  border-radius: 28px;
  box-shadow: 0 24px 70px rgba(31, 8, 14, 0.28);
}

.product-dialog__close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 14px rgba(31, 8, 14, 0.14);
}

.product-dialog__visual {
  display: grid;
  height: min(46vh, 360px);
  overflow: hidden;
  background: #f5f1ef;
  place-items: center;
}

.product-dialog__image {
  width: 100%;
  height: 100%;
}

.product-dialog__content {
  padding: 24px;
}

.product-dialog__type {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  color: #8d162f;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  background: rgba(141, 22, 47, 0.08);
  border-radius: 999px;
}

.product-dialog__title {
  margin: 14px 0 8px;
  color: #21181a;
  font-size: clamp(24px, 5vw, 32px);
  font-weight: 800;
  line-height: 1.15;
}

.product-dialog__description {
  margin: 0;
  color: #66575b;
  font-size: 15px;
  line-height: 1.65;
  white-space: pre-line;
}

.product-dialog__footer {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgba(141, 22, 47, 0.1);
}

.product-dialog__price {
  flex-shrink: 0;
  color: #8d162f;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.product-dialog__add {
  min-height: 46px;
  padding: 0 20px;
  color: #fff !important;
  font-weight: 800;
  background: #8d162f !important;
}

@media (max-width: 480px) {
  .product-dialog__visual {
    height: min(40vh, 300px);
  }

  .product-dialog__content {
    padding: 20px;
  }

  .product-dialog__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .product-dialog__add {
    width: 100%;
  }
}
</style>
