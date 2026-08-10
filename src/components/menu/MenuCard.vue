<script setup>
import { computed } from 'vue'
import foodFallback from '@/assets/img/food.png'
import drinkFallback from '@/assets/img/drink.png'

const props = defineProps({
  imageUrl: { type: String, required: true },
  index: { type: Number, required: true },
  item: { type: Object, required: true },
  language: { type: String, required: true },
})

const emit = defineEmits(['add', 'select'])

const isDrink = computed(() => props.item.source === 'Bar')
const fallbackImage = computed(() => (isDrink.value ? drinkFallback : foodFallback))
const formattedPrice = computed(() =>
  new Intl.NumberFormat(props.language === 'En' ? 'en-US' : 'fr-FR').format(
    Number(props.item.prix) || 0,
  ),
)
const actionLabel = computed(() =>
  props.language === 'En'
    ? `View details for ${props.item.nom}`
    : `Voir les détails de ${props.item.nom}`,
)
const addLabel = computed(() =>
  props.language === 'En' ? `Add ${props.item.nom} to cart` : `Ajouter ${props.item.nom} au panier`,
)
</script>

<template>
  <article
    class="order-card"
    role="button"
    tabindex="0"
    :aria-label="actionLabel"
    :style="{ '--entry-delay': `${(index % 14) * 20}ms` }"
    @click="emit('select', item)"
    @keydown.enter.self.prevent="emit('select', item)"
    @keydown.space.self.prevent="emit('select', item)"
  >
    <span class="order-card__visual">
      <q-img
        :src="imageUrl"
        :alt="item.nom"
        class="order-card__image"
        fit="cover"
        position="50% 50%"
        loading="lazy"
        no-spinner
      >
        <template #error>
          <q-img :src="fallbackImage" :alt="item.nom" class="order-card__image" fit="contain" />
        </template>
      </q-img>
    </span>

    <span class="order-card__content">
      <span class="order-card__title">{{ item.nom }}</span>
      <span class="order-card__footer">
        <strong class="order-card__price">{{ formattedPrice }} F</strong>
        <button
          type="button"
          class="order-card__action"
          :aria-label="addLabel"
          @click.stop="emit('add', item)"
        >
          <q-icon name="sym_o_add" size="20px" aria-hidden="true" />
          {{ language === 'En' ? 'Add' : 'Ajouter' }}
        </button>
      </span>
    </span>
  </article>
</template>

<style scoped>
.order-card {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 120px;
  padding: 0;
  overflow: hidden;
  color: inherit;
  font: inherit;
  text-align: left;
  touch-action: manipulation;
  cursor: pointer;
  background: #fff;
  border: 1px solid rgba(141, 22, 47, 0.12);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(54, 17, 24, 0.07);
  animation: order-card-enter 0.3s ease both;
  animation-delay: var(--entry-delay);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.order-card:hover {
  border-color: rgba(141, 22, 47, 0.32);
  box-shadow: 0 12px 30px rgba(54, 17, 24, 0.12);
  transform: translateY(-2px);
}

.order-card:active {
  transform: scale(0.985);
}

.order-card:focus-visible {
  outline: 3px solid rgba(141, 22, 47, 0.32);
  outline-offset: 3px;
}

.order-card__visual {
  display: block;
  flex: 0 0 34%;
  min-height: 120px;
  overflow: hidden;
  background: #f5eeeb;
}

.order-card__image {
  width: 100%;
  height: 100%;
}

.order-card__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 13px 10px 11px 14px;
}

.order-card__title {
  display: -webkit-box;
  min-height: 38px;
  overflow: hidden;
  color: #21181a;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.order-card__footer {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.order-card__price {
  color: #8d162f;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.order-card__action {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  min-height: 36px;
  padding: 0 10px 0 8px;
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  background: #8d162f;
  border: 0;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(141, 22, 47, 0.22);
}

.order-card__action:focus-visible {
  outline: 3px solid rgba(141, 22, 47, 0.3);
  outline-offset: 2px;
}

@media (min-width: 600px) {
  .order-card {
    flex-direction: column;
  }

  .order-card__visual {
    flex-basis: 180px;
    width: 100%;
    min-height: 180px;
  }

  .order-card__content {
    width: 100%;
    min-height: 112px;
    padding: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .order-card {
    animation: none;
    transition: none;
  }
}

@keyframes order-card-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
