<template>
  <div>
    <!-- Success Modal -->
    <UModal v-model="showSuccessModal" :ui="{ width: 'sm:max-w-md' }">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-center">
            <div
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100"
            >
              <UIcon name="i-heroicons-check" class="h-6 w-6 text-green-600" />
            </div>
          </div>
        </template>

        <div class="text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Demo Request Submitted Successfully!
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Thank you for your interest in Provento.ai! Our team will contact you within 24 hours to
            schedule your personalized demo session.
          </p>
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <div class="flex items-center text-sm text-blue-800 dark:text-blue-200">
              <UIcon name="i-heroicons-information-circle" class="h-5 w-5 mr-2 flex-shrink-0" />
              <span
                >We'll send you a calendar invite with meeting details and preparation
                materials.</span
              >
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end space-x-3">
            <UButton color="gray" variant="ghost" @click="showSuccessModal = false">
              Close
            </UButton>
            <UButton color="primary" @click="navigateTo('/')"> Back to Home </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
    <section class="pt-16 pb-24 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-16">
          <h1 class="text-4xl sm:text-5xl font-bold text-white mb-6">
            Book a
            <span class="text-primary-400">Demo</span>
          </h1>
          <p class="text-xl text-gray-300">
            See Provento.ai in action and discover how it can transform your document workflow
          </p>
        </div>

        <div class="grid lg:grid-cols-2 gap-12">
          <!-- Demo Form -->
          <div class="card">
            <h2 class="text-2xl font-bold text-white mb-6">Schedule Your Demo</h2>
            <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
              <div class="grid grid-cols-2 gap-4">
                <div class="form-field-wrapper">
                  <UFormField
                    name="firstName"
                    :ui="{ container: 'space-y-0', error: 'mt-2 text-red-400 text-sm' }"
                  >
                    <label class="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                    <UInput
                      v-model="state.firstName"
                      placeholder="John"
                      inputClass="custom-input"
                    />
                  </UFormField>
                </div>
                <div class="form-field-wrapper">
                  <UFormField
                    name="lastName"
                    :ui="{ container: 'space-y-0', error: 'mt-2 text-red-400 text-sm' }"
                  >
                    <label class="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                    <UInput v-model="state.lastName" placeholder="Doe" inputClass="custom-input" />
                  </UFormField>
                </div>
              </div>

              <div class="form-field-wrapper">
                <UFormField
                  name="email"
                  :ui="{ container: 'space-y-0', error: 'mt-2 text-red-400 text-sm' }"
                >
                  <label class="block text-sm font-medium text-gray-300 mb-2">Work Email *</label>
                  <UInput
                    v-model="state.email"
                    type="email"
                    placeholder="john@company.com"
                    inputClass="custom-input"
                  />
                </UFormField>
              </div>

              <div class="form-field-wrapper">
                <UFormField
                  name="phone"
                  :ui="{ container: 'space-y-0', error: 'mt-2 text-red-400 text-sm' }"
                >
                  <label class="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <LibVueTelInput
                    ref="phoneRef"
                    :prop-phone="phoneModel"
                    placeholder="Your phone number"
                    class="my-4"
                  />
                  <p class="text-xs text-gray-400 mt-1">NB: We'll use this for scheduling calls</p>
                </UFormField>
              </div>

              <div class="form-field-wrapper">
                <UFormField
                  name="company"
                  :ui="{ container: 'space-y-0', error: 'mt-2 text-red-400 text-sm' }"
                >
                  <label class="block text-sm font-medium text-gray-300 mb-2">Company *</label>
                  <UInput
                    v-model="state.company"
                    placeholder="Your company name"
                    inputClass="custom-input"
                  />
                </UFormField>
              </div>

              <div class="form-field-wrapper">
                <UFormField
                  name="jobTitle"
                  :ui="{ container: 'space-y-0', error: 'mt-2 text-red-400 text-sm' }"
                >
                  <label class="block text-sm font-medium text-gray-300 mb-2">Job Title</label>
                  <UInput
                    v-model="state.jobTitle"
                    placeholder="Your role"
                    inputClass="custom-input"
                  />
                </UFormField>
              </div>

              <div class="form-field-wrapper">
                <UFormField
                  name="companySize"
                  :ui="{ container: 'space-y-0', error: 'mt-2 text-red-400 text-sm' }"
                >
                  <label class="block text-sm font-medium text-gray-300 mb-2">Company Size</label>
                  <USelect
                    v-model="state.companySize"
                    :options="companySizeOptions"
                    value-attribute="value"
                    option-attribute="label"
                    selectClass="custom-select"
                  />
                </UFormField>
              </div>

              <div class="form-field-wrapper">
                <UFormField
                  name="useCase"
                  :ui="{ container: 'space-y-0', error: 'mt-2 text-red-400 text-sm' }"
                >
                  <label class="block text-sm font-medium text-gray-300 mb-2"
                    >Primary Use Case</label
                  >
                  <USelect
                    v-model="state.useCase"
                    :options="useCaseOptions"
                    value-attribute="value"
                    option-attribute="label"
                    selectClass="custom-select"
                  />
                </UFormField>
              </div>

              <div class="form-field-wrapper">
                <UFormField
                  name="message"
                  :ui="{ container: 'space-y-0', error: 'mt-2 text-red-400 text-sm' }"
                >
                  <label class="block text-sm font-medium text-gray-300 mb-2"
                    >Message (Optional)</label
                  >
                  <UTextarea
                    v-model="state.message"
                    :rows="4"
                    placeholder="Tell us about your specific needs or questions..."
                    :ui="{
                      base: 'w-full resize-none',
                    }"
                    textareaClass="custom-textarea"
                  />
                </UFormField>
              </div>

              <div class="form-field-wrapper">
                <button
                  type="submit"
                  :disabled="loading"
                  class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="loading" class="flex items-center justify-center">
                    <UIcon
                      name="i-heroicons-arrow-path"
                      class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    />
                    Booking a Demo...
                  </span>
                  <span v-else>Book a Demo</span>
                </button>
              </div>
            </UForm>
          </div>

          <!-- Demo Information -->
          <div class="space-y-8">
            <!-- What to Expect -->
            <div class="card">
              <h3 class="text-xl font-bold text-white mb-4">What to Expect</h3>
              <ul class="space-y-3">
                <li v-for="item in demoExpectations" :key="item" class="flex items-start">
                  <UIcon
                    name="i-heroicons-check"
                    class="w-5 h-5 text-primary-400 mt-0.5 mr-3 flex-shrink-0"
                  />
                  <span class="text-gray-300">{{ item }}</span>
                </li>
              </ul>
            </div>

            <!-- Demo Stats -->
            <div class="card">
              <h3 class="text-xl font-bold text-white mb-4">Demo Details</h3>
              <div class="space-y-4">
                <div class="flex items-center">
                  <UIcon name="i-heroicons-clock" class="w-5 h-5 text-primary-400 mr-3" />
                  <span class="text-gray-300">30-45 minutes</span>
                </div>
                <div class="flex items-center">
                  <UIcon name="i-heroicons-video-camera" class="w-5 h-5 text-primary-400 mr-3" />
                  <span class="text-gray-300">Live video call</span>
                </div>
                <div class="flex items-center">
                  <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-primary-400 mr-3" />
                  <span class="text-gray-300">Custom artefact demo</span>
                </div>
                <div class="flex items-center">
                  <UIcon
                    name="i-heroicons-question-mark-circle"
                    class="w-5 h-5 text-primary-400 mr-3"
                  />
                  <span class="text-gray-300">Q&A session</span>
                </div>
              </div>
            </div>

            <!-- Contact Alternative -->
            <div class="card">
              <h3 class="text-xl font-bold text-white mb-4">Prefer to Talk First?</h3>
              <p class="text-gray-300 mb-4">
                Have questions before booking? Our sales team is happy to help.
              </p>
              <div class="space-y-3">
                <a
                  href="mailto:sales@provento.ai"
                  class="flex items-center text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <UIcon name="i-heroicons-envelope" class="w-5 h-5 mr-3" />
                  sales@provento.ai
                </a>
                <a
                  href="tel:+1-555-0123"
                  class="flex items-center text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <UIcon name="i-heroicons-phone" class="w-5 h-5 mr-3" />
                  +1 (555) 012-3456
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useContactStore } from '~/stores/contact'
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'main',
})

const { showNotification } = useNotification()
const contactStore = useContactStore()
const loading = computed(() => contactStore.loading)
const showSuccessModal = ref(false)

// Zod schema for form validation
const schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  company: z.string().min(1, 'Company name is required').max(255, 'Company name too long'),
  jobTitle: z.string().max(255, 'Job title too long').optional(),
  companySize: z
    .enum(['', '1-10', '11-50', '51-200', '201-1000', '1000+'], {
      errorMap: () => ({ message: 'Please select a company size' }),
    })
    .optional(),
  useCase: z
    .enum(['', 'legal', 'hr', 'finance', 'research', 'customer-support', 'other'], {
      errorMap: () => ({ message: 'Please select a use case' }),
    })
    .optional(),
  message: z.string().max(1000, 'Message too long').optional(),
  phone: z.string().optional(),
})

type Schema = z.output<typeof schema>

const state = reactive({
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  jobTitle: '',
  companySize: '',
  useCase: '',
  message: '',
  phone: '',
})

// Phone number handling
const phoneModel = ref('')
const defaultCountry = ref('US')

// Options for selects
const companySizeOptions = [
  { value: '', label: 'Select company size' },
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-1000', label: '201-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
]

const useCaseOptions = [
  { value: '', label: 'Select use case' },
  { value: 'legal', label: 'Legal document analysis' },
  { value: 'hr', label: 'HR documentation' },
  { value: 'finance', label: 'Financial documents' },
  { value: 'research', label: 'Research and analysis' },
  { value: 'customer-support', label: 'Customer support' },
  { value: 'other', label: 'Other' },
]

const demoExpectations = [
  'Personalized demo based on your use case',
  'Live document upload and questioning',
  'Integration walkthrough',
  'Pricing and plan discussion',
  'Next steps and trial setup',
]

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    const domain = window.location.hostname
    const isProd = domain.includes('provento.ai') && !domain.includes('test')
    const isTest = domain.includes('test') || domain.includes('refactor')

    // Prepare data for API
    const contactData = {
      name: event.data.firstName,
      lastname: event.data.lastName,
      email: event.data.email,
      phone: phoneModel.value || undefined,
      company: event.data.company || undefined,
      jobTitle: event.data.jobTitle || undefined,
      companySize: event.data.companySize || undefined,
      requestFor: event.data.useCase || undefined,
      message: event.data.message || undefined,
      domain: isProd ? 'Prod' : isTest ? 'Test' : 'Local',
      // Note: reCAPTCHA token would be needed for production
      token: 'demo-token', // Replace with actual reCAPTCHA token
    }

    // Submit via store
    await contactStore.submitDemoRequest(contactData)

    // Show success modal
    showSuccessModal.value = true

    // Reset form
    Object.assign(state, {
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      jobTitle: '',
      companySize: '',
      useCase: '',
      message: '',
      phone: '',
    })
    phoneModel.value = ''
  } catch (error: any) {
    console.error('Demo submission error:', error)
    showNotification(
      error.message || 'Failed to submit demo request. Please try again or contact us directly.',
      'error',
    )
  }
}
</script>

<style scoped>
/* Form field wrapper spacing */
.form-field-wrapper {
  margin-bottom: 1.5rem;
}

/* Custom input styles to match reference design */
:deep(.custom-input) {
  background-color: #1e293b !important;
  border: 1px solid #334155 !important;
  border-radius: 0.5rem !important;
  color: #e2e8f0 !important;
  font-size: 0.875rem !important;
  padding: 0.875rem 1rem !important;
  transition: all 0.2s ease-in-out !important;
  width: 100% !important;
  box-shadow: none !important;
}

:deep(.custom-input:hover) {
  border-color: #475569 !important;
  background-color: #1e293b !important;
}

:deep(.custom-input:focus) {
  border-color: #3b82f6 !important;
  background-color: #1e293b !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  outline: none !important;
}

:deep(.custom-input::placeholder) {
  color: #64748b !important;
}

/* Custom select styles */
:deep(.custom-select) {
  background-color: #1e293b !important;
  border: 1px solid #334155 !important;
  border-radius: 0.5rem !important;
  color: #e2e8f0 !important;
  font-size: 0.875rem !important;
  padding: 0.875rem 1rem !important;
  transition: all 0.2s ease-in-out !important;
  width: 100% !important;
  cursor: pointer !important;
  box-shadow: none !important;
}

:deep(.custom-select:hover) {
  border-color: #475569 !important;
  background-color: #1e293b !important;
}

:deep(.custom-select:focus) {
  border-color: #3b82f6 !important;
  background-color: #1e293b !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  outline: none !important;
}

/* Custom textarea styles */
:deep(.custom-textarea) {
  background-color: #1e293b !important;
  border: 1px solid #334155 !important;
  border-radius: 0.5rem !important;
  color: #e2e8f0 !important;
  font-size: 0.875rem !important;
  padding: 0.875rem 1rem !important;
  transition: all 0.2s ease-in-out !important;
  width: 100% !important;
  resize: none !important;
  box-shadow: none !important;
}

:deep(.custom-textarea:hover) {
  border-color: #475569 !important;
  background-color: #1e293b !important;
}

:deep(.custom-textarea:focus) {
  border-color: #3b82f6 !important;
  background-color: #1e293b !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  outline: none !important;
}

:deep(.custom-textarea::placeholder) {
  color: #64748b !important;
}

/* Vue-tel-input custom styling to match design */
:deep(.vue-tel-custom-input) {
  background-color: transparent !important;
  border: none !important;
  color: #f3f4f6 !important;
  font-size: 0.875rem !important;
  padding: 0.75rem !important;
  padding-left: 1rem !important;
}

:deep(.vue-tel-custom-input::placeholder) {
  color: #9ca3af !important;
}

:deep(.vue-tel-custom-input:focus) {
  outline: none !important;
  box-shadow: none !important;
}

/* Custom styling for vue3-tel-input to match the design */
:deep(.vue-tel-input) {
  border: 1px solid #334155;
  border-radius: 0.5rem;
  background-color: #1e293b;
  transition: all 0.2s ease-in-out;
  box-shadow: none;
}

:deep(.vue-tel-input:hover) {
  border-color: #475569;
  background-color: #1e293b;
}

:deep(.vue-tel-input:focus-within) {
  border-color: #3b82f6;
  background-color: #1e293b;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

:deep(.vue-tel-input .vti__dropdown) {
  background-color: #1e293b;
  border-right: 1px solid #334155;
  border-radius: 0.5rem 0 0 0.5rem;
}

:deep(.vue-tel-input .vti__dropdown:hover) {
  background-color: #1e293b;
}

:deep(.vue-tel-input .vti__dropdown-list) {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

:deep(.vue-tel-input .vti__dropdown-item) {
  color: #e2e8f0;
  padding: 8px 12px;
}

:deep(.vue-tel-input .vti__dropdown-item:hover) {
  background-color: rgba(59, 130, 246, 0.1);
}

:deep(.vue-tel-input .vti__dropdown-item.highlighted) {
  background-color: rgba(59, 130, 246, 0.2);
}

:deep(.vue-tel-input .vti__selection) {
  color: #e2e8f0;
  font-size: 0.875rem;
}

:deep(.vue-tel-input .vti__input) {
  background-color: transparent !important;
  border: none !important;
  color: #e2e8f0 !important;
  font-size: 0.875rem;
  padding: 0.875rem 1rem !important;
}

:deep(.vue-tel-input .vti__input::placeholder) {
  color: #9ca3af;
}

:deep(.vue-tel-input .vti__input:focus) {
  outline: none !important;
  box-shadow: none !important;
}

:deep(.vue-tel-input .vti__dropdown-arrow) {
  color: #9ca3af;
}

/* Search box styling */
:deep(.vti__search-box) {
  background-color: rgba(31, 41, 55, 0.9) !important;
  border: 1px solid rgba(75, 85, 99, 0.7) !important;
  color: #f3f4f6 !important;
  border-radius: 0.5rem !important;
  margin: 8px !important;
  padding: 8px 12px !important;
  font-size: 14px !important;
  width: calc(100% - 16px) !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

:deep(.vti__search-box::placeholder) {
  color: #9ca3af !important;
}

:deep(.vti__search-box:focus) {
  outline: none !important;
  border-color: #3b82f6 !important;
  background-color: rgba(37, 47, 63, 1) !important;
  box-shadow:
    0 0 0 2px rgba(59, 130, 246, 0.1),
    inset 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

/* Ensure dropdown list is properly positioned and sized */
:deep(.vue-tel-input .vti__dropdown-list) {
  background-color: rgba(17, 24, 39, 0.95) !important;
  border: 1px solid rgba(55, 65, 81, 0.6) !important;
  border-radius: 0.5rem !important;
  backdrop-filter: blur(10px) !important;
  max-height: 250px !important;
  overflow-y: auto !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
  z-index: 50 !important;
}
</style>
