<script setup lang="ts">
import parsePhoneNumberFromString from 'libphonenumber-js'
import { VueTelInput } from 'vue-tel-input'
import 'vue-tel-input/vue-tel-input.css'

// Props
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  propPhone: '',
  placeholder: 'Enter your phone number',
  defaultCountry: 'IN',
  modelValue: '',
})

// Constants
const defaultPhoneDataValues = {
  country: {
    dialCode: '',
    name: '',
    iso2: '',
  },
  countryCallingCode: '',
  countryCode: '',
  formatted: '',
  nationalNumber: '',
  number: '',
  valid: false,
}

interface Props {
  propPhone?: string
  disabled?: boolean
  placeholder?: string
  defaultCountry?: string
  modelValue?: string
}

interface PhoneCountry {
  dialCode: string
  name: string
  iso2: string
}

interface PhoneNumber {
  country?: PhoneCountry
  countryCallingCode?: string
  countryCode?: string
  formatted?: string
  nationalNumber?: string
  number?: string
  valid?: boolean
}

/**
 * When try to access "phoneRef.value.phoneObject", the typescript throws an error-
 * "Property 'phoneObject' does not exist on type 'VueTelInputConstructor'"
 * To resolve this, augment the TypeScript type definition of the VueTelInput component
 */
declare module 'vue-tel-input' {
  interface VueTelInputConstructor {
    phoneObject: PhoneNumber
  }
}

// Local State
const phone = ref<string>('')
const phoneRef = ref<typeof VueTelInput>()
const phoneData = ref<PhoneNumber>(defaultPhoneDataValues)
const phoneErr = ref<boolean>(false)
const phoneErrMsg = ref<string>('')

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:phoneData': [data: PhoneNumber]
  validation: [result: { status: boolean; message?: string }]
}>()

// Watchers
watch(phoneData, (newVal) => {
  /**
   * This watcher will also get triggered When resetPhoneField function gets called,
   * which will again set the phoneErr and phoneErrMsg, so, to prevent this
   * call the watcher only when not triggered by resetPhoneField.
   */
  if (
    newVal.valid !== defaultPhoneDataValues.valid ||
    newVal.number !== defaultPhoneDataValues.number
  ) {
    handlePhoneValidation()
    // Emit the phone data to parent
    emit('update:phoneData', newVal)
  }
})

// Debounce auto-detection to avoid interfering with typing
let autoDetectTimeout: NodeJS.Timeout | null = null

watch(phone, (newVal) => {
  // Emit the phone value to parent for v-model support
  emit('update:modelValue', newVal)

  // Auto-detect country when user types international format (e.g., +15551234567)
  if (newVal && newVal.startsWith('+') && newVal.length >= 10) {
    // Clear previous timeout
    if (autoDetectTimeout) {
      clearTimeout(autoDetectTimeout)
    }

    // Debounce the auto-detection to avoid interference while typing
    autoDetectTimeout = setTimeout(() => {
      autoDetectCountryFromInternationalNumber(newVal)
    }, 300) // Wait 300ms after user stops typing for complete numbers
  }
})

watch(
  () => props.propPhone,
  (newVal) => {
    /**
     * This watch will trigger when parent component passes phone number value
     */
    if (newVal) initializePhoneDataAndParseCountryCode()
  },
)

watch(
  () => props.modelValue,
  (newVal) => {
    /**
     * This watch will trigger when parent component uses v-model
     */
    if (newVal && newVal !== phone.value) {
      phone.value = newVal
      initializePhoneDataAndParseCountryCode()
    }
  },
)

// Methods
let prevCursor = 0
let prevNumber: string = ''
function onPhoneInput(_phoneNumber: string, payload: PhoneNumber, input: HTMLInputElement) {
  // Update the phone data
  phoneData.value = payload
  prevNumber = _phoneNumber

  // Let the browser handle cursor positioning naturally
  // Only intervene if there's a specific need
  nextTick(() => {
    // Ensure cursor is at a valid position
    const cursorPos = input.selectionStart ?? 0
    const maxPos = _phoneNumber.length

    // If cursor is beyond the input length, move it to the end
    if (cursorPos > maxPos) {
      input.setSelectionRange(maxPos, maxPos)
    }
  })

  return phoneData.value
}

function onCountryChanged(payload: PhoneCountry) {
  /**
   * On country change, we need to reset the phone number but this function gets called
   * on mount too which will reset phone number on mount, so, reset the phone number
   * only if changed country does not matches with already selected phone's country code
   */
  if (phone.value && !phone.value?.includes(payload.dialCode)) resetPhoneField()

  // setTimeout(() => {
  //   document.querySelector<HTMLInputElement>('.custom-cursor input')?.focus()
  // }, 0)
}

function handlePhoneValidation() {
  let result

  if (!phone.value) {
    phoneErr.value = true
    phoneErrMsg.value = 'Phone number is required'

    result = {
      status: false,
      message: 'Phone number is required',
    }
  } else if (!phoneData.value?.valid) {
    phoneErr.value = true
    phoneErrMsg.value = 'Please enter valid Mobile Number'

    result = {
      status: false,
      message: 'Please enter valid Mobile Number',
    }
  } else {
    phoneErr.value = false
    phoneErrMsg.value = ''

    result = {
      status: true,
    }
  }

  // Emit validation result to parent
  emit('validation', result)
  return result
}

function resetPhoneField() {
  phone.value = ''
  phoneErrMsg.value = ''
  phoneErr.value = false
  phoneData.value = defaultPhoneDataValues
}

function autoDetectCountryFromInternationalNumber(internationalNumber: string) {
  try {
    // Only try to parse if it looks like a complete international number
    if (!internationalNumber.startsWith('+') || internationalNumber.length < 8) {
      return
    }

    const parsed = parsePhoneNumberFromString(internationalNumber)

    if (parsed && parsed.country && parsed.isValid()) {
      // Get the country list from the VueTelInput component
      const countryList = (phoneRef.value as any)?.allCountries || []
      const foundCountry = countryList.find((c: any) => c.iso2 === parsed.country)

      if (foundCountry && phoneData.value.countryCode !== parsed.country) {
        // Update phoneData with the detected country information
        phoneData.value = {
          country: {
            dialCode: foundCountry.dialCode,
            name: foundCountry.name,
            iso2: foundCountry.iso2,
          },
          countryCallingCode: parsed.countryCallingCode || '',
          countryCode: parsed.country || '',
          formatted: parsed.formatInternational(),
          nationalNumber: parsed.nationalNumber,
          number: parsed.number,
          valid: true,
        }

        // Set the input to show only the national number
        // e.g., +15551234567 becomes 5551234567, +447911123456 becomes 7911123456
        phone.value = parsed.nationalNumber

        // Emit the updated phone data to parent (contains full international number)
        emit('update:phoneData', phoneData.value)

        // Programmatically trigger country change in the Vue Tel Input component
        nextTick(() => {
          if (phoneRef.value) {
            // Access the Vue Tel Input's internal methods to set country
            const vuetelComponent = phoneRef.value as any
            if (vuetelComponent.choose && foundCountry) {
              // Use the component's built-in country selection method
              vuetelComponent.choose(foundCountry, true)
            }
          }
        })
      }
    }
  } catch (error) {
    // If parsing fails, just continue with normal input handling
    console.debug('Could not auto-detect country from phone number:', internationalNumber)
  }
}

function initializePhoneDataAndParseCountryCode() {
  const phoneValue = props.modelValue || props.propPhone
  if (phoneValue) {
    phone.value = phoneValue
    prevNumber = phoneValue
  }

  nextTick(() => {
    if (!phoneValue) return

    // Try to parse the phone number to detect country automatically
    const parsed = parsePhoneNumberFromString(phoneValue)

    if (parsed && parsed.isValid()) {
      const countryList = (phoneRef.value as any)?.allCountries || []
      const foundCountry = countryList.find((c: any) => c.iso2 === parsed.country)

      phoneData.value = {
        country: foundCountry
          ? {
              dialCode: foundCountry.dialCode,
              name: foundCountry.name,
              iso2: foundCountry.iso2,
            }
          : {
              dialCode: '',
              name: '',
              iso2: '',
            },
        countryCallingCode: parsed.countryCallingCode || '',
        countryCode: parsed.country || '',
        formatted: parsed.formatInternational(),
        nationalNumber: parsed.nationalNumber,
        number: parsed.number,
        valid: true,
      }

      // Set input to show only the national number
      // e.g., +15551234567 shows as 5551234567, +447911123456 shows as 7911123456
      phone.value = parsed.nationalNumber

      // Trigger country selection if different from current
      nextTick(() => {
        if (phoneRef.value && foundCountry) {
          const vuetelComponent = phoneRef.value as any
          if (vuetelComponent.choose) {
            vuetelComponent.choose(foundCountry, true)
          }
        }
      })
    } else if (phoneValue.startsWith('+')) {
      // If it's an international number format but parsing failed, try auto-detection
      autoDetectCountryFromInternationalNumber(phoneValue)
    } else {
      phoneData.value = defaultPhoneDataValues
    }
  })
}

// Hooks
onMounted(() => {
  /**
   * If phone number is already present (i.e edit user case),
   * 1. Manually initialize that phone's state from library object and set to the local state
   * 2. Parse the country code from the phone number
   */
  setTimeout(() => {
    initializePhoneDataAndParseCountryCode()
  }, 0)
})

onUnmounted(() => {
  // Clean up timeout to prevent memory leaks
  if (autoDetectTimeout) {
    clearTimeout(autoDetectTimeout)
  }
})

defineExpose({
  phoneData,
  handlePhoneValidation,
  resetPhoneField,
})
</script>

<template>
  <div>
    <VueTelInput
      ref="phoneRef"
      v-model="phone"
      class="custom-cursor"
      mode="international"
      :default-country="props.defaultCountry"
      :auto-format="false"
      required
      enabled-flags
      :disabled="props.disabled"
      :valid-characters-only="true"
      :style-classes="{
        errorState: phoneErr,
      }"
      selected-country-code
      :dropdown-options="{
        showDialCodeInList: true,
        showDialCodeInSelection: true,
        showFlags: true,
        showSearchBox: true,
      }"
      :input-options="{
        showDialCode: true,
        placeholder: props.placeholder,
      }"
      @on-input="onPhoneInput"
      @blur="handlePhoneValidation()"
      @country-changed="onCountryChanged"
    />
    <!-- Validation error field -->
    <div v-if="phoneErr">
      <p class="mt-2 text-red-500 dark:text-red-400 text-sm">
        {{ phoneErrMsg }}
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../../../assets/css/vue-tel-input.scss';

.errorState {
  border: 1px solid #ef4444 !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
}
</style>
