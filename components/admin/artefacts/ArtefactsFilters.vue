<template>
  <div class="bg-dark-800 rounded-lg p-4 sm:p-6 border border-dark-700">
    <div class="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <!-- Search Input -->
      <div class="flex-1 min-w-0">
        <UInput
          :model-value="searchQuery"
          @update:model-value="$emit('update:searchQuery', $event)"
          placeholder="Search artifacts..."
          size="md"
          icon="i-heroicons-magnifying-glass"
        />
      </div>

      <!-- Category Filter -->
      <div class="w-full">
        <USelect
          :model-value="selectedCategory"
          @update:model-value="$emit('update:selectedCategory', $event)"
          :options="[
            { label: categoriesLoading ? 'Loading categories...' : 'All Categories', value: '' },
            ...availableCategories.map((cat) => ({ label: cat, value: cat })),
          ]"
          :loading="categoriesLoading"
          :disabled="categoriesLoading"
          size="md"
        />
      </div>

      <!-- Type Filter -->
      <div class="w-full">
        <USelect
          :model-value="selectedType"
          @update:model-value="$emit('update:selectedType', $event)"
          :options="[
            { label: 'All Types', value: '' },
            { label: 'PDF', value: 'PDF' },
            { label: 'Word', value: 'Word' },
            { label: 'Markdown', value: 'Markdown' },
            { label: 'TXT', value: 'TXT' },
            { label: 'CSV', value: 'CSV' },
          ]"
          size="md"
        />
      </div>

      <!-- Status Filter -->
      <div class="w-full">
        <USelect
          :model-value="selectedStatus"
          @update:model-value="$emit('update:selectedStatus', $event)"
          :options="[
            { label: 'All Status', value: '' },
            { label: 'Processed', value: 'processed' },
            { label: 'Processing', value: 'processing' },
            { label: 'Failed', value: 'failed' },
          ]"
          size="md"
        />
      </div>

      <!-- Department Filter -->
      <USelect
        :model-value="selectedDepartment"
        @update:model-value="$emit('update:selectedDepartment', $event)"
        :options="departmentOptions"
        option-attribute="label"
        value-attribute="value"
        size="md"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'
interface Props {
  searchQuery: string
  selectedCategory: string
  selectedType: string
  selectedStatus: string
  availableCategories: string[]
  categoriesLoading?: boolean
  departmentOptions: any[]
  selectedDepartment: String
}

const props = withDefaults(defineProps<Props>(), {
  categoriesLoading: false,
})

defineEmits<{
  'update:searchQuery': [value: string]
  'update:selectedCategory': [value: string]
  'update:selectedType': [value: string]
  'update:selectedStatus': [value: string]
  'update:selectedDepartment': [value: String]
}>()
</script>
